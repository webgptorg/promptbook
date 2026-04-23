[ ] !!!!!

[✨👵] Vytvoř definice ukázkových AI agentů v booku

-   Podívej se do složky `agents/default` a vytvoř dokonči agenty podle toho, co tam je načrtnuté, a podle toho, co je v dokumentaci, kterou ti dávám níže
-   Agenti mají sloužit jako ukázkový příklad pro uživatele, jak mohou definovat své vlastní agenty a demonstrace jak Promptbook funguje
-   Dokumenty s ukázkovýma znalostma mi dej do podsložky `knowledge`, a odkaž je např. `KNOWLEDGE ./knowledge/knowledge-product-manager.txt`
-   Všichni agenti mají být `CLOSED`

**Takto má vypadat definice agenta:**

```book
Product Manager

NONCE Created by ChatGPT on 2026-04-23
FROM {void}

GOAL

Udržuju vývoj produktu, dokážu napsat PRD pro kódovacího agenta


META COLOR #ff4444


INITIAL MESSAGE


Ahoj,
@@

Dokážu @@


[@@](?message=@@)



USE TIME
USE TIMEOUT


USE EMAIL spravce-kalendare@ptbk.io
USE CALENDAR https://calendar.google.com/calendar/ical/59da51719f8182de0b734dd9b4f231e2c10ed17b8858c8cb697701572e21a3e2%40group.calendar.google.com/public/basic.ics

CLOSED

```

-   Místo @@ napiš konkrétní věci

# Book Language blueprint

> Canonical standalone guide for Promptbook Book Agent language.  
> Generated from repository https://github.com/webgptorg/promptbook

-   Book language version: `2.0.0`
-   Generated at: `2026-04-23T15:21:40.524Z`
-   Commitment groups: `58`
-   Implemented commitments: `54`
-   Placeholder commitments: `4`

## <a id="table-of-contents"></a>Table of Contents

