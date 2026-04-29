# TEMPLATE Commitment

The `TEMPLATE` commitment is a deprecated legacy commitment for response structure and templates.
New books should use `WRITING SAMPLE` and `WRITING RULES` instead.

## Icon

📋

## Description

Deprecated legacy message structure or response template commitment.

## Migration

The legacy `TEMPLATE` commitment can still be used in two ways for backward compatibility:

### 1. Legacy Template Mode (Without Content)

Use `TEMPLATE` alone only when maintaining older books. New books should express the same idea with `WRITING SAMPLE` and `WRITING RULES`:

```book
Customer Support Agent

PERSONA You are a helpful customer support representative
TEMPLATE
STYLE Be professional and empathetic
```

### 2. Legacy Specific Template (With Content)

Provide specific template structure instructions only for legacy books:

```book
Technical Assistant

PERSONA You are a technical writing expert
TEMPLATE Always structure your response with: 1) Summary, 2) Details, 3) Example
```

## Key Features

- **Both forms still work**: Use `TEMPLATE` or `TEMPLATES` (singular/plural are legacy aliases)
- **Optional content**: Can be used with or without content
- **Accumulative**: Multiple templates can be combined
- **Metadata tracking**: Templates are stored in `metadata.templates` for programmatic access

## Legacy Examples

### Example 1: Research Assistant

```book
Research Assistant

PERSONA You are an academic research assistant
TEMPLATE Use the following format: **Question:** [question] | **Answer:** [answer] | **Sources:** [citations]
RULE Always cite sources
```

### Example 2: Email Response Agent

```book
Email Response Agent

PERSONA You are a professional email assistant
TEMPLATE Structure: Greeting | Main Content | Closing
TEMPLATE Always include: Subject line suggestion at the end
```

### Example 3: Simple Template Mode

```book
John Doe

PERSONA You are a virtual assistant
TEMPLATE
```

## Implementation Details

When applied to agent model requirements:

- **Without content**: Adds general template mode instructions and sets `metadata.templateMode = true`
- **With content**: Adds specific template instructions to system message and stores template in `metadata.templates[]`
- **Multiple uses**: Templates accumulate in the metadata array

## Metadata Structure

```typescript
{
  templateMode: boolean,
  templates?: string[]
}
```

## Related Commitments

- **WRITING SAMPLE**: Preferred way to show a concrete response shape or voice exemplar
- **WRITING RULES**: Preferred way to describe formatting, structure, and writing-only constraints
- **FORMAT**: Deprecated legacy output-format commitment
- **STYLE**: Controls tone and writing style
- **RULE**: Adds behavioral constraints

## Technical Notes

- Commitment type: `TEMPLATE` | `TEMPLATES`
- Requires content: `false`
- Base class: `BaseCommitmentDefinition`
- File location: `src/commitments/TEMPLATE/TEMPLATE.ts`
