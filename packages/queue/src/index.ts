export * from './types';
export * from './config';
export * from './connection';
export * from './queues';
export * from './workers';
export { setPrismaInstance } from './workers';

// Services
export { default as emailService } from './services/emailService';
export { default as slackService } from './services/slackService';
export { default as webhookService } from './services/webhookService';

// Main alert system interface
export class AlertSystem {
  private static instance: AlertSystem;
  
  private constructor() {}

  static getInstance(): AlertSystem {
    if (!AlertSystem.instance) {
      AlertSystem.instance = new AlertSystem();
    }
    return AlertSystem.instance;
  }

  async initialize(prismaInstance?: any): Promise<void> {
    const { validateConfig } = await import('./config');
    const { workerManager, setPrismaInstance } = await import('./workers');
    
    console.log('🚀 Initializing W3Uptime Alert System...');
    
    // Set prisma instance if provided
    if (prismaInstance) {
      setPrismaInstance(prismaInstance);
    }
    
    // Validate configuration
    validateConfig();
    
    // Start workers
    workerManager.start();
    
    console.log('✅ Alert System initialized successfully');
  }

  async shutdown(): Promise<void> {
    const { workerManager } = await import('./workers');
    const { queueManager } = await import('./queues');
    const { closeRedisConnection } = await import('./connection');
    
    console.log('🛑 Shutting down Alert System...');
    
    // Stop workers
    await workerManager.stop();
    
    // Close queues
    await queueManager.closeAll();
    
    // Close Redis connection
    await closeRedisConnection();
    
    console.log('✅ Alert System shutdown complete');
  }

  async triggerIncidentAlert(data: {
    alertId: string;
    incidentId?: string;
    monitorId: string;
    monitorName: string;
    monitorUrl: string;
    incidentTitle: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    userId: string; // Added to support user-specific integrations
    escalationLevels: Array<{
      id: string;
      levelOrder: number;
      waitMinutes: number;
      contacts: string[];
      channel: 'EMAIL' | 'SLACK' | 'WEBHOOK';
      name?: string;
      message?: string;
    }>;
  }): Promise<void> {
    const { queueManager } = await import('./queues');
    
    if (data.escalationLevels.length === 0) {
      console.warn(`No escalation levels configured for monitor: ${data.monitorName}`);
      return;
    }

    const timestamp = new Date();
    const firstLevel = data.escalationLevels[0];
    
    // Process first level immediately
    await queueManager.addImmediateAlert({
      alertId: data.alertId,
      incidentId: data.incidentId,
      monitorId: data.monitorId,
      monitorName: data.monitorName,
      monitorUrl: data.monitorUrl,
      escalationLevelId: firstLevel.id,
      levelOrder: firstLevel.levelOrder,
      channel: firstLevel.channel,
      contacts: firstLevel.contacts,
      message: firstLevel.message,
      incidentTitle: data.incidentTitle,
      severity: data.severity,
      timestamp,
      userId: data.userId,
    });

    // Schedule remaining levels
    if (data.escalationLevels.length > 1) {
      const secondLevel = data.escalationLevels[1];
      await queueManager.addDelayedEscalation({
        alertId: data.alertId,
        incidentId: data.incidentId,
        monitorId: data.monitorId,
        monitorName: data.monitorName,
        monitorUrl: data.monitorUrl,
        escalationLevelId: secondLevel.id,
        levelOrder: secondLevel.levelOrder,
        channel: secondLevel.channel,
        contacts: secondLevel.contacts,
        message: secondLevel.message,
        incidentTitle: data.incidentTitle,
        severity: data.severity,
        timestamp,
        waitMinutes: secondLevel.waitMinutes,
        remainingLevels: data.escalationLevels.slice(2),
        userId: data.userId,
      });
    }

    console.log(`🚨 Triggered incident alert for ${data.monitorName} with ${data.escalationLevels.length} levels`);
  }

  async stopEscalation(monitorId: string): Promise<void> {
    const { queueManager } = await import('./queues');
    
    await queueManager.cancelDelayedEscalations(monitorId);
    console.log(`🛑 Stopped escalation for monitor: ${monitorId}`);
  }

  async sendRecoveryNotification(data: {
    monitorId: string;
    monitorName: string;
    monitorUrl: string;
    recoveryTime: Date;
    notifiedContacts: string[];
  }): Promise<void> {
    const { queueManager } = await import('./queues');
    
    await queueManager.addRecoveryNotification(data);
    console.log(`🎉 Queued recovery notification for ${data.monitorName}`);
  }

  async getSystemStats(): Promise<any> {
    const { queueManager } = await import('./queues');
    
    return await queueManager.getQueueStats();
  }

  async cleanupSystem(): Promise<void> {
    const { queueManager } = await import('./queues');
    
    await queueManager.cleanupQueues();
  }
}

// Export singleton instance
export const alertSystem = AlertSystem.getInstance();