-   [What Book language is](#what-book-language-is)
-   [Execution and compilation model](#execution-and-compilation-model)
-   [Mental model of an agent](#mental-model-of-an-agent)
-   [How to structure good agents](#how-to-structure-good-agents)
-   [Primitives and constructs reference](#primitives-and-constructs-reference)
-   [Commitment catalog (all commitments)](#commitment-catalog-all-commitments)
-   [End-to-end examples](#end-to-end-examples)
-   [Do nots and common pitfalls](#do-nots-and-common-pitfalls)
-   [Build an agent from scratch (offline tutorial)](#build-an-agent-from-scratch-offline-tutorial)

## <a id="what-book-language-is"></a>What Book language is

Book language is a domain-specific language for defining **AI agents** as plain-text source.
It solves these problems:

-   **One editable source of truth** for agent behavior, tools, memory, and profile metadata.
-   **Composable agent architecture** through commitments like `FROM`, `IMPORT`, and `TEAM`.
-   **Deterministic runtime preparation** where source is parsed and compiled into model requirements.
-   **Portable agent definitions** that can be copied, versioned, and reviewed as text.

In this repository, "Book language" means **Book 2.0 agent language**.

## <a id="execution-and-compilation-model"></a>Execution and compilation model

Promptbook and Agents Server use two core passes:

1. **Fast parse pass** (`parseAgentSource`):
   It synchronously extracts agent profile/basic info (name, last goal/profile text, meta, capabilities, samples, references).
2. **Compilation pass** (`createAgentModelRequirements`):
   It applies commitments in sequence and builds executable model requirements (system message, tools, memory/tool metadata, imports, etc.).

In Agents Server, the runtime flow typically includes:

1. Resolve scoped references (including in-book references like `{Some Agent}`).
2. Resolve inheritance/import chains into effective source.
3. Compile effective source into model requirements.
4. Execute chat turns with resolved tools and runtime adapters.

## <a id="mental-model-of-an-agent"></a>Mental model of an agent

Think of one agent source as four layers:

1. **Identity/Profile layer**:
   Agent name (first non-commitment line), the last `GOAL` (preferred) or deprecated `PERSONA`, and `META*` commitments.
2. **Behavior layer**:
   `RULE`, `KNOWLEDGE`, `WRITING RULES`, deprecated `STYLE`, `LANGUAGE`, `GOAL`, and related commitments.
3. **Capability layer**:
   `USE*`, `MEMORY`, and other tooling commitments exposing runtime abilities.
4. **Composition layer**:
   `FROM` inheritance, `IMPORT` reuse, and `TEAM` delegation.

Agent composition commitments in current runtime:

-   Profile-centric commitments detected: `PERSONA`, `MODEL`, `META IMAGE`, `META COLOR`, `META FONT`, `META LINK`, `META DOMAIN`, `META DISCLAIMER`, `META INPUT PLACEHOLDER`, `META`, `META VOICE`, `GOAL`, `INITIAL MESSAGE`
-   Behavior-centric commitments detected: `KNOWLEDGE`, `STYLE`, `RULES`, `LANGUAGES`, `WRITING SAMPLE`, `WRITING RULES`, `SAMPLE`, `FORMAT`, `ACTION`, `GOAL`, `USER MESSAGE`, `INTERNAL MESSAGE`, `AGENT MESSAGE`, `MESSAGE SUFFIX`, `MESSAGE`, `SCENARIO`, `OPEN`, `CLOSED`
-   Tool/runtime commitments detected: `MEMORY`, `USE BROWSER`, `USE DEEPSEARCH`, `USE SEARCH ENGINE`, `USE SPAWN`, `USE TIME`, `USE USER LOCATION`, `USE CALENDAR`, `USE EMAIL`, `USE POPUP`, `USE IMAGE GENERATOR`, `USE MCP`, `USE PRIVACY`, `USE PROJECT`, `USE`
-   Composition commitments detected: `FROM`, `IMPORT`, `TEAM`

### META commitments and agent profile

`META*` commitments control profile data shown in UI (for example image, description, disclaimers, domain, input placeholder).  
They generally shape presentation/metadata rather than tool behavior.

### FROM inheritance

`FROM` points to a parent agent source. During inheritance resolution:

-   Parent corpus is merged into effective source.
-   `FROM {Void}` / `FROM VOID` means explicit "no parent".
-   Missing references are surfaced as notes in resolved source.

### TEAM and IMPORT

-   `TEAM` registers teammate agents as callable tools.
-   `IMPORT` injects imported agent/file content into current agent context.
-   In Agents Server, compact references like `{Legal Reviewer}` can resolve to embedded in-book agents.

### USE commitments

`USE*` commitments enable capabilities (search, browser, project integration, email, image generation, etc.).
They expose runtime tools and system-message guidance used during execution.

## <a id="how-to-structure-good-agents"></a>How to structure good agents

Recommended patterns and tradeoffs:

1. **Single clear role first**:
   Start with one narrow `GOAL`; use `PERSONA` only for backward-compatible legacy books.
   Tradeoff: less initial flexibility, much higher reliability.
2. **Guardrails early**:
   Add concrete `RULE` commitments before adding many tools.
   Tradeoff: more upfront design, fewer runtime surprises.
3. **Grounding over improvisation**:
   Prefer `KNOWLEDGE` + explicit citation rule for high-stakes answers.
   Tradeoff: extra maintenance for sources, better factual control.
4. **Composition over monoliths**:
   Use `TEAM`/`IMPORT` for specialized responsibilities.
   Tradeoff: orchestration overhead, stronger modularity and reuse.
5. **Controlled memory**:
   If using `MEMORY`, define what must and must not be remembered.
   Tradeoff: stricter policy design, better privacy and signal quality.

## <a id="primitives-and-constructs-reference"></a>Primitives and constructs reference

### Core syntax primitives

1. **Agent title**:
   First non-empty line that is not a commitment keyword.
2. **Commitment block**:
   Starts with a commitment keyword and continues until the next commitment block or separator.
3. **Horizontal separator**:
   Lines like `--` split sections; in Agents Server they can delimit embedded in-book agents.
4. **Code fences**:
   Preserved inside commitment content; useful for examples/instructions.
5. **Parameters**:
   Both `@parameter` and `{parameter}` notations are supported and parsed.

### Reference tokens and pseudo-agents

-   Compact references like `{Agent Name}` are resolved by Agents Server reference resolver.
-   Pseudo-agent forms (for example `{User}`, `{Void}`) are supported in relevant commitments.
-   `{User}` is intended for `TEAM`; `{Void}` is useful for explicit no-parent inheritance.

### Commitment keywords currently recognized

```text
PERSONA, PERSONAE, KNOWLEDGE, MEMORY, MEMORIES, STYLE, STYLES, RULES, RULE, LANGUAGES, LANGUAGE, WRITING SAMPLE, WRITING RULES, SAMPLE, EXAMPLE, FORMAT, FORMATS, TEMPLATE, TEMPLATES, FROM, IMPORT, IMPORTS, MODEL, MODELS, ACTION, ACTIONS, COMPONENT, META IMAGE, META COLOR, META FONT, META LINK, META DOMAIN, META DISCLAIMER, META INPUT PLACEHOLDER, META, META VOICE, NOTE, NOTES, COMMENT, NONCE, TODO, GOAL, GOALS, INITIAL MESSAGE, USER MESSAGE, INTERNAL MESSAGE, AGENT MESSAGE, MESSAGE SUFFIX, MESSAGE, MESSAGES, SCENARIO, SCENARIOS, DELETE, CANCEL, DISCARD, REMOVE, DICTIONARY, OPEN, CLOSED, TEAM, USE BROWSER, USE DEEPSEARCH, USE SEARCH ENGINE, USE SPAWN, USE TIMEOUT, USE TIME, USE USER LOCATION, USE CALENDAR, USE EMAIL, USE POPUP, USE IMAGE GENERATOR, USE MCP, USE PRIVACY, USE PROJECT, USE, EXPECT, BEHAVIOUR, BEHAVIOURS, AVOID, AVOIDANCE, CONTEXT
```

## <a id="commitment-catalog-all-commitments"></a>Commitment catalog (all commitments)

This section is generated from commitment definitions in `src/commitments`.
For each commitment group you get:

-   semantics summary (description/icon/status)
-   parsing schema (`createTypeRegex` and `createRegex`)
-   canonical documentation block

### <a id="commitment-persona"></a>👤 PERSONA

-   **Status:** Implemented (deprecated)
-   **Aliases:** `PERSONAE`
-   **Semantics:** Deprecated legacy profile commitment. Prefer `GOAL` for agent profile text and inheritance-safe rewrites.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>PERSONA)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>PERSONA)\b\s+(?<contents>.+)$/gim`
-   **Deprecation:** Use `GOAL` for agent profile text and inheritance-safe rewrites. Preferred replacement: `GOAL`.

Deprecated legacy commitment that defines who the agent is, their background, expertise, and personality traits.

## Migration

-   Existing `PERSONA` books still parse and compile.
-   New books should prefer `GOAL`.
-   Agent profile rendering now prefers the last `GOAL` and only falls back to `PERSONA` when no goal exists.
-   Runtime compilation keeps the legacy multi-`PERSONA` merge behavior for backward compatibility.

## Preferred replacement

```book
Programming Assistant

GOAL Help the user solve programming problems with practical TypeScript and React guidance.
```

## Legacy compatibility example

```book
Programming Assistant

PERSONA You are a helpful programming assistant with expertise in TypeScript and React
PERSONA You have deep knowledge of modern web development practices
```

### <a id="commitment-knowledge"></a>🧠 KNOWLEDGE

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Add domain **knowledge** via direct text or external sources (RAG).
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>KNOWLEDGE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>KNOWLEDGE)\b\s+(?<contents>.+)$/gim`

Adds specific knowledge, facts, or context to the agent using a RAG (Retrieval-Augmented Generation) approach for external sources.

## Key aspects

-   Both terms work identically and can be used interchangeably.
-   Supports both direct text knowledge and external URLs.
-   External sources (PDFs, websites) are processed via RAG for context retrieval.

## Supported formats

-   Direct text: Immediate knowledge incorporated into agent
-   URLs: External documents processed for contextual retrieval
-   Supported file types: PDF, text, markdown, HTML

## Examples

```book
Customer Support Bot

PERSONA You are a helpful customer support agent for TechCorp
KNOWLEDGE TechCorp was founded in 2020 and specializes in AI-powered solutions
KNOWLEDGE https://example.com/company-handbook.pdf
KNOWLEDGE https://example.com/product-documentation.pdf
RULE Always be polite and professional
```

```book
Research Assistant

PERSONA You are a knowledgeable research assistant
KNOWLEDGE Academic research requires careful citation and verification
KNOWLEDGE https://example.com/research-guidelines.pdf
ACTION Can help with literature reviews and data analysis
WRITING RULES Present information in clear, academic format
```

### <a id="commitment-memory"></a>🧠 MEMORY

-   **Status:** Implemented
-   **Aliases:** `MEMORIES`
-   **Semantics:** Remember past interactions and user **preferences** for personalized responses.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>MEMORY)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>MEMORY)\b(?:\s+(?<contents>.+))?$/gim`

Enables persistent user memory for the current agent. The memory is stored by the runtime and can be retrieved in future conversations.

## Key aspects

-   Both `MEMORY` and `MEMORIES` work identically.
-   Stores user-specific details through runtime tools.
-   Retrieves relevant memories for personalized responses.
-   Supports optional extra instructions in the commitment content.

## Examples

```book
Personal Assistant

PERSONA You are a personal productivity assistant
MEMORY Remember user projects and long-term preferences.
GOAL Help optimize daily productivity and workflow
```

```book
Learning Companion

PERSONA You are an educational companion for programming students
MEMORY Remember only the student's learning progress and preferred study style.
GOAL Provide progressive learning experiences tailored to student's pace
```

```book
Customer Support Agent

PERSONA You are a customer support representative
MEMORY Remember only important support history and communication preferences.
GOAL Provide personalized support based on customer history
```

### <a id="commitment-style"></a>🖋️ STYLE

-   **Status:** Implemented (deprecated)
-   **Aliases:** `STYLES`
-   **Semantics:** Deprecated legacy writing-style commitment. Prefer `WRITING RULES` for new books.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>STYLE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>STYLE)\b\s+(?<contents>.+)$/gim`
-   **Deprecation:** Use `WRITING RULES` for writing-only constraints such as tone, length, formatting, or emoji usage. Preferred replacement: `WRITING RULES`.

Deprecated legacy commitment for writing and presentation instructions.

## Migration

-   Existing `STYLE` books still parse and compile.
-   New books should prefer `WRITING RULES`.
-   Use `WRITING SAMPLE` when you want to anchor voice by example instead of stating constraints directly.
-   The plural alias `STYLES` is the same legacy commitment family.

## Key aspects

-   `STYLE` remains functional for backward compatibility only.
-   Later style instructions can override earlier ones.
-   Style affects both tone and presentation format.

## Preferred replacement

```book
Technical Writer

GOAL Help the user understand technical topics with practical, accurate guidance.
WRITING RULES Write in a professional but friendly tone.
WRITING RULES Use bullet points for lists.
WRITING RULES Always provide code examples when explaining programming concepts.
FORMAT Use markdown formatting with clear headings
```

## Legacy compatibility examples

```book
Technical Writer

PERSONA You are a technical documentation expert
STYLE Write in a professional but friendly tone, use bullet points for lists
STYLE Always provide code examples when explaining programming concepts
FORMAT Use markdown formatting with clear headings
```

```book
Creative Assistant

PERSONA You are a creative writing helper
STYLE Be enthusiastic and encouraging in your responses
STYLE Use vivid metaphors and analogies to explain concepts
STYLE Keep responses conversational and engaging
RULE Always maintain a positive and supportive tone
```

### <a id="commitment-rules"></a>⚖️ RULES

-   **Status:** Implemented
-   **Aliases:** `RULE`
-   **Semantics:** Add behavioral rules the agent must follow.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>RULES)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>RULES)\b\s+(?<contents>.+)$/gim`

Adds behavioral constraints and guidelines that the agent must follow.

## Key aspects

-   All rules are treated equally regardless of singular/plural form.
-   Rules define what the agent must or must not do.

## Examples

```book
Customer Support Agent

PERSONA You are a helpful customer support representative
RULE Always ask for clarification if the user's request is ambiguous
RULE Be polite and professional in all interactions
RULES Never provide medical or legal advice
WRITING RULES Maintain a friendly and helpful tone
```

```book
Educational Tutor

PERSONA You are a patient and knowledgeable tutor
RULE Break down complex concepts into simple steps
RULE Always encourage students and celebrate their progress
RULE If you don't know something, admit it and suggest resources
WRITING SAMPLE Let's work through this step by step, and we will keep it simple all the way through.
```

### <a id="commitment-languages"></a>🌐 LANGUAGES

-   **Status:** Implemented
-   **Aliases:** `LANGUAGE`
-   **Semantics:** Specifies the language(s) the agent should use.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>LANGUAGES)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>LANGUAGES)\b\s+(?<contents>.+)$/gim`

Specifies the language(s) the agent should use in its responses.
This is a specialized variation of the RULE commitment focused on language constraints.

## Examples

```book
Paul Smith & Associés

PERSONA You are a company lawyer.
LANGUAGE French, English and Czech
```

```book
Customer Support

PERSONA You are a customer support agent.
LANGUAGE English
```

### <a id="commitment-writing-sample"></a>🗣️ WRITING SAMPLE

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Provide explicit sample-only text that demonstrates the desired voice.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>WRITING\s+SAMPLE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>WRITING\s+SAMPLE)\b\s+(?<contents>.+)$/gim`

Provides explicit 1:1 sample text that demonstrates how the agent should sound.

## Key aspects

-   Use it for **voice exemplars**, not for behavioral rules or tool-usage instructions.
-   The content should be sample-only text without meta commentary.
-   Multiple writing samples can stack, with newer samples carrying the highest weight.
-   If `WRITING RULES` add explicit constraints, those constraints override conflicting details from the sample while the sample still anchors the voice.

## Examples

```book
Copywriter

PERSONA You are a Copywriter who writes persuasive marketing copy.
WRITING SAMPLE
Looking to boost your productivity? Our app helps you organize your tasks and manage your time effectively, so you can get more done with less stress. Try it today and see the difference! 🚀
```

```book
Brand Voice Assistant

PERSONA You write launch emails for a playful lifestyle brand.
WRITING SAMPLE
Big news: the wait is over. Our newest drop is here, and it is built to make your mornings smoother, calmer, and a little more fun. Grab yours before it disappears. ✨
WRITING RULES Keep paragraphs short and end every reply with one fitting emoji.
```

### <a id="commitment-writing-rules"></a>📝 WRITING RULES

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Add writing-only constraints such as tone, length, formatting, or emoji usage.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>WRITING\s+RULES)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>WRITING\s+RULES)\b\s+(?<contents>.+)$/gim`

Adds instructions that apply strictly to how the agent writes.

## Key aspects

-   Use it for writing-only constraints such as tone, formatting, length, emoji usage, punctuation, or reading level.
-   Do **not** use it for problem-solving behavior, policy, tool usage, or decision-making logic. Use `RULE` for that.
-   Newer writing-rules blocks override conflicting earlier writing-rules blocks.
-   When a writing rule conflicts with a `WRITING SAMPLE`, prefer the explicit rule for the constraint while keeping the sample as the main voice exemplar.

## Examples

```book
Copywriter

PERSONA You are a Copywriter, an expert in crafting clear, engaging, and persuasive text.
WRITING RULES
- Use a friendly and conversational tone, as if you are talking to a friend.
- Keep sentences short and to the point.
- Use active voice and strong verbs.
- Focus on the benefits and value to the reader.
- Avoid jargon and technical language unless necessary.
- Always include emoji(s) at the end of your messages when appropriate.
```

```book
Product Launch Writer

PERSONA You write upbeat launch announcements.
WRITING SAMPLE
Meet the update your workflow has been waiting for. It is fast, clean, and surprisingly fun to use. Try it today and feel the difference. 🚀
WRITING RULES Keep every response under 120 words.
WRITING RULES Use markdown bullet points only when the user asks for a list.
```

### <a id="commitment-sample"></a>🗣️ SAMPLE

-   **Status:** Implemented (deprecated)
-   **Aliases:** `EXAMPLE`
-   **Semantics:** Deprecated legacy alias for `WRITING SAMPLE`.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>SAMPLE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>SAMPLE)\b\s+(?<contents>.+)$/gim`
-   **Deprecation:** Use `WRITING SAMPLE` for explicit voice exemplars. Preferred replacement: `WRITING SAMPLE`.

Deprecated legacy alias for `WRITING SAMPLE`.

## Migration

-   Existing `SAMPLE` blocks still work.
-   New books should use `WRITING SAMPLE` instead.
-   Runtime behavior is intentionally unchanged for backward compatibility.

## Preferred replacement

```book
Copywriter

PERSONA You are a Copywriter who writes persuasive marketing copy.
WRITING SAMPLE
Looking to boost your productivity? Our app helps you organize your tasks and manage your time effectively, so you can get more done with less stress. Try it today and see the difference! 🚀
```

## Legacy compatibility example

```book
Copywriter

PERSONA You are a Copywriter who writes persuasive marketing copy.
SAMPLE
Looking to boost your productivity? Our app helps you organize your tasks and manage your time effectively, so you can get more done with less stress. Try it today and see the difference! 🚀
```

### <a id="commitment-format"></a>📜 FORMAT

-   **Status:** Implemented
-   **Aliases:** `FORMATS`
-   **Semantics:** Specify output structure or formatting requirements.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>FORMAT)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>FORMAT)\b\s+(?<contents>.+)$/gim`

Defines the specific output structure and formatting for responses (data formats, templates, structure).

## Key aspects

-   Both terms work identically and can be used interchangeably.
-   If they are in conflict, the last one takes precedence.
-   You can specify both data formats and presentation styles.

## Examples

```book
Customer Support Bot

PERSONA You are a helpful customer support agent
FORMAT Always respond in JSON format with 'status' and 'data' fields
FORMAT Use markdown formatting for all code blocks
```

```book
Data Analyst

PERSONA You are a data analysis expert
FORMAT Present results in structured tables
FORMAT Include confidence scores for all predictions
WRITING RULES Be concise and precise in explanations
```

### <a id="commitment-template"></a>📋 TEMPLATE

-   **Status:** Implemented
-   **Aliases:** `TEMPLATES`
-   **Semantics:** Enforce a specific message structure or response template.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>TEMPLATE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>TEMPLATE)\b(?:\s+(?<contents>.+))?$/gim`

Enforces a specific response structure or template that the agent must follow when generating responses.

## Key aspects

-   Both terms work identically and can be used interchangeably.
-   Can be used with or without content.
-   When used without content, enables template mode for structured responses.
-   When used with content, defines the specific template structure to follow.
-   Multiple templates can be combined, with later ones taking precedence.

## Examples

```book
Customer Support Agent

