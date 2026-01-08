# Promptbook vs Wordware

Wordware is a "Language-oriented programming" platform and IDE designed specifically for building AI agents and applications. It allows developers to write prompts and logic in a unified interface, treating natural language as a first-class citizen in the development process.

Wordware and Promptbook share a similar philosophy: that natural language is the future of programming. However, while Wordware focuses on a web-based IDE and hosted execution, Promptbook provides a more decentralized, portable approach with its open-source Engine and text-based `.book` format.

## Side-by-Side Comparison

| Promptbook                                                                          | Wordware                                                               |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✔ **Open Source Engine**: Run agents on your own infrastructure or federated servers. | ✘ **Hosted Platform**: Execution is primarily tied to Wordware's cloud. |
| ✔ **Text-Based `.book` Files**: Easy to version control with Git and standard tools. | ✘ **IDE-Centric**: Configuration is often managed through their web UI. |
| ✔ **Adversary Verification**: Uses specialized agents to enforce rules and safety.   | ✘ **Implicit Logic**: Relies on the developer's prompt structure.       |
| ✔ **Multi-Model Portability**: Agents are truly agnostic to the underlying LLM.     | ✔ **Multi-Model Support**: Excellent support for switching models.     |
| ✔ **Federated Ecosystem**: Connect agents across different servers and domains.      | ✘ **Centralized**: Interaction is within the Wordware ecosystem.        |
| 💡 **Agent Personality**: Explicit `PERSONA` and `TEAM` commitments.                | 💡 **Rapid Prototyping**: Exceptional DX for building prompts quickly. |

**Best for:** Developers building self-hosted, portable AI agents with strict enforcement rules and a focus on decentralized ecosystems. | **Best for:** Rapidly building and deploying AI-powered applications with a focus on ease of use and integrated prompt management.
