# Script

A **Script** is a block of custom code written in a programming language like **Javascript** or **Python** that is executed as part of a [Pipeline](../core/pipeline.md). Scripts allow you to perform logic, calculations, and data manipulations that are difficult or impossible for an [LLM](../technical/llm.md) to do reliably.

## Purpose

While LLMs are great at language, they can struggle with:
-   **Math**: Performing complex calculations.
-   **Formatting**: Strictly following a complex data schema.
-   **Integration**: Interacting with specific external APIs or libraries.
-   **Logic**: Making deterministic decisions based on data.

## Example in a Book File

```book
## Calculate Total Price

-   SCRIPT LANGUAGE Javascript

```javascript
const price = parseFloat(itemPrice);
const count = parseInt(itemCount);
return (price * count).toFixed(2);
```

`-> {totalPrice}`
```

In this example, the script takes two parameters (`{itemPrice}` and `{itemCount}`), performs a calculation, and stores the result in `{totalPrice}`.

## How it Works

When the [Executor](../technical/executor.md) encounters a script task, it:
1.  Extracts the code from the [Book File](../core/book-file.md).
2.  Prepares the environment with the current [Parameters](../pipelines/parameter.md) as available variables.
3.  Executes the code in a secure sandbox.
4.  Captures the return value and stores it in the result parameter.

## Related Concepts

-   [**Pipeline**](../core/pipeline.md)
-   [**Task**](../pipelines/task.md)
-   [**Postprocessing**](./postprocessing.md)
-   [**Executor**](./executor.md)
