import chalk from 'chalk';
import * as inquirer from 'inquirer';
import { EventEmitter } from 'events';
import { ConfigManager } from '../config/config-manager.js';
import { KeystoreManager } from '../crypto/keystore.js';
import { SecureMessageSigner, ParanoidMessageSigner } from '../crypto/signer.js';
import { ValidatorWebSocketClient, WebSocketConfig } from '../network/websocket-client.js';
import { WebsiteMonitor, MonitoringRequest, MonitoringResult } from '../monitoring/monitor.js';

export interface ValidatorStats {
  startTime: Date;
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  uptime: number;
  lastValidation?: Date;
  balance?: number;
}

export class ValidatorService extends EventEmitter {
  private configManager: ConfigManager;
  private keystoreManager: KeystoreManager;
  private signer: SecureMessageSigner | ParanoidMessageSigner;
  private websocketClient: ValidatorWebSocketClient | null = null;
  private monitor: WebsiteMonitor;
  private stats: ValidatorStats;
  private isRunning: boolean = false;
  private shutdownInProgress: boolean = false;

  constructor(configManager: ConfigManager) {
    super();
    
    this.configManager = configManager;
    const securityConfig = configManager.getSecurityConfig();
    
    this.keystoreManager = new KeystoreManager(securityConfig.keystoreDir);
    
    if (securityConfig.paranoidMode) {
      this.signer = new ParanoidMessageSigner(securityConfig.keystoreDir);
    } else {
      this.signer = new SecureMessageSigner(securityConfig.keystoreDir);
    }
    
    this.monitor = new WebsiteMonitor(configManager.getMonitoringConfig());
    
    this.stats = {
      startTime: new Date(),
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      uptime: 0
    };
    
    this.setupEventHandlers();
    this.setupGracefulShutdown();
  }

  
  async start(walletName: string): Promise<void> {
    if (this.isRunning) {
      throw new Error('Validator service is already running');
    }

    try {
      console.log(chalk.blue(' Authenticating with wallet...'));
      

      await this.authenticateWallet(walletName);
      
      console.log(chalk.green('Authentication successful'));
      console.log(chalk.blue(' Connecting to hub...'));
      
      await this.initializeWebSocketClient();
      
      console.log(chalk.green('Connected to hub'))
      console.log(chalk.blue('📝 Registering as validator...'));
      
  
      await this.websocketClient!.signup();
      
      this.isRunning = true;
      this.stats.startTime = new Date();
      
      console.log(chalk.green('🚀 Validator service started successfully'));
      console.log(chalk.cyan(`📊 Wallet Address: ${this.signer.getAddress()}`));
      console.log(chalk.cyan(` Hub URL: ${this.configManager.getHubConfig().url}`));
      console.log(chalk.yellow('Press Ctrl+C to stop'));
      
      this.emit('started');
      
  
      this.startUptimeTracking();
      
    } catch (error) {
      this.isRunning = false;
      throw new Error(`Failed to start validator service: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  async stop(): Promise<void> {
    if (!this.isRunning || this.shutdownInProgress) {
      return;
    }

    this.shutdownInProgress = true;
    console.log(chalk.yellow('Stopping validator service...'));

    try {
      if (this.websocketClient) {
        this.websocketClient.disconnect();
        this.websocketClient.destroy();
        this.websocketClient = null;
      }

      
      this.signer.lock();

      
      this.monitor.destroy();

      this.isRunning = false;
      console.log(chalk.green('Validator service stopped'));
      
      this.emit('stopped');
      
    } catch (error) {
      console.error(chalk.red(`Error during shutdown: ${error instanceof Error ? error.message : String(error)}`));
    } finally {
      this.shutdownInProgress = false;
    }
  }

  
  getStatus(): {
    running: boolean;
    stats: ValidatorStats;
    connection?: any;
  } {
    const status: any = {
      running: this.isRunning,
      stats: {
        ...this.stats,
        uptime: this.isRunning ? Date.now() - this.stats.startTime.getTime() : 0
      }
    };

    if (this.websocketClient) {
      status.connection = this.websocketClient.getConnectionStatus();
    }

    return status;
  }

  
  private async authenticateWallet(walletName: string): Promise<void> {
    const keystorePath = this.keystoreManager.getKeystorePath(walletName);

    if (!this.keystoreManager.keystoreExists(walletName)) {
      throw new Error(`Wallet "${walletName}" not found`);
    }

    
    const password = await this.promptPassword('Enter wallet password:');

    
    await this.signer.authenticate(keystorePath, password);
  }

  
  private async initializeWebSocketClient(): Promise<void> {
    const hubConfig = this.configManager.getHubConfig();
    
    const wsConfig: WebSocketConfig = {
      url: hubConfig.url,
      reconnectInterval: hubConfig.reconnectInterval,
      maxReconnectAttempts: hubConfig.maxReconnectAttempts,
      pingInterval: hubConfig.pingInterval,
      connectionTimeout: hubConfig.connectionTimeout
    };

    this.websocketClient = new ValidatorWebSocketClient(wsConfig, this.signer);
    
    
    this.websocketClient.on('connected', () => {
      console.log(chalk.green('Connected to hub'));
    });

    this.websocketClient.on('disconnected', () => {
      console.log(chalk.yellow('🔌 Disconnected from hub'));
    });

    this.websocketClient.on('reconnected', () => {
      console.log(chalk.green('🔄 Reconnected to hub'));
      
    });

    this.websocketClient.on('registered', (data: { validatorId: string }) => {
      console.log(chalk.green(`Registered as validator: ${data.validatorId}`));
    });

    this.websocketClient.on('validationRequest', async (data: { url: string; callbackId: string; monitorId?: string }) => {
      await this.handleValidationRequest(data);
    });

    this.websocketClient.on('hubError', (error: { message: string }) => {
      console.log(chalk.red(`Hub error: ${error.message}`));
    });

    this.websocketClient.on('error', (error: Error) => {
      console.log(chalk.red(`WebSocket error: ${error.message}`));
    });


    await this.websocketClient.connect();
  }

  private async handleValidationRequest(data: { url: string; callbackId: string; monitorId?: string }): Promise<void> {
    try {
      console.log(chalk.blue(`🔍 Validating: ${data.url}`));
      
      const monitoringRequest: MonitoringRequest = {
        url: data.url,
        callbackId: data.callbackId
      };

      const result: MonitoringResult = await this.monitor.monitorWebsite(monitoringRequest);
      
  
      await this.websocketClient!.sendValidationResult({
        callbackId: result.callbackId,
        status: result.status,
        latency: result.latency,
        monitorId: data.monitorId || 'unknown'
      });

      this.updateStats(result);
      
      const statusIcon = result.status === 'GOOD' ? '[GOOD]' : '[BAD]';
        console.log(chalk.gray(`${statusIcon} ${data.url} - ${result.status} (${result.latency.toFixed(2)}ms)`));
      
    } catch (error) {
      console.log(chalk.red(`Validation failed for ${data.url}: ${error instanceof Error ? error.message : String(error)}`));
      
      try {
        await this.websocketClient!.sendValidationResult({
          callbackId: data.callbackId,
          status: 'BAD',
          latency: 0,
          monitorId: data.monitorId || 'unknown'
        });
      } catch (sendError) {
        console.log(chalk.red(`Failed to send error result: ${sendError instanceof Error ? sendError.message : String(sendError)}`) );
      }
      
      this.stats.failedValidations++;
    }
  }
  private updateStats(result: MonitoringResult): void {
    this.stats.totalValidations++;
    this.stats.lastValidation = new Date();
    
    if (result.status === 'GOOD') {
      this.stats.successfulValidations++;
    } else {
      this.stats.failedValidations++;
    }
  }
  private setupEventHandlers(): void {
    this.monitor.on('monitoringComplete', (result: MonitoringResult) => {
      this.emit('validationComplete', result);
    });
  }

  private setupGracefulShutdown(): void {
    process.on('SIGINT', async () => {
      chalk.yellow('\nReceived SIGINT, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
        chalk.yellow('\nReceived SIGTERM, shutting down gracefully...');
      await this.stop();
      process.exit(0);
    });
  }
  private startUptimeTracking(): void {
    setInterval(() => {
      if (this.isRunning) {
        const status = this.getStatus();
        
        if (status.stats.uptime % (5 * 60 * 1000) < 1000) {
          chalk.gray(
            `📊 Uptime: ${this.formatUptime(status.stats.uptime)} | ` +
            `Validations: ${this.stats.totalValidations} | ` +
            `Success Rate: ${this.getSuccessRate()}%`
          );
        }
      }
    }, 1000);
  }

  private formatUptime(uptime: number): string {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  private getSuccessRate(): number {
    if (this.stats.totalValidations === 0) return 100;
    return Math.round((this.stats.successfulValidations / this.stats.totalValidations) * 100);
  }

  
  private async promptPassword(message: string): Promise<string> {
    const { password } = await inquirer.default.prompt([
      {
        type: 'password',
        name: 'password',
        message,
        validate: (input: string) => input.length > 0 || 'Password is required'
      }
    ]);
    return password;
  }

  
  destroy(): void {
    this.removeAllListeners();
    if (this.websocketClient) {
      this.websocketClient.destroy();
    }
    this.monitor.destroy();
    this.signer.destroy();
  }
}