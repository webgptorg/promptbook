# 🕒 `USE TIME`

The `USE TIME` commitment grants an [Agent](../agents/README.md) awareness of the current date and time. Without this commitment, LLMs generally have no sense of "now" beyond their training data cutoff, leading to confusion when users ask about today's date or current events.

💡 `USE TIME` grounds your agent in the present moment.

## Usage

```book
USE TIME
```

## Examples

### 📅 Personal Assistant David
```book
David the Assistant

PERSONA You are a highly organized personal assistant. You help users manage their schedules and keep track of important dates.
USE TIME
RULE Always mention the current day of the week when starting a conversation.
```

### 🕒 Event Planner Sarah
```book
Sarah the Planner

PERSONA You are a professional event planner.
USE TIME
RULE When asked about an event, calculate how many days are left until it occurs based on today's date.
```

## How it Works

When this commitment is present, the [ExecutionTools](../execution/execution-tools.md) provide the current timestamp to the LLM as part of the system context. This allows the model to:
-   Answer "What day is it today?"
-   Calculate durations (e.g., "How long until Christmas?").
-   Understand relative time references like "yesterday," "next week," or "three months ago."

## Context

`USE TIME` is essential for any agent that interacts with calendars, schedules, or time-sensitive data. It is often used alongside [🌐 `USE BROWSER`](./use-browser.md) to help the agent understand if the information it finds online is recent or outdated.

## Related
- [🤖 Agent](../agents/README.md)
- [🌐 `USE BROWSER`](./use-browser.md)
- [⚙ Execution Tools](../execution/execution-tools.md)
