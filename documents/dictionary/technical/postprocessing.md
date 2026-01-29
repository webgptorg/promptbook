# Postprocessing

**Postprocessing** is the process of cleaning, formatting, or transforming the output of an [LLM](../technical/llm.md) before it is used as a [Parameter](../pipelines/parameter.md) or returned to the user. This is particularly important in legacy [Pipelines](../core/pipeline.md), where one task's output must perfectly match another task's expected input format.

## Common Postprocessing Tasks

-   **Trim**: Removing leading and trailing whitespace.
-   **Normalize**: Converting text to lowercase, removing special characters, or slugifying titles.
-   **Extraction**: Picking out specific parts of the LLM's response (e.g., extracting a URL or a JSON object from a longer message).
-   **Transformation**: Converting data formats (e.g., converting a CSV-formatted string into a JSON array).

## Example in a Book File

```book
## Generate Slug

-   PERSONA Professional Blogger
-   POSTPROCESS spaceTrim
-   POSTPROCESS nameToSlug

```markdown
Generate a URL-friendly slug for the following title: {title}
```

`-> {slug}`
```

In this example:
1.  The LLM generates a slug (e.g., " My New Blog Post ").
2.  `spaceTrim` removes the extra spaces ("My New Blog Post").
3.  `nameToSlug` converts it to a standard slug format ("my-new-blog-post").
4.  The final result is stored in `{slug}`.

## Related Concepts

-   [**Task**](../pipelines/task.md)
-   [**Expectations**](../pipelines/expect.md)
-   [**Script**](./script.md)
-   [**Pipeline**](../core/pipeline.md)
