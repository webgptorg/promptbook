# Collection

A **Collection** is a grouping of multiple [Agents](../core/agent.md) or [Pipelines](../core/pipeline.md). Collections are used to organize and manage large numbers of Book files, making it easier to load, find, and execute the right AI workflow for a given situation.

## Types of Collections

### 1. AgentCollection

An `AgentCollection` manages a set of [Agents](../core/agent.md). It is often used in a multi-agent system where a "coordinator" agent might delegate tasks to other specialized agents in the collection.

For example, a **Customer Support Collection** might include:
-   **John Green**: A billing specialist.
-   **Catherine Brown**: A technical support specialist.
-   **Jan Zelený**: A Czech-speaking general assistant.

### 2. PipelineCollection (Legacy)

A `PipelineCollection` manages a set of legacy [Pipelines](../core/pipeline.md). It allows you to load all your `.book` files from a directory and access them by their name or URL.

## How to Create a Collection

Collections can be created in several ways:
-   **From a directory**: Automatically load all `.book` files in a specific folder.
-   **From an array**: Programmatically create a collection from a list of Agent or Pipeline objects.
-   **From a remote URL**: Load definitions from a Promptbook Server or a GitHub repository.

## Benefits

-   **Organization**: Keep related agents together.
-   **Scalability**: Manage hundreds of specialized workflows.
-   **Reusability**: Shared components can be reused across multiple agents in the same collection.

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**Pipeline**](../core/pipeline.md)
-   [**Book File**](./book-file.md)
-   [**Executor**](../technical/executor.md)
