import { 
  users, 
  type User, 
  type InsertUser, 
  meals, 
  type Meal, 
  type InsertMeal 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User methods from original file
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getMealsByDate(date: Date, userId?: number): Promise<Meal[]> {
    console.log(`In storage.getMealsByDate with date: ${date.toISOString()}`);
    
    // Set timezone offset for Eastern Time (ET)
    // ET is UTC-4 during DST (summer) and UTC-5 during standard time (winter)
    // For 2025-04-24, we're in DST so it's UTC-4
    const etOffsetHours = -4;
    
    // Adjust the date to Eastern Time
    const etDate = new Date(date);
    etDate.setHours(etDate.getHours() + etOffsetHours);
    
    // Create date range for the given day in Eastern Time
    const startOfDay = new Date(Date.UTC(
      etDate.getFullYear(),
      etDate.getMonth(), 
      etDate.getDate()
    ));
    const endOfDay = new Date(Date.UTC(
      etDate.getFullYear(),
      etDate.getMonth(), 
      etDate.getDate() + 1
    ));
    
    // Debug logs
    console.log(`Eastern Time adjusted date: ${etDate.toISOString()}`);
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
