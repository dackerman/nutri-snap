// Inline schema types for test purposes
interface User {
  id: number;
  name?: string;
  email: string;
  password?: string;
  googleId?: string;
  profilePicture?: string;
  createdAt: Date;
  lastLogin: Date;
}

interface Meal {
  id: number;
  userId: number;
  mealType: string;
  foodName?: string;
  brandName?: string;
  description?: string;
  imageUrl?: string;
  calories?: number;
  fat?: number;
  carbs?: number;
  protein?: number;
  quantity?: number;
  unit?: string;
  analysisPending?: boolean;
  userProvidedImage?: boolean;
  timestamp: Date;
}

// In-memory storage for our stub API
class InMemoryDatabase {
  private users: Map<number, User> = new Map();
  private meals: Map<number, Meal> = new Map();
  private nextUserId = 1;
  private nextMealId = 1;
  private currentUserId: number | null = null;

  // User API methods
  register(email: string, password: string, name: string): User {
    // Check if email already exists
    const existingUser = [...this.users.values()].find(u => u.email === email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const user: User = {
      id: this.nextUserId++,
      email,
      name,
      password,
      createdAt: new Date(),
      lastLogin: new Date(),
    };

    this.users.set(user.id, user);
    this.currentUserId = user.id;
    return user;
  }

  login(email: string, password: string): User {
    const user = [...this.users.values()].find(
      u => u.email === email && u.password === password
    );
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    this.currentUserId = user.id;
    return user;
  }

  logout(): void {
    this.currentUserId = null;
  }

  getCurrentUser(): User | null {
    if (!this.currentUserId) return null;
    return this.users.get(this.currentUserId) || null;
  }

  // Meal API methods
  getMealsByDate(date: string, tzOffset: number): Meal[] {
    if (!this.currentUserId) {
      return [];
    }

    // Convert the date string to Date object for comparison
    const targetDate = new Date(date + 'T00:00:00Z');
    
    // Get the start and end of the day in user's local timezone
    const tzOffsetHours = tzOffset / 60;
    
    const startOfDay = new Date(Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      -tzOffsetHours,
      0, 0, 0
    ));
    
    const endOfDay = new Date(Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      24 - tzOffsetHours - 1,
      59, 59, 999
    ));

