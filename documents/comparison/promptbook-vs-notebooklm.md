# Promptbook vs NotebookLM

NotebookLM is an experimental AI-powered research and writing tool from Google. It is designed to help users synthesize information from multiple sources (documents, slides, websites) by creating a "source-grounded" AI that only answers based on the provided material.

While NotebookLM is excellent for personal research and "chatting with your data," it is a closed consumer product with limited extensibility. Promptbook provides a similar "knowledge-grounded" experience through its `KNOWLEDGE` commitment but does so in an open, programmable, and highly customizable way that is suitable for building production-grade agents.

## Side-by-Side Comparison

| Promptbook                                                                          | NotebookLM                                                             |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✔ **Programmable Agent Traits**: Define Persona, Rules, and Team structure.        | ✘ **Fixed Assistant Personality**: Lacks customization of the AI's tone. |
| ✔ **Developer-First**: Accessible via API, CLI, and SDK for custom apps.            | ✘ **Consumer-Only**: No public API for integrating into other tools.   |
| ✔ **Multi-Source Knowledge**: Native support for URLs and local files via `KNOWLEDGE`. | ✔ **Source-Grounded**: Excellent at keeping responses tied to data.    |
| ✔ **Enforceable Behavioral Rules**: `RULE` commitment ensures agent compliance.     | ✘ **Limited Control**: Rules cannot be explicitly enforced or audited.  |
| ✔ **Model Freedom**: Use any LLM provider (OpenAI, Anthropic, Google, etc.).        | ✘ **Vendor Locked**: Limited to Google's Gemini models.                |
| 💡 **Agent Creation**: Focuses on building a persistent expert "being".             | 💡 **Research Tool**: Focuses on analyzing and summarizing documents.   |

**Best for:** Building specialized AI experts with deep knowledge bases that can be integrated into professional software ecosystems. | **Best for:** Personal research, summarizing long documents, and brainstorming based on a specific set of private notes.
