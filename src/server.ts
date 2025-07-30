import express, { Express } from "express";
import { GraphQLService } from "./services/graphQLService.js";
import { ToolFactory } from "./services/toolFactory.js";

export class Server {
  private app: Express;
  private readonly port: string;
  private readonly graphqlService: GraphQLService;
  private toolsMap: Map<string, any> = new Map();
  private initialized: boolean = false;

  constructor(port: string, apiUrl: string, apiToken?: string) {
    this.app = express();
    this.port = port;
    this.graphqlService = new GraphQLService(apiUrl, apiToken);
    this.app.use(express.json());
  }

  public async start(startListener: boolean = true): Promise<void> {
    console.log("Starting Conduit bridge server...");

    // Fetch the remote GraphQL schema
    const schema = await this.graphqlService.fetchSchema();

    // Create tools from the schema and store them
    const toolFactory = new ToolFactory(
      this.graphqlService.getApiUrl(),
      this.graphqlService.getApiToken(),
    );
    await this.setupTools(toolFactory, schema);

    // Setup the HTTP endpoint
    this.app.post("/mcp", async (req, res) => {
      try {
        const message = req.body;

        // Basic JSON-RPC validation
        if (!message.jsonrpc || message.jsonrpc !== "2.0") {
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
        const response = await this.handleMcpRequest(message);

        // Handle notifications (no response)
        if (response === null) {
          res.status(200).end();
          return;
        }

        res.json(response);
      } catch (error) {
        console.error("Error handling MCP request:", error);
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

    //Start listening for requests (optional for testing)
    if (startListener) {
      this.app.listen(this.port, () => {
        console.log(
          `Proxying tools for GraphQL API at: ${this.graphqlService.getApiUrl()}`,
        );
      });
    }
  }

  private async setupTools(
    toolFactory: ToolFactory,
    schema: any,
  ): Promise<void> {
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();

    if (queryType) {
      await this.processFields(toolFactory, queryType.getFields(), "query");
    }
    if (mutationType) {
      await this.processFields(
        toolFactory,
        mutationType.getFields(),
        "mutation",
      );
    }
  }

  private async processFields(
    toolFactory: ToolFactory,
    fields: { [key: string]: any },
    type: "query" | "mutation",
  ): Promise<void> {
    for (const fieldName in fields) {
      const field = fields[fieldName];
      console.log(`Registering ${type}: ${fieldName}`);

      const toolInfo = await toolFactory.createToolInfo(fieldName, field, type);
      this.toolsMap.set(fieldName, toolInfo);
    }
  }

  private async handleMcpRequest(message: any): Promise<any> {
    // Handle initialize request
    if (message.method === "initialize") {
      this.initialized = true;
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
      // This is a notification, no response needed
      return null;
    }

    // Check if initialized for other methods
    if (!this.initialized && message.method !== "initialize") {
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
      const tools = Array.from(this.toolsMap.values()).map((tool) => ({
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
        const tool = this.toolsMap.get(name);

        if (!tool) {
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
        return {
          jsonrpc: "2.0",
          id: message.id,
          result,
        };
      } catch (error) {
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
    return {
      jsonrpc: "2.0",
      id: message.id || null,
      error: {
        code: -32601,
        message: `Method not found: ${message.method}`,
      },
    };
  }

  public getApp(): Express {
    return this.app;
  }
}
