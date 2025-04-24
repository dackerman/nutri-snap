import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inMemoryApi } from './mocks/stub-api';

// Mock WebSocket class
class MockWebSocket {
  url: string;
  onmessage: ((event: any) => void) | null = null;
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  readyState = 0; // CONNECTING
  
  constructor(url: string) {
    this.url = url;
    // Signal connection success after a short delay
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen({});
      }
    }, 0);
  }
  
  send(data: string): void {
    // No-op for tests
  }
  
  close(): void {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose({});
    }
  }
  
  // For tests to trigger fake messages
  triggerMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
}

describe('WebSocket Integration', () => {
  let originalWebSocket: any;
  
  beforeEach(() => {
    inMemoryApi._reset();
    
    // Setup fake timers
    vi.useFakeTimers();
    
    // Store original WebSocket constructor
    originalWebSocket = global.WebSocket;
    
    // Replace with our mock
    global.WebSocket = MockWebSocket as any;
  });
  
  afterEach(() => {
    // Restore original WebSocket
    global.WebSocket = originalWebSocket;
    
    // Restore real timers
    vi.useRealTimers();
  });
  
  it('connects to WebSocket server', () => {
    // Create WebSocket instance
    const socket = new WebSocket('ws://localhost/ws');
    
    // Setup spy for onopen handler
    const openSpy = vi.fn();
    socket.onopen = openSpy;
    
    // Fast-forward timers to trigger onopen
    vi.runAllTimers();
    
    // Check if connection was established
    expect(openSpy).toHaveBeenCalled();
    expect(socket.readyState).toBe(1); // OPEN
  });
  
  it('receives meal updates via WebSocket', () => {
    // Create WebSocket instance
    const socket = new WebSocket('ws://localhost/ws');
    
    // Setup message handler
    const messageSpy = vi.fn();
    socket.onmessage = messageSpy;
    
    // Fast-forward timers to establish connection
    vi.runAllTimers();
    
    // Create a meal with analysis pending
    const user = inMemoryApi._seedUser({});
    const meal = inMemoryApi._seedMeal({
      userId: user.id,
      analysisPending: true,
      calories: 0
    });
    
    // Register our WebSocket with inMemoryApi
    inMemoryApi._registerWebSocketHandler((mealId) => {
      // Trigger message on the socket
      (socket as any).triggerMessage({
        type: 'meal_updated',
        mealId
      });
    });
    
    // Simulate analysis completion with 0ms delay
    inMemoryApi._simulateAnalysisPending(meal.id, 0);
    
    // Run all timers to trigger the setTimeout in _simulateAnalysisPending
    vi.runAllTimers();
    
    // Verify WebSocket message was sent
    expect(messageSpy).toHaveBeenCalled();
    
    // Check message content
    const messageData = JSON.parse(messageSpy.mock.calls[0][0].data);
    expect(messageData.type).toBe('meal_updated');
    expect(messageData.mealId).toBe(meal.id);
  });
  
  it('properly closes WebSocket connections', () => {
    // Create WebSocket instance
    const socket = new WebSocket('ws://localhost/ws');
    
    // Setup close handler
    const closeSpy = vi.fn();
    socket.onclose = closeSpy;
    
    // Close connection
    socket.close();
    
    // Verify close handler was called
    expect(closeSpy).toHaveBeenCalled();
    expect(socket.readyState).toBe(3); // CLOSED
  });
});