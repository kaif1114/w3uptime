import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EventEmitter } from 'events';

export interface MonitoringRequest {
  url: string;
  callbackId: string;
  expectedStatusCodes?: number[];
  timeout?: number;
  method?: 'GET' | 'POST' | 'HEAD';
  headers?: Record<string, string>;
}

export interface MonitoringResult {
  callbackId: string;
  url: string;
  status: 'GOOD' | 'BAD';
  latency: number;
  httpStatus?: number;
  error?: string;
  timestamp: number;
}

export interface MonitoringConfig {
  defaultTimeout: number;
  userAgent: string;
  maxConcurrentRequests: number;
  retryAttempts: number;
  retryDelay: number;
}

export class WebsiteMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private activeRequests: Set<string> = new Set();
  private requestQueue: MonitoringRequest[] = [];
  private isProcessing: boolean = false;

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    
    this.config = {
      defaultTimeout: 30000, // 30 seconds
      userAgent: 'W3Uptime-Validator/1.0',
      maxConcurrentRequests: 10,
      retryAttempts: 2,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Monitor a single website
   */
  async monitorWebsite(request: MonitoringRequest): Promise<MonitoringResult> {
    const startTime = process.hrtime.bigint();
    
    try {
      // Validate URL
      this.validateUrl(request.url);
      
      // Perform HTTP request
      const response = await this.performHttpRequest(request);
      const latency = this.calculateLatency(startTime);
      
      // Determine if result is good or bad
      const isGood = this.isStatusGood(response.status, request.expectedStatusCodes);
      
      const result: MonitoringResult = {
        callbackId: request.callbackId,
        url: request.url,
        status: isGood ? 'GOOD' : 'BAD',
        latency,
        httpStatus: response.status,
        timestamp: Date.now()
      };

      this.emit('monitoringComplete', result);
      return result;
      
    } catch (error) {
      const latency = this.calculateLatency(startTime);
      
      const result: MonitoringResult = {
        callbackId: request.callbackId,
        url: request.url,
        status: 'BAD',
        latency,
        error: error.message,
        timestamp: Date.now()
      };

      this.emit('monitoringComplete', result);
      return result;
    }
  }

  /**
   * Queue monitoring request
   */
  queueMonitoringRequest(request: MonitoringRequest): void {
    this.requestQueue.push(request);
    this.processQueue();
  }

  /**
   * Monitor multiple websites concurrently
   */
  async monitorMultipleWebsites(requests: MonitoringRequest[]): Promise<MonitoringResult[]> {
    const promises = requests.map(request => this.monitorWebsite(request));
    return Promise.allSettled(promises).then(results => 
      results.map(result => 
        result.status === 'fulfilled' ? result.value : this.createErrorResult(requests[0], 'Request failed')
      )
    );
  }

  /**
   * Get monitoring statistics
   */
  getStatistics(): {
    activeRequests: number;
    queuedRequests: number;
    totalProcessed: number;
  } {
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.requestQueue.length,
      totalProcessed: 0 // Would need to track this
    };
  }

  /**
   * Validate URL format
   */
  private validateUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('URL must use HTTP or HTTPS protocol');
      }
    } catch (error) {
      throw new Error(`Invalid URL format: ${error.message}`);
    }
  }

  /**
   * Perform HTTP request with retry logic
   */
  private async performHttpRequest(request: MonitoringRequest): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {
      url: request.url,
      method: request.method || 'GET',
      timeout: request.timeout || this.config.defaultTimeout,
      headers: {
        'User-Agent': this.config.userAgent,
        ...request.headers
      },
      validateStatus: () => true, // Don't throw on any status code
      maxRedirects: 5,
      // Security settings
      maxContentLength: 10 * 1024 * 1024, // 10MB max response size
      decompress: true
    };

    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await axios(config);
        return response;
      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Check if HTTP status is considered good
   */
  private isStatusGood(status: number, expectedStatusCodes?: number[]): boolean {
    const defaultGoodCodes = [200, 201, 202, 204];
    const expectedCodes = expectedStatusCodes || defaultGoodCodes;
    return expectedCodes.includes(status);
  }

  /**
   * Calculate latency in milliseconds
   */
  private calculateLatency(startTime: bigint): number {
    const endTime = process.hrtime.bigint();
    const latencyNs = endTime - startTime;
    return Number(latencyNs) / 1_000_000; // Convert to milliseconds
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeRequests.size >= this.config.maxConcurrentRequests) {
      return;
    }

    this.isProcessing = true;

    while (
      this.requestQueue.length > 0 && 
      this.activeRequests.size < this.config.maxConcurrentRequests
    ) {
      const request = this.requestQueue.shift()!;
      this.activeRequests.add(request.callbackId);

      // Process request asynchronously
      this.monitorWebsite(request)
        .finally(() => {
          this.activeRequests.delete(request.callbackId);
          // Continue processing queue
          this.processQueue();
        });
    }

    this.isProcessing = false;
  }

  /**
   * Create error result
   */
  private createErrorResult(request: MonitoringRequest, error: string): MonitoringResult {
    return {
      callbackId: request.callbackId,
      url: request.url,
      status: 'BAD',
      latency: 0,
      error,
      timestamp: Date.now()
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.requestQueue = [];
    this.activeRequests.clear();
  }
}

/**
 * Advanced monitoring with additional checks
 */
export class AdvancedWebsiteMonitor extends WebsiteMonitor {
  /**
   * Monitor with content validation
   */
  async monitorWithContentCheck(
    request: MonitoringRequest & { 
      expectedContent?: string;
      contentRegex?: string;
    }
  ): Promise<MonitoringResult> {
    const result = await this.monitorWebsite(request);
    
    // If basic check passed and we have content validation
    if (result.status === 'GOOD' && (request.expectedContent || request.contentRegex)) {
      try {
        const response = await axios.get(request.url, {
          timeout: this.config.defaultTimeout,
          maxContentLength: 1024 * 1024 // 1MB for content check
        });

        let contentValid = true;

        if (request.expectedContent) {
          contentValid = response.data.includes(request.expectedContent);
        }

        if (request.contentRegex && contentValid) {
          const regex = new RegExp(request.contentRegex);
          contentValid = regex.test(response.data);
        }

        if (!contentValid) {
          result.status = 'BAD';
          result.error = 'Content validation failed';
        }

      } catch (error) {
        result.status = 'BAD';
        result.error = `Content check failed: ${error.message}`;
      }
    }

    return result;
  }

  /**
   * Monitor with SSL certificate validation
   */
  async monitorWithSSLCheck(request: MonitoringRequest): Promise<MonitoringResult> {
    const result = await this.monitorWebsite(request);
    
    if (result.status === 'GOOD' && request.url.startsWith('https://')) {
      // SSL certificate validation would go here
      // This is a simplified implementation
      try {
        const url = new URL(request.url);
        // In a real implementation, you would check certificate validity,
        // expiration, trust chain, etc.
        console.log(`SSL check for ${url.hostname} - placeholder implementation`);
      } catch (error) {
        result.status = 'BAD';
        result.error = `SSL check failed: ${error.message}`;
      }
    }

    return result;
  }
}