# USE TIME

The `USE TIME` commitment grants an [Agent](../core/agent.md) the ability to know the current date and time. By default, [LLMs](../technical/llm.md) have a "knowledge cutoff" and do not know the exact moment they are being used. `USE TIME` solves this by injecting the current timestamp into the conversation context.

## Example

```book
Catherine Brown

PERSONA You are a professional event coordinator.
USE TIME
RULE Always mention how many days are left until the next scheduled event.
```

In this example, Catherine can accurately tell a user that their "Sustainable Design Workshop" is in exactly 3 days because she knows today's date.

## Why it's Important

Without this commitment, if you ask an AI "What day is it today?", it might give you an incorrect date or tell you it doesn't know. With `USE TIME`, the agent has real-time awareness of the temporal context.

## Related Concepts

-   [**Agent**](../core/agent.md)
-   [**USE BROWSER**](./use-browser.md)
-   [**Instrument**](../pipelines/instrument.md)
