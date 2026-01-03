/**
 * Qoda Logging Service
 * =============================================================================
 * Structured logging utility for production and development environments.
 * Provides different log levels, structured data, and proper formatting.
 * =============================================================================
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  data?: Record<string, unknown>;
  error?: Error;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';

    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LogLevel) {
      this.level = LogLevel[envLevel as keyof typeof LogLevel];
    } else if (this.isDevelopment) {
      this.level = LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, levelName, message } = entry;

    if (this.isDevelopment) {
      // Simple format for development
      return `${timestamp} ${levelName}: ${message}`;
    } else {
      // Structured JSON format for production
      return JSON.stringify(entry);
    }
  }

  private createEntry(
    level: LogLevel,
    levelName: string,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      levelName,
      message,
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      } : undefined,
    };
  }

  private log(level: LogLevel, levelName: string, message: string, data?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createEntry(level, levelName, message, data, error);
    const formattedMessage = this.formatMessage(entry);

    // Output based on level
    switch (level) {
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage);
        break;
    }

    // In production, you might want to send to external logging service
    if (!this.isDevelopment && level >= LogLevel.ERROR) {
      // TODO: Send to external logging service (e.g., Datadog, LogRocket, Sentry)
      // await sendToLoggingService(entry);
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  warn(message: string, data?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.WARN, 'WARN', message, data, error);
  }

  error(message: string, data?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data, error);
  }

  fatal(message: string, data?: Record<string, unknown>, error?: Error): void {
    this.log(LogLevel.FATAL, 'FATAL', message, data, error);
  }

  // Specialized logging methods for common patterns
  apiRequest(method: string, path: string, statusCode: number, duration?: number, userId?: string): void {
    this.info(`API ${method} ${path}`, {
      method,
      path,
      statusCode,
      duration,
      userId,
      category: 'api_request'
    });
  }

  webhookReceived(eventType: string, eventId: string, processed: boolean): void {
    this.info(`Webhook ${eventType} ${processed ? 'processed' : 'received'}`, {
      eventType,
      eventId,
      processed,
      category: 'webhook'
    });
  }

  databaseQuery(operation: string, table: string, duration?: number, error?: Error): void {
    const logger = error ? this.error : this.debug;

    logger(`${operation} on ${table}`, {
      operation,
      table,
      duration,
      category: 'database'
    }, error);
  }

  authEvent(event: string, userId?: string, error?: Error): void {
    const logger = error ? this.warn : this.info;

    logger(`Auth ${event}`, {
      event,
      userId,
      category: 'auth'
    }, error);
  }

  financialEvent(event: string, amount?: bigint, agentId?: string, error?: Error): void {
    const logger = error ? this.error : this.info;

    logger(`Financial ${event}`, {
      event,
      amount: amount?.toString(),
      agentId,
      category: 'financial'
    }, error);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in other files
export type { LogEntry };
