# Source syntax

[Book language](_index.md) · [Commitments](commitments/_index.md) · [References](references.md)

## One language, three building blocks

A Book is UTF-8 human-readable text. Its syntactic building blocks are a **commitment keyword**, that commitment's **content**, and **references** embedded in nonliteral content. A document is an ordered series of commitments, not a special title syntax followed by a different body language. Agent, task and chat Books use the same parsing rules; the engine interprets and validates the resulting commitments according to their meanings.

Ignore an optional UTF-8 BOM and leading blank lines. The first nonempty line must begin at column zero with exactly one supported type-and-name commitment: `AGENT <name>`, `TASK <name>` or `CHAT <name>`. The nonempty, single-line content after that keyword is the entity's display name. Normalize **that name only** for logical identity, excluding the keyword. Neither a generated opaque ID, filename, folder nor Git hash supplies identity.

This first commitment is foundational: it declares the entity to which all subsequent commitments apply. An agent's PERSONA, GOAL, RULE and KNOWLEDGE develop its role; a task's instructions and metadata describe bounded work; a chat's members and messages build its conversation. These are not nested Books or different parser modes. Exactly one entity is defined per source. A later standalone AGENT, TASK or CHAT declaration is an error, even if it repeats the same name or kind. Multiword keywords such as TASK AGENT and CHAT MESSAGE are distinct commitments, not additional entity declarations.

The declaration's content is a name, not a multiline description. Blank separation is allowed; place subsequent descriptive text under an appropriate commitment such as GOAL, PERSONA or NOTE. Nonblank continuation of the name declaration is invalid rather than silently becoming part of the name or an unowned introductory paragraph.

## Commitment boundaries and content

At the beginning of a nonliteral line, a commitment keyword is the maximal consecutive sequence of all-uppercase words, separated by spaces. The complete sequence must contain at least **three letters**, excluding spaces; a standalone `A`, `I` or `AI` in prose therefore does not start a commitment. Short words can occur within a longer keyword, as in `TASK DEPENDS ON`.

A word containing lowercase letters ends the keyword and begins its content. A reference, numeric value or other non-keyword token also begins content. Once content starts, later uppercase words on the same line remain content. Thus `AGENT Frontend Developer` has keyword AGENT and name `Frontend Developer`; `TASK AGENT @Developer` has keyword TASK AGENT and reference content; `TASK PRIORITY 2` has numeric content. `WRITING SAMPLE This is an example.` is one multiword keyword followed by text.

Do not consume only a recognized prefix when the complete uppercase sequence is longer. For example, `TASK SOMETHING value` is an unknown TASK SOMETHING commitment, not a TASK declaration. Likewise `AGENT CEO` does not secretly mean AGENT with name CEO under a special header rule: both uppercase words belong to the keyword. Use a mixed-case initial name word, for example `AGENT Ceo`; ordinary name normalization still handles case differences. Generated content must respect this same boundary rule.

Content may be on the keyword's line, on following lines, or both, and continues until the next commitment or end of the document. Line breaks and paragraphs do not create another top-level syntactic category. Most instruction bodies accept natural text; individual commitments may constrain their content, for example to a name, reference, number, timestamp, enum or message metadata plus text. Those constraints are semantic validation, not entity-specific tokenization. Empty content is allowed only where that commitment permits it, such as OPEN or CLOSED.

Literal fenced content remains literal, including examples that resemble commitments or references. Writers must preserve arbitrary supplied text losslessly using the supported literal quoting/escaping behavior; pasted uppercase lines must not accidentally become controls. A standalone uppercase word long enough to meet the boundary rule is not ordinary prose merely because its keyword is unknown. The semantic vocabulary is extensible: preserve and diagnose unknown commitments without silently dispatching work, granting permission or treating them as a known shorter keyword.

## Examples

```book
AGENT Developer
PERSONA You maintain the project's software.
GOAL Keep the project reliable and understandable.
RULE Preserve public interfaces.
```

```book
TASK Improve CSV export — 2026-10-18 01:25:00
GOAL Preserve column names and correctly quote cells with commas or newlines.
Add regression tests for multiline fields.
TASK AGENT @Developer
LINK {Discuss CSV requirements — 2026-10-18 01:24:00}
```

```book
CHAT Discuss CSV requirements — 2026-10-18 01:24:00
CHAT MEMBER @User
CHAT MEMBER @Developer
CHAT MESSAGE @User 2026-10-18T01:24:00+02:00
Can the export support multiline fields?
LINK {Improve CSV export — 2026-10-18 01:25:00}
```

The dates in these names illustrate [generated-name policy](../cli/generated-names.md). They have no special syntactic role; a name without a date is equally valid. CHAT MESSAGE timestamps, task scheduling and completion timestamps retain their separate commitment-specific meanings.

## Classification, validation and compatibility

The opening commitment determines kind from the Book itself, including when it is outside conventional directories. Locations govern discovery and queue eligibility, not parsing or type identity. Moving a valid Book cannot turn its agent into a task or its chat into an agent. Report misleading placement where relevant, but never override the declared kind or dispatch a non-task as queued work because it is in `tasks/`.

Missing/empty type-and-name declarations, extra declarations and malformed constrained content produce source/line diagnostics, not guessed dispatch. An unsupported opening type is an unsupported document kind, not an implicit agent. Repeatable commitments accumulate in order; single-value controls must be unambiguous. FROM and OPEN/CLOSED are agent-only. Task work, chat turns and LINKs retain their own contracts. Preserve source spelling, Unicode, attachments, metadata and literal blocks during mutation.

Unprefixed name headers and name-plus-ENTITY sources are legacy material, not alternate canonical syntax. [Explicit conversion](../cli/migration.md) preserves their names and content without modifying files during read-only discovery. ENTITY cannot override an opening declaration. An already conforming `TASK <name>` header is now canonical, not a deprecated spelling.

## Acceptance outcomes

Parse standalone AGENT, TASK and CHAT examples with one grammar and no location hint; moving them preserves kind and normalized name. Verify multiline content, multiword keywords, numeric/reference values, short uppercase prose words and fenced control-looking text. Preserve an unknown complete keyword without prefix fallback. Reject an empty declaration, an unprefixed canonical header, a second entity declaration and a multiline name; do not confuse TASK AGENT or CHAT MESSAGE with root declarations. No test depends on a timestamp being present in a name.

## Resilient authoring and repair

The diagnostics above describe whether a source can be interpreted safely, not a prohibition on saving it. Preserve unknown commitment content and user mistakes. The Book editor **warns and permits saving**, including malformed constrained MODEL content; detected problems create an ordinary Fixer repair task. Isolate affected execution instead of fatally failing the engine. Do not guess a runnable task from an ambiguous declaration, silently correct uncertain intent or turn every unusual natural-language sentence into a fatal syntax error. See [Book editor](../cli/book-editor.md).
