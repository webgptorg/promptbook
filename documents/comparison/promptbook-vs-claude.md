# Promptbook vs Claude

> ⚠ TODO: This document was written by AI Agent and needs to be proofread; Read is with a grain of salt

Claude is a family of large language models developed by Anthropic, designed to be helpful, honest, and harmless. Claude is known for its strong reasoning capabilities, long context window, and articulate writing style. Anthropic also provides "Projects" and "Artifacts" to enhance the developer experience.

While Claude excels at processing large amounts of information and maintaining a consistent tone, it is primarily a model-centric product. Promptbook, on the other hand, provides an agent-centric abstraction that allows developers to define persistent personas and rules that remain consistent regardless of the underlying model version. In professional environments, Claude's "Constitutional AI" can sometimes be too restrictive or unpredictable, a problem Promptbook addresses with explicit, auditable **Commitments**.

## Side-by-Side Comparison

| Promptbook                                                                           | Claude                                                                     |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| ✔ **Persistent Agent Identity**: Decoupled from the specific model version.          | ✔ **Long Context Window**: Up to 200K tokens for massive documents.       |
| ✔ **Multi-Model Support**: Switch between OpenAI, Anthropic, and others easily.      | ✔ **Superior Reasoning**: Excellent at complex analysis and nuanced tasks.|
| ✔ **Strict Behavioral Constraints**: `RULE` commitment ensures compliance.           | ✔ **Constitutional AI**: Built-in safety and ethical guidelines.          |
| ✔ **Structured Agent Definitions**: Written in `.book` format for portability.       | ✔ **Projects & Artifacts**: Organizational tools for context management.  |
| ✔ **External Knowledge Integration**: Native `KNOWLEDGE` commitment for RAG.         | ✔ **Articulate Writing**: Known for high-quality, well-structured output. |
| ✔ **Auditable Commitments**: Rules are verifiable and can be tested via adversaries. | ✘ **Black Box**: Alignment logic is internal and not easily customized.    |
| ✘ **Requires Agent Definition**: More setup needed compared to using models directly.| ✘ **Ecosystem Locked**: Optimized for Anthropic's own infrastructure.      |
| 💡 **Agent Abstraction**: Focuses on _who_ the AI is and _what_ it must do.          | 💡 **Model Power**: Focuses on the raw intelligence and window size.       |

**Best for:** Building professional AI agents with long-term stability, strict rules, and cross-provider flexibility where agent behavior must be consistent and auditable. | **Best for:** Complex reasoning, creative writing, processing very large documents, and tasks requiring sophisticated analysis with strong ethical guardrails.
