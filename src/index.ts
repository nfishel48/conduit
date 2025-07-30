import { Server } from "./server.js";

// Load environment variables (ensure you have a .env file for local development)
const PORT = process.env.PORT || "3000";
const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL;
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN;

/**
 * Create and return the server instance for testing
 */
export async function createApp(
  port?: string,
  apiUrl?: string,
  apiToken?: string,
) {
  const serverPort = port || PORT;
  const serverApiUrl = apiUrl || GRAPHQL_API_URL;
  const serverApiToken = apiToken || API_AUTH_TOKEN;

  if (!serverApiUrl) {
    throw new Error("GRAPHQL_API_URL is required");
  }

  const server = new Server(serverPort, serverApiUrl, serverApiToken);
  await server.start(false); // Don't start HTTP listener in test mode
  return server.getApp();
}

/**
 * Main application bootstrap function.
 */
async function bootstrap() {
  try {
    if (!GRAPHQL_API_URL) {
      console.error("FATAL: GRAPHQL_API_URL environment variable is not set.");
      process.exit(1);
    }

    const server = new Server(PORT, GRAPHQL_API_URL, API_AUTH_TOKEN);
    await server.start();
    console.log(
      `🚀 Conduit bridge is successfully running on http://localhost:${PORT}`,
    );
  } catch (error) {
    console.error("Failed to start the Conduit bridge server:", error);
    process.exit(1);
  }
}

// Only run bootstrap if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap();
}

// Export for testing
export { createApp as viteNodeApp };
