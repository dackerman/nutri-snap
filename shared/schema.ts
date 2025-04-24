import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model with Google OAuth support
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  password: text("password"), // Now optional for Google auth
  googleId: text("google_id").unique(), // Google's unique user ID
  profilePicture: text("profile_picture"), // Profile picture URL from Google
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login").defaultNow(),
});

// Standard email/password registration schema
export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
});

// Google registration schema (no password required)
export const insertGoogleUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  googleId: true,
  profilePicture: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// New nutrition-tracking related models
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  foodName: text("food_name"), // The name of the food
  brandName: text("brand_name"), // Brand name if it's not a generic food
  description: text("description"), // More detailed description
  imageUrl: text("image_url"), // Image URL or JSON string containing multiple image URLs
  calories: integer("calories"),
  fat: integer("fat"), // in grams
  carbs: integer("carbs"), // in grams
  protein: integer("protein"), // in grams
  quantity: integer("quantity"), // The numeric amount
  unit: text("unit"), // The unit of measurement (grams, ounces, count)
  analysisPending: boolean("analysis_pending").default(false), // Flag to indicate if analysis is in progress
  userProvidedImage: boolean("user_provided_image").default(false), // Flag to track if image was provided by user or AI generated
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
  protein: z.number(),
  foodName: z.string().optional(),
  brandName: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional()
});

export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;
export type MealAnalysis = z.infer<typeof mealAnalysisSchema>;
