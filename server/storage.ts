import { 
  users, 
  type User, 
  type InsertUser, 
  meals, 
  type Meal, 
  type InsertMeal,
  insertGoogleUserSchema
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User methods from original file
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser | z.infer<typeof insertGoogleUserSchema>): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Meal methods
  getMealsByDate(date: Date, userId?: number): Promise<Meal[]>;
  getMealById(id: number): Promise<Meal | undefined>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  updateMeal(id: number, meal: Partial<InsertMeal>): Promise<Meal | undefined>;
  deleteMeal(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser | z.infer<typeof insertGoogleUserSchema>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        lastLogin: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async getMealsByDate(date: Date, userId?: number): Promise<Meal[]> {
    console.log(`In storage.getMealsByDate with date: ${date.toISOString()}`);
    
    // For simplicity and to show all meals in the current calendar day (local time),
    // we'll use a wider date range that covers both UTC and Eastern time interpretation
    // of the same calendar date
    
    // Start at 00:00:00 UTC for the requested date
    const startOfDay = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(), 
      date.getUTCDate()
    ));
    
    // End at 23:59:59 UTC for the requested date
    const endOfDay = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(), 
      date.getUTCDate() + 1
    ));
    
    // Debug logs
    console.log(`Date range: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);
    
    let conditions = [
      gte(meals.timestamp, startOfDay),
      lte(meals.timestamp, endOfDay)
    ];
    
    // If userId is provided, add it to the conditions
    if (userId !== undefined) {
      conditions.push(eq(meals.userId, userId));
      console.log(`Filtering by userId: ${userId}`);
    }
    
    const result = await db
      .select()
      .from(meals)
      .where(and(...conditions));
      
    console.log(`Found ${result.length} meals`);
    return result;
  }

  async getMealById(id: number): Promise<Meal | undefined> {
    const [meal] = await db
      .select()
      .from(meals)
      .where(eq(meals.id, id));
    return meal || undefined;
  }

  async createMeal(insertMeal: InsertMeal): Promise<Meal> {
    const [meal] = await db
      .insert(meals)
      .values({
        ...insertMeal,
        timestamp: new Date()
      })
      .returning();
    return meal;
  }

  async updateMeal(id: number, updateData: Partial<InsertMeal>): Promise<Meal | undefined> {
    const [updatedMeal] = await db
      .update(meals)
      .set(updateData)
      .where(eq(meals.id, id))
      .returning();
    return updatedMeal || undefined;
  }

  async deleteMeal(id: number): Promise<boolean> {
    const result = await db
      .delete(meals)
      .where(eq(meals.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
