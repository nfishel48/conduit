import {
  buildSchema,
  introspectionFromSchema,
  type GraphQLSchema,
  type IntrospectionQuery,
} from "graphql";

/**
 * Simple test GraphQL schema for E2E tests - matches the existing mock structure
 */
export const SIMPLE_SCHEMA_SDL = `
  type Query {
    getUser(id: ID!): User
  }

  type Mutation {
    createUser(name: String!): User
  }

  type User {
    id: ID!
    name: String!
  }
`;

/**
 * Comprehensive test GraphQL schema for unit tests
 */
export const COMPREHENSIVE_SCHEMA_SDL = `
  type Query {
    user(id: ID!): User
    users: [User!]!
    post(id: ID!): Post
    posts: [Post!]!
    search(query: String!): [SearchResult!]!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    createPost(input: CreatePostInput!): Post!
    updatePost(id: ID!, input: UpdatePostInput!): Post!
    deletePost(id: ID!): Boolean!
  }

  type Subscription {
    userCreated: User!
    postCreated: Post!
  }

  type User {
    id: ID!
    username: String!
    email: String!
    posts: [Post!]!
    followers: [User!]!
    following: [User!]!
    createdAt: String!
    updatedAt: String!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    tags: [String!]!
    likes: Int!
    status: PostStatus!
    createdAt: String!
    updatedAt: String!
  }

  union SearchResult = User | Post

  input CreateUserInput {
    username: String!
    email: String!
  }

  input UpdateUserInput {
    username: String
    email: String
  }

  input CreatePostInput {
    title: String!
    content: String!
    authorId: ID!
    tags: [String!]
  }

  input UpdatePostInput {
    title: String
    content: String
    tags: [String!]
    status: PostStatus
  }

  enum PostStatus {
    DRAFT
    PUBLISHED
    ARCHIVED
  }
`;

/**
 * Creates a simple test GraphQL schema for E2E tests
 */
export function createSimpleSchema(): GraphQLSchema {
  return buildSchema(SIMPLE_SCHEMA_SDL);
}

/**
 * Creates a comprehensive test GraphQL schema for unit tests
 */
export function createComprehensiveSchema(): GraphQLSchema {
  return buildSchema(COMPREHENSIVE_SCHEMA_SDL);
}

/**
 * Creates introspection data from the simple schema
 */
export function createSimpleIntrospectionData(): IntrospectionQuery {
  const schema = createSimpleSchema();
  return introspectionFromSchema(schema);
}

/**
 * Creates introspection data from the comprehensive schema
 */
export function createComprehensiveIntrospectionData(): IntrospectionQuery {
  const schema = createComprehensiveSchema();
  return introspectionFromSchema(schema);
}

/**
 * Creates mock GraphQL response data for successful introspection (simple schema)
 */
export function createSimpleMockResponse(): {
  data: IntrospectionQuery;
} {
  return {
    data: createSimpleIntrospectionData(),
  };
}

/**
 * Creates mock GraphQL response data for successful introspection (comprehensive schema)
 */
export function createComprehensiveMockResponse(): {
  data: IntrospectionQuery;
} {
  return {
    data: createComprehensiveIntrospectionData(),
  };
}

/**
 * Creates mock GraphQL response data with errors
 */
export function createMockErrorResponse(
  errors: Array<{ message: string; extensions?: Record<string, any> }>,
): {
  errors: Array<{ message: string; extensions?: Record<string, any> }>;
} {
  return { errors };
}

/**
 * Creates mock execution result for simple user creation
 */
export function createSimpleUserExecutionResult(userData: {
  id: string;
  name: string;
}) {
  return {
    data: {
      createUser: userData,
    },
  };
}

/**
 * Legacy compatibility - matches the existing mockGraphQL.ts structure
 */
export const legacyMockIntrospectionResult = {
  data: createSimpleIntrospectionData(),
};

export const legacyMockUserExecutionResult = createSimpleUserExecutionResult({
  id: "user-123",
  name: "Jane Doe",
});

/**
 * Common test schema fixtures for different scenarios
 */
export const TestSchemaFixtures = {
  // Simple schema responses (for E2E tests)
  simple: {
    success: createSimpleMockResponse(),
    userExecution: legacyMockUserExecutionResult,
  },

  // Comprehensive schema responses (for unit tests)
  comprehensive: {
    success: createComprehensiveMockResponse(),
  },

  // Common error responses
  errors: {
    introspectionDisabled: createMockErrorResponse([
      { message: "Schema introspection is disabled" },
    ]),

    unauthorized: createMockErrorResponse([
      {
        message: "You must be authenticated to perform this action.",
        extensions: { code: "UNAUTHENTICATED" },
      },
    ]),

    rateLimited: createMockErrorResponse([
      {
        message: "Rate limit exceeded",
        extensions: { code: "RATE_LIMITED", retryAfter: 60 },
      },
    ]),

    syntaxError: createMockErrorResponse([
      {
        message: "Syntax Error: Expected Name, found }",
        extensions: { code: "GRAPHQL_PARSE_FAILED" },
      },
    ]),

    networkError: createMockErrorResponse([
      {
        message: "Network error",
        extensions: { code: "NETWORK_ERROR" },
      },
    ]),

    userAlreadyExists: createMockErrorResponse([
      {
        message: "User already exists",
        extensions: { code: "USER_EXISTS" },
      },
    ]),
  },
} as const;