    return [...this.meals.values()].filter(meal => {
      const mealDate = new Date(meal.timestamp);
      return (
        meal.userId === this.currentUserId &&
        mealDate >= startOfDay &&
        mealDate <= endOfDay
      );
    });
  }

  getMealById(id: number): Meal | null {
    return this.meals.get(id) || null;
  }

  createMeal(mealData: Partial<Meal>): Meal {
    if (!this.currentUserId) {
      throw new Error('Not authenticated');
    }

    const meal: Meal = {
      id: this.nextMealId++,
      userId: this.currentUserId,
      mealType: mealData.mealType || 'snack',
      foodName: mealData.foodName || '',
      brandName: mealData.brandName || '',
      description: mealData.description || '',
      imageUrl: mealData.imageUrl || '',
      calories: mealData.calories || 0,
      fat: mealData.fat || 0,
      carbs: mealData.carbs || 0,
      protein: mealData.protein || 0,
      quantity: mealData.quantity || 1,
      unit: mealData.unit || 'serving',
      analysisPending: mealData.analysisPending || false,
      userProvidedImage: mealData.userProvidedImage || false,
      timestamp: new Date(),
    };

    this.meals.set(meal.id, meal);
    return meal;
  }

  updateMeal(id: number, mealData: Partial<Meal>): Meal {
    const meal = this.meals.get(id);
    if (!meal) {
      throw new Error('Meal not found');
    }

    if (meal.userId !== this.currentUserId) {
      throw new Error('Not authorized');
    }

    const updatedMeal = { ...meal, ...mealData };
    this.meals.set(id, updatedMeal);
    return updatedMeal;
  }

  deleteMeal(id: number): boolean {
    const meal = this.meals.get(id);
    if (!meal) {
      return false;
    }

    if (meal.userId !== this.currentUserId) {
      throw new Error('Not authorized');
    }

    return this.meals.delete(id);
  }

  getSummary(date: string, tzOffset: number): { calories: number; fat: number; carbs: number; protein: number } {
    const meals = this.getMealsByDate(date, tzOffset);
    
    return meals.reduce(
      (acc, meal) => {
        acc.calories += meal.calories || 0;
        acc.fat += meal.fat || 0;
        acc.carbs += meal.carbs || 0;
        acc.protein += meal.protein || 0;
        return acc;
      },
      { calories: 0, fat: 0, carbs: 0, protein: 0 }
    );
  }

  // Test helper methods
  _reset(): void {
    this.users.clear();
    this.meals.clear();
    this.nextUserId = 1;
    this.nextMealId = 1;
    this.currentUserId = null;
  }

  _seedUser(user: Partial<User>): User {
    const newUser: User = {
      id: user.id || this.nextUserId++,
      email: user.email || `user${this.nextUserId}@example.com`,
      name: user.name || `Test User ${this.nextUserId}`,
      password: user.password || 'password',
      createdAt: user.createdAt || new Date(),
      lastLogin: user.lastLogin || new Date(),
    };

    this.users.set(newUser.id, newUser);
    this.currentUserId = newUser.id;
    return newUser;
  }

  _seedMeal(mealData: Partial<Meal>): Meal {
    const userId = mealData.userId || this.currentUserId;
    if (!userId) {
      throw new Error('Cannot seed meal without userId');
    }

    const meal: Meal = {
      id: mealData.id || this.nextMealId++,
      userId,
      mealType: mealData.mealType || 'snack',
      foodName: mealData.foodName || `Test Food ${this.nextMealId}`,
      brandName: mealData.brandName || '',
      description: mealData.description || '',
      imageUrl: mealData.imageUrl || '',
      calories: mealData.calories || 200,
      fat: mealData.fat || 5,
      carbs: mealData.carbs || 20,
      protein: mealData.protein || 10,
      quantity: mealData.quantity || 1,
      unit: mealData.unit || 'serving',
      analysisPending: mealData.analysisPending || false,
      userProvidedImage: mealData.userProvidedImage || false,
      timestamp: mealData.timestamp || new Date(),
    };

    this.meals.set(meal.id, meal);
    return meal;
  }

  // Simulate edge cases/errors
  _simulateNetworkError(method: string, probability = 0.2): void {
    const originalMethod = this[method as keyof InMemoryDatabase] as Function;
    
    this[method as keyof InMemoryDatabase] = ((...args: any[]) => {
      if (Math.random() < probability) {
        throw new Error('Network error');
      }
      return originalMethod.apply(this, args);
    }) as any;
  }

  _simulateSlowResponse(method: string, delay = 2000): void {
    const originalMethod = this[method as keyof InMemoryDatabase] as Function;
    
    this[method as keyof InMemoryDatabase] = (async (...args: any[]) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return originalMethod.apply(this, args);
    }) as any;
  }

  _simulateAnalysisPending(mealId: number, duration = 5000): void {
    const meal = this.meals.get(mealId);
    if (!meal) return;
    
    this.meals.set(mealId, { ...meal, analysisPending: true });
    
    setTimeout(() => {
      const updatedMeal = this.meals.get(mealId);
      if (updatedMeal) {
        this.meals.set(mealId, { 
          ...updatedMeal, 
          analysisPending: false,
          calories: 350,
          fat: 12,
          carbs: 45,
          protein: 15
        });
        
        // Simulate WebSocket notification
        if (this.onMealUpdated) {
          this.onMealUpdated(mealId);
        }
      }
    }, duration);
  }

  // WebSocket simulation
  onMealUpdated: ((mealId: number) => void) | null = null;
  
  _registerWebSocketHandler(handler: (mealId: number) => void): void {
    this.onMealUpdated = handler;
  }
  
  _unregisterWebSocketHandler(): void {
    this.onMealUpdated = null;
  }
}

// Create instance
export const inMemoryApi = new InMemoryDatabase();