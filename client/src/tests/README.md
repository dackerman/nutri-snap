# NutriSnap Frontend Testing

This directory contains tests for the NutriSnap frontend application, featuring a comprehensive in-memory stub API implementation that enables realistic testing of frontend interactions.

## Testing Stack

- **Vitest**: A fast testing framework compatible with Vite projects
- **React Testing Library**: For testing React components
- **In-Memory Stub API**: Custom implementation for realistic API simulation
- **WebSocket Mocking**: For testing real-time updates

## Test Structure

```
client/src/tests/
├── README.md
├── api-interactions.test.ts  # Tests API request/response flow
├── in-memory-api.test.ts     # Tests the stub API functionality
├── mocks/
│   ├── mockApi.ts            # React-based mock API (not used in current tests)
│   └── stub-api.ts           # Pure TypeScript API stub implementation
├── simple.test.ts            # Basic test example
└── websocket.test.ts         # Tests WebSocket interaction
```

## Running Tests

```bash
pnpm test                # Run all tests
pnpm test:watch          # Run tests in watch mode
pnpm test:coverage       # Generate test coverage report
```

## Stub API Features

Our in-memory stub API provides:

1. **Full Data Persistence**: All data is stored in memory during the test lifecycle, allowing for complex multi-step tests.

2. **Complete API Coverage**:
   - User authentication (register, login, logout)
   - Meal management (create, read, update, delete)
   - Nutritional summary calculations
   - WebSocket notifications

3. **Timezone Handling**: Proper handling of date ranges based on browser timezone.

4. **Edge Case Simulation**:
   - Network errors
   - Slow responses
   - Analysis in progress states

5. **Test Helpers**:
   - `_seedUser()`: Create test users
   - `_seedMeal()`: Create test meals
   - `_reset()`: Clear all data between tests
   - `_simulateAnalysisPending()`: Simulate asynchronous analysis
   - `_simulateNetworkError()`: Inject errors for specific methods
   - `_simulateSlowResponse()`: Add delays to specific methods

## WebSocket Testing

The stub API includes WebSocket simulation:

1. **Connection Management**: Mimics connection establishment and termination
2. **Message Broadcasting**: Simulates server-to-client notifications
3. **Event Handlers**: Implements the standard WebSocket event system

## Example: Testing a Complete User Flow

```typescript
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
  
  // 3. Simulate background analysis completion
  let websocketNotified = false;
  inMemoryApi._registerWebSocketHandler(() => {
    websocketNotified = true;
  });
  
  inMemoryApi._simulateAnalysisPending(meal.id, 0);
  
  // 4. Verify WebSocket was notified
  expect(websocketNotified).toBe(true);
  
  // 5. Verify meal was updated with nutrition data
  const updatedMeal = inMemoryApi.getMealById(meal.id);
  expect(updatedMeal?.analysisPending).toBe(false);
  expect(updatedMeal?.calories).toBeGreaterThan(0);
});
```

## Best Practices

1. **Reset Between Tests**: Call `inMemoryApi._reset()` in the `beforeEach` hook.
2. **Seed Test Data**: Use `_seedUser()` and `_seedMeal()` to create test fixtures.
3. **Test Edge Cases**: Use the simulation methods to test error handling and loading states.
4. **Mock Fetch Carefully**: Replace `global.fetch` with a handler that routes to the stub API.
5. **Test Full Flows**: Test complete user flows from start to finish.