PERSONA You are a helpful customer support representative
TEMPLATE Always structure your response with: 1) Acknowledgment, 2) Solution, 3) Follow-up question
WRITING RULES Be professional and empathetic
```

```book
Technical Documentation Assistant

PERSONA You are a technical writing expert
TEMPLATE Use the following format: **Topic:** [topic] | **Explanation:** [details] | **Example:** [code]
FORMAT Use markdown with clear headings
```

```book
Simple Agent

PERSONA You are a virtual assistant
TEMPLATE
```

### <a id="commitment-from"></a>🧬 FROM

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Inherit agent source from another agent.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>FROM)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>FROM)\b\s+(?<contents>.+)$/gim`

Inherits agent source from another agent.

## Examples

```book
My AI Agent

FROM https://s6.ptbk.io/benjamin-white
RULE Speak only in English.
```

### <a id="commitment-import"></a>📥 IMPORT

-   **Status:** Implemented
-   **Aliases:** `IMPORTS`
-   **Semantics:** Import content from another agent or a generic text file.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>IMPORT)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>IMPORT)\b\s+(?<contents>.+)$/gim`

Imports content from another agent or a generic text file at the location of the commitment.

## Examples

```book
My AI Agent

IMPORT https://s6.ptbk.io/benjamin-white
IMPORT https://example.com/some-text-file.txt
IMPORT ./path/to/local-file.json
RULE Speak only in English.
```

### <a id="commitment-model"></a>⚙️ MODEL

-   **Status:** Implemented
-   **Aliases:** `MODELS`
-   **Semantics:** Enforce AI model requirements including name and technical parameters.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>MODEL)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>MODEL)\b\s+(?<contents>.+)$/gim`

Enforces technical parameters for the AI model, ensuring consistent behavior across different execution environments.

## Key aspects

-   When no `MODEL` commitment is specified, the best model requirement is picked automatically based on the agent `PERSONA`, `KNOWLEDGE`, `TOOLS` and other commitments
-   Multiple `MODEL` commitments can be used to specify different parameters
-   Both `MODEL` and `MODELS` terms work identically and can be used interchangeably
-   Parameters control the randomness, creativity, and technical aspects of model responses

## Syntax variations

### Single-line format (legacy support)

```book
MODEL gpt-4
MODEL claude-3-opus temperature=0.3
MODEL gpt-3.5-turbo temperature=0.8 topP=0.9
```

### Multi-line named parameter format (recommended)

```book
MODEL NAME gpt-4
MODEL TEMPERATURE 0.7
MODEL TOP_P 0.9
MODEL MAX_TOKENS 2048
```

## Supported parameters

-   `NAME`: The specific model to use (e.g., 'gpt-4', 'claude-3-opus')
-   `TEMPERATURE`: Controls randomness (0.0 = deterministic, 1.0+ = creative)
-   `TOP_P`: Nucleus sampling parameter for controlling diversity
-   `TOP_K`: Top-k sampling parameter for limiting vocabulary
-   `MAX_TOKENS`: Maximum number of tokens the model can generate

## Examples

### Precise deterministic assistant

```book
Precise Assistant

PERSONA You are a precise and accurate assistant
MODEL NAME gpt-4
MODEL TEMPERATURE 0.1
MODEL MAX_TOKENS 1024
RULE Always provide factual information
```

### Creative writing assistant

```book
Creative Writer

PERSONA You are a creative writing assistant
MODEL NAME claude-3-opus
MODEL TEMPERATURE 0.8
MODEL TOP_P 0.9
MODEL MAX_TOKENS 2048
WRITING RULES Be imaginative and expressive
ACTION Can help with storytelling and character development
```

### Balanced conversational agent

```book
Balanced Assistant

PERSONA You are a helpful and balanced assistant
MODEL NAME gpt-4
MODEL TEMPERATURE 0.7
MODEL TOP_P 0.95
MODEL TOP_K 40
MODEL MAX_TOKENS 1500
```

### <a id="commitment-action"></a>⚡ ACTION

-   **Status:** Implemented
-   **Aliases:** `ACTIONS`
-   **Semantics:** Define agent capabilities and actions it can perform.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>ACTION)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>ACTION)\b\s+(?<contents>.+)$/gim`

Defines specific actions or capabilities that the agent can perform.

## Key aspects

-   Both terms work identically and can be used interchangeably.
-   Each action adds to the agent's capability list.
-   Actions help users understand what the agent can do.

## Examples

```book
Code Assistant

PERSONA You are a programming assistant
ACTION Can generate code snippets and explain programming concepts
ACTION Able to debug existing code and suggest improvements
ACTION Can create unit tests for functions
```

```book
Data Scientist

PERSONA You are a data analysis expert
ACTION Able to analyze data and provide insights
ACTION Can create visualizations and charts
ACTION Capable of statistical analysis and modeling
KNOWLEDGE Data analysis best practices and statistical methods
```

### <a id="commitment-component"></a>🧩 COMPONENT

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Define a UI component that the agent can render in the chat.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>COMPONENT)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>COMPONENT)\b\s+(?<contents>.+)$/gim`

Defines a UI component that the agent can render in the chat.

## Key aspects

-   Tells the agent that a specific component is available.
-   Provides syntax for using the component.

## Example

```book
COMPONENT Arrow
The agent should render an arrow component in the chat UI.
Syntax:
<Arrow direction="up" color="red" />
```

### <a id="commitment-meta-image"></a>🖼️ META IMAGE

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Set the agent's profile image URL.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>META\s+IMAGE|IMAGE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>META\s+IMAGE|IMAGE)\b\s+(?<contents>.+)$/gim`

Sets the agent's avatar/profile image URL.

## Key aspects

-   Does not modify the agent's behavior or responses.
-   Only one `META IMAGE` should be used per agent.
-   If multiple are specified, the last one takes precedence.
-   Used for visual representation in user interfaces.

## Examples

```book
Professional Assistant

META IMAGE https://example.com/professional-avatar.jpg
PERSONA You are a professional business assistant
WRITING RULES Maintain a formal and courteous tone
```

```book
Creative Helper

META IMAGE /assets/creative-bot-avatar.png
PERSONA You are a creative and inspiring assistant
WRITING RULES Be enthusiastic and encouraging
ACTION Can help with brainstorming and ideation
```

### <a id="commitment-meta-color"></a>🎨 META COLOR

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Set the agent's accent color or gradient.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>META\s+COLOR|COLOR)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>META\s+COLOR|COLOR)\b\s+(?<contents>.+)$/gim`

Sets the agent's accent color or gradient.

## Key aspects

-   Does not modify the agent's behavior or responses.
-   Only one `META COLOR` should be used per agent.
-   If multiple are specified, the last one takes precedence.
-   Used for visual representation in user interfaces.
-   Can specify multiple colors separated by comma to create a gradient.

## Examples

```book
Professional Assistant

META COLOR #3498db
PERSONA You are a professional business assistant
```

