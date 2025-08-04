import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface ValidatorConfig {
  // Hub connection settings
  hub: {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
    pingInterval: number;
    connectionTimeout: number;
  };
  
  // Security settings
  security: {
    sessionTimeoutMinutes: number;
    keystoreDir: string;
    paranoidMode: boolean;
    secureMemory: boolean;
  };
  
  // Monitoring settings
  monitoring: {
    defaultTimeout: number;
    maxConcurrentRequests: number;
    retryAttempts: number;
    retryDelay: number;
    userAgent: string;
  };
  
  // Logging settings
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    file?: string;
    maxFileSize: string;
    maxFiles: number;
  };
  
  // Validator settings
  validator: {
    defaultWallet?: string;
    autoReconnect: boolean;
    reportInterval: number;
  };
}

export class ConfigManager {
  private configPath: string;
  private config: ValidatorConfig;
  private readonly defaultConfig: ValidatorConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
    
    this.defaultConfig = {
      hub: {
        url: 'ws://localhost:8080',
        reconnectInterval: 5000,
        maxReconnectAttempts: 10,
        pingInterval: 30000,
        connectionTimeout: 10000
      },
      security: {
        sessionTimeoutMinutes: 30,
        keystoreDir: path.join(this.getConfigDir(), 'keystore'),
        paranoidMode: false,
        secureMemory: true
      },
      monitoring: {
        defaultTimeout: 30000,
        maxConcurrentRequests: 10,
        retryAttempts: 2,
        retryDelay: 1000,
        userAgent: 'W3Uptime-Validator/1.0'
      },
      logging: {
        level: 'info',
        maxFileSize: '10MB',
        maxFiles: 5
      },
      validator: {
        autoReconnect: true,
        reportInterval: 60000
      }
    };

