import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { analyzeFood } from "./openai";
import multer from "multer";
import { insertMealSchema, type Meal } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";

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
      
      // Create date at UTC midnight to handle timezone issues properly
      const date = new Date(dateStr + 'T00:00:00Z');
      
      // Add logging to help with debugging
      console.log(`Fetching meals for date: ${dateStr}, parsed as: ${date.toISOString()}`);
      
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
        description: req.body.description || "",
        imageUrl: "", // Will be populated with images
        calories: 0, // Placeholder until AI analysis completes
        fat: 0,     // Placeholder until AI analysis completes
        carbs: 0,    // Placeholder until AI analysis completes
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
      
      if (mainImage) {
        // If we only have the main image with no additional images
        if (additionalImages.length === 0) {
          imageBase64 = mainImage.buffer.toString('base64');
          mealData.imageUrl = `data:${mainImage.mimetype};base64,${imageBase64}`;
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
        }
      } else if (additionalImages.length > 0) {
        // If we only have additional images with no main image
        const firstImage = additionalImages[0];
        imageBase64 = firstImage.buffer.toString('base64');
        
        if (additionalImages.length === 1) {
          // Just one additional image
          mealData.imageUrl = `data:${firstImage.mimetype};base64,${imageBase64}`;
        } else {
          // Multiple additional images
          const allImages = additionalImages.map(img => 
            `data:${img.mimetype};base64,${img.buffer.toString('base64')}`
          );
          mealData.imageUrl = JSON.stringify(allImages);
        }
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
          analysisPending: false
        };
        
        // If user didn't provide a food name but AI detected one, use the AI's suggestion
        if (!mealData.foodName && analysis.foodName) {
          // Need to use type assertion for dynamic property
          (updateData as any).foodName = analysis.foodName;
        }

        // Update the meal with the analysis results
        await storage.updateMeal(meal.id, updateData);
        console.log(`Successfully updated meal ${meal.id} with AI analysis`);
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

  // API endpoint to update a meal
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
      
      const updatedMeal = await storage.updateMeal(id, req.body);
      res.json(updatedMeal);
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
      
      // Create date at UTC midnight to handle timezone issues properly
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
        return acc;
      }, { calories: 0, fat: 0, carbs: 0 });
      
      console.log(`Summary for ${dateStr}: Calories: ${summary.calories}, Fat: ${summary.fat}g, Carbs: ${summary.carbs}g`);
      res.json(summary);
    } catch (error) {
      console.error("Error calculating summary:", error);
      res.status(500).json({ message: "Failed to calculate summary" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
