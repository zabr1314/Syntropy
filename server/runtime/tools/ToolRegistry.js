export class ToolRegistry {
    constructor() {
        this.tools = new Map();
        
        // Register default tools
        this.registerSystemTools();
    }

    /**
     * Register a tool
     * @param {Object} toolDefinition { name, description, parameters, handler }
     */
    register(toolDefinition) {
        if (!toolDefinition.name || !toolDefinition.handler) {
            throw new Error('Tool must have name and handler');
        }
        
        // Construct OpenAI Tool Format
        const openAiTool = {
            type: 'function',
            function: {
                name: toolDefinition.name,
                description: toolDefinition.description,
                parameters: toolDefinition.parameters
            }
        };

        this.tools.set(toolDefinition.name, {
            definition: openAiTool,
            handler: toolDefinition.handler
        });
        
        console.log(`[ToolRegistry] Registered tool: ${toolDefinition.name}`);
    }

    /**
     * Get tool definition for LLM
     * @param {string} toolName 
     */
    getDefinition(toolName) {
        return this.tools.get(toolName)?.definition;
    }

    /**
     * Get tool handler
     * @param {string} toolName 
     */
    getHandler(toolName) {
        return this.tools.get(toolName)?.handler;
    }

    /**
     * Register system-wide default tools
     */
    registerSystemTools() {
        // Example: Search Knowledge (Placeholder)
        this.register({
            name: 'search_knowledge',
            description: 'Search for historical or legal knowledge in the database.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'The search query' }
                },
                required: ['query']
            },
            handler: async ({ query }) => {
                return `Searching for "${query}"... (Mock Result: No records found yet)`;
            }
        });
    }
}
