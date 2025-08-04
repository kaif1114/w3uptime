import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { IncomingMessage, OutgoingMessage } from 'common/types';
import { SecureMessageSigner } from '../crypto/signer.js';
import { v7 as uuidv7 } from 'uuid';

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number; // milliseconds
  maxReconnectAttempts: number;
  pingInterval: number; // milliseconds
  connectionTimeout: number; // milliseconds
}

export interface QueuedMessage {
  id: string;
  data: any;
  timestamp: number;
  attempts: number;
  maxAttempts: number;
}

export class ValidatorWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private signer: SecureMessageSigner;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private messageQueue: QueuedMessage[] = [];
  private validatorId: string | null = null;
  private isDestroyed: boolean = false;

  constructor(config: WebSocketConfig, signer: SecureMessageSigner) {
    super();
    this.config = config;
    this.signer = signer;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Client has been destroyed');
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      await this.createConnection();
      this.emit('connected');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.cleanup();
    this.isConnected = false;
    this.emit('disconnected');
  }

  /**
   * Send a signed message to the hub
   */
  async sendSignedMessage(type: string, data: any): Promise<void> {
    if (!this.signer.isAuthenticated()) {
      throw new Error('Signer not authenticated');
    }

    try {
      const signedMessage = await this.signer.signMessage(data);
      
      const message: IncomingMessage = {
        type: type as any,
        data: data,
        signature: signedMessage.signature
      };

      await this.sendMessage(message);
    } catch (error) {
      throw new Error(`Failed to send signed message: ${error}`);
    }
  }

  /**
   * Send raw message (queued if not connected)
   */
  async sendMessage(message: any): Promise<void> {
    const messageId = this.generateMessageId();
    
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue the message
      this.queueMessage(messageId, message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.emit('messageSent', { id: messageId, message });
    } catch (error) {
      // Queue the message for retry
      this.queueMessage(messageId, message);
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  /**
   * Sign up as a validator
   */
  async signup(): Promise<void> {
    if (!this.signer.isAuthenticated()) {
      throw new Error('Signer not authenticated');
    }

    const signupData = {
      ip: await this.getLocalIP(),
      publicKey: this.signer.getPublicKey()!,
      callbackId: this.generateCallbackId()
    };

    await this.sendSignedMessage('signup', signupData);
  }

  /**
   * Send validation result
   */
  async sendValidationResult(result: {
    callbackId: string;
    status: 'GOOD' | 'BAD';
    latency: number;
    monitorId: string;
  }): Promise<void> {
    if (!this.validatorId) {
      throw new Error('Not registered as validator');
    }

    const validationData = {
      ...result,
      validatorId: this.validatorId,
      publicKey: this.signer.getPublicKey()!
    };

    await this.sendSignedMessage('validate', validationData);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
    validatorId: string | null;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      validatorId: this.validatorId
    };
  }

  /**
   * Create WebSocket connection
   */
  private async createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, {
          handshakeTimeout: this.config.connectionTimeout
        });

        const connectionTimeout = setTimeout(() => {
          if (this.ws) {
            this.ws.terminate();
          }
          reject(new Error('Connection timeout'));
        }, this.config.connectionTimeout);

        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.setupHeartbeat();
          this.processMessageQueue();
          console.log('Connected to hub');
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', (code, reason) => {
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          console.log(`Connection closed: ${code} - ${reason}`);
          this.emit('disconnected', { code, reason });
          
          if (!this.isDestroyed) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('pong', () => {
          // Heartbeat received
          this.emit('heartbeat');
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: string): void {
    try {
      const message: OutgoingMessage = JSON.parse(data);
      
      switch (message.type) {
        case 'signup':
          this.validatorId = message.data.validatorId;
          console.log(`Registered as validator: ${this.validatorId}`);
          this.emit('registered', message.data);
          break;
          
        case 'validate':
          this.emit('validationRequest', message.data);
          break;
          
        case 'error':
          console.error('Hub error:', message.data.message);
          this.emit('hubError', message.data);
          break;
          
        default:
          console.warn('Unknown message type in message:', message);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
      this.emit('parseError', error);
    }
  }

  /**
   * Setup heartbeat/ping mechanism
   */
  private setupHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.config.pingInterval);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.config.reconnectInterval * this.reconnectAttempts, 30000);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.createConnection();
        this.emit('reconnected');
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(id: string, message: any, maxAttempts: number = 3): void {
    const queuedMessage: QueuedMessage = {
      id,
      data: message,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts
    };

    this.messageQueue.push(queuedMessage);
    this.emit('messageQueued', queuedMessage);
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    const messagesToSend = [...this.messageQueue];
    this.messageQueue = [];

    for (const queuedMessage of messagesToSend) {
      try {
        queuedMessage.attempts++;
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(queuedMessage.data));
          this.emit('queuedMessageSent', queuedMessage);
        } else {
          // Re-queue if connection lost
          if (queuedMessage.attempts < queuedMessage.maxAttempts) {
            this.messageQueue.push(queuedMessage);
          }
        }
      } catch (error) {
        // Re-queue if failed to send
        if (queuedMessage.attempts < queuedMessage.maxAttempts) {
          this.messageQueue.push(queuedMessage);
        } else {
          this.emit('messageDropped', queuedMessage);
        }
      }
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate callback ID
   */
  private generateCallbackId(): string {
    return uuidv7();
  }

  /**
   * Get local IP address
   */
  private async getLocalIP(): Promise<string> {
    // Simple implementation - in production might want to use external service
    return '127.0.0.1'; // Placeholder
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Destroy the client
   */
  destroy(): void {
    this.isDestroyed = true;
    this.cleanup();
    this.removeAllListeners();
  }
}