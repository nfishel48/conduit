import {
  type GraphQLSchema,
  type GraphQLType,
  type GraphQLField,
  type GraphQLArgument,
  type GraphQLNonNull,
  type GraphQLList,
} from "graphql";
import { z } from "zod";
import { JsonSchema } from "../types.js";

export class ToolFactory {
  private readonly apiUrl: string;
  private readonly apiToken?: string;

  constructor(apiUrl: string, apiToken?: string) {
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
  }

  public async createToolInfo(
    fieldName: string,
    field: GraphQLField<any, any>,
    type: "query" | "mutation",
  ): Promise<any> {
    // Create Zod schema for input validation
    const inputSchemaProperties: Record<string, z.ZodType> = {};

    field.args.forEach((arg: GraphQLArgument) => {
      const zodType = this.mapGqlTypeToZod(arg.type);
      inputSchemaProperties[arg.name] = zodType;
    });

    const inputSchema = z.object(inputSchemaProperties);

    return {
      name: fieldName,
      description: field.description || `Executes the ${fieldName} ${type}.`,
      inputSchema: this.zodToJsonSchema(inputSchema),
      handler: async (args: any) =>
        this.createExecutor(fieldName, field, type, args),
    };
  }

  private async createExecutor(
    fieldName: string,
    field: GraphQLField<any, any>,
    type: "query" | "mutation",
    args: any,
  ) {
    console.log(`Executing tool '${fieldName}' with args:`, args);

    const argDefinitions = field.args
      .map((arg) => `$${arg.name}: ${arg.type.toString()}`)
      .join(", ");
    const argUsage = field.args
      .map((arg) => `${arg.name}: $${arg.name}`)
      .join(", ");

    // Build a more comprehensive selection set
    const returnTypeName = field.type.toString().replace(/\[|\]|!/g, "");
    const selectionSet = this.buildSelectionSet(returnTypeName);

    const query = `
            ${type}${argDefinitions ? `(${argDefinitions})` : ""} {
                ${fieldName}${argUsage ? `(${argUsage})` : ""} ${selectionSet}
            }
        `;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.apiToken) {
        headers["Authorization"] = `Bearer ${this.apiToken}`;
      }

      const gqlResponse = await fetch(this.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables: args }),
      });

      const result = await gqlResponse.json();

      if (result.errors) {
        throw new Error(`API Error: ${result.errors[0].message}`);
      }

      console.log("Execution successful, result:", result.data);
      const data = result.data[fieldName];

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`Error executing tool '${fieldName}':`, error);
      throw error;
    }
  }

  private buildSelectionSet(typeName: string): string {
    // For scalar types, no selection set needed
    if (["String", "Int", "Float", "Boolean", "ID"].includes(typeName)) {
      return "";
    }

    // For object types, request common fields
    return `{
            id
            name
            ... on ${typeName} {
                __typename
            }
        }`;
  }

  private mapGqlTypeToZod(gqlType: GraphQLType): z.ZodType {
    if ("ofType" in gqlType) {
      const wrappedType = gqlType as GraphQLNonNull<any> | GraphQLList<any>;
      if (wrappedType.constructor.name === "GraphQLNonNull") {
        return this.mapGqlTypeToZod(wrappedType.ofType);
      }
      if (wrappedType.constructor.name === "GraphQLList") {
        return z.array(this.mapGqlTypeToZod(wrappedType.ofType));
      }
    }

    switch (gqlType.toString()) {
      case "Int":
      case "Float":
        return z.number();
      case "String":
      case "ID":
        return z.string();
      case "Boolean":
        return z.boolean();
      default:
        return z
          .string()
          .describe(`Represents GraphQL type '${gqlType.toString()}'`);
    }
  }

  private zodToJsonSchema(zodSchema: z.ZodObject<any>): any {
    const shape = zodSchema._def.shape();
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodType = value as z.ZodType;
      properties[key] = this.convertZodTypeToJsonSchema(zodType);

      if (!zodType.isOptional()) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  private convertZodTypeToJsonSchema(zodType: z.ZodType): any {
    const typeName = zodType._def.typeName;

    switch (typeName) {
      case "ZodString":
        return { type: "string" };
      case "ZodNumber":
        return { type: "number" };
      case "ZodBoolean":
        return { type: "boolean" };
      case "ZodArray":
        return {
          type: "array",
          items: this.convertZodTypeToJsonSchema(
            (zodType as z.ZodArray<any>)._def.type,
          ),
        };
      case "ZodOptional":
        return this.convertZodTypeToJsonSchema(
          (zodType as z.ZodOptional<any>)._def.innerType,
        );
      default:
        return { type: "string", description: `Unknown type: ${typeName}` };
    }
  }
}
