# 🛤 Pipelines

A **Pipeline** (also known as a Workflow or Chain) is a legacy abstraction in Promptbook that focuses on sequential, multi-step LLM operations. It defines a clear path from input parameters to final output, often involving multiple intermediate templates and LLM calls.

💡 Pipelines are like assembly lines: data goes in, gets processed by various "stations," and comes out as a finished product.

## 📂 Key Terms in Pipelines

-   [**Template**](./template.md) - A single prompt within a pipeline.
-   [**Parameter**](./parameter.md) - A variable used to pass data between templates or from the user.
-   [**Execution**](../execution/README.md) - The process of running the pipeline.
-   [**Expectation**](../concepts/expectations.md) - Validation rules for template outputs.

## Example

```book
# 📝 Recipe Generator

Generate a delicious recipe based on available ingredients.

## 📥 Inputs

-   `ingredients`

## 🍳 Step 1: Suggest Name

-   MODEL GPT-4
-   EXPECT MIN 3 WORDS

Suggest a catchy name for a dish made with {ingredients}.

➔ `dishName`

## 🥗 Step 2: Write Recipe

-   MODEL GPT-4

Write a detailed recipe for {dishName} using {ingredients}.

➔ `recipe`
```

In this example, the pipeline takes `ingredients` as input, first generates a `dishName`, and then uses that `dishName` to write the full `recipe`.

## 🔄 Status: Legacy / Deprecated

While Pipelines are still supported and widely used for structured data processing, the project is shifting towards [Agents](../agents/README.md). Agents provide a higher level of abstraction and are better suited for interactive, conversational, and autonomous tasks.

## 🧠 When to use Pipelines?

-   When you need a strict, predictable sequence of steps.
-   When the task is purely data transformation (Input ➔ Output).
-   When you are working with legacy Promptbook codebases.

## Related
- [🤖 Agent](../agents/README.md)
- [⭕ Parameter](./parameter.md)
- [📜 Template](./template.md)
