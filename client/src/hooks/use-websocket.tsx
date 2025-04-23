import { useState, useEffect, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';

type WebSocketMessage = {
  type: string;
  mealId?: number;
  [key: string]: any;
};

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // Construct WebSocket URL - use same host but with ws/wss protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    const ws = new WebSocket(wsUrl);

    // Set up event handlers
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      setError(null);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
      setIsConnected(false);
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        setSocket(null); // This will trigger a reconnection
      }, 3000);
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('Failed to connect to the server');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        handleMessage(message);
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    setSocket(ws);

    // Clean up on unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [socket === null]); // Reconnect if socket is explicitly set to null

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('Received WebSocket message:', message);
    
    switch (message.type) {
      case 'meal_updated':
        if (message.mealId) {
          // Invalidate meal query to trigger a refetch
          queryClient.invalidateQueries({ queryKey: [`/api/meals/${message.mealId}`] });
          
          // Invalidate meals list query to update the list
          queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
          
          // Invalidate summary to update nutrition totals
          queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
          
          console.log(`Meal ${message.mealId} has been updated - refreshing data`);
        }
        break;
        
      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }, []);

  return { isConnected, error };
}