```book
Creative Helper

META COLOR #e74c3c
PERSONA You are a creative and inspiring assistant
```

```book
Gradient Agent

META COLOR #ff0000, #00ff00, #0000ff
PERSONA You are a colorful agent
```

### <a id="commitment-meta-font"></a>🔤 META FONT

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Set the agent's font.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>META\s+FONT|FONT)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>META\s+FONT|FONT)\b\s+(?<contents>.+)$/gim`

Sets the agent's font.

## Key aspects

-   Does not modify the agent's behavior or responses.
-   Only one `META FONT` should be used per agent.
-   If multiple are specified, the last one takes precedence.
-   Used for visual representation in user interfaces.
-   Supports Google Fonts.

## Examples

```book
Modern Assistant

META FONT Poppins, Arial, sans-serif
PERSONA You are a modern assistant
```

```book
Classic Helper

META FONT Times New Roman
PERSONA You are a classic helper
```

### <a id="commitment-meta-link"></a>🔗 META LINK

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Provide profile/source links for the person the agent models.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>META\s+LINK)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>META\s+LINK)\b\s+(?<contents>.+)$/gim`

Represents a profile or source link for the person the agent is modeled after.

## Key aspects

-   Does not modify the agent's behavior or responses.
-   Multiple `META LINK` commitments can be used for different social profiles.
-   Used for attribution and crediting the original person.
-   Displayed in user interfaces for transparency.

## Examples

```book
Expert Consultant

META LINK https://twitter.com/expertname
META LINK https://linkedin.com/in/expertprofile
PERSONA You are Dr. Smith, a renowned expert in artificial intelligence
KNOWLEDGE Extensive background in machine learning and neural networks
```

```book
Open Source Developer

META LINK https://github.com/developer
META LINK https://twitter.com/devhandle
PERSONA You are an experienced open source developer
ACTION Can help with code reviews and architecture decisions
WRITING RULES Be direct and technical in explanations
```

### <a id="commitment-meta-domain"></a>🌐 META DOMAIN

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Set the agent's canonical domain/host.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>META\s+DOMAIN|DOMAIN)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>META\s+DOMAIN|DOMAIN)\b\s+(?<contents>.+)$/gim`

Sets the canonical domain (host) of the agent, for example a custom domain that should open this agent directly.

## Key aspects

-   Does not modify the agent's behavior or responses.
-   Used by server routing to map incoming hostnames to this agent.
-   If multiple `META DOMAIN` commitments are specified, the last one takes precedence.
-   Prefer hostname-only values such as `my-agent.com`.

## Examples

```book
My agent

PERSONA My agent is an expert in something.
META DOMAIN my-agent.com
```

### <a id="commitment-meta-disclaimer"></a>⚠️ META DISCLAIMER

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Set markdown disclaimer text that users must agree with before chat.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>META\s+DISCLAIMER)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>META\s+DISCLAIMER)\b\s+(?<contents>.+)$/gim`

Defines a markdown disclaimer shown to users before they can start chatting with the agent.

## Key aspects

-   Does not modify the system message or model requirements.
-   Supports multiline markdown content.
-   Intended for legal warnings, safety notices, and mandatory acknowledgements.
-   If multiple `META DISCLAIMER` commitments are present, the last one takes precedence.

## Example

```book
Legal Assistant

META DISCLAIMER

This assistant provides **informational content only** and does not
replace professional legal advice.
```

### <a id="commitment-meta-input-placeholder"></a>⌨️ META INPUT PLACEHOLDER

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Set custom placeholder text shown in the chat input.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>META\s+INPUT\s+PLACEHOLDER)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>META\s+INPUT\s+PLACEHOLDER)\b\s+(?<contents>.+)$/gim`

Sets custom placeholder text for the chat input field.

## Key aspects

-   Does not modify model behavior, system message, or tools.
-   If multiple `META INPUT PLACEHOLDER` lines are provided, the last one wins.
-   Used by chat UIs to customize the message input hint.

## Example

```book
Helpful Assistant

META INPUT PLACEHOLDER Ask me about your project...
PERSONA You help users plan and ship software.
```

### <a id="commitment-meta"></a>ℹ️ META

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Set meta-information about the agent (IMAGE, LINK, TITLE, DESCRIPTION, etc.).
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>META)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>META)\b\s+(?<contents>.+)$/gim`

Sets meta-information about the agent that is used for display and attribution purposes.

## Supported META types

-   **META IMAGE** - Sets the agent's avatar/profile image URL
-   **META LINK** - Provides profile/source links for the person the agent models
-   **META DOMAIN** - Sets the canonical custom domain/host of the agent
-   **META TITLE** - Sets the agent's display title
-   **META DESCRIPTION** - Sets the agent's description
-   **META INPUT PLACEHOLDER** - Sets chat input placeholder text
-   **META [ANYTHING]** - Any other meta information in uppercase format

## Key aspects

-   Does not modify the agent's behavior or responses
-   Used for visual representation and attribution in user interfaces
-   Multiple META commitments of different types can be used
-   Multiple META LINK commitments can be used for different social profiles
-   If multiple META commitments of the same type are specified, the last one takes precedence (except for LINK)

## Examples

### Basic meta information

```book
Professional Assistant

META IMAGE https://example.com/professional-avatar.jpg
META TITLE Senior Business Consultant
META DESCRIPTION Specialized in strategic planning and project management
META LINK https://linkedin.com/in/professional
```

### Multiple links and custom meta

```book
Open Source Developer

META IMAGE /assets/dev-avatar.png
META LINK https://github.com/developer
META LINK https://twitter.com/devhandle
META AUTHOR Jane Smith
META VERSION 2.1
META LICENSE MIT
```

### Creative assistant

```book
Creative Helper

META IMAGE https://example.com/creative-bot.jpg
META TITLE Creative Writing Assistant
META DESCRIPTION Helps with brainstorming, storytelling, and creative projects
META INSPIRATION Books, movies, and real-world experiences
```

### <a id="commitment-meta-voice"></a>🎙️ META VOICE

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Select the ElevenLabs voice ID used for this agent.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>META\s+VOICE|VOICE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>META\s+VOICE|VOICE)\b\s+(?<contents>.+)$/gim`

Instructs the UI to use a specific ElevenLabs voice when reading this agent's replies aloud.

## Key aspects

-   Only affects ElevenLabs TTS playback, not agent behavior or system prompts
-   If multiple `META VOICE` lines are provided, the last one wins
-   The value should match one of the voice IDs listed in the ElevenLabs console

## Example

```book
Friendly Assistant

META VOICE 21m00Tcm4TlvDq8ikWAM
PERSONA You are a warm, conversational tutor
```

### <a id="commitment-note"></a>📝 NOTE

-   **Status:** Implemented
-   **Aliases:** `NOTES`, `COMMENT`, `NONCE`, `TODO`
-   **Semantics:** Add developer-facing notes without changing behavior or output.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>NOTE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>NOTE)\b\s+(?<contents>.+)$/gim`

Adds comments for documentation without changing agent behavior.

## Key aspects

-   Does not modify the agent's behavior or responses.
-   Multiple `NOTE`, `NOTES`, `COMMENT`, and `NONCE` commitments are aggregated for debugging.
-   All four terms work identically and can be used interchangeably.
-   Useful for documenting design decisions and reminders.
-   Content is preserved in metadata for inspection.

## Examples

```book
Customer Support Bot

NOTE This agent was designed for customer support scenarios
COMMENT Remember to update the knowledge base monthly
PERSONA You are a helpful customer support representative
KNOWLEDGE Company policies and procedures
RULE Always be polite and professional
```

```book
Research Assistant

NONCE Performance optimized for quick response times
NOTE Uses RAG for accessing latest research papers
PERSONA You are a knowledgeable research assistant
ACTION Can help with literature reviews and citations
WRITING RULES Present information in academic format
```

### <a id="commitment-goal"></a>🎯 GOAL

-   **Status:** Implemented
-   **Aliases:** `GOALS`
-   **Semantics:** Define the effective agent **goal**; when multiple goals exist, only the last one stays effective.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>GOAL)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>GOAL)\b\s+(?<contents>.+)$/gim`

Defines the main goal which should be achieved by the AI assistant.
There can be multiple goals in source, but after inheritance/source rewriting only the last `GOAL` /`GOALS` remains effective.

## Key aspects

-   Both terms work identically and can be used interchangeably.
-   Later goals overwrite earlier goals.
-   The public agent profile text is derived from the last goal.
-   Goals provide clear direction and purpose for the agent's responses.
-   Goals influence decision-making and response prioritization.

## Priority system

When multiple goals are defined, they are processed in order, with later goals taking precedence over earlier ones when there are conflicts.

## Examples

```book
Customer Support Agent

GOAL Resolve customer issues quickly and efficiently
GOAL Always follow company policies and procedures
RULE Be polite and professional at all times
```

```book
Educational Assistant

GOAL Help students understand mathematical concepts clearly
GOAL Ensure all explanations are age-appropriate and accessible
WRITING RULES Use simple language and provide step-by-step explanations
```

```book
Safety-First Assistant

GOAL Be helpful and informative in all interactions
GOAL Always prioritize user safety and ethical guidelines
RULE Never provide harmful or dangerous advice
```

### <a id="commitment-initial-message"></a>👋 INITIAL MESSAGE

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Defines the **initial message** shown to the user when the chat starts.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>INITIAL\s+MESSAGE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>INITIAL\s+MESSAGE)\b\s+(?<contents>.+)$/gim`

Defines the first message that the user sees when opening the chat. This message is purely for display purposes in the UI and does not inherently become part of the LLM's system prompt context (unless also included via other means).

## Key aspects

-   Used to greet the user.
-   Sets the tone of the conversation.
-   Displayed immediately when the chat interface loads.

## Examples

```book
Support Agent

PERSONA You are a helpful support agent.
INITIAL MESSAGE Hi there! How can I assist you today?
```

### <a id="commitment-user-message"></a>🧑 USER MESSAGE

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Defines a **message from the user** in the conversation history.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USER\s+MESSAGE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USER\s+MESSAGE)\b\s+(?<contents>.+)$/gim`

