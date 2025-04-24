# Testing NutriSnap Frontend

This directory contains tests for the NutriSnap frontend application. We use a combination of unit tests and integration tests with a stub API implementation.

## Testing Framework

- **Vitest**: Fast testing framework compatible with Vite
- **React Testing Library**: For testing React components
- **In-Memory Stub API**: For realistic backend interaction simulation

## Stub API Overview

Instead of mocking individual API requests, we use an in-memory stub API that:

1. Stores records in JavaScript Maps
2. Implements the same interfaces as the real API
3. Has test helper methods for creating specific scenarios
4. Can simulate real-world conditions like network errors, slow responses, etc.

## Getting Started

1. Run tests with:
   ```bash
   npm run test
   ```

2. Run tests in watch mode:
   ```bash
   npm run test:watch
   ```

## Writing Tests

### Basic Component Test

```tsx
import { render, screen } from '@testing-library/react';
import { inMemoryApi } from './mocks/mockApi';
import MealCard from '../components/meal-card';

describe('MealCard', () => {
  it('displays meal information', () => {
    // Create test data
    const meal = inMemoryApi._seedMeal({
      foodName: 'Pizza',
      calories: 300
    });
    
    // Render component
    render(<MealCard meal={meal} />);
    
    // Verify output
    expect(screen.getByText('Pizza')).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });
});
```

### Testing API Interactions

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { inMemoryApi, setupFetchMock } from './mocks/mockApi';
import { useMeals } from '../hooks/use-meals';

describe('useMeals hook', () => {
  const cleanup = setupFetchMock();
  
  afterAll(() => {
    cleanup();
  });
  
  beforeEach(() => {
    inMemoryApi._reset();
  });
  
  it('fetches meals for the current day', async () => {
    // Seed test data
    const user = inMemoryApi._seedUser({});
    inMemoryApi._seedMeal({ 
      userId: user.id,
      foodName: 'Breakfast Burrito' 
    });
    
    // Use the hook
    const { result } = renderHook(() => useMeals());
    
    // Wait for results
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    // Verify data
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].foodName).toBe('Breakfast Burrito');
  });
});
```

### Testing Edge Cases

```tsx
it('handles analysis pending state', async () => {
  // Create test data with analysis pending
  const meal = inMemoryApi._seedMeal({
    analysisPending: true,
    foodName: 'Processing Meal'
  });
  
  // Simulate analysis completion after delay
  inMemoryApi._simulateAnalysisPending(meal.id, 1000);
  
  // Render component that uses WebSocket updates
  render(<MealDetail id={meal.id} />);
  
  // Check initial state
  expect(screen.getByText('Analysis in progress...')).toBeInTheDocument();
  
  // Advance timers to trigger WebSocket update
  vi.advanceTimersByTime(1000);
  
  // Verify component updates after WebSocket notification
  await waitFor(() => {
    expect(screen.queryByText('Analysis in progress...')).not.toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument(); // Updated calories
  });
});
```

## Available Test Helpers

### Seeding Data

- `inMemoryApi._seedUser(userData)`: Create a test user
- `inMemoryApi._seedMeal(mealData)`: Create a test meal

### Simulating Conditions

- `inMemoryApi._simulateNetworkError(method, probability)`: Make API calls fail randomly
- `inMemoryApi._simulateSlowResponse(method, delay)`: Add delay to API responses
- `inMemoryApi._simulateAnalysisPending(mealId, duration)`: Simulate async meal analysis

### Reset State

- `inMemoryApi._reset()`: Clear all data between tests