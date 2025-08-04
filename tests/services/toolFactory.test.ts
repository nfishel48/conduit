import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { ToolFactory } from "../../src/services/toolFactory";
import {
  buildSchema,
  type GraphQLSchema,
  type GraphQLField,
  type GraphQLObjectType,
} from "graphql";
import {
  createSimpleSchema,
  createComprehensiveSchema,
} from "../fixtures/testSchema";

describe("ToolFactory unit tests", () => {
  let toolFactory: ToolFactory;
  let simpleSchema: GraphQLSchema;
  let comprehensiveSchema: GraphQLSchema;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    simpleSchema = createSimpleSchema();
    comprehensiveSchema = createComprehensiveSchema();
  });

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    toolFactory = new ToolFactory(
      "http://localhost:4000/graphql",
      "test-token",
    );
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with API URL and token", () => {
      const factory = new ToolFactory("http://example.com", "my-token");
      expect(factory).toBeInstanceOf(ToolFactory);
    });

    it("should initialize with API URL only", () => {
      const factory = new ToolFactory("http://example.com");
      expect(factory).toBeInstanceOf(ToolFactory);
    });
  });

  describe("createToolInfo", () => {
    it("should create tool info for simple query field", async () => {
      const queryType = simpleSchema.getQueryType() as GraphQLObjectType;
      const getUserField = queryType.getFields()["getUser"];

      const toolInfo = await toolFactory.createToolInfo(
        "getUser",
        getUserField,
        "query",
      );

      expect(toolInfo).toEqual({
        name: "getUser",
        description: "Executes the getUser query.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        handler: expect.any(Function),
      });
    });

    it("should create tool info for simple mutation field", async () => {
      const mutationType = simpleSchema.getMutationType() as GraphQLObjectType;
      const createUserField = mutationType.getFields()["createUser"];

      const toolInfo = await toolFactory.createToolInfo(
        "createUser",
        createUserField,
        "mutation",
      );

      expect(toolInfo).toEqual({
        name: "createUser",
        description: "Executes the createUser mutation.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
        handler: expect.any(Function),
      });
    });

    it("should handle field without description", async () => {
      const customSchema = buildSchema(`
        type Query {
          testField(arg: String!): String
        }
      `);

      const queryType = customSchema.getQueryType() as GraphQLObjectType;
      const testField = queryType.getFields()["testField"];

      const toolInfo = await toolFactory.createToolInfo(
        "testField",
        testField,
        "query",
      );

      expect(toolInfo.description).toBe("Executes the testField query.");
    });

    it("should handle multiple arguments", async () => {
      const customSchema = buildSchema(`
        type Query {
          searchUsers(name: String!, age: Int, active: Boolean): [User]
        }
        type User { id: ID! name: String! }
      `);

      const queryType = customSchema.getQueryType() as GraphQLObjectType;
      const searchField = queryType.getFields()["searchUsers"];

      const toolInfo = await toolFactory.createToolInfo(
        "searchUsers",
        searchField,
        "query",
      );

      expect(toolInfo.inputSchema).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
          active: { type: "boolean" },
        },
        required: ["name", "age", "active"],
      });
    });

    it("should handle array arguments", async () => {
      const customSchema = buildSchema(`
        type Query {
          getUsers(ids: [ID!]!): [User]
        }
        type User { id: ID! name: String! }
      `);

      const queryType = customSchema.getQueryType() as GraphQLObjectType;
      const getUsersField = queryType.getFields()["getUsers"];

      const toolInfo = await toolFactory.createToolInfo(
        "getUsers",
        getUsersField,
        "query",
      );

      expect(toolInfo.inputSchema.properties.ids).toEqual({
        type: "array",
        items: { type: "string" },
      });
    });

    it("should handle no arguments", async () => {
      const customSchema = buildSchema(`
        type Query {
          getAllUsers: [User]
        }
        type User { id: ID! name: String! }
      `);

      const queryType = customSchema.getQueryType() as GraphQLObjectType;
      const getAllUsersField = queryType.getFields()["getAllUsers"];

      const toolInfo = await toolFactory.createToolInfo(
        "getAllUsers",
        getAllUsersField,
        "query",
      );

      expect(toolInfo.inputSchema).toEqual({
        type: "object",
        properties: {},
        required: undefined,
      });
    });
  });

  describe("handler execution", () => {
    it("should execute successful query with arguments", async () => {
      const queryType = simpleSchema.getQueryType() as GraphQLObjectType;
      const getUserField = queryType.getFields()["getUser"];

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: {
            getUser: { id: "123", name: "John Doe" },
          },
        }),
      });

      const toolInfo = await toolFactory.createToolInfo(
        "getUser",
        getUserField,
        "query",
      );
      const result = await toolInfo.handler({ id: "123" });

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: expect.stringContaining("query($id: ID!)"),
      });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.query).toContain("query($id: ID!)");
      expect(body.query).toContain("getUser(id: $id)");
      expect(body.variables).toEqual({ id: "123" });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify({ id: "123", name: "John Doe" }, null, 2),
          },
        ],
      });
    });

    it("should execute successful mutation with arguments", async () => {
      const mutationType = simpleSchema.getMutationType() as GraphQLObjectType;
      const createUserField = mutationType.getFields()["createUser"];

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: {
            createUser: { id: "456", name: "Jane Doe" },
          },
        }),
      });

      const toolInfo = await toolFactory.createToolInfo(
        "createUser",
        createUserField,
        "mutation",
      );
      const result = await toolInfo.handler({ name: "Jane Doe" });

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: expect.stringContaining("mutation($name: String!)"),
      });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.query).toContain("mutation($name: String!)");
      expect(body.query).toContain("createUser(name: $name)");
      expect(body.variables).toEqual({ name: "Jane Doe" });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: JSON.stringify({ id: "456", name: "Jane Doe" }, null, 2),
          },
        ],
      });
    });

    it("should execute without authorization header when no token provided", async () => {
      const factoryWithoutToken = new ToolFactory(
        "http://localhost:4000/graphql",
      );
      const queryType = simpleSchema.getQueryType() as GraphQLObjectType;
      const getUserField = queryType.getFields()["getUser"];

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: {
            getUser: { id: "123", name: "John Doe" },
          },
        }),
      });

      const toolInfo = await factoryWithoutToken.createToolInfo(
        "getUser",
        getUserField,
        "query",
      );
      await toolInfo.handler({ id: "123" });

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: expect.any(String),
      });
    });

    it("should handle GraphQL errors", async () => {
      const queryType = simpleSchema.getQueryType() as GraphQLObjectType;
      const getUserField = queryType.getFields()["getUser"];

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          errors: [{ message: "User not found" }],
        }),
      });

      const toolInfo = await toolFactory.createToolInfo(
        "getUser",
        getUserField,
        "query",
      );

      await expect(toolInfo.handler({ id: "999" })).rejects.toThrow(
        "API Error: User not found",
      );
    });

    it("should handle network errors", async () => {
      const queryType = simpleSchema.getQueryType() as GraphQLObjectType;
      const getUserField = queryType.getFields()["getUser"];

      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const toolInfo = await toolFactory.createToolInfo(
        "getUser",
        getUserField,
        "query",
      );

      await expect(toolInfo.handler({ id: "123" })).rejects.toThrow(
        "Network failure",
      );
    });

    it("should handle multiple GraphQL errors", async () => {
      const queryType = simpleSchema.getQueryType() as GraphQLObjectType;
      const getUserField = queryType.getFields()["getUser"];

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          errors: [{ message: "First error" }, { message: "Second error" }],
        }),
      });

      const toolInfo = await toolFactory.createToolInfo(
        "getUser",
        getUserField,
        "query",
      );

      await expect(toolInfo.handler({ id: "999" })).rejects.toThrow(
        "API Error: First error",
      );
    });

    it("should handle no arguments correctly", async () => {
      const customSchema = buildSchema(`
        type Query {
          getAllUsers: [User]
        }
        type User { id: ID! name: String! }
      `);

      const queryType = customSchema.getQueryType() as GraphQLObjectType;
      const getAllUsersField = queryType.getFields()["getAllUsers"];

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: {
            getAllUsers: [{ id: "1", name: "User 1" }],
          },
        }),
      });

      const toolInfo = await toolFactory.createToolInfo(
        "getAllUsers",
        getAllUsersField,
        "query",
      );
      const result = await toolInfo.handler({});

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.query).toContain("query {");
      expect(body.query).toContain("getAllUsers");
      expect(body.variables).toEqual({});
    });
  });

  describe("selection set building", () => {
    it("should handle scalar return types", async () => {
      const customSchema = buildSchema(`
        type Query {
          getUserCount: Int
        }
      `);

      const queryType = customSchema.getQueryType() as GraphQLObjectType;
      const countField = queryType.getFields()["getUserCount"];

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: { getUserCount: 42 },
        }),
      });

      const toolInfo = await toolFactory.createToolInfo(
        "getUserCount",
        countField,
        "query",
      );
      await toolInfo.handler({});

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      // Should not include selection set for scalar types
      expect(body.query).toContain("getUserCount");
      expect(body.query).not.toContain("getUserCount {");
    });

    it("should handle object return types with selection set", async () => {
      const queryType = simpleSchema.getQueryType() as GraphQLObjectType;
      const getUserField = queryType.getFields()["getUser"];

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: {
            getUser: { id: "123", name: "John" },
          },
        }),
      });

      const toolInfo = await toolFactory.createToolInfo(
        "getUser",
        getUserField,
        "query",
      );
      await toolInfo.handler({ id: "123" });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.query).toContain("getUser(id: $id) {");
      expect(body.query).toContain("id");
      expect(body.query).toContain("name");
      expect(body.query).toContain("__typename");
    });

    it("should handle list return types", async () => {
      const customSchema = buildSchema(`
        type Query {
          getUsers: [User]
        }
        type User { id: ID! name: String! }
      `);

      const queryType = customSchema.getQueryType() as GraphQLObjectType;
      const getUsersField = queryType.getFields()["getUsers"];

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: {
            getUsers: [{ id: "1", name: "User 1" }],
          },
        }),
      });

      const toolInfo = await toolFactory.createToolInfo(
        "getUsers",
        getUsersField,
        "query",
      );
      await toolInfo.handler({});

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.query).toContain("getUsers {");
      expect(body.query).toContain("id");
      expect(body.query).toContain("name");
    });
  });

  describe("GraphQL type mapping", () => {
    it("should map GraphQL types to Zod correctly", async () => {
      const customSchema = buildSchema(`
        type Query {
          complexQuery(
            stringArg: String!
            intArg: Int!
            floatArg: Float!
            boolArg: Boolean!
            idArg: ID!
            optionalString: String
            stringList: [String!]!
          ): String
        }
      `);

      const queryType = customSchema.getQueryType() as GraphQLObjectType;
      const complexField = queryType.getFields()["complexQuery"];

      const toolInfo = await toolFactory.createToolInfo(
        "complexQuery",
        complexField,
        "query",
      );

      expect(toolInfo.inputSchema).toEqual({
        type: "object",
        properties: {
          stringArg: { type: "string" },
          intArg: { type: "number" },
          floatArg: { type: "number" },
          boolArg: { type: "boolean" },
          idArg: { type: "string" },
          optionalString: { type: "string" },
          stringList: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "stringArg",
          "intArg",
          "floatArg",
          "boolArg",
          "idArg",
          "optionalString",
          "stringList",
        ],
      });
    });

    it("should handle custom scalar types", async () => {
      const customSchema = buildSchema(`
        scalar DateTime
        type Query {
          getByDate(date: DateTime!): String
        }
      `);

      const queryType = customSchema.getQueryType() as GraphQLObjectType;
      const dateField = queryType.getFields()["getByDate"];

      const toolInfo = await toolFactory.createToolInfo(
        "getByDate",
        dateField,
        "query",
      );

      expect(toolInfo.inputSchema.properties.date).toEqual({
        type: "string",
      });
    });

    it("should handle enum types", async () => {
      const customSchema = buildSchema(`
        enum Status { ACTIVE INACTIVE }
        type Query {
          getByStatus(status: Status!): String
        }
      `);

      const queryType = customSchema.getQueryType() as GraphQLObjectType;
      const statusField = queryType.getFields()["getByStatus"];

      const toolInfo = await toolFactory.createToolInfo(
        "getByStatus",
        statusField,
        "query",
      );

      expect(toolInfo.inputSchema.properties.status).toEqual({
        type: "string",
      });
    });

    it("should handle input object types", async () => {
      const customSchema = buildSchema(`
        input UserInput { name: String! email: String! }
        type Query {
          searchUser(input: UserInput!): String
        }
      `);

      const queryType = customSchema.getQueryType() as GraphQLObjectType;
      const searchField = queryType.getFields()["searchUser"];

      const toolInfo = await toolFactory.createToolInfo(
        "searchUser",
        searchField,
        "query",
      );

      expect(toolInfo.inputSchema.properties.input).toEqual({
        type: "string",
      });
    });
  });

  describe("error edge cases", () => {
    it("should handle malformed JSON responses", async () => {
      const queryType = simpleSchema.getQueryType() as GraphQLObjectType;
      const getUserField = queryType.getFields()["getUser"];

      mockFetch.mockResolvedValueOnce({
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const toolInfo = await toolFactory.createToolInfo(
        "getUser",
        getUserField,
        "query",
      );

      await expect(toolInfo.handler({ id: "123" })).rejects.toThrow(
        "Invalid JSON",
      );
    });

    it("should handle responses with both data and errors", async () => {
      const queryType = simpleSchema.getQueryType() as GraphQLObjectType;
      const getUserField = queryType.getFields()["getUser"];

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: { getUser: { id: "123" } },
          errors: [{ message: "Warning: deprecated field" }],
        }),
      });

      const toolInfo = await toolFactory.createToolInfo(
        "getUser",
        getUserField,
        "query",
      );

      await expect(toolInfo.handler({ id: "123" })).rejects.toThrow(
        "API Error: Warning: deprecated field",
      );
    });

    it("should handle empty response data", async () => {
      const queryType = simpleSchema.getQueryType() as GraphQLObjectType;
      const getUserField = queryType.getFields()["getUser"];

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          data: { getUser: null },
        }),
      });

      const toolInfo = await toolFactory.createToolInfo(
        "getUser",
        getUserField,
        "query",
      );
      const result = await toolInfo.handler({ id: "999" });

      expect(result).toEqual({
        content: [
          {
            type: "text",
            text: "null",
          },
        ],
      });
    });
  });

  describe("comprehensive schema integration", () => {
    it("should handle complex types from comprehensive schema", async () => {
      const queryType = comprehensiveSchema.getQueryType() as GraphQLObjectType;
      const searchField = queryType.getFields()["search"];

      const toolInfo = await toolFactory.createToolInfo(
        "search",
        searchField,
        "query",
      );

      expect(toolInfo.name).toBe("search");
      expect(toolInfo.inputSchema.properties.query).toEqual({
        type: "string",
      });
      expect(toolInfo.inputSchema.required).toContain("query");
    });

    it("should handle subscription type fields", async () => {
      const subscriptionType =
        comprehensiveSchema.getSubscriptionType() as GraphQLObjectType;
      const userCreatedField = subscriptionType.getFields()["userCreated"];

      const toolInfo = await toolFactory.createToolInfo(
        "userCreated",
        userCreatedField,
        "query",
      );

      expect(toolInfo.name).toBe("userCreated");
      expect(toolInfo.inputSchema.properties).toEqual({});
    });
  });
});