    this.config = { ...this.defaultConfig };
  }

  /**
   * Load configuration from file
   */
  async loadConfig(): Promise<ValidatorConfig> {
    try {
      if (await fs.pathExists(this.configPath)) {
        const configData = await fs.readJson(this.configPath);
        this.config = this.mergeConfig(this.defaultConfig, configData);
        this.validateConfig();
      } else {
        // Create default config file
        await this.saveConfig();
      }
    } catch (error) {
      console.warn(`Failed to load config from ${this.configPath}: ${error instanceof Error ? error.message : String(error)}`);
      console.warn('Using default configuration');
      this.config = { ...this.defaultConfig };
    }

    return this.config;
  }

  /**
   * Save configuration to file
   */
  async saveConfig(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, this.config, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save config to ${this.configPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ValidatorConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ValidatorConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.validateConfig();
  }

  /**
   * Get specific configuration section
   */
  getHubConfig() {
    return this.config.hub;
  }

  getSecurityConfig() {
    return this.config.security;
  }

  getMonitoringConfig() {
    return this.config.monitoring;
  }

  getLoggingConfig() {
    return this.config.logging;
  }

  getValidatorConfig() {
    return this.config.validator;
  }

  /**
   * Set hub URL
   */
  setHubUrl(url: string): void {
    this.config.hub.url = url;
  }

  /**
   * Set default wallet
   */
  setDefaultWallet(walletName: string): void {
    this.config.validator.defaultWallet = walletName;
  }

  /**
   * Enable/disable paranoid mode
   */
  setParanoidMode(enabled: boolean): void {
    this.config.security.paranoidMode = enabled;
  }

  /**
   * Set session timeout
   */
  setSessionTimeout(minutes: number): void {
    if (minutes < 5 || minutes > 480) { // 5 minutes to 8 hours
      throw new Error('Session timeout must be between 5 and 480 minutes');
    }
    this.config.security.sessionTimeoutMinutes = minutes;
  }

  /**
   * Set logging level
   */
  setLoggingLevel(level: 'error' | 'warn' | 'info' | 'debug'): void {
    this.config.logging.level = level;
  }

  /**
   * Get configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * Get configuration directory
   */
  getConfigDir(): string {
    return path.dirname(this.configPath);
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...this.defaultConfig };
  }

  /**
   * Export configuration for sharing (without sensitive data)
   */
  exportConfig(): Partial<ValidatorConfig> {
    const exportConfig = { ...this.config };
    
    // Remove sensitive information
    if (exportConfig.validator) {
      delete exportConfig.validator.defaultWallet;
    }
    
    return exportConfig;
  }

  /**
   * Import configuration from another source
   */
  importConfig(importedConfig: Partial<ValidatorConfig>): void {
    // Don't import sensitive data
    const safeConfig = { ...importedConfig };
    if (safeConfig.validator?.defaultWallet) {
      delete safeConfig.validator.defaultWallet;
    }
    
    this.config = this.mergeConfig(this.config, safeConfig);
    this.validateConfig();
  }

  /**
   * Get default configuration path
   */
  private getDefaultConfigPath(): string {
    const configDir = path.join(os.homedir(), '.w3uptime');
    return path.join(configDir, 'validator-config.json');
  }

  /**
   * Deep merge configuration objects
   */
  private mergeConfig(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeConfig(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Validate configuration values
   */
  private validateConfig(): void {
    // Validate hub URL
    try {
      new URL(this.config.hub.url);
    } catch {
      throw new Error('Invalid hub URL format');
    }

    // Validate timeout values
    if (this.config.hub.connectionTimeout < 1000 || this.config.hub.connectionTimeout > 60000) {
      throw new Error('Connection timeout must be between 1 and 60 seconds');
    }

    if (this.config.monitoring.defaultTimeout < 1000) {
      throw new Error('Monitoring timeout must be at least 1 second');
    }

    // Validate session timeout
    if (this.config.security.sessionTimeoutMinutes < 5 || this.config.security.sessionTimeoutMinutes > 480) {
      throw new Error('Session timeout must be between 5 and 480 minutes');
    }

    // Validate monitoring settings
    if (this.config.monitoring.maxConcurrentRequests < 1 || this.config.monitoring.maxConcurrentRequests > 100) {
      throw new Error('Max concurrent requests must be between 1 and 100');
    }

    // Ensure directories exist
    fs.ensureDirSync(this.config.security.keystoreDir);
  }
}

/**
 * Environment variable configuration loader
 */
export class EnvironmentConfigLoader {
  /**
   * Load configuration from environment variables
   */
  static loadFromEnvironment(): Partial<ValidatorConfig> {
    const config: Partial<ValidatorConfig> = {};

    // Hub settings
    if (process.env.W3UPTIME_HUB_URL) {
      config.hub = {
        url: process.env.W3UPTIME_HUB_URL,
        reconnectInterval: 5000,
        maxReconnectAttempts: 10,
        pingInterval: 30000,
        connectionTimeout: 10000
      };
    }

    // Security settings
    if (process.env.W3UPTIME_SESSION_TIMEOUT) {
      const timeout = parseInt(process.env.W3UPTIME_SESSION_TIMEOUT);
      if (!isNaN(timeout)) {
        config.security = {
          sessionTimeoutMinutes: timeout,
          keystoreDir: path.join(process.cwd(), '.w3uptime', 'keystore'),
          paranoidMode: false,
          secureMemory: true
        };
      }
    }

    if (process.env.W3UPTIME_PARANOID_MODE === 'true') {
      config.security = {
        sessionTimeoutMinutes: 30,
        keystoreDir: path.join(process.cwd(), '.w3uptime', 'keystore'),
        paranoidMode: true,
        secureMemory: true
      };
    }

    // Logging settings
    if (process.env.W3UPTIME_LOG_LEVEL) {
      const level = process.env.W3UPTIME_LOG_LEVEL as any;
      if (['error', 'warn', 'info', 'debug'].includes(level)) {
        config.logging = {
          level,
          maxFileSize: '10MB',
          maxFiles: 5
        };
      }
    }

    if (process.env.W3UPTIME_LOG_FILE) {
      config.logging = {
        level: 'info',
        file: process.env.W3UPTIME_LOG_FILE,
        maxFileSize: '10MB',
        maxFiles: 5
      };
    }

    return config;
  }
}