Defines a message from the user in the conversation history. This is used to pre-fill the chat with a conversation history or to provide few-shot examples.

## Key aspects

-   Represents a message sent by the user.
-   Used for setting up conversation context.
-   Can be used in conjunction with AGENT MESSAGE.

## Examples

```book
Conversation History

USER MESSAGE Hello, I have a problem.
AGENT MESSAGE What seems to be the issue?
USER MESSAGE My computer is not starting.
```

### <a id="commitment-internal-message"></a>🧩 INTERNAL MESSAGE

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Defines an **internal trace message** (tool calls/thinking metadata) in conversation history.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>INTERNAL\s+MESSAGE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>INTERNAL\s+MESSAGE)\b\s+(?<contents>.+)$/gim`

Defines an internal trace message related to one interaction. This is intended mainly for self-learning analytics and future training datasets.

## Key aspects

-   Stores internal execution context such as tool-call payloads.
-   Can contain structured JSON payloads.
-   Preserves additional context between USER MESSAGE and AGENT MESSAGE.
-   Does not directly modify model requirements.

## Examples

```book
USER MESSAGE
Search latest weather in Prague.

INTERNAL MESSAGE
{
    "kind": "TOOL_CALL",
    "toolCall": {
        "name": "search",
        "arguments": "{\"q\":\"weather Prague\"}",
        "result": "..."
    }
}

AGENT MESSAGE
It looks partly cloudy in Prague.
```

### <a id="commitment-agent-message"></a>🤖 AGENT MESSAGE

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Defines a **message from the agent** in the conversation history.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>AGENT\s+MESSAGE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>AGENT\s+MESSAGE)\b\s+(?<contents>.+)$/gim`

Defines a message from the agent in the conversation history. This is used to pre-fill the chat with a conversation history or to provide few-shot examples.

## Key aspects

-   Represents a message sent by the agent.
-   Used for setting up conversation context.
-   Can be used in conjunction with USER MESSAGE.

## Examples

```book
Conversation History

USER MESSAGE Hello, I have a problem.
AGENT MESSAGE What seems to be the issue?
USER MESSAGE My computer is not starting.
```

### <a id="commitment-message-suffix"></a>🏷️ MESSAGE SUFFIX

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Set a hardcoded suffix appended to every assistant response.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>MESSAGE\s+SUFFIX)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>MESSAGE\s+SUFFIX)\b\s+(?<contents>.+)$/gim`

Defines a hardcoded message appended to every assistant response.

## Key aspects

-   Does not modify the system message or model requirements.
-   Supports multiline markdown content.
-   Useful for branding, legal notes, and disclosure notices.
-   If multiple `MESSAGE SUFFIX` commitments are present, the last one takes precedence.

## Example

```book
Branded Assistant

MESSAGE SUFFIX
This was generated by Promptbook, the best tool to create AI agents.
```

### <a id="commitment-message"></a>💬 MESSAGE

-   **Status:** Implemented
-   **Aliases:** `MESSAGES`
-   **Semantics:** Include actual **messages** the AI assistant has sent during conversation history.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>MESSAGE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>MESSAGE)\b\s+(?<contents>.+)$/gim`

Contains 1:1 text of the message which AI assistant already sent during the conversation. Later messages are later in the conversation. It is similar to `WRITING SAMPLE`, but it is not a sample. It is the real message which the AI assistant already sent.

## Key aspects

-   Multiple `MESSAGE` and `MESSAGES` commitments represent the conversation timeline.
-   Both terms work identically and can be used interchangeably.
-   Later messages are later in the conversation chronologically.
-   Contains actual historical messages, not examples or templates.
-   Helps maintain conversation continuity and context.

## Differences from WRITING SAMPLE

-   `WRITING SAMPLE` shows hypothetical sample-only voice exemplars
-   `MESSAGE`/`MESSAGES` contains actual historical conversation content
-   `MESSAGE`/`MESSAGES` preserves the exact conversation flow
-   `MESSAGE`/`MESSAGES` helps with context awareness and consistency

## Use cases

-   Maintaining conversation history context
-   Ensuring consistent tone and style across messages
-   Referencing previous responses in ongoing conversations
-   Building upon previously established context

## Examples

```book
Customer Support Continuation

PERSONA You are a helpful customer support agent
MESSAGE Hello! How can I help you today?
MESSAGE I understand you're experiencing issues with your account login.
MESSAGE I've sent you a password reset link to your email address.
MESSAGE Is there anything else I can help you with regarding your account?
GOAL Continue providing consistent support based on conversation history
```

```book
Technical Discussion

PERSONA You are a software development mentor
MESSAGE Let's start by reviewing the React component structure you shared.
MESSAGE I notice you're using class components - have you considered hooks?
MESSAGE Here's how you could refactor that using the useState hook.
MESSAGE Great question about performance! Let me explain React's rendering cycle.
KNOWLEDGE React hooks were introduced in version 16.8
```

```book
Educational Session

PERSONA You are a mathematics tutor
MESSAGE Today we'll work on solving quadratic equations.
MESSAGE Let's start with the basic form: ax² + bx + c = 0
MESSAGE Remember, we can use the quadratic formula or factoring.
MESSAGE You did great with that first problem! Let's try a more complex one.
GOAL Build upon previous explanations for deeper understanding
```

### <a id="commitment-scenario"></a>🎭 SCENARIO

-   **Status:** Implemented
-   **Aliases:** `SCENARIOS`
-   **Semantics:** Define specific **situations** or contexts for AI responses, with later scenarios having higher priority.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>SCENARIO)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>SCENARIO)\b\s+(?<contents>.+)$/gim`

Defines a specific situation or context in which the AI assistant should operate. It helps to set the scene for the AI's responses. Later scenarios are more important than earlier scenarios.

## Key aspects

-   Multiple `SCENARIO` and `SCENARIOS` commitments build upon each other.
-   Both terms work identically and can be used interchangeably.
-   Later scenarios have higher priority and can override earlier scenarios.
-   Provides situational context that influences response tone and content.
-   Helps establish the environment and circumstances for interactions.

## Priority system

When multiple scenarios are defined, they are processed in order, with later scenarios taking precedence over earlier ones when there are conflicts.

## Use cases

-   Setting the physical or virtual environment
-   Establishing time constraints or urgency
-   Defining relationship dynamics or power structures
-   Creating emotional or situational context

## Examples

```book
Emergency Response Operator

PERSONA You are an emergency response operator
SCENARIO You are handling a 911 emergency call
SCENARIO The caller is panicked and speaking rapidly
SCENARIO Time is critical - every second counts
GOAL Gather essential information quickly and dispatch appropriate help
RULE Stay calm and speak clearly
```

```book
Sales Representative

PERSONA You are a software sales representative
SCENARIO You are in the final meeting of a 6-month sales cycle
SCENARIO The client has budget approval and decision-making authority
SCENARIO Two competitors have also submitted proposals
SCENARIO The client values long-term partnership over lowest price
GOAL Close the deal while building trust for future business
```

```book
Medical Assistant

PERSONA You are a medical assistant in a busy clinic
SCENARIO The waiting room is full and the doctor is running behind schedule
SCENARIO Patients are becoming impatient and anxious
SCENARIO You need to manage expectations while maintaining professionalism
SCENARIO Some patients have been waiting over an hour
GOAL Keep patients informed and calm while supporting efficient clinic flow
RULE Never provide medical advice or diagnosis
```

```book
Technical Support Agent

PERSONA You are a technical support agent
SCENARIO The customer is a small business owner during their busy season
SCENARIO Their main business system has been down for 2 hours
SCENARIO They are losing money every minute the system is offline
SCENARIO This is their first experience with your company
GOAL Resolve the issue quickly while creating a positive first impression
```

### <a id="commitment-delete"></a>🗑️ DELETE

-   **Status:** Implemented
-   **Aliases:** `CANCEL`, `DISCARD`, `REMOVE`
-   **Semantics:** Remove or **disregard** certain information, context, or previous commitments.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>DELETE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>DELETE)\b\s+(?<contents>.+)$/gim`

A commitment to remove or disregard certain information or context. This can be useful for overriding previous commitments or removing unwanted behaviors.

## Aliases

-   `DELETE` - Remove or eliminate something
-   `CANCEL` - Cancel or nullify something
-   `DISCARD` - Discard or ignore something
-   `REMOVE` - Remove or take away something

## Key aspects

-   Multiple delete commitments can be used to remove different aspects.
-   Useful for overriding previous commitments in the same agent definition.
-   Can be used to remove inherited behaviors from base personas.
-   Helps fine-tune agent behavior by explicitly removing unwanted elements.

## Use cases

-   Overriding inherited persona characteristics
-   Removing conflicting or outdated instructions
-   Disabling specific response patterns
-   Canceling previous formatting or style requirements

## Examples

```book
Serious Business Assistant

PERSONA You are a friendly and casual assistant who uses emojis
DELETE Casual conversational style
REMOVE All emoji usage
GOAL Provide professional business communications
WRITING RULES Use formal language and proper business etiquette
```

```book
Simplified Technical Support

PERSONA You are a technical support specialist with deep expertise
KNOWLEDGE Extensive database of technical specifications
DISCARD Technical jargon explanations
CANCEL Advanced troubleshooting procedures
GOAL Help users with simple, easy-to-follow solutions
WRITING RULES Use plain language that anyone can understand
```

```book
Focused Customer Service

PERSONA You are a customer service agent with broad knowledge
ACTION Can help with billing, technical issues, and product information
DELETE Billing assistance capabilities
REMOVE Technical troubleshooting functions
GOAL Focus exclusively on product information and general inquiries
```

```book
Concise Information Provider

PERSONA You are a helpful assistant who provides detailed explanations
WRITING RULES Include examples, analogies, and comprehensive context
CANCEL Detailed explanation style
DISCARD Examples and analogies
GOAL Provide brief, direct answers without unnecessary elaboration
WRITING RULES Be concise and to the point
```

