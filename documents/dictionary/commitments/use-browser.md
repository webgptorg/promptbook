# USE BROWSER

The `USE BROWSER` commitment grants an [Agent](../core/agent.md) the ability to access the live web using a controlled web browser. Unlike [KNOWLEDGE](./knowledge.md), which is typically indexed beforehand, `USE BROWSER` allows the agent to navigate websites, read real-time content, and interact with web pages during a conversation.

This commitment is essential for tasks that require real-time information, such as checking news, flight prices, or the latest software documentation.

## Example

```book
John Green

PERSONA You are a helpful travel assistant.
USE BROWSER
RULE Always verify flight availability before suggesting a trip.
```

In this example, John Green can use a browser to check real-time flight data for a user who wants to travel from London to Prague.

## How it Works

When an agent needs information from a specific URL or needs to find information on the web, it can trigger the browser tool. The browser will:
1.  Navigate to the requested URL.
2.  Extract the text content or take screenshots.
3.  Provide the extracted information back to the agent to process.

## Comparison with Search

While [**USE SEARCH ENGINE**](./use-search-engine.md) is for finding links, `USE BROWSER` is for deep-diving into the content of those links.

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**USE SEARCH ENGINE**](./use-search-engine.md)
-   [**Scraping**](../technical/scraping.md)
