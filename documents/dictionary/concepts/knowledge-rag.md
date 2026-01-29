# 🧠 Knowledge (RAG)

**Knowledge** is a core concept and a [🤝 Commitment](../commitments/README.md) that enables an [Agent](../agents/README.md) to access and use information beyond its initial training data. This is achieved through a technique called **Retrieval-Augmented Generation (RAG)**.

💡 Knowledge allows your agent to have "eyes" on your specific data, documents, or websites.

## Usage

```book
KNOWLEDGE [URL / File Path / Search Query]
```

## Examples

### 📚 Librarian Leo
```book
Leo the Librarian

PERSONA You are a helpful librarian with access to a vast digital archive.
KNOWLEDGE https://archive.org/
KNOWLEDGE ./local-documents/library-catalog.pdf
```

### 🏥 Medical Assistant Dr. Smith
```book
Dr. Smith

PERSONA You are a medical assistant specialized in oncology.
RULE Always state that you are an AI and not a doctor.
KNOWLEDGE https://www.cancer.org/
KNOWLEDGE https://pubmed.ncbi.nlm.nih.gov/
```

## How it Works

1.  **Ingestion**: The specified sources are read and broken down into smaller, searchable pieces (chunks).
2.  **Indexing**: These chunks are converted into mathematical representations (embeddings) and stored in a vector database.
3.  **Retrieval**: When a user asks a question, the agent searches the database for the most relevant chunks of information.
4.  **Generation**: The agent uses these chunks as context to generate a highly accurate and informed response.

## Benefits

-   **Reduced Hallucinations**: The agent bases its answers on factual data rather than "guessing."
-   **Up-to-Date Information**: By pointing to live URLs, the agent can access the latest information.
-   **Privacy**: You can provide agents with private datasets that are not available to the public.

## Related
- [🤖 Agent](../agents/README.md)
- [🤝 Commitments](../commitments/README.md)
- [🔍 `USE SEARCH ENGINE`](../commitments/use-search-engine.md)
- [🌐 `USE BROWSER`](../commitments/use-browser.md)