### <a id="commitment-dictionary"></a>📚 DICTIONARY

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Define terms and their meanings for consistent terminology usage.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>DICTIONARY)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>DICTIONARY)\b\s+(?<contents>.+)$/gim`

Defines specific terms and their meanings that the agent should use correctly in reasoning and responses.

## Key aspects

-   Multiple `DICTIONARY` commitments are merged together.
-   Terms are defined in the format: "Term is definition"
-   The agent should use these terms consistently in responses.
-   Definitions help ensure accurate and consistent terminology.

## Examples

```book
Legal Assistant

PERSONA You are a knowledgeable legal assistant specializing in criminal law
DICTIONARY Misdemeanor is a minor wrongdoing or criminal offense
DICTIONARY Felony is a serious crime usually punishable by imprisonment for more than one year
DICTIONARY Tort is a civil wrong that causes harm or loss to another person, leading to legal liability
```

```book
Medical Assistant

PERSONA You are a helpful medical assistant
DICTIONARY Hypertension is persistently high blood pressure
DICTIONARY Diabetes is a chronic condition that affects how the body processes blood sugar
DICTIONARY Vaccine is a biological preparation that provides active immunity to a particular disease
```

### <a id="commitment-open"></a>🔓 OPEN

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Allow the agent to be modified by conversation (default) and optionally guide the teacher.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>OPEN)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>OPEN)\b\s+(?<contents>.+)$/gim`

Specifies that the agent can be modified by conversation with it.
This means the agent will learn from interactions and update its source code.

This is the default behavior if neither `OPEN` nor `CLOSED` is specified.

> See also [CLOSED](/docs/CLOSED)

## Example

```book
OPEN
```

### <a id="commitment-closed"></a>🔒 CLOSED

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Prevent the agent from being modified by conversation.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>CLOSED)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>CLOSED)\b(?:\s+(?<contents>.+))?$/gim`

Specifies that the agent **cannot** be modified by conversation with it.
This means the agent will **not** learn from interactions and its source code will remain static during conversation.

By default (if not specified), agents are `OPEN` to modification.

> See also [OPEN](/docs/OPEN)

## Example

```book
CLOSED
```

### <a id="commitment-team"></a>?? TEAM

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable the agent to consult teammate agents via dedicated tools.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>TEAM)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>TEAM)\b\s+(?<contents>.+)$/gim`

Registers teammate agents that the current agent can consult via tools.

## Examples

```book
Legal Assistant

GOAL Get expert software-development advice from the teammate when legal discussion needs technical context.
TEAM You can talk with http://localhost:4440/agents/GMw67JN8TXxN7y to discuss the legal aspects.
```

### <a id="commitment-use-browser"></a>🌐 USE BROWSER

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable the agent to use browser tools for accessing internet information.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+BROWSER|BROWSER)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+BROWSER|BROWSER)\b(?:\s+(?<contents>.+))?$/gim`

Enables the agent to use browser tools to access and retrieve up-to-date information from the internet.

## Key aspects

-   The content following `USE BROWSER` is an arbitrary text that the agent should know (e.g. browsing scope or preferred sources).
-   Provides two levels of browser access:
    1. **One-shot URL fetching**: Simple function to fetch and scrape URL content (active)
    2. **Running browser**: For complex tasks like scrolling, clicking, form filling, etc. (runtime-dependent)
-   The actual browser tool usage is handled by the agent runtime
-   Allows the agent to fetch current information from websites and documents
-   Useful for research tasks, fact-checking, and accessing dynamic content
-   Supports various content types including HTML pages and PDF documents

## Examples

```book
Research Assistant

PERSONA You are a helpful research assistant specialized in finding current information
USE BROWSER
RULE Always cite your sources when providing information from the web
```

```book
News Analyst

PERSONA You are a news analyst who stays up-to-date with current events
USE BROWSER
WRITING RULES Present news in a balanced and objective manner
ACTION Can search for and summarize news articles
```

```book
Company Lawyer

PERSONA You are a company lawyer providing legal advice
USE BROWSER
KNOWLEDGE Corporate law and legal procedures
RULE Always recommend consulting with a licensed attorney for specific legal matters
```

### <a id="commitment-use-deepsearch"></a>🔬 USE DEEPSEARCH

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable the agent to use DeepSearch for more thorough internet research.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+DEEPSEARCH)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+DEEPSEARCH)\b(?:\s+(?<contents>.+))?$/gim`

Enables the agent to use DeepSearch for broader, more thorough internet research than lightweight web search.

## Key aspects

-   The content following `USE DEEPSEARCH` is arbitrary guidance for the research workflow.
-   In Agents Server, the OpenAI Agents SDK runtime uses a nested deep-research agent for this tool.
-   Use this for investigations, comparisons, market scans, or other tasks that benefit from deeper synthesis.
-   Prefer regular `USE SEARCH ENGINE` when a quick factual lookup is enough.

## Examples

```book
Due Diligence Researcher

GOAL Investigate vendors thoroughly before making recommendations.
USE DEEPSEARCH Compare official sources with credible third-party analysis.
RULE Cite the strongest supporting sources in the final answer.
```

```book
Market Analyst

GOAL Build concise but well-grounded research briefs.
USE DEEPSEARCH Focus on recent public information and competing viewpoints.
CLOSED
```

### <a id="commitment-use-search-engine"></a>🔍 USE SEARCH ENGINE

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable the agent to use a search engine tool for accessing internet information.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+SEARCH\s+ENGINE|USE\s+SEARCH)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+SEARCH\s+ENGINE|USE\s+SEARCH)\b(?:\s+(?<contents>.+))?$/gim`

Enables the agent to use a search engine tool to access and retrieve up-to-date information from the internet.

## Key aspects

-   The content following `USE SEARCH ENGINE` is an arbitrary text that the agent should know (e.g. search scope or instructions).
-   The actual search engine tool usage is handled by the agent runtime
-   Allows the agent to search for current information from the web
-   Useful for research tasks, finding facts, and accessing dynamic content

## Examples

```book
Research Assistant

PERSONA You are a helpful research assistant specialized in finding current information
USE SEARCH ENGINE
RULE Always cite your sources when providing information from the web
```

```book
Fact Checker

PERSONA You are a fact checker
USE SEARCH ENGINE
ACTION Search for claims and verify them against reliable sources
```

### <a id="commitment-use-spawn"></a>🧬 USE SPAWN

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable the agent to create persistent child agents via Agents Server create-agent flow.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+SPAWN|SPAWN)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+SPAWN|SPAWN)\b(?:\s+(?<contents>.+))?$/gim`

Enables the agent to create a new persistent child agent using the `spawn_agent` tool.

## Key aspects

-   The spawned agent is persisted exactly like manually created agents.
-   Tool input mirrors create-agent fields currently supported by Agents Server:
    -   `source` (required)
    -   `folderId` (optional)
    -   `sortOrder` (optional)
    -   `visibility` (optional)
-   Unknown fields are rejected to avoid silent misconfiguration.
-   `source` payload is size-limited.
-   Agents Server applies permission and abuse protections (auth checks, limits).
-   Optional text after `USE SPAWN` is treated as spawn-policy instructions.

## Examples

```book
Team Builder

PERSONA You can create specialized assistants for the user.
USE SPAWN Spawn only when the user explicitly asks for a new persistent agent.
```

### <a id="commitment-use-timeout"></a>⏱️ USE TIMEOUT

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable timeout wake-ups plus scoped timeout listing, updates, and cancellation across chats.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+TIMEOUT)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+TIMEOUT)\b(?:\s+(?<contents>.+))?$/gim`

Enables timeout wake-ups and timeout management for the same user+agent scope.

## Key aspects

-   The agent uses `set_timeout` to schedule a future wake-up in the same chat thread.
-   The tool returns immediately while the timeout is stored and executed by the runtime later.
-   The wake-up arrives as a new user-like timeout message in the same conversation.
-   The agent can inspect known timeout details via `list_timeouts`.
-   The agent can cancel one timeout by `timeoutId` or cancel all active timeouts via `cancel_timeout`.
-   The agent can pause/resume and edit timeout details via `update_timeout`.
-   Commitment content is treated as optional timeout policy instructions.

## Examples

```book
Follow-up Agent
USE TIMEOUT Remind yourself only when follow-up work is explicitly requested.
```

### <a id="commitment-use-time"></a>🕒 USE TIME

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable the agent to determine the current date and time.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+TIME|CURRENT\s+TIME|TIME|DATE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+TIME|CURRENT\s+TIME|TIME|DATE)\b(?:\s+(?<contents>.+))?$/gim`

Enables the agent to determine the current date and time.

## Key aspects

-   This tool won't receive any input.
-   It outputs the current date and time as an ISO 8601 string.
-   Allows the agent to answer questions about the current time or date.
-   The content following `USE TIME` is an arbitrary text that the agent should know (e.g. timezone preference).

## Examples

```book
Time-aware Assistant

PERSONA You are a helpful assistant who knows the current time.
USE TIME
```

```book
Travel Assistant

PERSONA You help travelers with planning.
USE TIME Prefer the user's local timezone.
```

### <a id="commitment-use-user-location"></a>📍 USE USER LOCATION

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable the agent to determine the user location when browser permission is granted.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+USER\s+LOCATION|USER\s+LOCATION)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+USER\s+LOCATION|USER\s+LOCATION)\b(?:\s+(?<contents>.+))?$/gim`

Enables the agent to retrieve the user's location from runtime context.

## Key aspects

-   The location is requested by the browser runtime (with user permission).
-   Use the tool `get_user_location` when an answer depends on user's location.
-   If location is unavailable or denied, ask the user to enable location sharing or provide location manually.
-   The content following `USE USER LOCATION` can define additional location usage instructions.

## Examples

```book
Local Assistant

PERSONA You help with local recommendations.
USE USER LOCATION
```

```book
Travel Assistant

