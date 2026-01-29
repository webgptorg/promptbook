# TEMPLATE Commitment

The `TEMPLATE` commitment enforces a specific message structure or response template that the agent must follow when generating responses.

## Icon

📋

## Description

Enforce a specific message structure or response template.

## Usage

The TEMPLATE commitment can be used in two ways:

### 1. Template Mode (Without Content)

Use `TEMPLATE` alone to enable template mode, which instructs the agent to use structured, consistent formatting:

```book
Customer Support Agent

PERSONA You are a helpful customer support representative
TEMPLATE
STYLE Be professional and empathetic
```

### 2. Specific Template (With Content)

Provide specific template structure instructions:

```book
Technical Assistant

PERSONA You are a technical writing expert
TEMPLATE Always structure your response with: 1) Summary, 2) Details, 3) Example
```

## Key Features

- **Both forms work**: Use `TEMPLATE` or `TEMPLATES` (singular/plural are aliases)
- **Optional content**: Can be used with or without content
- **Accumulative**: Multiple templates can be combined
- **Metadata tracking**: Templates are stored in `metadata.templates` for programmatic access

## Examples

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

- **FORMAT**: Specifies output structure or formatting (e.g., JSON, markdown)
- **STYLE**: Controls tone and writing style
- **RULE**: Adds behavioral constraints

## Technical Notes

- Commitment type: `TEMPLATE` | `TEMPLATES`
- Requires content: `false`
- Base class: `BaseCommitmentDefinition`
- File location: `src/commitments/TEMPLATE/TEMPLATE.ts`
