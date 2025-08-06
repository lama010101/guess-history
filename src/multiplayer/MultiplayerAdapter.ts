/**
 * MultiplayerAdapter - Socket-agnostic abstraction for PartyKit multiplayer
 * Provides connect/send/on API that can be swapped with any socket provider
 */

export interface MultiplayerAdapter {
  connect(roomId: string, jwt: string): Promise<void>;
  send(type: string, payload: any): void;
  on(type: string, callback: (data: any) => void): () => void;
  disconnect(): void;
  getState(): any;
}

export class PartyKitAdapter implements MultiplayerAdapter {
  public selfId: string | null = null;
  private socket: WebSocket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private currentState: any = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(roomId: string, jwt: string): Promise<void> {
    // Derive own userId from JWT (sub claim)
    try {
      const payloadPart = jwt.split('.')[1];
      const payloadJson = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
      this.selfId = payloadJson.sub || null;
    } catch {}

    if (this.socket) {
      this.disconnect();
    }

    const partykitUrl: string = (import.meta.env.VITE_PARTYKIT_URL as string) || (() => {
      const [hostname] = location.host.split(':');
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      return `${protocol}://${hostname}:6497`;
    })();
    const wsUrl = `${partykitUrl}/parties/main/${roomId}?jwt=${jwt}`;

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('Connected to PartyKit room:', roomId);
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.currentState = data;
        this.emit(data.type, data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log('Disconnected from PartyKit:', event.code);
      this.attemptReconnect(roomId, jwt);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  send(type: string, payload: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Socket not ready, message queued:', type);
      return;
    }

    this.socket.send(JSON.stringify({ type, ...payload }));
  }

  on(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(type);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.listeners.clear();
    this.currentState = null;
  }

  getState(): any {
    return this.currentState;
  }

  private emit(type: string, data: any): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  private attemptReconnect(roomId: string, jwt: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('error', { message: 'Failed to reconnect' });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      this.connect(roomId, jwt).catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }
}

// Factory function to create adapter instances
export function createMultiplayerAdapter(): MultiplayerAdapter {
  return new PartyKitAdapter();
}
