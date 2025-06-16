# OpenAI Compatible Execution Tools Example

This example demonstrates how to use `OpenAiCompatibleExecutionTools` with a custom `baseURL` to connect to any OpenAI-compatible LLM service.

## Overview

The `OpenAiCompatibleExecutionTools` now supports the `baseURL` parameter, allowing you to connect to various OpenAI-compatible APIs including:

- **OpenAI** (default): `https://api.openai.com/v1`
- **Local Ollama**: `http://localhost:11434/v1`
- **DeepSeek**: `https://api.deepseek.com/v1`
- **Any other OpenAI-compatible endpoint**

## Usage

### Basic Usage

```typescript
import { createOpenAiCompatibleExecutionTools } from '@promptbook/openai';

const tools = createOpenAiCompatibleExecutionTools({
    apiKey: 'your-api-key',
    baseURL: 'https://your-openai-compatible-endpoint.com/v1',
    isVerbose: true,
});
```

### Environment Variables

You can also configure the tools using environment variables:

```bash
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://your-endpoint.com/v1"
```

Then create the tools:

```typescript
const tools = createOpenAiCompatibleExecutionTools({
    apiKey: process.env.OPENAI_API_KEY!,
    baseURL: process.env.OPENAI_BASE_URL,
});
```

## Running the Example

### Prerequisites

1. Make sure you're in the root directory of the promptbook project
2. Install dependencies: `npm install`

### With OpenAI

```bash
OPENAI_API_KEY=sk-your-openai-key npm run ts-node examples/usage/openai-compatible/openai-compatible-example.ts
```

### With Custom Endpoint

```bash
OPENAI_API_KEY=your-key OPENAI_BASE_URL=https://your-endpoint.com/v1 npm run ts-node examples/usage/openai-compatible/openai-compatible-example.ts
```

### With Local Ollama

First, make sure Ollama is running locally:

```bash
# Install and start Ollama
ollama serve
```

Then run the example:

```bash
OPENAI_API_KEY=ollama OPENAI_BASE_URL=http://localhost:11434/v1 npm run ts-node examples/usage/openai-compatible/openai-compatible-example.ts
```

## Configuration Options

The `OpenAiCompatibleExecutionToolsOptions` includes all standard OpenAI client options plus:

- `baseURL`: The base URL for the OpenAI-compatible API endpoint
- `apiKey`: Your API key for the service
- `maxRequestsPerMinute`: Rate limiting (optional)
- `isVerbose`: Enable verbose logging (optional)

## Supported Services

### OpenAI
- **baseURL**: `https://api.openai.com/v1` (default)
- **API Key**: Required (starts with `sk-`)

### Ollama (Local)
- **baseURL**: `http://localhost:11434/v1`
- **API Key**: Any value (Ollama doesn't validate API keys)

### DeepSeek
- **baseURL**: `https://api.deepseek.com/v1`
- **API Key**: Required (DeepSeek API key)

### Other Compatible Services
Any service that implements the OpenAI API specification should work by setting the appropriate `baseURL`.

## Notes

- The `baseURL` parameter is now explicitly documented and supported
- Environment variable `OPENAI_BASE_URL` is automatically recognized
- All OpenAI client options are supported through the underlying OpenAI SDK
- The tools maintain full compatibility with the existing OpenAI implementation
