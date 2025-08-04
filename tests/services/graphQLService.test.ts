import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { GraphQLService } from "../../src/services/graphQLService";
import { getIntrospectionQuery } from "graphql";
import {
  TestSchemaFixtures,
  createComprehensiveSchema,
  createComprehensiveMockResponse,
} from "../fixtures/testSchema";

describe("graphQLService unit tests", () => {
  let graphQLService: GraphQLService;

  beforeAll(async () => {
    graphQLService = new GraphQLService(
      "http://localhost:3000/graphql",
      "test-token",
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("getApiUrl", () => {
    it("Should return the api url", () => {
      const url = graphQLService.getApiUrl();
      expect(url).toBe("http://localhost:3000/graphql");
    });
  });

  describe("getApiToken", () => {
    it("Should return the api token", () => {
      const token = graphQLService.getApiToken();
      expect(token).toBe("test-token");
    });

    it("Should return undefined when no token is provided", () => {
      const serviceWithoutToken = new GraphQLService(
        "http://localhost:3000/graphql",
      );
      const token = serviceWithoutToken.getApiToken();
      expect(token).toBeUndefined();
    });
  });

  describe("fetchSchema", () => {
    it("Should fetch api schema successfully", async () => {
      // Mock successful fetch response using comprehensive schema
      const mockResponse = {
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue(TestSchemaFixtures.comprehensive.success),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const schema = await graphQLService.fetchSchema();

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3000/graphql",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-token",
          },
          body: JSON.stringify({ query: getIntrospectionQuery() }),
        },
      );

      expect(schema).toBeDefined();
      expect(schema.getQueryType()).toBeDefined();
      expect(schema.getMutationType()).toBeDefined();
      expect(schema.getSubscriptionType()).toBeDefined();

      // Verify the schema has our expected types
      const userType = schema.getType("User");
      const postType = schema.getType("Post");
      const searchResultType = schema.getType("SearchResult");
      const postStatusType = schema.getType("PostStatus");

      expect(userType).toBeDefined();
      expect(postType).toBeDefined();
      expect(searchResultType).toBeDefined();
      expect(postStatusType).toBeDefined();
    });

    it("Should make request without Authorization header when no token is provided", async () => {
      const serviceWithoutToken = new GraphQLService(
        "http://localhost:3000/graphql",
      );

      const mockResponse = {
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue(TestSchemaFixtures.comprehensive.success),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await serviceWithoutToken.fetchSchema();

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:3000/graphql",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: getIntrospectionQuery() }),
        },
      );
    });

    it("Should throw error when fetch fails with non-ok response", async () => {
      const mockResponse = {
        ok: false,
        statusText: "Internal Server Error",
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(graphQLService.fetchSchema()).rejects.toThrow(
        "Failed to fetch schema: Internal Server Error",
      );
    });

    it("Should throw error when GraphQL response contains errors", async () => {
      const mockResponse = {
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue(TestSchemaFixtures.errors.introspectionDisabled),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(graphQLService.fetchSchema()).rejects.toThrow(
        'GraphQL introspection query failed: [{"message":"Schema introspection is disabled"}]',
      );
    });

    it("Should throw error when network request fails", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(graphQLService.fetchSchema()).rejects.toThrow(
        "Network error",
      );
    });

    it("Should handle unauthorized error responses", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(TestSchemaFixtures.errors.unauthorized),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(graphQLService.fetchSchema()).rejects.toThrow(
        "You must be authenticated to perform this action.",
      );
    });

    it("Should handle rate limit error responses", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(TestSchemaFixtures.errors.rateLimited),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(graphQLService.fetchSchema()).rejects.toThrow(
        "Rate limit exceeded",
      );
    });

    it("Should validate that returned schema matches expected structure", async () => {
      const mockResponse = {
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue(TestSchemaFixtures.comprehensive.success),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const schema = await graphQLService.fetchSchema();

      // Validate schema structure
      const queryType = schema.getQueryType();
      expect(queryType).toBeDefined();
      expect(queryType?.name).toBe("Query");

      const mutationType = schema.getMutationType();
      expect(mutationType).toBeDefined();
      expect(mutationType?.name).toBe("Mutation");

      const subscriptionType = schema.getSubscriptionType();
      expect(subscriptionType).toBeDefined();
      expect(subscriptionType?.name).toBe("Subscription");

      // Validate specific fields exist
      const userField = queryType?.getFields()["user"];
      const usersField = queryType?.getFields()["users"];
      const searchField = queryType?.getFields()["search"];
      expect(userField).toBeDefined();
      expect(usersField).toBeDefined();
      expect(searchField).toBeDefined();

      const createUserField = mutationType?.getFields()["createUser"];
      const createPostField = mutationType?.getFields()["createPost"];
      expect(createUserField).toBeDefined();
      expect(createPostField).toBeDefined();

      const userCreatedField = subscriptionType?.getFields()["userCreated"];
      const postCreatedField = subscriptionType?.getFields()["postCreated"];
      expect(userCreatedField).toBeDefined();
      expect(postCreatedField).toBeDefined();
    });

    it("Should validate enum types are properly parsed", async () => {
      const mockResponse = {
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue(TestSchemaFixtures.comprehensive.success),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const schema = await graphQLService.fetchSchema();

      const postStatusEnum = schema.getType("PostStatus");
      expect(postStatusEnum).toBeDefined();
      expect(postStatusEnum?.toString()).toContain("PostStatus");
    });

    it("Should validate union types are properly parsed", async () => {
      const mockResponse = {
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue(TestSchemaFixtures.comprehensive.success),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const schema = await graphQLService.fetchSchema();

      const searchResultUnion = schema.getType("SearchResult");
      expect(searchResultUnion).toBeDefined();
      expect(searchResultUnion?.toString()).toContain("SearchResult");
    });
  });
});
