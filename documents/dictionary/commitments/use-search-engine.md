# USE SEARCH ENGINE

The `USE SEARCH ENGINE` commitment allows an [Agent](../core/agent.md) to perform web searches to find relevant information or links. This is often the first step when an agent needs to answer a question about a topic it doesn't have in its [KNOWLEDGE](./knowledge.md) base.

## Example

```book
Catherine Brown

PERSONA You are a specialized tech journalist.
USE SEARCH ENGINE
RULE Focus on news from the last 24 hours.
```

In this example, Catherine can search for the latest tech breakthroughs to write a daily news summary for her readers.

## How it Works

When an agent needs to find information, it generates a search query. The Promptbook system then:
1.  Executes the query using a search provider (like Google, Bing, or DuckDuckGo).
2.  Retrieves a list of results (titles, snippets, and URLs).
3.  Presents these results to the agent.
4.  The agent can then decide to visit a specific link using [**USE BROWSER**](./use-browser.md) if needed.

## Comparison with Browser

`USE SEARCH ENGINE` is for discovery (finding "where" the information is), whereas [**USE BROWSER**](./use-browser.md) is for consumption (reading the content of a specific page).

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**USE BROWSER**](./use-browser.md)
-   [**Knowledge**](./knowledge.md)
