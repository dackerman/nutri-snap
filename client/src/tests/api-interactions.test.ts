import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inMemoryApi } from './mocks/stub-api';

// Mock global fetch for API tests
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('API Interactions', () => {
  beforeEach(() => {
    inMemoryApi._reset();
    vi.clearAllMocks();
    
    // Setup fetch mock to route through our in-memory API
    fetchMock.mockImplementation((url: string, options: RequestInit = {}) => {
      const urlObj = new URL(url, 'http://localhost');
      const path = urlObj.pathname;
      const method = options.method || 'GET';
      
      // Process the meal API endpoints
      if (path === '/api/meals' && method === 'GET') {
        const params = Object.fromEntries(urlObj.searchParams.entries());
        const date = params.date || new Date().toISOString().split('T')[0];
        const tzOffset = parseInt(params.tzOffset || '0');
        
        const meals = inMemoryApi.getMealsByDate(date, tzOffset);
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(meals),
        } as Response);
      }
      
      if (path === '/api/meals' && method === 'POST') {
        const body = options.body ? JSON.parse(options.body.toString()) : {};
        const meal = inMemoryApi.createMeal(body);
        
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(meal),
        } as Response);
      }
      
      // Add other API endpoints as needed
      
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not Found' }),
      } as Response);
    });
  });
  
  it('fetches meals for today', async () => {
    // Seed a user and add meals
    const user = inMemoryApi._seedUser({});
    inMemoryApi._seedMeal({ userId: user.id, foodName: 'Breakfast' });
    inMemoryApi._seedMeal({ userId: user.id, foodName: 'Lunch' });
    
    // Get today's date as string
    const today = new Date().toISOString().split('T')[0];
    const tzOffset = new Date().getTimezoneOffset();
    
    // Make a fetch request to /api/meals (this goes through our mock)
    const response = await fetch(`/api/meals?date=${today}&tzOffset=${tzOffset}`);
    const meals = await response.json();
    
    // Assertions
    expect(response.ok).toBe(true);
    expect(meals.length).toBe(2);
    expect(meals[0].foodName).toBe('Breakfast');
    expect(meals[1].foodName).toBe('Lunch');
  });
  
  it('creates a new meal', async () => {
    // Seed a user first
    const user = inMemoryApi._seedUser({});
    
    // Prepare meal data
    const mealData = {
      mealType: 'dinner',
      foodName: 'Pasta',
      calories: 550,
      fat: 15,
      carbs: 80,
      protein: 20,
    };
    
    // Make POST request to create meal
    const response = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mealData),
    });
    
    const createdMeal = await response.json();
    
    // Assertions
    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);
    expect(createdMeal.foodName).toBe('Pasta');
    expect(createdMeal.calories).toBe(550);
    
    // Verify meal was stored in our in-memory database
    const storedMeal = inMemoryApi.getMealById(createdMeal.id);
    expect(storedMeal).not.toBeNull();
    expect(storedMeal?.foodName).toBe('Pasta');
  });
  
  it('simulates API errors', async () => {
    // Seed a user
    const user = inMemoryApi._seedUser({});
    
    // Since we can't use mockImplementationOnce with the expect().rejects pattern,
    // we'll use a different approach
    
    // Setup error response instead of throwing
    fetchMock.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ message: 'Service Unavailable' }),
    } as Response));
    
    // Should handle error response from API
    const networkErrorResponse = await fetch('/api/meals');
    expect(networkErrorResponse.ok).toBe(false);
    expect(networkErrorResponse.status).toBe(503);
    
    const networkErrorData = await networkErrorResponse.json();
    expect(networkErrorData.message).toBe('Service Unavailable');
    
    // Reset for the next test
    fetchMock.mockClear();
    
    // Setup more realistic error - API returns error response
    fetchMock.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Internal Server Error' }),
    } as Response));
    
    // Should handle error response from API
    const errorResponse = await fetch('/api/meals');
    expect(errorResponse.ok).toBe(false);
    expect(errorResponse.status).toBe(500);
    
    const errorData = await errorResponse.json();
    expect(errorData.message).toBe('Internal Server Error');
  });
  
  it('demonstrates realistic API flows', async () => {
    // 1. Register a user
    const user = inMemoryApi._seedUser({
      email: 'user@example.com',
      password: 'password123'
    });
    
    // 2. Create a meal with analysis pending
    const mealResponse = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mealType: 'breakfast',
        description: 'Eggs and toast',
        analysisPending: true,
      }),
    });
    
    const meal = await mealResponse.json();
    expect(meal.analysisPending).toBe(true);
    
    // 3. Simulate background analysis completion
    let websocketNotified = false;
    inMemoryApi._registerWebSocketHandler(() => {
      websocketNotified = true;
    });
    
    inMemoryApi._simulateAnalysisPending(meal.id, 0);
    
    // Wait for the analysis to complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // 4. Verify WebSocket was notified
    expect(websocketNotified).toBe(true);
    
    // 5. Verify meal was updated with nutrition data
    const updatedMeal = inMemoryApi.getMealById(meal.id);
    expect(updatedMeal?.analysisPending).toBe(false);
    expect(updatedMeal?.calories).toBeGreaterThan(0);
    
    // 6. Fetch today's meals again to see the update
    const today = new Date().toISOString().split('T')[0];
    const tzOffset = new Date().getTimezoneOffset();
    
    const mealsResponse = await fetch(`/api/meals?date=${today}&tzOffset=${tzOffset}`);
    const meals = await mealsResponse.json();
    
    // Should include our analyzed meal
    expect(meals.length).toBe(1);
    expect(meals[0].id).toBe(meal.id);
    expect(meals[0].analysisPending).toBe(false);
    expect(meals[0].calories).toBeGreaterThan(0);
  });
});