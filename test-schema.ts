import { mapResponseFormatToAgentOutputType } from './src/llm-providers/openai/OpenAiAgentKitExecutionTools';

const userSchema = {
    type: "json_schema",
    json_schema: {
      type: "object",
      properties: {
        topics: {
          type: "array",
          items: {
            type: "string"
          }
        },
        message: {
          type: "string"
        }
      },
      required: [
        "topics",
        "message"
      ]
    }
};

console.log(JSON.stringify(mapResponseFormatToAgentOutputType(userSchema as any), null, 2));