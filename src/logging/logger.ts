// src/logger.ts

import fs from "fs";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  level: LogLevel;
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface LoggerOptions {
  level?: LogLevel;
  output?: "stdout" | "file" | "browser";
  filePath?: string;
}

function getLogLevelFromEnv(): LogLevel {
  const envLevel = process.env.PROMPTBOOK_LOG_LEVEL?.toLowerCase();
  if (envLevel === "debug" || envLevel === "info" || envLevel === "warn" || envLevel === "error") {
    return envLevel;
  }
  return "info";
}

function shouldLog(current: LogLevel, target: LogLevel): boolean {
  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  return levels.indexOf(target) >= levels.indexOf(current);
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  return JSON.stringify(logEntry);
}

class StdioLogger implements Logger {
  level: LogLevel;
  constructor(options: LoggerOptions = {}) {
    this.level = options.level || getLogLevelFromEnv();
  }
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "debug")) console.log(formatLog("debug", message, meta));
  }
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "info")) console.log(formatLog("info", message, meta));
  }
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "warn")) console.warn(formatLog("warn", message, meta));
  }
  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "error")) console.error(formatLog("error", message, meta));
  }
}

class FileLogger implements Logger {
  level: LogLevel;
  filePath: string;
  constructor(options: LoggerOptions = {}) {
    this.level = options.level || getLogLevelFromEnv();
    this.filePath = options.filePath || "promptbook.log";
  }
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "debug")) fs.appendFileSync(this.filePath, formatLog("debug", message, meta) + "\n");
  }
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "info")) fs.appendFileSync(this.filePath, formatLog("info", message, meta) + "\n");
  }
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "warn")) fs.appendFileSync(this.filePath, formatLog("warn", message, meta) + "\n");
  }
  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "error")) fs.appendFileSync(this.filePath, formatLog("error", message, meta) + "\n");
  }
}

class BrowserLogger implements Logger {
  level: LogLevel;
  constructor(options: LoggerOptions = {}) {
    this.level = options.level || getLogLevelFromEnv();
  }
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "debug")) window.console.log(formatLog("debug", message, meta));
  }
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "info")) window.console.info(formatLog("info", message, meta));
  }
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "warn")) window.console.warn(formatLog("warn", message, meta));
  }
  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog(this.level, "error")) window.console.error(formatLog("error", message, meta));
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  if (options.output === "file") {
    return new FileLogger(options);
  }
  if (options.output === "browser" || typeof window !== "undefined") {
    return new BrowserLogger(options);
  }
  return new StdioLogger(options);
}

// Singleton instance for engine-wide usage
let loggerInstance: Logger | undefined;
export function getLogger(options?: LoggerOptions): Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger(options);
  }
  return loggerInstance;
}
