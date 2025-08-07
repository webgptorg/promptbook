# KNOWLEDGE Commitment Example

This example demonstrates how to use the enhanced KNOWLEDGE commitment with RAG support.

## Example Agent Source

```
PERSONA You are a helpful customer support agent for TechCorp.

KNOWLEDGE TechCorp was founded in 2020 and specializes in AI-powered business solutions.
KNOWLEDGE https://example.com/techcorp-handbook.pdf
KNOWLEDGE https://example.com/product-documentation.pdf

RULE Always be polite and professional in your responses.
RULE If you don't know something, admit it and offer to find out more.

FORMAT Respond in a friendly, conversational tone.
```

## How It Works

1. **Direct Knowledge**: The first KNOWLEDGE line adds direct text knowledge about TechCorp.

2. **External Sources**: The PDF URLs are processed:
   - URLs are stored in agent metadata during commitment processing
   - During chat initialization, URLs are sent to backend API
   - Backend fetches PDF files and extracts text using pdf-parse
   - Content is split into chunks and returned to frontend

3. **During Chat**: When a user asks a question:
   - The system analyzes the query for relevant keywords
   - Retrieves the most relevant chunks (default: top 5)
   - Adds the context to the system message
   - The AI model responds using both its training and the retrieved knowledge

## Example Conversation

**User**: "What products does TechCorp offer?"

**System Processing**:
1. Query analysis: keywords ["products", "techcorp", "offer"]
2. Chunk retrieval: Finds relevant sections from product-documentation.pdf
3. Context injection: Adds relevant product information to system message

**Agent Response**: "Based on our product documentation, TechCorp offers several AI-powered business solutions including..."

## Benefits

- **Up-to-date Information**: External sources can be updated without changing the agent source
- **Comprehensive Knowledge**: Large documents are automatically processed and made searchable
- **Relevant Context**: Only the most relevant information is provided for each query
- **Fallback Handling**: If external sources fail, the system continues with direct knowledge

## Configuration Options

You can customize the RAG behavior by modifying the configuration in the RAGService:

```typescript
const ragConfig = {
    maxChunkSize: 1500,        // Larger chunks for more context
    chunkOverlap: 300,         // More overlap for better continuity
    maxRetrievedChunks: 3,     // Fewer chunks for focused responses
    minRelevanceScore: 0.2,    // Higher threshold for relevance
};
```

## Supported File Types

- **PDF Files**: Full text extraction with page number tracking
- **Text Files**: Direct processing of plain text content
- **Future Support**: Markdown, HTML, Word documents, and more

## Error Handling

The system gracefully handles various error scenarios:

- **Invalid URLs**: Treated as direct text knowledge
- **Network Failures**: Logged but don't break the agent
- **Unsupported Formats**: Fall back to text processing
- **Large Files**: Automatically chunked for efficient processing

## Performance Notes

- Knowledge sources are processed asynchronously during agent initialization
- Retrieval is optimized for speed using keyword matching
- Memory usage is managed through chunking
- Future versions will support vector embeddings for better semantic matching
