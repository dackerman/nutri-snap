import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model from original file
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// New nutrition-tracking related models
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  foodName: text("food_name"), // The name of the food
  description: text("description"), // More detailed description
  imageUrl: text("image_url"), // Image URL or JSON string containing multiple image URLs
  calories: integer("calories"),
  fat: integer("fat"), // in grams
  carbs: integer("carbs"), // in grams
  analysisPending: boolean("analysis_pending").default(false), // Flag to indicate if analysis is in progress
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  // No physical storage of images, we're assuming imageUrl could be a data URI or a reference
});

export const insertMealSchema = createInsertSchema(meals).omit({ 
  id: true,
  timestamp: true
});

export const mealAnalysisSchema = z.object({
  calories: z.number(),
  fat: z.number(),
  carbs: z.number(),
  foodName: z.string().optional()
});

export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;
export type MealAnalysis = z.infer<typeof mealAnalysisSchema>;
