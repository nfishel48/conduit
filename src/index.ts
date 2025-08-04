import { serverLogger } from "./utils/logger.ts";
import express from "express";
import { handleMcpRequest, setupTools } from "./server.ts";
import dotenv from "dotenv";
dotenv.config();

/**
 * Main entry point for the Conduit application
 */
async function main(): Promise<void> {
  try {
    const app = express();
    const port = process.env.PORT || 3000;

    //Create the tools map
    const toolsMap = await setupTools();

    // Add JSON middleware for MCP endpoint
    app.use(express.json());

    app.post("/mcp", async (req, res) => {
      try {
        const message = req.body;
        console.info(`📨 Received MCP request: ${message.method}`);

        // Basic JSON-RPC validation
        if (!message.jsonrpc || message.jsonrpc !== "2.0") {
          console.warn(`⚠️  Invalid JSON-RPC request from ${req.ip}`);
          res.json({
            jsonrpc: "2.0",
            id: message.id || null,
            error: {
              code: -32600,
              message: "Invalid JSON-RPC request",
            },
          });
          return;
        }

        // Handle the request
        const response = await handleMcpRequest(message, toolsMap);

        // Handle notifications (no response)
        if (response === null) {
          console.log(`📤 Notification processed: ${message.method}`);
          res.status(200).end();
          return;
        }

        console.debug(`📤 Sending MCP response for: ${message.method}`);
        res.json(response);
      } catch (error) {
        console.error(
          `❌ Error handling MCP request: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        res.json({
          jsonrpc: "2.0",
          id: req.body?.id || null,
          error: {
            code: -32603,
            message: "Internal server error",
          },
        });
      }
    });

    app.listen(port, () => {
      console.info(`🏗️  Server initialized with port ${port}`);
    });
  } catch (error) {
    serverLogger.error(
      `❌ Failed to start Conduit application: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );

    if (error instanceof Error && error.stack) {
      serverLogger.debug(`Stack trace: ${error.stack}`);
    }

    // Exit with error code
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  console.error(
    `💥 Critical startup error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`,
  );
  process.exit(1);
});
