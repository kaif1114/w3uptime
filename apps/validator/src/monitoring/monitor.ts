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
      defaultTimeout: 30000, 
      userAgent: 'W3Uptime-Validator/1.0',
      maxConcurrentRequests: 10,
      retryAttempts: 2,
      retryDelay: 1000,
      ...config
    };
  }

  
  async monitorWebsite(request: MonitoringRequest): Promise<MonitoringResult> {
    const startTime = process.hrtime.bigint();
    
    try {
      
      this.validateUrl(request.url);
      
      
      const response = await this.performHttpRequest(request);
      const latency = this.calculateLatency(startTime);
      
      
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
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };

      this.emit('monitoringComplete', result);
      return result;
    }
  }

  
  queueMonitoringRequest(request: MonitoringRequest): void {
    this.requestQueue.push(request);
    this.processQueue();
  }

  
  async monitorMultipleWebsites(requests: MonitoringRequest[]): Promise<MonitoringResult[]> {
    const promises = requests.map(request => this.monitorWebsite(request));
    return Promise.allSettled(promises).then(results => 
      results.map(result => 
        result.status === 'fulfilled' ? result.value : this.createErrorResult(requests[0], 'Request failed')
      )
    );
  }

  
  getStatistics(): {
    activeRequests: number;
    queuedRequests: number;
    totalProcessed: number;
  } {
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.requestQueue.length,
      totalProcessed: 0 
    };
  }

  
  private validateUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('URL must use HTTP or HTTPS protocol');
      }
    } catch (error) {
      throw new Error(`Invalid URL format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  
  private async performHttpRequest(request: MonitoringRequest): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {
      url: request.url,
      method: request.method || 'GET',
      timeout: request.timeout || this.config.defaultTimeout,
      headers: {
        'User-Agent': this.config.userAgent,
        ...request.headers
      },
      validateStatus: () => true, 
      maxRedirects: 5,
      
      maxContentLength: 10 * 1024 * 1024, 
      decompress: true
    };

    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await axios(config);
        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError!;
  }

  
  private isStatusGood(status: number, expectedStatusCodes?: number[]): boolean {
    const defaultGoodCodes = [200, 201, 202, 204];
    const expectedCodes = expectedStatusCodes || defaultGoodCodes;
    return expectedCodes.includes(status);
  }

  
  private calculateLatency(startTime: bigint): number {
    const endTime = process.hrtime.bigint();
    const latencyNs = endTime - startTime;
    return Number(latencyNs) / 1_000_000; 
  }

  
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

      
      this.monitorWebsite(request)
        .finally(() => {
          this.activeRequests.delete(request.callbackId);
          
          this.processQueue();
        });
    }

    this.isProcessing = false;
  }

  
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

  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  
  destroy(): void {
    this.removeAllListeners();
    this.requestQueue = [];
    this.activeRequests.clear();
  }
}


export class AdvancedWebsiteMonitor extends WebsiteMonitor {
  
  async monitorWithContentCheck(
    request: MonitoringRequest & { 
      expectedContent?: string;
      contentRegex?: string;
    }
  ): Promise<MonitoringResult> {
    const result = await this.monitorWebsite(request);
    
    
    if (result.status === 'GOOD' && (request.expectedContent || request.contentRegex)) {
      try {
        const response = await axios.get(request.url, {
          timeout: 30000,
          maxContentLength: 1024 * 1024 
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
        result.error = `Content check failed: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return result;
  }

  
  async monitorWithSSLCheck(request: MonitoringRequest): Promise<MonitoringResult> {
    const result = await this.monitorWebsite(request);
    
    if (result.status === 'GOOD' && request.url.startsWith('https://')) {
      
      
      try {
        const url = new URL(request.url);
        
        
        console.log(`SSL check for ${url.hostname} - placeholder implementation`);
      } catch (error) {
        result.status = 'BAD';
        result.error = `SSL check failed: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return result;
  }
}