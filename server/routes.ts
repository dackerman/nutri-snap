import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeFood, generateFoodImage } from "./openai";
import multer from "multer";
import { insertMealSchema, type Meal } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";
import { WebSocketServer, WebSocket } from "ws";

// Add global type declaration for our broadcast function
declare global {
  var broadcastMealUpdate: (mealId: number) => void;
}

// Setup multer for memory storage (we'll process the image and won't store it on disk)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to check if a string is a JSON array
function isJsonArray(str: string): boolean {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed);
  } catch (e) {
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  // API endpoint to get meals for a specific date
  app.get("/api/meals", async (req: Request, res: Response) => {
    try {
      // Get date from query parameter or use current date
      const dateStr = req.query.date as string || new Date().toISOString().split('T')[0];
      
      // Create date object (we'll adjust for Eastern time in the storage layer)
      const date = new Date(dateStr + 'T00:00:00Z');
      
      // Force the year to be 2025 if not specified in the query
      if (!req.query.date) {
        date.setFullYear(2025);
      }
      
      // Add logging to help with debugging
      console.log(`Fetching meals for date: ${dateStr}, using date: ${date.toISOString()}`);
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format. Use ISO format (YYYY-MM-DD)" });
      }
      
      // If user is logged in, filter by userId
      const userId = req.isAuthenticated() ? req.user?.id : undefined;
      const meals = await storage.getMealsByDate(date, userId);
      
      console.log(`Found ${meals.length} meals for date ${dateStr}`);
      res.json(meals);
    } catch (error) {
      console.error("Error fetching meals:", error);
      res.status(500).json({ message: "Failed to fetch meals" });
    }
  });

  // API endpoint to get a specific meal by ID
  app.get("/api/meals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid meal ID" });
      }
      
      const meal = await storage.getMealById(id);
      
      if (!meal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      res.json(meal);
    } catch (error) {
      console.error("Error fetching meal:", error);
      res.status(500).json({ message: "Failed to fetch meal" });
    }
  });

  // API endpoint to create a new meal with immediate addition and async AI analysis
  // Setup for multiple file uploads
  const multiUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'additionalImage1', maxCount: 1 },
    { name: 'additionalImage2', maxCount: 1 },
    { name: 'additionalImage3', maxCount: 1 },
    { name: 'additionalImage4', maxCount: 1 }
  ]);

  app.post("/api/meals", multiUpload, async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to add meals" });
      }
      
      // Get all uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const mainImage = files?.image?.[0];
      const additionalImages = [];
      
      // Collect any additional images
      for (let i = 1; i <= 4; i++) {
        const additionalImage = files?.[`additionalImage${i}`]?.[0];
        if (additionalImage) {
          additionalImages.push(additionalImage);
        }
      }
      
      // Check if either at least one image or description is provided
      const hasImages = !!mainImage || additionalImages.length > 0;
      const hasDescription = !!(req.body.description && req.body.description.trim() !== '');
      
      if (!hasImages && !hasDescription) {
        return res.status(400).json({ message: "Either a food image or description is required" });
      }

      // Get the meal data from the request
      const mealData = {
        userId: req.user?.id,
        mealType: req.body.mealType,
        foodName: req.body.foodName || "",
        brandName: req.body.brandName || "",
        description: req.body.description || "",
        imageUrl: "", // Will be populated with images
        calories: 0, // Placeholder until AI analysis completes
        fat: 0,     // Placeholder until AI analysis completes
        carbs: 0,    // Placeholder until AI analysis completes
        protein: 0,  // Placeholder until AI analysis completes
        quantity: req.body.quantity || null,
        unit: req.body.unit || null,
        analysisPending: true // New flag to indicate analysis is pending
      };

      // Validate the meal data
      const validationResult = insertMealSchema.safeParse(mealData);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Process images
      let imageBase64 = ""; // For AI analysis (use main image)
      let willGenerateImage = false; // Flag to indicate if we should generate an image
      
      if (mainImage) {
        // If we only have the main image with no additional images
        if (additionalImages.length === 0) {
          imageBase64 = mainImage.buffer.toString('base64');
          mealData.imageUrl = `data:${mainImage.mimetype};base64,${imageBase64}`;
          mealData.userProvidedImage = true; // User provided the image
        } else {
          // If we have both main and additional images, store as JSON array
          imageBase64 = mainImage.buffer.toString('base64');
          const allImages = [
            `data:${mainImage.mimetype};base64,${imageBase64}`,
            ...additionalImages.map(img => 
              `data:${img.mimetype};base64,${img.buffer.toString('base64')}`
            )
          ];
          mealData.imageUrl = JSON.stringify(allImages);
          mealData.userProvidedImage = true; // User provided the images
        }
      } else if (additionalImages.length > 0) {
        // If we only have additional images with no main image
        const firstImage = additionalImages[0];
        imageBase64 = firstImage.buffer.toString('base64');
        
        if (additionalImages.length === 1) {
          // Just one additional image
          mealData.imageUrl = `data:${firstImage.mimetype};base64,${imageBase64}`;
          mealData.userProvidedImage = true; // User provided the image
        } else {
          // Multiple additional images
          const allImages = additionalImages.map(img => 
            `data:${img.mimetype};base64,${img.buffer.toString('base64')}`
          );
          mealData.imageUrl = JSON.stringify(allImages);
          mealData.userProvidedImage = true; // User provided the images
        }
      } else if (hasDescription) {
        // No images provided but we have a description - we'll generate an image later
        // Set a placeholder image URL for now
        mealData.imageUrl = ""; 
        mealData.userProvidedImage = false; // AI will generate the image
        willGenerateImage = true;
      }

      // Create the meal in storage immediately with placeholder values
      const meal = await storage.createMeal(mealData);
      
      // Respond immediately with the created meal
      res.status(201).json(meal);
      
      // Now perform the AI analysis asynchronously (after response is sent)
      try {
        const analysis = await analyzeFood(imageBase64, mealData.description);
        
        // Prepare update data with analysis results
        const updateData = {
          calories: analysis.calories,
          fat: analysis.fat,
          carbs: analysis.carbs,
          protein: analysis.protein || 0,
          analysisPending: false
        };
        
        // If user didn't provide a food name but AI detected one, use the AI's suggestion
        if (!mealData.foodName && analysis.foodName) {
          (updateData as any).foodName = analysis.foodName;
        }
        
        // Add brand name if detected and not provided by user
        if (!mealData.brandName && analysis.brandName) {
          (updateData as any).brandName = analysis.brandName;
        }
        
        // Add quantity and unit if detected and not provided by user
        if (!mealData.quantity && analysis.quantity) {
          (updateData as any).quantity = analysis.quantity;
        }
        
        if (!mealData.unit && analysis.unit) {
          (updateData as any).unit = analysis.unit;
        }

        // Generate an AI image if needed (no images were provided but we have a description)
        if (willGenerateImage) {
          try {
            console.log(`Generating AI image for meal ${meal.id} using description: ${mealData.description}`);
            
            // Use food name from analysis if available, and combine with description for better image
            const foodName = analysis.foodName || "food";
            
            // Create an enhanced description combining food name and description
            const enhancedDescription = `${foodName}: ${mealData.description || ""}`.trim();
            
            // Generate the image with both food name and description
            const generatedImageBase64 = await generateFoodImage(enhancedDescription, foodName);
            
            // Set the image URL
            (updateData as any).imageUrl = `data:image/png;base64,${generatedImageBase64}`;
            
            console.log(`Successfully generated AI image for meal ${meal.id}`);
          } catch (imageError) {
            console.error(`Error generating image for meal ${meal.id}:`, imageError);
            // Continue with analysis even if image generation fails
          }
        }

        // Update the meal with the analysis results
        await storage.updateMeal(meal.id, updateData);
        console.log(`Successfully updated meal ${meal.id} with AI analysis`);
        
        // Broadcast update to all connected clients
        if (global.broadcastMealUpdate) {
          global.broadcastMealUpdate(meal.id);
        }
      } catch (analysisError: any) {
        console.error(`Error analyzing meal ${meal.id}:`, analysisError);
        // Mark the meal as no longer pending, but with analysis failed
        await storage.updateMeal(meal.id, { 
          analysisPending: false,
          // Could add an analysisError field here if desired
        });
      }
    } catch (error: any) {
      console.error("Error creating meal:", error);
      res.status(500).json({ message: `Failed to create meal: ${error.message || 'Unknown error'}` });
    }
  });

  // API endpoint to update a meal with smart regeneration
  app.patch("/api/meals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid meal ID" });
      }
      
      const existingMeal = await storage.getMealById(id);
      
      if (!existingMeal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      // Check what fields are being updated
      const updates = req.body;
      
      // Copy existing meal data so we can modify it before saving
      const mealData = { ...existingMeal, ...updates };
      
      // Track if we need to trigger AI processing
      let needsReanalysis = false;
      let needsImageGeneration = false;
      
      // Check if description was changed and meal was using AI generated image
      if (
        updates.description && 
        updates.description !== existingMeal.description && 
        !existingMeal.userProvidedImage
      ) {
        console.log(`Description changed for meal ${id}, will regenerate image`);
        needsImageGeneration = true;
      }
      
      // If we're updating the image
      if (updates.imageUrl && updates.imageUrl !== existingMeal.imageUrl) {
        console.log(`Image changed for meal ${id}, will reanalyze`);
        needsReanalysis = true;
        // Mark that the image is now user-provided
        mealData.userProvidedImage = true;
      }
      
      // Set analysisPending flag if we need to reanalyze or regenerate
      if (needsReanalysis || needsImageGeneration) {
        mealData.analysisPending = true;
      }
      
      // Update meal with initial changes
      const updatedMeal = await storage.updateMeal(id, mealData);
      
      // Return immediately with the updated meal
      res.json(updatedMeal);
      
      // Handle any regeneration or reanalysis asynchronously
      if (needsReanalysis || needsImageGeneration) {
        try {
          // Get image data for analysis
          let imageBase64 = "";
          if (mealData.imageUrl) {
            // Handle both single image and array of images
            if (isJsonArray(mealData.imageUrl)) {
              const images = JSON.parse(mealData.imageUrl);
              if (images.length > 0) {
                // Use the first image for analysis
                const firstImage = images[0];
                const dataUrlParts = firstImage.split(',');
                if (dataUrlParts.length > 1) {
                  imageBase64 = dataUrlParts[1]; // Get the base64 part
                }
              }
            } else {
              // Single image
              const dataUrlParts = mealData.imageUrl.split(',');
              if (dataUrlParts.length > 1) {
                imageBase64 = dataUrlParts[1]; // Get the base64 part
              }
            }
          }
          
          // Start with updating just analysis pending flag when done
          const finalUpdates: any = {
            analysisPending: false
          };
          
          // If description changed and we need to regenerate the image
          if (needsImageGeneration) {
            try {
              console.log(`Generating new AI image for meal ${id} using description: ${mealData.description}`);
              
              // Use food name if available, otherwise use a generic description
              const foodName = mealData.foodName || "food";
              
              // Create an enhanced description combining food name and description
              const enhancedDescription = `${foodName}: ${mealData.description || ""}`.trim();
              
              // Generate the image with both food name and description
              const generatedImageBase64 = await generateFoodImage(enhancedDescription, foodName);
              
              // Set the image URL
              finalUpdates.imageUrl = `data:image/png;base64,${generatedImageBase64}`;
              finalUpdates.userProvidedImage = false;
              
              console.log(`Successfully regenerated AI image for meal ${id}`);
              
              // Update image base64 for analysis
              imageBase64 = generatedImageBase64;
            } catch (imageError) {
              console.error(`Error generating image for meal ${id}:`, imageError);
              // Continue with analysis even if image generation fails
            }
          }
          
          // If we need to reanalyze nutrition data
          if (needsReanalysis || needsImageGeneration) {
            // Run the analysis
            const analysis = await analyzeFood(imageBase64, mealData.description);
            
            // Update nutrition data
            finalUpdates.calories = analysis.calories;
            finalUpdates.fat = analysis.fat;
            finalUpdates.carbs = analysis.carbs;
            finalUpdates.protein = analysis.protein || 0;
            
            // If user didn't provide these fields, use the AI's suggestions
            if (!mealData.foodName && analysis.foodName) {
              finalUpdates.foodName = analysis.foodName;
            }
            
            if (!mealData.brandName && analysis.brandName) {
              finalUpdates.brandName = analysis.brandName;
            }
            
            if (!mealData.quantity && analysis.quantity) {
              finalUpdates.quantity = analysis.quantity;
            }
            
            if (!mealData.unit && analysis.unit) {
              finalUpdates.unit = analysis.unit;
            }
          }
          
          // Apply all the final updates
          await storage.updateMeal(id, finalUpdates);
          console.log(`Successfully updated meal ${id} with regenerated data`);
          
          // Broadcast update to all connected clients
          if (global.broadcastMealUpdate) {
            global.broadcastMealUpdate(id);
          }
        } catch (processingError) {
          console.error(`Error processing meal ${id}:`, processingError);
          // Mark the meal as no longer pending, but with analysis failed
          await storage.updateMeal(id, { analysisPending: false });
        }
      }
    } catch (error) {
      console.error("Error updating meal:", error);
      res.status(500).json({ message: "Failed to update meal" });
    }
  });

  // API endpoint to delete a meal
  app.delete("/api/meals/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid meal ID" });
      }
      
      const success = await storage.deleteMeal(id);
      
      if (!success) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting meal:", error);
      res.status(500).json({ message: "Failed to delete meal" });
    }
  });

  // API endpoint to calculate daily summary
  app.get("/api/summary", async (req: Request, res: Response) => {
    try {
      // Get date from query parameter or use current date
      const dateStr = req.query.date as string || new Date().toISOString().split('T')[0];
      
      // Create date object (we'll adjust for Eastern time in the storage layer)
      const date = new Date(dateStr + 'T00:00:00Z');
      
      // Add logging to help with debugging
      console.log(`Calculating summary for date: ${dateStr}, parsed as: ${date.toISOString()}`);
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format. Use ISO format (YYYY-MM-DD)" });
      }
      
      // Filter by logged in user if authenticated
      const userId = req.isAuthenticated() ? req.user?.id : undefined;
      const meals = await storage.getMealsByDate(date, userId);
      
      const summary = meals.reduce((acc, meal) => {
        acc.calories += meal.calories || 0;
        acc.fat += meal.fat || 0;
        acc.carbs += meal.carbs || 0;
        acc.protein += meal.protein || 0;
        return acc;
      }, { calories: 0, fat: 0, carbs: 0, protein: 0 });
      
      console.log(`Summary for ${dateStr}: Calories: ${summary.calories}, Fat: ${summary.fat}g, Carbs: ${summary.carbs}g, Protein: ${summary.protein}g`);
      res.json(summary);
    } catch (error) {
      console.error("Error calculating summary:", error);
      res.status(500).json({ message: "Failed to calculate summary" });
    }
  });
  
  const httpServer = createServer(app);
  
  // Set up WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Store active connections
  const connections: WebSocket[] = [];
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Store the connection
    connections.push(ws);
    
    // Remove connection when closed
    ws.on('close', () => {
      const index = connections.indexOf(ws);
      if (index !== -1) {
        connections.splice(index, 1);
      }
      console.log('WebSocket client disconnected');
    });
  });
  
  // Add broadcast function to send messages to all connected clients
  global.broadcastMealUpdate = (mealId: number) => {
    const message = JSON.stringify({
      type: 'meal_updated',
      mealId
    });
    
    connections.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };
  
  return httpServer;
}
