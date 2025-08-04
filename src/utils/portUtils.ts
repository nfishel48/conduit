import { createServer } from "net";

export interface PortCheckResult {
  port: number;
  available: boolean;
  error?: string;
}

export interface ServerStartOptions {
  preferredPort: number;
  maxAttempts?: number;
  portRange?: number;
}

/**
 * Check if a specific port is available
 */
export async function isPortAvailable(port: number): Promise<PortCheckResult> {
  return new Promise((resolve) => {
    const server = createServer();

    server.listen(port, () => {
      server.once("close", () => {
        resolve({ port, available: true });
      });
      server.close();
    });

    server.on("error", (err: any) => {
      let errorMessage = "Unknown error";

      if (err.code === "EADDRINUSE") {
        errorMessage = `Port ${port} is already in use`;
      } else if (err.code === "EACCES") {
        errorMessage = `Permission denied to bind to port ${port}`;
      } else if (err.code === "EADDRNOTAVAIL") {
        errorMessage = `Address not available for port ${port}`;
      } else {
        errorMessage = `Error checking port ${port}: ${err.message}`;
      }

      resolve({
        port,
        available: false,
        error: errorMessage,
      });
    });
  });
}

/**
 * Find an available port, starting from the preferred port
 */
export async function findAvailablePort(
  options: ServerStartOptions,
): Promise<PortCheckResult> {
  const { preferredPort, maxAttempts = 10, portRange = 100 } = options;

  console.log(
    `🔍 Checking port availability starting from ${preferredPort}...`,
  );

  // First, try the preferred port
  const preferredResult = await isPortAvailable(preferredPort);
  if (preferredResult.available) {
    console.log(`✅ Port ${preferredPort} is available`);
    return preferredResult;
  }

  console.log(
    `❌ Port ${preferredPort} is not available: ${preferredResult.error}`,
  );
  console.log(`🔄 Searching for alternative ports...`);

  // Try alternative ports
  for (let attempt = 1; attempt < maxAttempts; attempt++) {
    const testPort = preferredPort + attempt;

    // Don't go beyond reasonable port range
    if (testPort > preferredPort + portRange || testPort > 65535) {
      break;
    }

    const result = await isPortAvailable(testPort);
    if (result.available) {
      console.log(`✅ Found available port: ${testPort}`);
      return result;
    }

    console.log(`❌ Port ${testPort} is also in use`);
  }

  // If we get here, no ports were available
  const errorMessage = `No available ports found in range ${preferredPort}-${preferredPort + maxAttempts - 1}`;
  console.error(`🚨 ${errorMessage}`);

  return {
    port: preferredPort,
    available: false,
    error: errorMessage,
  };
}

/**
 * Get all processes using a specific port (Unix/Linux/macOS only)
 */
export async function getPortProcesses(port: number): Promise<string[]> {
  try {
    const { execSync } = await import("child_process");

    // Try different commands based on the platform
    let command: string;
    const platform = process.platform;

    if (platform === "darwin" || platform === "linux") {
      command = `lsof -i :${port} -t`;
    } else if (platform === "win32") {
      command = `netstat -ano | findstr :${port}`;
    } else {
      return [`Unable to check processes on platform: ${platform}`];
    }

    const output = execSync(command, { encoding: "utf8", stdio: "pipe" });
    const lines = output
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    if (platform === "win32") {
      // Parse Windows netstat output
      return lines.map((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        return `PID: ${pid}`;
      });
    } else {
      // Parse Unix lsof output (PIDs)
      return lines.map((pid) => `PID: ${pid.trim()}`);
    }
  } catch (error) {
    return [
      `Error checking port processes: ${error instanceof Error ? error.message : "Unknown error"}`,
    ];
  }
}

/**
 * Enhanced port error logging with process information
 */
export async function logPortError(port: number, error: string): Promise<void> {
  console.error(`\n🚨 Port Error Details:`);
  console.error(`   Port: ${port}`);
  console.error(`   Error: ${error}`);

  if (error.includes("already in use")) {
    console.error(`\n🔍 Investigating processes using port ${port}:`);
    const processes = await getPortProcesses(port);
    processes.forEach((process) => {
      console.error(`   ${process}`);
    });

    console.error(`\n💡 Suggestions:`);
    console.error("   1. Kill the process using: kill -9 <PID>");
    console.error(
      "   2. Use a different port with: PORT=<new_port> npm run dev",
    );
    console.error("   3. Set environment variable: export PORT=<new_port>");
  }

  console.error("\n");
}

/**
 * Parse port from environment or use default
 */
export function getPortFromEnv(defaultPort: number = 5173): number {
  const envPort = process.env.PORT;

  if (!envPort) {
    return defaultPort;
  }

  const parsed = parseInt(envPort, 10);

  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    console.warn(
      `⚠️ Invalid PORT environment variable: ${envPort}. Using default: ${defaultPort}`,
    );
    return defaultPort;
  }

  return parsed;
}
