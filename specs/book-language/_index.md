# Book language

[Main specification](../_main.md) · [Project model](../concepts/project-model.md)

Book is one human-readable language for **agents, tasks and chats**, each in one `.book` source. Its three syntactic building blocks are **commitment keywords**, their **content**, and **references** within nonliteral content. Every canonical Book starts with a type-and-name commitment: `AGENT <name>`, `TASK <name>` or `CHAT <name>`. The name is the commitment's content, not a separate unprefixed header or a filename.

The same syntax and parser apply to every entity kind. The first commitment establishes what is being defined; subsequent commitments build up that entity's instructions, work or conversation. Entity-specific validation and engine behavior are separate from parsing. The commitment vocabulary and supported entity kinds may grow without introducing another document grammar.

### Editing one Book from TypeScript

```ts
import { Book, book } from 'ptbk';

const name = 'Writer';
const draft = book`
    AGENT ${name}
    RULE Keep answers short.
`;
const source = draft.rename('Editor').setModel([
    { harness: 'OPENAI_CODEX', model: 'gpt-5', thinking: 'high' },
    { harness: 'CLAUDE_CODE' },
]).toString();
```

Use the `book` tag for source written inside JavaScript or TypeScript. It removes surrounding blank lines and common indentation, preserves relative indentation and returns an editable `Book`. A multiline value placed on its own indented line aligns with the surrounding content. Use `Book.parse(source)` for text loaded by the app, then save `draft.toString()` with the original revision ID. Both named exports and their TypeScript declarations ship in the `ptbk` package and work in browser bundles.

Each row is a complete alternative. Use `setModel([{}])` for `MODEL *`. Read `draft.model.constraint.rows` for the local selection and `draft.model.diagnostics` for any problems in its source. A missing MODEL has `explicit: false`. A chat appends a changed selection chronologically.

`Book.create('task', name)` starts a new document. `addCommitment('RULE', text)` appends escaped content. `setSource(text)` accepts the raw editor draft, including incomplete syntax. The same instance then exposes its current name, kind, commitments through `draft.document.commitments`, and diagnostics. Mutators return that instance. `toString()` returns the exact draft for the caller to save with its original revision.

- [Progressive layering](layering.md): Evolving Books and chronological chat events, with implicit open status.
- [Syntax](syntax.md): Commitment-first documents, uppercase boundaries, content and diagnostics.
- [References](references.md): One normalized name resolver and graph links across all three kinds.
- [Inheritance](inheritance.md): Agent-only FROM, implicit Adam and termination.
- [Commitments](commitments/_index.md): One document per canonical commitment.
- [Message audio](commitments/chat-message-audio.md): Text and recorded speech as two representations of one chat utterance.
- [Generated names](../cli/generated-names.md): Preventive task/chat naming, separate from language validity and filenames.
- [VS Code extension](vscode.md): Editor support built and released with the same engine vocabulary.

[Agents](../agents/_index.md), [Task Books](../cli/task-books.md) and [Chats](../cli/chats.md) define distinct semantics; common syntax does not make a chat executable or a task inheritable. Plain name headers and `ENTITY` belong to [explicit legacy conversion](../cli/migration.md), not canonical authoring or folder-based type inference.

Task evolution uses [TASK CHANGE](commitments/task-change.md) and [TASK REOPEN](commitments/task-reopen.md) alongside typed status/schedule commitments, preserving earlier source layers. [Reference action prefixes](references.md#active-chat-invitation-is-an-action-prefix) distinguish passive references from active chat invitation without creating another parser or reference identity.
