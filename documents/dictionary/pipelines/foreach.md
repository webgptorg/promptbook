# Foreach

The `FOREACH` command is used in legacy [Pipelines](../core/pipeline.md) to iterate over a collection of data, such as rows in a CSV file or items in an array. It allows you to perform the same set of [Tasks](./task.md) for each item in the collection.

## Purpose

`FOREACH` is essential for batch processing tasks, such as:
-   Generating personalized emails for a list of customers.
-   Summarizing multiple articles in a single run.
-   Processing rows in a spreadsheet.

## Example in a Book File

```book
# 💌 Email Generator

-   INPUT PARAMETER {customerList} A CSV string of customers

## Process Customers

-   FOREACH Csv row {customerList} -> {firstName} {lastName} {email}

## Write Email

-   PERSONA Customer Support Specialist

```markdown
Write a thank-you email to {firstName} {lastName} ({email}).
```

`-> {outputEmails}`
```

In this example:
1.  The `FOREACH` command parses the `{customerList}` CSV.
2.  For each row, it extracts the `{firstName}`, `{lastName}`, and `{email}`.
3.  The "Write Email" task is executed for each customer.
4.  All generated emails are collected into the `{outputEmails}` parameter.

## Foreach in Modern Agents

In modern [Agents](../core/agent.md), batch processing is often handled by the agent itself or through specialized tools. However, the `FOREACH` logic remains a powerful way to handle structured data within a Promptbook workflow.

## Related Concepts

-   [**Pipeline**](../core/pipeline.md)
-   [**Task**](./task.md)
-   [**Parameter**](./parameter.md)
