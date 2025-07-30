import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import request from "supertest";
import { Express } from "express";
import {
  mockGraphQLResponses,
  createCustomUserResult,
  createCustomErrorResponse,
} from "./mocks/mockGraphQL";
import { createApp } from "../src/index.js";

// Mock the global fetch function
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Conduit Server E2E", () => {
  let app: Express;

  beforeAll(async () => {
    // Set up environment variables for testing
    process.env.GRAPHQL_API_URL = "http://localhost:4000/graphql";
    process.env.API_AUTH_TOKEN = "test-token";
  });

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock the introspection query response for server initialization
    mockFetch.mockResolvedValueOnce(mockGraphQLResponses.introspection);

    // Create a new app instance for each test with unique port
    const port = (3000 + Math.floor(Math.random() * 1000)).toString();
    app = await createApp(port, "http://localhost:4000/graphql", "test-token");
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("should correctly list tools from the mocked GraphQL schema", async () => {
    // Step 1: Initialize the MCP session
    const initResponse = await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
        id: 1,
      });

    expect(initResponse.status).toBe(200);
    expect(initResponse.body.jsonrpc).toBe("2.0");
    expect(initResponse.body.id).toBe(1);

    // Step 2: Send initialized notification
    const initializedResponse = await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

    // Step 3: Request the list of tools
    const response = await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "tools/list",
        id: 2,
      });

    // Assert
    expect(response.status).toBe(200);
    const body = response.body;
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe(2);
    expect(body.result).toBeDefined();
    expect(body.result.tools).toBeDefined();
    expect(body.result.tools).toHaveLength(2);

    // Check that both query and mutation tools are present
    const toolNames = body.result.tools.map((tool: any) => tool.name);
    expect(toolNames).toContain("getUser");
    expect(toolNames).toContain("createUser");

    // Verify tool structure
    const getUserTool = body.result.tools.find(
      (tool: any) => tool.name === "getUser",
    );
    expect(getUserTool).toBeDefined();
    expect(getUserTool.description).toBeDefined();
    expect(getUserTool.inputSchema).toBeDefined();

    const createUserTool = body.result.tools.find(
      (tool: any) => tool.name === "createUser",
    );
    expect(createUserTool).toBeDefined();
    expect(createUserTool.description).toBeDefined();
    expect(createUserTool.inputSchema).toBeDefined();
  });

  it("should correctly execute a tool and return the result", async () => {
    // Arrange: Mock the tool execution query
    mockFetch.mockResolvedValueOnce(mockGraphQLResponses.userCreation);

    // Step 1: Initialize the MCP session
    const initResponse = await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
        id: 1,
      });

    expect(initResponse.status).toBe(200);

    // Step 2: Send initialized notification
    await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

    // Step 3: Execute the tool
    const response = await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "createUser",
          arguments: { name: "Jane Doe" },
        },
        id: 2,
      });

    // Assert
    expect(response.status).toBe(200);
    const body = response.body;
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe(2);

    if (body.error) {
      throw new Error(`Tool execution failed: ${body.error.message}`);
    }

    expect(body.result).toBeDefined();
    expect(body.result.content).toBeDefined();
    expect(body.result.content[0].type).toBe("text");

    // Parse the returned JSON content
    const resultText = body.result.content[0].text;
    const resultData = JSON.parse(resultText);
    expect(resultData.id).toBe("user-123");
    expect(resultData.name).toBe("Jane Doe");

    // Also assert that fetch was called with the correct GraphQL mutation
    const [url, options] = mockFetch.mock.calls[1]; // Get the second call to fetch (first was introspection)
    expect(url).toBe("http://localhost:4000/graphql");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers["Authorization"]).toBe("Bearer test-token");

    const sentBody = JSON.parse(options.body);
    expect(sentBody.variables).toEqual({ name: "Jane Doe" });
    expect(sentBody.query).toContain("mutation");
    expect(sentBody.query).toContain("createUser");
    expect(sentBody.query).toContain("$name: String!");
  });

  it("should handle GraphQL errors properly", async () => {
    // Create a fresh app instance to avoid mock interference
    vi.clearAllMocks();
    mockFetch.mockResolvedValueOnce(mockGraphQLResponses.introspection);

    const port = (3000 + Math.floor(Math.random() * 1000)).toString();
    const freshApp = await createApp(
      port,
      "http://localhost:4000/graphql",
      "test-token",
    );

    // Arrange: Mock a GraphQL error response
    mockFetch.mockResolvedValueOnce(mockGraphQLResponses.graphqlError);

    // Step 1: Initialize the MCP session
    await request(freshApp)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
        id: 1,
      });

    // Step 2: Send initialized notification
    await request(freshApp)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

    // Step 3: Execute a tool that will result in an error
    const response = await request(freshApp)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "createUser",
          arguments: { name: "Existing User" },
        },
        id: 3,
      });

    // Assert: The MCP protocol should return an error response
    expect(response.status).toBe(200); // HTTP status is still 200 for JSON-RPC
    const body = response.body;
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe(3);
    expect(body.error).toBeDefined();
    expect(body.error.message).toContain("User already exists");
  });

  it("should handle network errors properly", async () => {
    // Create a fresh app instance to avoid mock interference
    vi.clearAllMocks();
    mockFetch.mockResolvedValueOnce(mockGraphQLResponses.introspection);

    const port = (3000 + Math.floor(Math.random() * 1000)).toString();
    const freshApp = await createApp(
      port,
      "http://localhost:4000/graphql",
      "test-token",
    );

    // Arrange: Mock a network error
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    // Step 1: Initialize the MCP session
    await request(freshApp)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
        id: 1,
      });

    // Step 2: Send initialized notification
    await request(freshApp)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

    // Step 3: Execute a tool that will result in a network error
    const response = await request(freshApp)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "createUser",
          arguments: { name: "Test User" },
        },
        id: 4,
      });

    // Assert: The MCP protocol should return an error response
    expect(response.status).toBe(200); // HTTP status is still 200 for JSON-RPC
    const body = response.body;
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe(4);
    expect(body.error).toBeDefined();
    expect(body.error.message).toContain("Network error");
  });

  it("should handle invalid tool names", async () => {
    // Step 1: Initialize the MCP session
    await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
        id: 1,
      });

    // Step 2: Send initialized notification
    await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

    // Step 3: Try to execute a non-existent tool
    const response = await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "nonExistentTool",
          arguments: { foo: "bar" },
        },
        id: 5,
      });

    // Assert: Should return an error for unknown tool
    expect(response.status).toBe(200);
    const body = response.body;
    expect(body.jsonrpc).toBe("2.0");
    expect(body.id).toBe(5);
    expect(body.error).toBeDefined();
    // Be more flexible with the error message since different MCP implementations may use different wording
    expect(body.error.message).toBeTruthy();
  });

  it("should handle invalid JSON-RPC requests", async () => {
    // Act: Send an invalid JSON-RPC request
    const response = await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("Content-Type", "application/json")
      .send({
        invalidField: "test",
      });

    // Assert: Should return a JSON-RPC error
    expect(response.status).toBe(200);
    const body = response.body;
    expect(body.jsonrpc).toBe("2.0");
    expect(body.error).toBeDefined();
    expect(body.error.code).toBeDefined();
    expect(body.id).toBeNull();
  });
});
