# Promptbook vs Letta

> ⚠ TODO: This document was written by AI Agent and needs to be proofread; Read is with a grain of salt


Letta (the evolution of MemGPT) is a specialized framework for building AI agents with long-term memory. It uses a "Virtual Context Management" system (similar to an OS kernel) to allow agents to store and retrieve information beyond the standard LLM context window.

Letta is a powerful tool for building "stateless" agents that appear to have a deep memory of past interactions. Promptbook shares the goal of creating knowledgeable agents but approaches it through the `KNOWLEDGE` commitment (RAG and context management) and a focus on defining the agent's core character and rules in a portable language (Book).

## Side-by-Side Comparison

| Promptbook                                                                          | Letta                                                                  |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✔ **Book Language**: Declarative definitions of persona, rules, and knowledge.     | ✘ **Code-First**: Agents are primarily built and managed via Python/JS. |
| ✔ **Adversary Verification**: Specialized agents ensure compliance with rules.      | ✘ **Instruction-Based**: Rules are part of the system prompt.           |
| ✔ **Federated Ecosystem**: Agents can communicate across different servers.          | ✘ **Standalone Instances**: Focused on managing individual agent state. |
| ✔ **Commitment-Based Knowledge**: Native support for RAG via `KNOWLEDGE`.           | ✔ **Virtual Context**: Advanced memory management (archival/recall).    |
| ✔ **Language Agnostic**: Run agents anywhere with the Promptbook Engine.            | ✘ **Framework Specific**: Tied to the MemGPT/Letta ecosystem.           |
| 💡 **Agent Personality**: Strong focus on character traits and team dynamics.       | 💡 **Agent Memory**: Exceptional at managing "infinite" context.        |

**Best for:** Building standardized, reliable, and rules-based AI agents that need to be portable and federated. | **Best for:** Applications requiring agents with deep, long-term memory of past interactions and state.
