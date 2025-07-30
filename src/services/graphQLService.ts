import { buildClientSchema, getIntrospectionQuery, type IntrospectionQuery, type GraphQLSchema } from 'graphql';

export class GraphQLService {
    private readonly apiUrl: string;
    private readonly apiToken?: string;

    constructor(apiUrl: string, apiToken?: string) {
        this.apiUrl = apiUrl;
        this.apiToken = apiToken;
    }

    public getApiUrl(): string {
        return this.apiUrl;
    }

    public getApiToken(): string | undefined {
        return this.apiToken;
    }

    public async fetchSchema(): Promise<GraphQLSchema> {
        try {
            console.log(`Fetching schema from ${this.apiUrl}...`);
            const introspectionQuery = getIntrospectionQuery();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (this.apiToken) {
                headers['Authorization'] = `Bearer ${this.apiToken}`;
            }

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({ query: introspectionQuery }),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch schema: ${response.statusText}`);
            }

            const result = await response.json();
            if (result.errors) {
                throw new Error(`GraphQL introspection query failed: ${JSON.stringify(result.errors)}`);
            }
            
            const introspectionData = result.data as IntrospectionQuery;
            const clientSchema = buildClientSchema(introspectionData);
            console.log("Successfully fetched and built client schema.");
            return clientSchema;
        } catch (error) {
            console.error("Error during schema introspection:", error);
            throw error;
        }
    }
}
