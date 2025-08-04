export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export interface LoggerOptions {
  level: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colors?: boolean;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private timestamp: boolean;
  private colors: boolean;

  constructor(options: LoggerOptions = { level: LogLevel.INFO }) {
    this.level = options.level;
    this.prefix = options.prefix || "";
    this.timestamp = options.timestamp !== false;
    this.colors = options.colors !== false && process.stdout.isTTY;
  }

  private getTimestamp(): string {
    if (!this.timestamp) return "";
    return `[${new Date().toISOString()}] `;
  }

  private colorize(text: string, color: string): string {
    if (!this.colors) return text;

    const colors: { [key: string]: string } = {
      reset: "\x1b[0m",
      red: "\x1b[31m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      green: "\x1b[32m",
      cyan: "\x1b[36m",
      magenta: "\x1b[35m",
      gray: "\x1b[90m",
    };

    return `${colors[color] || ""}${text}${colors.reset}`;
  }

  private formatMessage(level: string, message: string, color: string): string {
    const timestamp = this.getTimestamp();
    const prefix = this.prefix ? `[${this.prefix}] ` : "";
    const levelStr = this.colorize(`[${level}]`, color);
    return `${this.colorize(timestamp, "gray")}${levelStr} ${prefix}${message}`;
  }

  private log(
    level: LogLevel,
    levelName: string,
    color: string,
    message: string,
    ...args: any[]
  ): void {
    if (level > this.level) return;

    const formattedMessage = this.formatMessage(levelName, message, color);

    if (level === LogLevel.ERROR) {
      console.error(formattedMessage, ...args);
    } else {
      console.log(formattedMessage, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, "ERROR", "red", message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, "WARN", "yellow", message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, "INFO", "blue", message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, "DEBUG", "gray", message, ...args);
  }

  success(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, "SUCCESS", "green", message, ...args);
  }

  // Convenience methods for common scenarios
  server(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, "SERVER", "cyan", message, ...args);
  }

  websocket(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, "WS", "magenta", message, ...args);
  }

  mcp(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, "MCP", "cyan", message, ...args);
  }

  // Port-specific logging methods
  portCheck(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, "PORT", "blue", message, ...args);
  }

  portError(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, "PORT", "red", message, ...args);
  }

  portSuccess(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, "PORT", "green", message, ...args);
  }

  // Create a child logger with additional prefix
  child(prefix: string): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger({
      level: this.level,
      prefix: childPrefix,
      timestamp: this.timestamp,
      colors: this.colors,
    });
  }

  // Set log level at runtime
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  // Get current log level
  getLevel(): LogLevel {
    return this.level;
  }
}

// Create default logger instance
export const logger = new Logger({
  level: process.env.LOG_LEVEL
    ? (parseInt(process.env.LOG_LEVEL, 10) as LogLevel)
    : LogLevel.INFO,
  timestamp: true,
  colors: true,
});

// Create specialized loggers
export const serverLogger = logger.child("server");
export const mcpLogger = logger.child("mcp");
export const portLogger = logger.child("port");
export const wsLogger = logger.child("websocket");
