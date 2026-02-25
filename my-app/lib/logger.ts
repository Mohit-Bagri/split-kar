/**
 * @file lib/logger.ts
 * @description Client-side logging and audit system
 * @author SplitKar Team
 * @created 2026-02-24
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 
  | 'parser' 
  | 'settlement' 
  | 'transaction' 
  | 'participant' 
  | 'validation' 
  | 'ui';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  subscribe(listener: (logs: LogEntry[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.logs]);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ) {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
    };

    this.addLog(entry);

    // Also log to console for development
    const consoleMethod = level === 'error' ? console.error :
                          level === 'warn' ? console.warn :
                          level === 'debug' ? console.debug : console.log;
    const safeMessage = message || '(empty message)';
    
    // Only include data in console if it has content
    if (data && Object.keys(data).length > 0) {
      consoleMethod(`[${category}] ${safeMessage}`, data);
    } else {
      consoleMethod(`[${category}] ${safeMessage}`);
    }
  }

  debug(category: LogCategory, message: string, data?: Record<string, unknown>) {
    this.log('debug', category, message, data);
  }

  info(category: LogCategory, message: string, data?: Record<string, unknown>) {
    this.log('info', category, message, data);
  }

  warn(category: LogCategory, message: string, data?: Record<string, unknown>) {
    this.log('warn', category, message, data);
  }

  error(category: LogCategory, message: string, error?: Error, data?: Record<string, unknown>) {
    this.log('error', category, message, data, error);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByCategory(category: LogCategory): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }

  exportToJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
