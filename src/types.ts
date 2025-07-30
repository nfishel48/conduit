export interface JsonSchema {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
    description?: string;
    items?: JsonSchema;
    properties?: { [key: string]: JsonSchema };
    required?: string[];
}
