export const mockIntrospectionResult = {
  data: {
    __schema: {
      queryType: { name: "Query" },
      mutationType: { name: "Mutation" },
      subscriptionType: null,
      types: [
        {
          kind: "OBJECT",
          name: "Query",
          description: null,
          fields: [
            {
              name: "getUser",
              description: "Retrieves a single user by their ID.",
              args: [
                {
                  name: "id",
                  description: "The user ID",
                  type: {
                    kind: "NON_NULL",
                    ofType: { kind: "SCALAR", name: "ID" },
                  },
                  defaultValue: null,
                },
              ],
              type: { kind: "OBJECT", name: "User" },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "OBJECT",
          name: "Mutation",
          description: null,
          fields: [
            {
              name: "createUser",
              description: "Creates a new user.",
              args: [
                {
                  name: "name",
                  description: "The user name",
                  type: {
                    kind: "NON_NULL",
                    ofType: { kind: "SCALAR", name: "String" },
                  },
                  defaultValue: null,
                },
              ],
              type: { kind: "OBJECT", name: "User" },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "OBJECT",
          name: "User",
          description: "A user object",
          fields: [
            {
              name: "id",
              description: "The user ID",
              args: [],
              type: {
                kind: "NON_NULL",
                ofType: { kind: "SCALAR", name: "ID" },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
            {
              name: "name",
              description: "The user name",
              args: [],
              type: {
                kind: "NON_NULL",
                ofType: { kind: "SCALAR", name: "String" },
              },
              isDeprecated: false,
              deprecationReason: null,
            },
          ],
          inputFields: null,
          interfaces: [],
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "SCALAR",
          name: "ID",
          description: "The `ID` scalar type represents a unique identifier",
          fields: null,
          inputFields: null,
          interfaces: null,
          enumValues: null,
          possibleTypes: null,
        },
        {
          kind: "SCALAR",
          name: "String",
          description: "The `String` scalar type represents textual data",
          fields: null,
          inputFields: null,
          interfaces: null,
          enumValues: null,
          possibleTypes: null,
        },
      ],
      directives: [],
    },
  },
};

export const mockUserExecutionResult = {
  data: {
    createUser: {
      id: "user-123",
      name: "Jane Doe",
    },
  },
};
