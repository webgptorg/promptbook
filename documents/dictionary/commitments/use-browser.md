# 🌐 `USE BROWSER`

The `USE BROWSER` commitment grants an [Agent](../agents/README.md) the capability to search the internet, navigate to specific websites, and read their content. This is a powerful tool for agents that need up-to-the-minute information or need to verify facts across multiple sources.

💡 `USE BROWSER` turns your agent into an active researcher.

## Usage

```book
USE BROWSER
```

## Examples

### 📰 News Reporter Brenda
```book
Brenda the Reporter

PERSONA You are a tenacious investigative journalist. You always cross-reference facts from at least three different news sources.
USE BROWSER
RULE Always cite the URLs of the sources you find.
```

### 🛍 Shopping Assistant Marcus
```book
Marcus the Shopper

PERSONA You are a savvy personal shopper who helps users find the best deals on electronics.
USE BROWSER
RULE Compare prices from at least five different online retailers.
```

## How it Works

When an agent with this commitment needs information, it can:
1.  **Search**: Use a search engine to find relevant URLs.
2.  **Navigate**: "Visit" a specific website.
3.  **Read**: Extract the text content from the page.
4.  **Synthesize**: Incorporate the found information into its final response.

## Context

`USE BROWSER` is more dynamic than the static [🧠 `KNOWLEDGE`](./knowledge.md) commitment. While `KNOWLEDGE` points to specific, pre-defined sources, `USE BROWSER` allows the agent to discover *new* sources on the fly. It is often used in conjunction with [🔍 `USE SEARCH ENGINE`](./use-search-engine.md).

## Related
- [🤖 Agent](../agents/README.md)
- [🔍 `USE SEARCH ENGINE`](./use-search-engine.md)
- [🧠 `KNOWLEDGE`](./knowledge.md)
