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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  // API endpoint to get meals for a specific date
  app.get("/api/meals", async (req: Request, res: Response) => {
    try {
      const dateStr = req.query.date as string || new Date().toISOString().split('T')[0];
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format. Use ISO format (YYYY-MM-DD)" });
      }
      
      // If user is logged in, filter by userId
      const userId = req.isAuthenticated() ? req.user?.id : undefined;
      const meals = await storage.getMealsByDate(date, userId);
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
  app.post("/api/meals", upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to add meals" });
      }
      
      // Check if either image or description is provided
      if (!req.file && (!req.body.description || req.body.description.trim() === '')) {
        return res.status(400).json({ message: "Either a food image or description is required" });
      }

      // Get the meal data from the request
      const mealData = {
        userId: req.user?.id,
        mealType: req.body.mealType,
        foodName: req.body.foodName || "",
        description: req.body.description || "",
        imageUrl: "", // Will be populated with base64 string if image is provided
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

      // Process image if available
      let imageBase64 = "";
      if (req.file) {
        imageBase64 = req.file.buffer.toString('base64');
        mealData.imageUrl = `data:${req.file.mimetype};base64,${imageBase64}`;
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
      const dateStr = req.query.date as string || new Date().toISOString().split('T')[0];
      const date = new Date(dateStr);
      
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
      
      res.json(summary);
    } catch (error) {
      console.error("Error calculating summary:", error);
      res.status(500).json({ message: "Failed to calculate summary" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
