import { describe, it, expect, beforeEach } from 'vitest';
import { inMemoryApi } from './mocks/stub-api';

describe('In-memory API', () => {
  beforeEach(() => {
    inMemoryApi._reset();
  });

  it('seeds and retrieves users', () => {
    const user = inMemoryApi._seedUser({
      email: 'test@example.com',
      name: 'Test User'
    });

    expect(user.id).toBe(1);
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
  });

  it('seeds and retrieves meals', () => {
    const user = inMemoryApi._seedUser({});
    
    const meal = inMemoryApi._seedMeal({
      userId: user.id,
      mealType: 'breakfast',
      foodName: 'Avocado Toast',
      calories: 350
    });

    expect(meal.foodName).toBe('Avocado Toast');
    expect(meal.calories).toBe(350);
    expect(meal.mealType).toBe('breakfast');
  });

  it('filters meals by date and timezone offset', () => {
    const user = inMemoryApi._seedUser({});
    
    // Yesterday's meal
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    inMemoryApi._seedMeal({
      userId: user.id,
      foodName: 'Yesterday Meal',
      timestamp: yesterday
    });
    
    // Today's meal
    inMemoryApi._seedMeal({
      userId: user.id,
      foodName: 'Today Meal',
      timestamp: new Date()
    });

    // Current user ID is set by _seedUser
    const todayStr = new Date().toISOString().split('T')[0];
    const tzOffset = new Date().getTimezoneOffset();
    
    const meals = inMemoryApi.getMealsByDate(todayStr, tzOffset);
    
    expect(meals.length).toBe(1);
    expect(meals[0].foodName).toBe('Today Meal');
  });

  it('calculates nutrition summary', () => {
    const user = inMemoryApi._seedUser({});
    
    // Add multiple meals with different nutrition values
    inMemoryApi._seedMeal({
      userId: user.id,
      foodName: 'Breakfast',
      calories: 300,
      fat: 15,
      carbs: 30,
      protein: 10
    });
    
    inMemoryApi._seedMeal({
      userId: user.id,
      foodName: 'Lunch',
      calories: 500,
      fat: 20,
      carbs: 45,
      protein: 25
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const tzOffset = new Date().getTimezoneOffset();
    
    const summary = inMemoryApi.getSummary(todayStr, tzOffset);
    
    expect(summary.calories).toBe(800);
    expect(summary.fat).toBe(35);
    expect(summary.carbs).toBe(75);
    expect(summary.protein).toBe(35);
  });
  
  it('simulates analysis completion', async () => {
    const user = inMemoryApi._seedUser({});
    
    const meal = inMemoryApi._seedMeal({
      userId: user.id,
      analysisPending: true,
      calories: 0
    });
    
    // Register a mock WebSocket callback
    let wasUpdated = false;
    inMemoryApi._registerWebSocketHandler(() => {
      wasUpdated = true;
    });
    
    // Issue is timing - setTimeout with 0ms still runs asynchronously
    // We'll use a Promise to wait for the analysis to complete
    inMemoryApi._simulateAnalysisPending(meal.id, 0);
    
    // Wait for the setTimeout to execute
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Now check meal was updated
    const updatedMeal = inMemoryApi.getMealById(meal.id);
    expect(updatedMeal?.analysisPending).toBe(false);
    expect(updatedMeal?.calories).toBe(350);
    expect(wasUpdated).toBe(true);
  });
});