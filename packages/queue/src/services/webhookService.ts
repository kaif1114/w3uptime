import axios from 'axios';
import { NotificationResult } from '../types';

export interface WebhookPayload {
  event: 'incident.created' | 'incident.escalated' | 'incident.resolved';
  timestamp: string;
  monitor: {
    id: string;
    name: string;
    url: string;
  };
  incident?: {
    id?: string;
    title: string;
    severity: string;
    escalationLevel?: number;
  };
  recovery?: {
    recoveryTime: string;
    downtimeDuration?: string;
  };
  customMessage?: string;
}

class WebhookService {
  async sendWebhook(urls: string[], payload: WebhookPayload): Promise<NotificationResult> {
    const sentTo: string[] = [];
    const errors: string[] = [];

    for (const url of urls) {
      try {
        if (!this.isValidUrl(url)) {
          errors.push(`Invalid webhook URL: ${url}`);
          continue;
        }

        const response = await axios.post(url, payload, {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'W3Uptime-Webhook/1.0',
          },
        });

        if (response.status >= 200 && response.status < 300) {
          sentTo.push(url);
          console.log(`🔗 Webhook sent to ${url}: ${response.status}`);
        } else {
          errors.push(`Webhook ${url} returned status ${response.status}`);
        }
      } catch (error) {
        let errorMessage = 'Unknown error';
        
        if (axios.isAxiosError(error)) {
          if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
          } else if (error.request) {
            errorMessage = 'No response received (timeout or connection error)';
          } else {
            errorMessage = error.message;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        errors.push(`Failed to send to ${url}: ${errorMessage}`);
        console.error(`❌ Failed to send webhook to ${url}:`, error);
      }
    }

    return {
      success: sentTo.length > 0,
      sentTo,
      errors
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

// Webhook payload generators
export const createIncidentWebhookPayload = (
  monitorId: string,
  monitorName: string,
  monitorUrl: string,
  incidentId: string | undefined,
  incidentTitle: string,
  severity: string,
  timestamp: Date,
  levelOrder?: number,
  customMessage?: string
): WebhookPayload => ({
  event: levelOrder && levelOrder > 1 ? 'incident.escalated' : 'incident.created',
  timestamp: timestamp.toISOString(),
  monitor: {
    id: monitorId,
    name: monitorName,
    url: monitorUrl,
  },
  incident: {
    id: incidentId,
    title: incidentTitle,
    severity,
    escalationLevel: levelOrder,
  },
  customMessage,
});

export const createRecoveryWebhookPayload = (
  monitorId: string,
  monitorName: string,
  monitorUrl: string,
  recoveryTime: Date,
  downtimeDuration?: string
): WebhookPayload => ({
  event: 'incident.resolved',
  timestamp: recoveryTime.toISOString(),
  monitor: {
    id: monitorId,
    name: monitorName,
    url: monitorUrl,
  },
  recovery: {
    recoveryTime: recoveryTime.toISOString(),
    downtimeDuration,
  },
});

export default new WebhookService();

