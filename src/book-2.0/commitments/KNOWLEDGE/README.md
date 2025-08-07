# KNOWLEDGE Commitment with RAG Support

The KNOWLEDGE commitment has been enhanced to support RAG (Retrieval-Augmented Generation) for external knowledge sources like PDF files.

## Features

- **Direct Text Knowledge**: Add knowledge directly as text in the agent source
- **External Sources**: Support for PDF files and other formats via URLs
- **RAG Processing**: Automatic chunking and retrieval of relevant information
- **Extensible Architecture**: Easy to add support for new file formats

## Usage

### Direct Text Knowledge

```
KNOWLEDGE The company was founded in 2020 and specializes in AI-powered solutions
KNOWLEDGE Our main product is a chatbot platform with over 10,000 users
```

### External Knowledge Sources

```
KNOWLEDGE https://example.com/company-handbook.pdf
KNOWLEDGE https://example.com/product-documentation.pdf
```

## Supported Formats

- **PDF** (`.pdf`) - Extracts text content and splits into chunks
- **Text** (`.txt`) - Plain text files
- **Markdown** (`.md`, `.markdown`) - Treated as text (future enhancement planned)
- **HTML** (`.html`, `.htm`) - Treated as text (future enhancement planned)

## How It Works

1. **Processing**: When a URL is provided, the system:
   - Stores the URL in the agent metadata for later processing
   - During chat initialization, sends URLs to the backend API
   - Backend fetches content, detects format, and processes with appropriate handlers
   - PDF files are processed using `pdf-parse` on the server
   - Content is split into chunks and returned to the frontend

2. **Retrieval**: During chat, the system:
   - Sends user queries to the backend retrieval API
   - Backend analyzes queries and finds relevant chunks using keyword matching
   - Returns formatted context to the frontend

3. **Response**: The AI model uses the retrieved context to provide informed responses

## Architecture

The system uses a **backend-first approach** to avoid Node.js dependencies in the frontend:

- **Frontend**: `FrontendRAGService` handles API communication
- **Backend**: Two API endpoints handle processing and retrieval
- **Vercel Compatible**: All PDF processing happens on the server side

## Configuration

The RAG system can be configured with:

```typescript
const config: RAGConfig = {
    maxChunkSize: 1000,        // Maximum size of each chunk
    chunkOverlap: 200,         // Overlap between chunks
    maxRetrievedChunks: 5,     // Maximum chunks to retrieve per query
    minRelevanceScore: 0.1,    // Minimum relevance score for inclusion
};
```

## Architecture

### Core Components

- **RAGService**: Main service for processing and retrieving knowledge
- **ProcessorFactory**: Creates appropriate processors for different formats
- **BaseKnowledgeProcessor**: Abstract base class for all processors
- **PdfProcessor**: Handles PDF file processing
- **TextProcessor**: Handles plain text files
- **RAGHelper**: Utility functions for chat integration

### File Structure

```
src/book/commitments/KNOWLEDGE/
├── KNOWLEDGE.ts              # Main commitment definition
├── RAGService.ts            # RAG processing service
├── types.ts                 # TypeScript type definitions
├── processors/
│   ├── BaseKnowledgeProcessor.ts
│   ├── PdfProcessor.ts
│   ├── TextProcessor.ts
│   └── ProcessorFactory.ts
├── utils/
│   └── ragHelper.ts         # Helper utilities for chat integration
└── README.md               # This file
```

## Integration with Chat Systems

To integrate RAG with a chat system:

```typescript
import { RAGHelper } from './book/commitments/KNOWLEDGE';

// Initialize knowledge sources when starting a chat
const ragService = await RAGHelper.initializeKnowledgeSources(agentRequirements);

// Get relevant context for each user query
const updatedRequirements = RAGHelper.updateSystemMessageWithContext(
    agentRequirements,
    ragService,
    userQuery
);

// Use updatedRequirements when calling the AI model
```

## Future Enhancements

- **Vector Embeddings**: Replace keyword matching with semantic similarity
- **More Formats**: Add support for Word documents, PowerPoint, etc.
- **Caching**: Implement persistent storage for processed knowledge
- **Advanced Chunking**: Use semantic chunking instead of simple text splitting
- **Knowledge Graph**: Build relationships between different knowledge sources

## Error Handling

The system gracefully handles errors:
- Invalid URLs fall back to treating content as direct text
- Failed PDF processing logs errors but continues with other sources
- Network failures are logged and don't break the entire system

## Performance Considerations

- Knowledge sources are processed asynchronously
- Chunks are cached in memory during the session
- Large PDFs are automatically split into manageable chunks
- Retrieval uses efficient keyword matching (O(n) complexity)

## Security

- URLs are validated to prevent access to private networks
- File size limits are enforced to prevent memory issues
- Content is sanitized during processing