PERSONA You help users with nearby transport and weather.
USE USER LOCATION Use location only when strictly needed.
```

### <a id="commitment-use-calendar"></a>📅 USE CALENDAR

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable calendar tools for reading and managing events through Google Calendar.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+CALENDAR|CALENDAR)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+CALENDAR|CALENDAR)\b\s+(?<contents>.+)$/gim`

Enables the agent to access and manage one Google Calendar.

## Key aspects

-   The first URL in the commitment should point to a Google Calendar URL.
-   Optional `SCOPES` lines can provide explicit OAuth scopes.
-   Optional extra instructions can follow calendar reference lines.
-   Runtime provides Google Calendar OAuth token (manual wallet token or host-managed OAuth token).
-   Tools support listing events, reading one event, creating events, updating events, deleting events, and inviting guests.

## Examples

```book
Scheduling Assistant

PERSONA You coordinate meetings and schedules.
USE CALENDAR https://calendar.google.com/calendar/u/0/r
```

```book
Executive Assistant

USE CALENDAR https://calendar.google.com/calendar/u/0/r
SCOPES https://www.googleapis.com/auth/calendar.readonly
RULE Ask for confirmation before deleting events.
```

### <a id="commitment-use-email"></a>📧 USE EMAIL

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable outbound email sending through a wallet-backed SMTP configuration.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+EMAIL|EMAIL|MAIL)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+EMAIL|EMAIL|MAIL)\b(?:\s+(?<contents>.+))?$/gim`

Enables the agent to send outbound emails through SMTP.

## Key aspects

-   The agent sends email via the `send_email` tool.
-   SMTP credentials are expected from wallet records (`ACCESS_TOKEN`, service `smtp`, key `use-email-smtp-credentials`).
-   Commitment content can optionally begin with a default sender email address:
    -   `USE EMAIL agent@example.com`
-   Remaining commitment content is treated as optional email-writing instructions.

## Examples

```book
Writing Agent
USE EMAIL agent@example.com
RULE Write emails to customers according to the instructions from user.
```

```book
Formal Email Assistant
USE EMAIL agent@example.com Keep emails concise and formal.
```

### <a id="commitment-use-popup"></a>🪟 USE POPUP

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable the agent to open a popup window with a specific website.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+POPUP|POPUP)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+POPUP|POPUP)\b(?:\s+(?<contents>.+))?$/gim`

Enables the agent to open a popup window with a specific website.

## Key aspects

-   The content following `USE POPUP` is an arbitrary text that the agent should know (e.g. constraints or instructions).
-   The actual popup opening is handled by the agent runtime (usually in the browser)
-   Allows the agent to open websites for the user to interact with (e.g. social media posts)

## Examples

```book
John the Copywriter

PERSONA You are a professional copywriter writing about CNC machines.
USE POPUP Allow to open Facebook and Linkedin
```

### <a id="commitment-use-image-generator"></a>🖼️ USE IMAGE GENERATOR

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable the agent to output markdown image placeholders that the UI turns into generated images.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+IMAGE\s+GENERATOR)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+IMAGE\s+GENERATOR)\b(?:\s+(?<contents>.+))?$/gim`

Enables the agent to output markdown image placeholders that trigger image generation in the user interface.

## Key aspects

-   The content following `USE IMAGE GENERATOR` is an arbitrary text that the agent should know (e.g. style instructions or safety guidelines).
-   The agent does **not** call an image-generation tool directly.
-   The agent inserts markdown notation: `![alt](?image-prompt=...)`.
-   The user interface detects the notation and generates the image asynchronously.

## Examples

```book
Visual Artist

PERSONA You are a creative visual artist.
USE IMAGE GENERATOR
RULE Always describe the generated image to the user.
```

```book
Interior Designer

PERSONA You are an interior designer who helps users visualize their space.
USE IMAGE GENERATOR Professional interior design renders.
ACTION Add one generated image placeholder whenever a user asks for a visual.
```

### <a id="commitment-use-mcp"></a>🔌 USE MCP

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Connects the agent to an external MCP server for additional capabilities.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+MCP|MCP)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+MCP|MCP)\b\s+(?<contents>.+)$/gim`

Connects the agent to an external Model Context Protocol (MCP) server.

## Key aspects

-   The content following `USE MCP` must be a valid URL
-   Multiple MCP servers can be connected by using multiple `USE MCP` commitments
-   The agent will have access to tools and resources provided by the MCP server

## Example

```book
Company Lawyer

PERSONA You are a company lawyer.
USE MCP http://legal-db.example.com
```

### <a id="commitment-use-privacy"></a>🔒 USE PRIVACY

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable the agent to request turning private mode on for sensitive conversations.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+PRIVACY|PRIVACY)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+PRIVACY|PRIVACY)\b(?:\s+(?<contents>.+))?$/gim`

Enables the agent to request turning on private mode in chat.

## Key aspects

-   The tool `turn_privacy_on` asks the UI to show a confirmation dialog to the user.
-   Private mode is enabled only after explicit user confirmation in the UI.
-   In the current implementation, this reuses existing private mode behavior in chat.
-   While private mode is active, chat persistence, memory persistence, and self-learning are disabled.
-   Proper encryption is planned for future updates, but not implemented by this commitment yet.
-   Optional content after `USE PRIVACY` can provide additional privacy instructions.

## Examples

```book
Sensitive Assistant

PERSONA You help with sensitive topics where privacy is important.
USE PRIVACY
```

```book
Compliance Assistant

PERSONA You assist with legal and HR conversations.
USE PRIVACY Offer private mode when user asks to avoid storing data.
```

### <a id="commitment-use-project"></a>🧑‍💻 USE PROJECT

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable GitHub project tools for reading/editing repository files and creating pull requests.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE\s+PROJECT|PROJECT)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE\s+PROJECT|PROJECT)\b\s+(?<contents>.+)$/gim`

Enables the agent to work with files in a GitHub repository and create pull requests.

## Key aspects

-   The first repository reference in the commitment should point to GitHub repository (for example `https://github.com/owner/repo`).
-   Optional extra instructions can follow the repository reference.
-   The runtime provides a GitHub token (manual wallet token or host-managed integration token).
-   Tools support listing files, reading files, editing files, deleting files, creating branches, and opening pull requests.

## Examples

```book
AI Developer

PERSONA You are a TypeScript developer
USE PROJECT https://github.com/example/project
```

### <a id="commitment-use"></a>🔧 USE

-   **Status:** Implemented
-   **Aliases:** None
-   **Semantics:** Enable the agent to use specific tools or capabilities (BROWSER, SEARCH ENGINE, DEEPSEARCH, etc.).
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>USE)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>USE)\b\s+(?<contents>.+)$/gim`

Enables the agent to use specific tools or capabilities for interacting with external systems.

## Supported USE types

-   **USE BROWSER** - Enables the agent to use a web browser tool to access and retrieve information from the internet
-   **USE SEARCH ENGINE** (future) - Enables search engine access
-   **USE DEEPSEARCH** - Enables deeper research-oriented search access
-   **USE FILE SYSTEM** (future) - Enables file system operations
-   **USE MCP** (future) - Enables MCP server connections

## Key aspects

-   The content following the USE commitment is ignored (similar to NOTE)
-   Multiple USE commitments can be specified to enable multiple capabilities
-   The actual tool usage is handled by the agent runtime

## Examples

### Basic browser usage

```book
Research Assistant

PERSONA You are a helpful research assistant
USE BROWSER
KNOWLEDGE Can search the web for up-to-date information
```

### Multiple tools

```book
Data Analyst

PERSONA You are a data analyst assistant
USE BROWSER
USE FILE SYSTEM
ACTION Can analyze data from various sources
```

### <a id="commitment-expect"></a>🚧 EXPECT

-   **Status:** Placeholder (not fully implemented)
-   **Aliases:** None
-   **Semantics:** Placeholder commitment that appends content verbatim to the system message.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>EXPECT)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>EXPECT)\b\s+(?<contents>.+)$/gim`

This commitment is not yet fully implemented.

## Key aspects

-   Content is appended directly to the system message.
-   No special processing or validation is performed.
-   Behavior preserved until proper implementation is added.

## Status

-   **Status:** Placeholder implementation
-   **Effect:** Appends content prefixed by commitment type
-   **Future:** Will be replaced with specialized logic

## Examples

```book
Example Agent

PERSONA You are a helpful assistant
EXPECT Your content here
RULE Always be helpful
```

### <a id="commitment-behaviour"></a>🚧 BEHAVIOUR

-   **Status:** Placeholder (not fully implemented)
-   **Aliases:** `BEHAVIOURS`
-   **Semantics:** Placeholder commitment that appends content verbatim to the system message.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>BEHAVIOUR)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>BEHAVIOUR)\b\s+(?<contents>.+)$/gim`

This commitment is not yet fully implemented.

## Key aspects

-   Content is appended directly to the system message.
-   No special processing or validation is performed.
-   Behavior preserved until proper implementation is added.

## Status

-   **Status:** Placeholder implementation
-   **Effect:** Appends content prefixed by commitment type
-   **Future:** Will be replaced with specialized logic

## Examples

```book
Example Agent

PERSONA You are a helpful assistant
BEHAVIOUR Your content here
RULE Always be helpful
```

### <a id="commitment-avoid"></a>🚧 AVOID

-   **Status:** Placeholder (not fully implemented)
-   **Aliases:** `AVOIDANCE`
-   **Semantics:** Placeholder commitment that appends content verbatim to the system message.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>AVOID)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>AVOID)\b\s+(?<contents>.+)$/gim`

This commitment is not yet fully implemented.

## Key aspects

-   Content is appended directly to the system message.
-   No special processing or validation is performed.
-   Behavior preserved until proper implementation is added.

## Status

-   **Status:** Placeholder implementation
-   **Effect:** Appends content prefixed by commitment type
-   **Future:** Will be replaced with specialized logic

## Examples

```book
Example Agent

PERSONA You are a helpful assistant
AVOID Your content here
RULE Always be helpful
```

### <a id="commitment-context"></a>🚧 CONTEXT

