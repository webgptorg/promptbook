# Scraping

**Scraping** is the process of extracting textual information from websites, PDFs, or other documents so that it can be used by an [Agent](../core/agent.md). In Promptbook, scraping is a core part of the [KNOWLEDGE](../commitments/knowledge.md) system and the [USE BROWSER](../commitments/use-browser.md) capability.

## How it works

When you provide a URL as a knowledge source, Promptbook's scraping engine:
1.  **Fetches** the content of the page.
2.  **Cleans** the data by removing HTML tags, scripts, and navigation elements.
3.  **Converts** the content into plain text or Markdown.
4.  **Indexes** the text so that the agent can efficiently search and retrieve relevant parts of it during a conversation.

## Features

-   **Deep Scraping**: Promptbook can follow links on a website to a certain depth (e.g., scraping an entire documentation site).
-   **Multiple Formats**: Supports HTML, PDF, and plain text files.
-   **Real-time Scraping**: When using [USE BROWSER](../commitments/use-browser.md), scraping happens dynamically during the conversation.

## Benefits

-   **RAG (Retrieval-Augmented Generation)**: Allows agents to "read" documentation before answering.
-   **Automated Knowledge Base**: Keeps the agent's knowledge up-to-date without manual data entry.

## Related Concepts

-   [**Knowledge**](../commitments/knowledge.md)
-   [**USE BROWSER**](../commitments/use-browser.md)
-   [**Agent**](../core/agent.md)
-   [**LLM**](./llm.md)
