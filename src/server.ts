import express from "express";
import { ToolFactory } from "./services/toolFactory.ts";
import { GraphQLService } from "./services/graphQLService.ts";
import type { GraphQLField, GraphQLFieldMap } from "graphql";
import dotenv from "dotenv";
dotenv.config();

interface Tool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

export async function handleMcpRequest(
  message: any,
  toolsMap: Map<string, Tool>,
): Promise<any> {
  // Handle initialize request
  if (message.method === "initialize") {
    console.info("🔄 Initializing MCP connection...");
    let initialized = true;
    console.info("✅ MCP connection initialized");
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {
            listChanged: true,
          },
        },
        serverInfo: {
          name: "conduit-graphql-bridge",
          version: "1.0.0",
        },
      },
    };
  }

  // Handle notifications/initialized
  if (message.method === "notifications/initialized") {
    console.info("📡 Client initialization notification received");
    //  is a notification, no response needed
    return null;
  }

  // Check if initialized for other methods (except initialize itself)
  if (
    message.method !== "initialize" &&
    message.method !== "notifications/initialized"
  ) {
    console.warn(`⚠️  Received ${message.method} before initialization`);
    return {
      jsonrpc: "2.0",
      id: message.id || null,
      error: {
        code: -32002,
        message: "Server not initialized",
      },
    };
  }

  // Handle tools/list
  if (message.method === "tools/list") {
    console.debug(`📋 Listing ${toolsMap.size} available tools`);
    const tools = Array.from(toolsMap.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        tools,
      },
    };
  }

  // Handle tools/call
  if (message.method === "tools/call") {
    try {
      const { name, arguments: args } = message.params;
      console.info(`🔧 Executing tool: ${name}`);
      const tool = toolsMap.get(name);

      if (!tool) {
        console.warn(`⚠️  Tool not found: ${name}`);
        return {
          jsonrpc: "2.0",
          id: message.id,
          error: {
            code: -32601,
            message: `Tool not found: ${name}`,
          },
        };
      }

      const result = await tool.handler(args);
      console.info(`✅ Tool executed successfully: ${name}`);
      return {
        jsonrpc: "2.0",
        id: message.id,
        result,
      };
    } catch (error) {
      console.error(
        `❌ Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return {
        jsonrpc: "2.0",
        id: message.id,
        error: {
          code: -32603,
          message: `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      };
    }
  }

  // Handle unknown methods
  console.warn(`⚠️  Unknown method received: ${message.method}`);
  return {
    jsonrpc: "2.0",
    id: message.id || null,
    error: {
      code: -32601,
      message: `Method not found: ${message.method}`,
    },
  };
}

export async function setupTools(): Promise<Map<string, Tool>> {
  const apiUrl = process.env.GRAPHQL_API_URL;
  const apiToken = process.env.GRAPHQL_API_TOKEN;

  if (!apiUrl) {
    throw new Error("GRAPHQL_API_URL environment variable is required");
  }

  console.info("🔍 Starting GraphQL introspection...");

  // Initialize services
  const graphqlService = new GraphQLService(apiUrl, apiToken);
  const toolFactory = new ToolFactory(apiUrl, apiToken);

  // Fetch schema via introspection
  const schema = await graphqlService.fetchSchema();

  // Create tools map
  const toolsMap = new Map<string, Tool>();

  // Process query fields
  const queryType = schema.getQueryType();
  if (queryType) {
    await processFields(toolFactory, queryType.getFields(), "query", toolsMap);
  }

  // Process mutation fields
  const mutationType = schema.getMutationType();
  if (mutationType) {
    await processFields(
      toolFactory,
      mutationType.getFields(),
      "mutation",
      toolsMap,
    );
  }

  console.info(`✅ Created ${toolsMap.size} tools from GraphQL schema`);
  return toolsMap;
}

async function processFields(
  toolFactory: ToolFactory,
  fields: GraphQLFieldMap<any, any>,
  type: "query" | "mutation",
  toolsMap: Map<string, Tool>,
): Promise<void> {
  for (const [fieldName, field] of Object.entries(fields)) {
    try {
      const toolInfo = await toolFactory.createToolInfo(fieldName, field, type);
      toolsMap.set(fieldName, toolInfo);
      console.debug(`🛠️  Created tool: ${fieldName} (${type})`);
    } catch (error) {
      console.warn(
        `⚠️  Failed to create tool for ${fieldName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