-   **Status:** Placeholder (not fully implemented)
-   **Aliases:** None
-   **Semantics:** Placeholder commitment that appends content verbatim to the system message.
-   **Type schema (`createTypeRegex`):** `/^\s*(?<type>CONTEXT)\b/gim`
-   **Block schema (`createRegex`):** `/^\s*(?<type>CONTEXT)\b\s+(?<contents>.+)$/gim`

This commitment is not yet fully implemented.

## Key aspects

-   Content is appended directly to the system message.
-   No special processing or validation is performed.
-   Behavior preserved until proper implementation is added.

## Status

-   **Status:** Placeholder implementation
-   **Effect:** Appends content prefixed by commitment type
-   **Future:** Will be replaced with specialized logic

## Examples

```book
Example Agent

PERSONA You are a helpful assistant
CONTEXT Your content here
RULE Always be helpful
```

## <a id="end-to-end-examples"></a>End-to-end examples

### <a id="example-minimal-hello-world-agent"></a>Minimal hello-world agent

**Goal:** Create the smallest useful agent with identity and greeting.

**Full source**

```book
Hello World Agent

GOAL Be a concise and friendly assistant.
INITIAL MESSAGE Hello! I am ready to help.
CLOSED
```

**Walkthrough**

1. The first line (`Hello World Agent`) is the agent name.
2. `GOAL` defines the effective role and profile text.
3. `INITIAL MESSAGE` sets a deterministic first message for a new chat.
4. `CLOSED` prevents conversational self-modification.

### <a id="example-tool-using-browser-search-agent"></a>Tool-using agent (Browser + Search engine)

**Goal:** Enable internet research with clear sourcing behavior.

**Full source**

```book
Web Research Assistant

GOAL Research topics using fresh and verifiable information.
USE SEARCH ENGINE Prefer official sources and recent publications.
USE BROWSER
RULE Verify important claims across multiple sources when possible.
RULE Include source links in your final answer.
INITIAL MESSAGE Ask me what topic you want to research and how deep the report should be.
```

**Walkthrough**

1. `USE SEARCH ENGINE` provides web search tooling and optional search instructions.
2. `USE BROWSER` enables URL fetching and interactive browsing tools.
3. `RULE` commitments make reliability behavior explicit and repeatable.
4. This pattern is ideal for current-events and fact-checking agents.

### <a id="example-rule-and-knowledge-agent"></a>Agent with RULE and KNOWLEDGE

**Goal:** Ground responses in explicit constraints and curated sources.

**Full source**

```book
Support Policy Assistant

GOAL Answer questions about support policy.
KNOWLEDGE Refunds are available within 30 days with proof of purchase.
KNOWLEDGE https://example.com/support-policy
RULE If a policy item is missing in available knowledge, say it explicitly.
RULE Never invent legal or policy statements.
INITIAL MESSAGE I can explain refund and support rules from provided knowledge.
```

**Walkthrough**

1. `KNOWLEDGE` may be inline text or an external URL/document.
2. `RULE` commitments define non-negotiable behavior constraints.
3. Combining both creates predictable, grounded policy responses.
4. Use this pattern for compliance, support, and internal procedures.

### <a id="example-memory-agent-with-long-term-memory"></a>MEMORY agent with long-term memory

**Goal:** Persist user preferences across conversations.

**Full source**

```book
Customer Success Memory Agent

GOAL Support SaaS customers while remembering relevant setup and preference context.
MEMORY Remember product setup, user goals, and communication preferences.
RULE Store only user-approved preferences and project context.
RULE Never store secrets or sensitive data unless explicitly requested and allowed.
INITIAL MESSAGE I can remember your setup and preferences for future sessions.
```

**Walkthrough**

1. `MEMORY` adds runtime memory tools and memory-specific system guidance.
2. `RULE` commitments narrow what should be remembered to reduce privacy risks.
3. In Agents Server, memory is runtime-backed and user-scoped.
4. Use this for assistants that must preserve context over time.

### <a id="example-use-project-and-wallet-integration-agent"></a>USE PROJECT and WALLET external integration

**Goal:** Work with GitHub repositories and wallet-backed credentials.

**Full source**

```book
Repository Maintainer

GOAL Maintain a GitHub repository and prepare safe pull requests.
USE PROJECT https://github.com/acme/website
WALLET Store credentials for repository operations.
RULE Before editing files, explain the planned change and impacted paths.
RULE Never reveal raw credentials in chat output.
INITIAL MESSAGE I can inspect the repository and help you prepare PR-ready changes.
```

**Walkthrough**

1. `USE PROJECT` enables repository tools for listing, reading, editing files, and creating PRs.
2. Credentials are resolved from wallet records at runtime in Agents Server.
3. `WALLET` is kept here as a compatibility marker, but current Book 2.0 parsing treats it as deprecated/ignored.
4. In current runtime behavior, wallet-backed integrations are driven by commitments such as `USE PROJECT` and `USE EMAIL`.

### <a id="example-use-calendar-integration-agent"></a>USE CALENDAR integration

**Goal:** Coordinate meetings and schedules through a connected Google Calendar.

**Full source**

```book
Calendar Assistant

GOAL Schedule meetings and keep the calendar conflict-free.
USE CALENDAR https://calendar.google.com/calendar/u/0/r
SCOPES https://www.googleapis.com/auth/calendar
RULE Confirm destructive actions before deleting an event.
INITIAL MESSAGE Tell me the meeting details and I will schedule it in your calendar.
```

**Walkthrough**

1. `USE CALENDAR` enables calendar tools for listing, reading, creating, updating, and deleting events.
2. The first calendar URL identifies which calendar integration should be used.
3. `SCOPES` can explicitly request required Google Calendar OAuth permissions.
4. Credentials are resolved from wallet-backed Google Calendar OAuth records at runtime in Agents Server.

### <a id="example-agents-team-example"></a>Agents TEAM (with in-book teammates)

**Goal:** Delegate sub-tasks to specialized teammates.

**Full source**

```book
Team Manager

GOAL Coordinate specialists and deliver one consolidated answer.
TEAM Ask {Legal Reviewer} for legal constraints and {Implementation Reviewer} for technical feasibility.
RULE Always summarize teammate outputs into one action plan.

--

Legal Reviewer

FROM VOID
GOAL Review legal and compliance risk.
RULE Flag legal/compliance risk and uncertainty clearly.
CLOSED


Implementation Reviewer

FROM VOID
GOAL Review implementation effort and delivery risk.
RULE Estimate complexity and identify blockers.
CLOSED
```

**Walkthrough**

1. The main agent delegates via `TEAM` commitment.
2. References in `{...}` are resolved against embedded agents inside the same book (split by `--`).
3. Each teammate can be isolated with `FROM VOID` for deterministic specialization.
4. This pattern works well for multi-role review and decision support.

## <a id="do-nots-and-common-pitfalls"></a>Do nots and common pitfalls

1. **Too broad agent scope**

-   Don't: One agent tries to be a lawyer, developer, marketer, and researcher at once.
-   Do instead: Split into focused agents and orchestrate with TEAM or IMPORT.

2. **Unverifiable claims**

-   Don't: The agent answers internet-dependent questions without tools or without citing sources.
-   Do instead: Add `USE SEARCH ENGINE` / `USE BROWSER` and a citation-oriented `RULE`.

3. **Missing guardrails**

-   Don't: Only persona is defined, with no behavioral constraints.
-   Do instead: Add concrete `RULE` commitments for safety, scope, and tone.

4. **Overloaded inheritance**

-   Don't: Using deep `FROM` chains without documenting why each parent is needed.
-   Do instead: Keep inheritance shallow and use focused IMPORT/TEAM composition for reuse.

5. **Unsafe memory usage**

-   Don't: Storing every detail in memory without boundaries.
-   Do instead: Pair `MEMORY` with explicit rules about what is allowed to persist.

## <a id="build-an-agent-from-scratch-offline-tutorial"></a>Build an agent from scratch (offline tutorial)

This tutorial is sufficient without internet access.

1. **Define role and goal**
   Create a short name line and one clear `GOAL`.
2. **Add behavioral constraints**
   Add 3-6 specific `RULE` commitments covering scope, tone, and safety boundaries.
3. **Add grounding**
   Add `KNOWLEDGE` commitments (inline text or local/importable sources).
4. **Add capabilities**
   Add only necessary `USE*` and/or `MEMORY` commitments.
5. **Set profile metadata**
   Add `META DESCRIPTION`, `META IMAGE`, `META INPUT PLACEHOLDER`, and disclaimers if needed.
6. **Add first interaction**
   Add `INITIAL MESSAGE` and optionally sample `USER MESSAGE` / `AGENT MESSAGE` pairs.
7. **Close for deterministic behavior (optional)**
   Add `CLOSED` when you want stable non-self-modifying behavior.

Copy-paste template:

```book
Project Assistant

GOAL Help the user turn project ideas into concrete deliverables with focused planning support.

RULE Ask clarifying questions when requirements are ambiguous.
RULE Provide concise, structured outputs with actionable steps.
RULE If information is missing, state assumptions explicitly.
RULE Do not invent facts.

KNOWLEDGE Team works in two-week sprints and tracks tasks in Kanban.
KNOWLEDGE Preferred output format: summary, plan, risks, next action.

META DESCRIPTION Practical project-planning assistant.
META INPUT PLACEHOLDER Describe your project goal or blocker...

INITIAL MESSAGE Share your project goal and current blocker, and I will propose a concrete next-step plan.
CLOSED
```

Validation checklist:

-   Does each commitment have a clear purpose?
-   Are there explicit constraints against hallucination and unsafe behavior?
-   Are tools only enabled when genuinely needed?
-   Is memory usage bounded by clear rules?
-   Is composition (`FROM`/`TEAM`/`IMPORT`) justified and understandable?

Generated from:

-   Commitments registry and runtime docs in `src/commitments`
-   Parser/compiler behavior in `src/book-2.0/agent-source`
-   Agents Server reference/inheritance resolution in `apps/agents-server/src/utils`
-   Standalone docs source blocks in `apps/agents-server/src/utils/bookLanguageDocumentation`
