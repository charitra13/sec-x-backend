interface CORSAlert {
  id: string;
  timestamp: string;
  type: 'VIOLATION' | 'SUSPICIOUS' | 'BLOCKED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  origin: string;
  ip: string;
  userAgent: string;
  details: Record<string, any>;
}

class CORSAlertSystem {
  private alerts: CORSAlert[] = [];
  private readonly maxAlerts = 1000; // Keep last 1000 alerts in memory
  private violationCounts = new Map<string, number>();
  private readonly alertThresholds = {
    LOW: 5,      // 5 violations per hour
    MEDIUM: 10,  // 10 violations per hour
    HIGH: 20,    // 20 violations per hour
    CRITICAL: 50 // 50 violations per hour
  };

  generateAlert(
    type: CORSAlert['type'],
    origin: string,
    ip: string,
    userAgent: string,
    details: Record<string, any> = {}
  ): CORSAlert {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Count violations by origin
    const key = `${origin}-${ip}`;
    const currentCount = this.violationCounts.get(key) || 0;
    this.violationCounts.set(key, currentCount + 1);
    
    // Determine severity based on frequency
    let severity: CORSAlert['severity'] = 'LOW';
    if (currentCount >= this.alertThresholds.CRITICAL) severity = 'CRITICAL';
    else if (currentCount >= this.alertThresholds.HIGH) severity = 'HIGH';
    else if (currentCount >= this.alertThresholds.MEDIUM) severity = 'MEDIUM';
    
    const alert: CORSAlert = {
      id,
      timestamp,
      type,
      severity,
      origin,
      ip,
      userAgent: userAgent.substring(0, 200), // Truncate long user agents
      details: {
        ...details,
        violationCount: currentCount + 1
      }
    };

    this.alerts.unshift(alert); // Add to beginning
    
    // Maintain max alerts limit
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }

    // Log alert
    this.logAlert(alert);
    
    // Send to external monitoring if configured
    this.sendToMonitoring(alert);
    
    return alert;
  }

  private logAlert(alert: CORSAlert) {
    const logLevel = alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'error' : 'warn';
    const emoji = {
      'VIOLATION': '🚨',
      'SUSPICIOUS': '⚠️',
      'BLOCKED': '🛡️'
    }[alert.type];

    console[logLevel](`${emoji} CORS Alert [${alert.severity}]:`, {
      id: alert.id,
      type: alert.type,
      origin: alert.origin,
      ip: alert.ip,
      violationCount: alert.details.violationCount,
      timestamp: alert.timestamp
    });
  }

  private async sendToMonitoring(_alert: CORSAlert) {
    if (process.env.NODE_ENV === 'production' && process.env.MONITORING_WEBHOOK_URL) {
      try {
        // Example: Send to Slack, Discord, or monitoring service
        // await fetch(process.env.MONITORING_WEBHOOK_URL, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({
        //     text: `CORS Alert: ${_alert.type} from ${_alert.origin}`,
        //     severity: _alert.severity,
        //     details: _alert
        //   })
        // });
      } catch (error) {
        console.error('Failed to send alert to monitoring:', error);
      }
    }
  }

  getRecentAlerts(limit: number = 50): CORSAlert[] {
    return this.alerts.slice(0, limit);
  }

  getAlertStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentAlerts = this.alerts.filter(
      alert => now - new Date(alert.timestamp).getTime() < oneHour
    );

    return {
      total: this.alerts.length,
      lastHour: recentAlerts.length,
      bySeverity: {
        CRITICAL: recentAlerts.filter(a => a.severity === 'CRITICAL').length,
        HIGH: recentAlerts.filter(a => a.severity === 'HIGH').length,
        MEDIUM: recentAlerts.filter(a => a.severity === 'MEDIUM').length,
        LOW: recentAlerts.filter(a => a.severity === 'LOW').length
      },
      topOrigins: this.getTopViolatingOrigins(recentAlerts)
    };
  }

  private getTopViolatingOrigins(alerts: CORSAlert[]): Array<{origin: string, count: number}> {
    const originCounts = new Map<string, number>();
    alerts.forEach(alert => {
      const count = originCounts.get(alert.origin) || 0;
      originCounts.set(alert.origin, count + 1);
    });

    return Array.from(originCounts.entries())
      .map(([origin, count]) => ({ origin, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  // Clean up old violation counts (call periodically)
  cleanupOldCounts() {
    // Reset violation counts every hour
    this.violationCounts.clear();
  }
}

export const corsAlertSystem = new CORSAlertSystem();

// Cleanup old counts every hour
setInterval(() => {
  corsAlertSystem.cleanupOldCounts();
}, 60 * 60 * 1000); 