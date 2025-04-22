import { 
  users, 
  type User, 
  type InsertUser, 
  meals, 
  type Meal, 
  type InsertMeal 
} from "@shared/schema";

export interface IStorage {
  // User methods from original file
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Meal methods
  getMealsByDate(date: Date): Promise<Meal[]>;
  getMealById(id: number): Promise<Meal | undefined>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  updateMeal(id: number, meal: Partial<InsertMeal>): Promise<Meal | undefined>;
  deleteMeal(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private meals: Map<number, Meal>;
  private userCurrentId: number;
  private mealCurrentId: number;

  constructor() {
    this.users = new Map();
    this.meals = new Map();
    this.userCurrentId = 1;
    this.mealCurrentId = 1;
  }

  // User methods from original file
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Meal methods
  async getMealsByDate(date: Date): Promise<Meal[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.meals.values()).filter(meal => {
      const mealDate = new Date(meal.timestamp);
      return mealDate >= startOfDay && mealDate <= endOfDay;
    });
  }

  async getMealById(id: number): Promise<Meal | undefined> {
    return this.meals.get(id);
  }

  async createMeal(insertMeal: InsertMeal): Promise<Meal> {
    const id = this.mealCurrentId++;
    const meal: Meal = { 
      ...insertMeal,
      id, 
      timestamp: new Date()
    };
    
    this.meals.set(id, meal);
    return meal;
  }

  async updateMeal(id: number, updateData: Partial<InsertMeal>): Promise<Meal | undefined> {
    const existingMeal = this.meals.get(id);
    
    if (!existingMeal) {
      return undefined;
    }
    
    const updatedMeal: Meal = {
      ...existingMeal,
      ...updateData
    };
    
    this.meals.set(id, updatedMeal);
    return updatedMeal;
  }

  async deleteMeal(id: number): Promise<boolean> {
    return this.meals.delete(id);
  }
}

export const storage = new MemStorage();
