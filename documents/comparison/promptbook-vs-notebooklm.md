# Promptbook vs NotebookLM

NotebookLM is an AI-powered research and writing tool from Google. It is designed to help users synthesize information from multiple sources (documents, slides, websites) by creating a "source-grounded" AI that only answers based on the provided material. It is particularly known for its "Audio Overview" feature that creates podcast-like summaries of data.

While NotebookLM is an exceptional tool for personal research and "chatting with your data," it is a closed consumer product with limited extensibility and no API. Promptbook provides a similar "knowledge-grounded" experience through its `KNOWLEDGE` commitment but does so in an open, programmable, and highly customizable way. Promptbook is designed for building production-grade agents that can be integrated into professional software ecosystems, whereas NotebookLM is a standalone research workspace.

## Side-by-Side Comparison

| Promptbook                                                                          | NotebookLM                                                             |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✔ **Programmable Agent Traits**: Define Persona, Rules, and Team structure.        | ✘ **Fixed Assistant Personality**: Lacks customization of the AI's tone. |
| ✔ **Developer-First**: Accessible via API, CLI, and SDK for custom apps.            | ✘ **Consumer-Only**: No public API for integrating into other tools.   |
| ✔ **Multi-Source Knowledge**: Native support for URLs and local files via `KNOWLEDGE`. | ✔ **Source-Grounded**: Excellent at keeping responses tied to data.    |
| ✔ **Enforceable Behavioral Rules**: `RULE` commitment ensures agent compliance.     | ✘ **Limited Control**: Rules cannot be explicitly enforced or audited.  |
| ✔ **Model Freedom**: Use any LLM provider (OpenAI, Anthropic, Google, etc.).        | ✘ **Vendor Locked**: Limited to Google's Gemini models.                |
| ✔ **Federated Ecosystem**: Connect and use agents across different servers.          | ✘ **Isolated Workspace**: Data and chat are siloed within the project.  |
| ✔ **Custom UI/UX**: Embed the agent anywhere using the Promptbook Engine.           | ✘ **Standard UI**: Limited to Google's web interface.                   |
| 💡 **Agent Creation**: Focuses on building a persistent expert "being".             | 💡 **Research Tool**: Focuses on analyzing and summarizing documents.   |

**Best for:** Developers building specialized AI experts with deep knowledge bases that can be integrated into professional software ecosystems and custom applications. | **Best for:** Individuals and researchers who need a quick, hosted way to analyze, summarize, and brainstorm based on a specific set of documents and notes.
