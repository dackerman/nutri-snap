import { Meal, User } from '@shared/schema';
import { createContext, useState, useContext } from 'react';

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

// Create instances
export const inMemoryApi = new InMemoryDatabase();

// For React component tests, create a context
export const MockApiContext = createContext<InMemoryDatabase | null>(null);

export const MockApiProvider = ({ children }: { children: React.ReactNode }) => {
  const [api] = useState(() => new InMemoryDatabase());
  return (
    <MockApiContext.Provider value={api}>
      {children}
    </MockApiContext.Provider>
  );
};

export const useMockApi = () => {
  const context = useContext(MockApiContext);
  if (!context) {
    throw new Error('useMockApi must be used within a MockApiProvider');
  }
  return context;
};

// Mock fetch implementation for tests
export function setupFetchMock() {
  const originalFetch = global.fetch;

  global.fetch = jest.fn((url: string, options: RequestInit = {}) => {
    // Extract route and parameters
    const urlObj = new URL(url, 'http://localhost');
    const path = urlObj.pathname;
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body.toString()) : undefined;
    
    // Parse query parameters
    const params = Object.fromEntries(urlObj.searchParams.entries());
    const date = params.date || new Date().toISOString().split('T')[0];
    const tzOffset = parseInt(params.tzOffset || '0');

    try {
      // Route the request to our in-memory API
      if (path === '/api/register' && method === 'POST') {
        const { email, password, name } = body;
        const user = inMemoryApi.register(email, password, name);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(user),
        } as Response);
      }
      
      if (path === '/api/login' && method === 'POST') {
        const { email, password } = body;
        const user = inMemoryApi.login(email, password);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(user),
        } as Response);
      }
      
      if (path === '/api/logout' && method === 'POST') {
        inMemoryApi.logout();
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response);
      }
      
      if (path === '/api/user' && method === 'GET') {
        const user = inMemoryApi.getCurrentUser();
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(user),
        } as Response);
      }
      
      if (path === '/api/meals' && method === 'GET') {
        const meals = inMemoryApi.getMealsByDate(date, tzOffset);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(meals),
        } as Response);
      }
      
      if (path.match(/\/api\/meals\/\d+/) && method === 'GET') {
        const id = parseInt(path.split('/').pop() || '0');
        const meal = inMemoryApi.getMealById(id);
        
        if (!meal) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ message: 'Meal not found' }),
          } as Response);
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(meal),
        } as Response);
      }
      
      if (path === '/api/meals' && method === 'POST') {
        let mealData: any = body;
        
        // Handle FormData
        if (options.headers?.['Content-Type']?.includes('multipart/form-data')) {
          mealData = {};
          // In a real implementation, you'd parse the FormData, but for the mock we'll pass an empty object
          // and let createMeal handle the defaults
        }
        
        const meal = inMemoryApi.createMeal(mealData);
        
        // Simulate async analysis if needed
        if (!mealData.calories && !mealData.analysisPending) {
          inMemoryApi._simulateAnalysisPending(meal.id);
        }
        
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(meal),
        } as Response);
      }
      
      if (path.match(/\/api\/meals\/\d+/) && method === 'PATCH') {
        const id = parseInt(path.split('/').pop() || '0');
        const updatedMeal = inMemoryApi.updateMeal(id, body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(updatedMeal),
        } as Response);
      }
      
      if (path.match(/\/api\/meals\/\d+/) && method === 'DELETE') {
        const id = parseInt(path.split('/').pop() || '0');
        const success = inMemoryApi.deleteMeal(id);
        
        if (!success) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ message: 'Meal not found' }),
          } as Response);
        }
        
        return Promise.resolve({
          ok: true,
          status: 204,
          json: () => Promise.resolve({}),
        } as Response);
      }
      
      if (path === '/api/summary' && method === 'GET') {
        const summary = inMemoryApi.getSummary(date, tzOffset);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(summary),
        } as Response);
      }
      
      // Fallback for unhandled routes
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      } as Response);
      
    } catch (error: any) {
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: error.message }),
      } as Response);
    }
  });

  // Return cleanup function
  return () => {
    global.fetch = originalFetch;
  };
}

// WebSocket mock
export function setupWebSocketMock() {
  class MockWebSocket {
    private url: string;
    private handlers: Record<string, Function[]> = {};
    
    constructor(url: string) {
      this.url = url;
      
      // Register with our in-memory API
      inMemoryApi._registerWebSocketHandler((mealId: number) => {
        this.trigger('message', {
          data: JSON.stringify({
            type: 'meal_updated',
            mealId
          })
        });
      });
      
      // Signal open connection on next tick
      setTimeout(() => {
        this.trigger('open', {});
      }, 0);
    }
    
    addEventListener(event: string, callback: Function) {
      if (!this.handlers[event]) {
        this.handlers[event] = [];
      }
      this.handlers[event].push(callback);
    }
    
    removeEventListener(event: string, callback: Function) {
      if (!this.handlers[event]) return;
      this.handlers[event] = this.handlers[event].filter(h => h !== callback);
    }
    
    trigger(event: string, data: any) {
      if (!this.handlers[event]) return;
      this.handlers[event].forEach(callback => callback(data));
    }
    
    close() {
      inMemoryApi._unregisterWebSocketHandler();
      this.trigger('close', {});
    }
    
    send() { /* Mock implementation - no-op for now */ }
  }
  
  // Replace WebSocket with our mock
  const originalWebSocket = global.WebSocket;
  global.WebSocket = MockWebSocket as any;
  
  // Return cleanup function
  return () => {
    global.WebSocket = originalWebSocket;
  };
}

// Example usage in a test
/*
import { inMemoryApi, setupFetchMock, setupWebSocketMock } from './mockApi';

describe('Authentication flow', () => {
  beforeEach(() => {
    inMemoryApi._reset();
  });
  
  const cleanup = setupFetchMock();
  const cleanupWs = setupWebSocketMock();
  
  afterAll(() => {
    cleanup();
    cleanupWs();
  });
  
  it('should register and login a user', async () => {
    // Seed test data
    inMemoryApi._seedUser({
      email: 'existing@example.com',
      password: 'password123'
    });
    
    // Test registration
    const newUser = await registerUser('new@example.com', 'password456');
    expect(newUser).toBeDefined();
    
    // Test login with wrong password
    await expect(loginUser('new@example.com', 'wrong')).rejects.toThrow();
    
    // Test successful login
    const loggedInUser = await loginUser('new@example.com', 'password456');
    expect(loggedInUser.email).toBe('new@example.com');
    
    // Test meal creation
    const meal = await createMeal({
      mealType: 'breakfast',
      description: 'Oatmeal with banana'
    });
    
    expect(meal.analysisPending).toBe(true);
    
    // Test meal updates via WebSocket
    const wsHandler = jest.fn();
    listenForMealUpdates(wsHandler);
    
    // Fast-forward time
    jest.advanceTimersByTime(5000);
    
    // Check that WebSocket handler was called
    expect(wsHandler).toHaveBeenCalled();
    
    // Verify meal was updated
    const updatedMeal = await fetchMeal(meal.id);
    expect(updatedMeal.analysisPending).toBe(false);
    expect(updatedMeal.calories).toBeGreaterThan(0);
  });
});
*/