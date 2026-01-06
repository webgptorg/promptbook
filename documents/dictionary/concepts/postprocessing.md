# ✂ Postprocessing

**Postprocessing** is a core concept in Promptbook that involves refining, transforming, or cleaning the output of an LLM after it has been generated. While [🧪 Expectations](./expectations.md) validate the output, postprocessing *modifies* it to fit the required format or style.

💡 Postprocessing is the "finishing touch" that makes AI output production-ready.

## Usage in Pipelines

In [Pipelines](../pipelines/README.md), postprocessing is defined using the `POSTPROCESS` command within a template section.

```book
## Write a Title

Write a catchy title for a blog post about {topic}.

- POSTPROCESS trim
- POSTPROCESS capitalize
```

## Common Postprocessing Operations

-   **`trim`**: Removes leading and trailing whitespace.
-   **`capitalize`**: Capitalizes the first letter of each word.
-   **`unwrap`**: Removes Markdown code blocks (e.g., stripping ```json and ```).
-   **`extract`**: Extracts a specific part of the response (e.g., using a regex).
-   **`custom`**: Running a custom JavaScript/TypeScript function on the output.

## Why Postprocess?

1.  **Consistency**: Ensures that outputs follow a specific format regardless of how the LLM phrases them.
2.  **Integration**: Prepares data for use in other parts of the application (e.g., turning a text response into a valid JSON object).
3.  **Cleanliness**: Removes unwanted artifacts like "Sure, here is your summary:" or extra newlines.

## Context in Agents

For [Agents](../agents/README.md), postprocessing can be used to ensure that the agent's final response to the user is polite, follows branding guidelines, or is formatted correctly for the specific [Formfactor](./formfactors.md) (e.g., adding Markdown for a web chat).

## Related
- [🛤 Pipeline](../pipelines/README.md)
- [🤖 Agent](../agents/README.md)
- [🧪 Expectations](./expectations.md)
- [🏗 Structure](../structure/README.md)
