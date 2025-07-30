import {
  buildSchema,
  introspectionFromSchema,
  type IntrospectionQuery,
} from "graphql";

// Simple schema for E2E testing
const SIMPLE_SCHEMA_SDL = `
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

// Create the simple schema and introspection data
const simpleSchema = buildSchema(SIMPLE_SCHEMA_SDL);
const simpleIntrospectionData = introspectionFromSchema(simpleSchema);

// Export the mock data
export const mockIntrospectionResult = {
  data: simpleIntrospectionData,
};

export const mockUserExecutionResult = {
  data: {
    createUser: {
      id: "user-123",
      name: "Jane Doe",
    },
  },
};

// Additional mock data for E2E testing scenarios
export const mockGraphQLResponses = {
  // Success responses
  introspection: {
    ok: true,
    json: async () => mockIntrospectionResult,
  },

  userCreation: {
    ok: true,
    json: async () => mockUserExecutionResult,
  },

  // Error responses
  networkError: {
    ok: false,
    status: 500,
    statusText: "Internal Server Error",
  },

  graphqlError: {
    ok: true,
    json: async () => ({
      errors: [{ message: "User already exists" }],
    }),
  },

  authError: {
    ok: true,
    json: async () => ({
      errors: [
        {
          message: "You must be authenticated to perform this action.",
          extensions: { code: "UNAUTHENTICATED" },
        },
      ],
    }),
  },

  rateLimitError: {
    ok: true,
    json: async () => ({
      errors: [
        {
          message: "Rate limit exceeded",
          extensions: { code: "RATE_LIMITED", retryAfter: 60 },
        },
      ],
    }),
  },
} as const;

// Helper functions
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

export function createMockErrorResponse(
  errors: Array<{ message: string; extensions?: Record<string, any> }>,
): {
  errors: Array<{ message: string; extensions?: Record<string, any> }>;
} {
  return { errors };
}

export function createCustomUserResult(id: string, name: string) {
  return {
    ok: true,
    json: async () => createSimpleUserExecutionResult({ id, name }),
  };
}

export function createCustomErrorResponse(message: string, code?: string) {
  return {
    ok: true,
    json: async () =>
      createMockErrorResponse([
        {
          message,
          ...(code && { extensions: { code } }),
        },
      ]),
  };
}
