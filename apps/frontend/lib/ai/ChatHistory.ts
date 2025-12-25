import { redis } from '@/lib/queue';
import { StoredConversation, Message } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

const CHAT_PREFIX = 'chat:conversation:';
const DEFAULT_TTL_DAYS = parseInt(process.env.CHAT_HISTORY_TTL_DAYS || '7');
const MAX_MESSAGES = 50; // Keep last 50 messages for context

export class ChatHistoryManager {
  private getTTLSeconds(): number {
    return DEFAULT_TTL_DAYS * 24 * 60 * 60;
  }

  private getKey(userId: string, conversationId: string): string {
    return `${CHAT_PREFIX}${userId}:${conversationId}`;
  }

  async createConversation(userId: string): Promise<string> {
    const conversationId = uuidv4();
    const conversation: StoredConversation = {
      conversationId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    const key = this.getKey(userId, conversationId);
    await redis.set(key, JSON.stringify(conversation), 'EX', this.getTTLSeconds());
    return conversationId;
  }

  async loadConversation(userId: string, conversationId: string): Promise<StoredConversation | null> {
    const key = this.getKey(userId, conversationId);
    const data = await redis.get(key);

    if (!data) return null;

    return JSON.parse(data) as StoredConversation;
  }

  async saveConversation(conversation: StoredConversation): Promise<void> {
    const key = this.getKey(conversation.userId, conversation.conversationId);
    conversation.updatedAt = new Date().toISOString();

    // Truncate to last MAX_MESSAGES to control memory
    if (conversation.messages.length > MAX_MESSAGES) {
      conversation.messages = conversation.messages.slice(-MAX_MESSAGES);
    }

    await redis.set(key, JSON.stringify(conversation), 'EX', this.getTTLSeconds());
  }

  async appendMessage(userId: string, conversationId: string, message: Message): Promise<void> {
    const conversation = await this.loadConversation(userId, conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.messages.push(message);
    await this.saveConversation(conversation);
  }

  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    const key = this.getKey(userId, conversationId);
    await redis.del(key);
  }
}

export const chatHistory = new ChatHistoryManager();
