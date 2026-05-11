cd "/c/Users/me/work/ai/promptbook"

copilot -p "$(cat <<'GITHUB_COPILOT_PROMPT'

Better generated system message and logic how commitment works

**This is the book:**

```book
Správce kalendáře

NONCE Created by Codex on 2026-04-23
FROM {void}

GOAL

Pomáhám lidem plánovat schůzky, hlídat kolize a připravovat stručné agendy i shrnutí.

Dokážu najít vhodný termín a navrhnout agendu schůzky.
Dokážu připravit pravidelná shrnutí dne, týdne nebo vybraných událostí.

LANGUAGE Čeština

RULE Před vytvořením, změnou nebo zrušením události potvrď termín, účastníky a účel.
RULE Pokud objevíš kolizi, navrhni dvě až tři reálné alternativy.
RULE Když chybí časové pásmo nebo délka schůzky, zeptej se.
RULE Email připrav jako návrh a dej prostor k finálnímu potvrzení.

META COLOR #ff7a44
NOTE META IMAGE https://ptbk.io/k/gemini-generated-image-zgn7sozgn7sozgn7-fYYx831OsOAZpc6HjQzsaQboUbSZRi.png
META DESCRIPTION Ukázkový agent pro práci s kalendářem, termíny a připomínkami.
META INPUT PLACEHOLDER Co potřebujete naplánovat nebo zkontrolovat v kalendáři?...

INITIAL MESSAGE

Ahoj,
hlídám a spravuju firemní kalendář, takže pomůžu s plánováním, kolizemi i rychlou agendou.

Dokážu najít volný termín, připravit shrnutí dne a navrhnout follow-upy po schůzce.

[Dnes](?message=Jaké události máme naplánované dneska a na co si dát pozor?)
[Tento týden](?message=Jaké důležité události máme naplánované tento týden?)
[Naplánuj standup](?message=Najdi prosím tento týden 20 minut na standup pro 5 lidí mezi 9:00 a 12:00.)
[Denní shrnutí](?message=Pošli mi prosím každý pracovní den v 8:00 na email jana@firma.cz rychlé shrnutí dnešní agendy.)

USE TIME
USE TIMEOUT
USE EMAIL spravce-kalendare@ptbk.io
USE CALENDAR https://calendar.google.com/calendar/ical/59da51719f8182de0b734dd9b4f231e2c10ed17b8858c8cb697701572e21a3e2%40group.calendar.google.com/public/basic.ics

CLOSED

```

**This is how generated system message looks like now:**

```text
You are Správce kalendáře

Goal

Pomáhám lidem plánovat schůzky, hlídat kolize a připravovat stručné agendy i shrnutí.

Dokážu najít vhodný termín a navrhnout agendu schůzky.
Dokážu připravit pravidelná shrnutí dne, týdne nebo vybraných událostí.

## Language:
Čeština
<- You are speaking these languages in your responses to the user.

Rule: Před vytvořením, změnou nebo zrušením události potvrď termín, účastníky a účel.

Rule: Pokud objevíš kolizi, navrhni dvě až tři reálné alternativy.

Rule: Když chybí časové pásmo nebo délka schůzky, zeptej se.

Rule: Email připrav jako návrh a dej prostor k finálnímu potvrzení.

Time and date context:
- It is May 2026 now.
- If you need more precise current time information, use the tool "get_current_time".

Timeout scheduling:
- Use "set_timeout" to wake this same chat thread in the future.
- Use "list_timeouts" to review timeout ids/details across all chats for the same user+agent scope.
- "cancel_timeout" accepts either one timeout id or `allActive: true` to cancel all active timeouts in this same user+agent scope.
- Use "update_timeout" to pause/resume, edit next run, edit recurrence, or update timeout payload details.
- When one timeout elapses, you will receive a new user-like message that explicitly says it is a timeout wake-up and includes the `timeoutId`.
- Do not claim a timer was set or cancelled unless the tool confirms it.

Email tool:
- Use "send_email" to send outbound emails.
- Prefer `message` argument compatible with Promptbook `Message` type.
- Include subject in `message.metadata.subject` (or use legacy `subject` argument).
- USE EMAIL credentials are read from wallet records (ACCESS_TOKEN, service "smtp", key "use-email-smtp-credentials").
- Wallet secret must contain SMTP credentials in JSON format with fields `host`, `port`, `secure`, `username`, `password`.
- If credentials are missing, ask user to add wallet credentials.
- Default sender address from commitment: "spravce-kalendare@ptbk.io".

Calendar tools:
- You can inspect and manage events in configured calendars.
- Supported operations include read, create, update, delete, invite guests, and reminders.
- Configured calendars:
  - google: https://calendar.google.com/calendar/ical/59da51719f8182de0b734dd9b4f231e2c10ed17b8858c8cb697701572e21a3e2%40group.calendar.google.com/public/basic.ics
    scopes: https://www.googleapis.com/auth/calendar
- USE CALENDAR credentials are read from wallet records (ACCESS_TOKEN, service "google_calendar", key "use-calendar-google-token").
- If credentials are missing, ask user to connect calendar credentials in host UI and/or add them to wallet.

Example interaction:

Agent: Ahoj,
hlídám a spravuju firemní kalendář, takže pomůžu s plánováním, kolizemi i rychlou agendou.

Dokážu najít volný termín, připravit shrnutí dne a navrhnout follow-upy po schůzce.

[Dnes](?message=Jaké události máme naplánované dneska a na co si dát pozor?)
[Tento týden](?message=Jaké důležité události máme naplánované tento týden?)
[Naplánuj standup](?message=Najdi prosím tento týden 20 minut na standup pro 5 lidí mezi 9:00 a 12:00.)
[Denní shrnutí](?message=Pošli mi prosím každý pracovní den v 8:00 na email jana@firma.cz rychlé shrnutí dnešní agendy.)

User: null
Agent: Ahoj,
hlídám a spravuju firemní kalendář, takže pomůžu s plánováním, kolizemi i rychlou agendou.

Dokážu najít volný termín, připravit shrnutí dne a navrhnout follow-upy po schůzce.

[Dnes](?message=Jaké události máme naplánované dneska a na co si dát pozor?)
[Tento týden](?message=Jaké důležité události máme naplánované tento týden?)
[Naplánuj standup](?message=Najdi prosím tento týden 20 minut na standup pro 5 lidí mezi 9:00 a 12:00.)
[Denní shrnutí](?message=Pošli mi prosím každý pracovní den v 8:00 na email jana@firma.cz rychlé shrnutí dnešní agendy.)
```

**This is how generated model requirements looks like now:**

```json
{
    "systemMessage": /* [look ☝ above] */,
    "promptSuffix": /* ... */,
    "modelName": "gpt-5.4-mini",
    "temperature": 0.7,
    "topP": 0.9,
    "topK": 50,
    "parentAgentUrl": null,
    "isClosed": true,
    "samples": [
        {
            "question": null,
            "answer": "Ahoj,\nhlídám a spravuju firemní kalendář, takže pomůžu s plánováním, kolizemi i rychlou agendou.\n\nDokážu najít volný termín, připravit shrnutí dne a navrhnout follow-upy po schůzce.\n\n[Dnes](?message=Jaké události máme naplánované dneska a na co si dát pozor?)\n[Tento týden](?message=Jaké důležité události máme naplánované tento týden?)\n[Naplánuj standup](?message=Najdi prosím tento týden 20 minut na standup pro 5 lidí mezi 9:00 a 12:00.)\n[Denní shrnutí](?message=Pošli mi prosím každý pracovní den v 8:00 na email jana@firma.cz rychlé shrnutí dnešní agendy.)"
        }
    ],
    "tools": [
        {
            "name": "get_current_time",
            "description": "Get the current date and time in ISO 8601 format.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Optional timezone name (e.g. \"Europe/Prague\", \"UTC\", \"America/New_York\")."
                    }
                },
                "required": []
            }
        },
        {
            "name": "set_timeout",
            "description": "Schedule one thread-scoped wake-up in the current chat. The timer returns immediately and wakes this same conversation later.",
            "parameters": {
                "type": "object",
                "properties": {
                    "milliseconds": {
                        "type": "number",
                        "description": "Delay in milliseconds before the timeout wakes the same chat thread."
                    },
                    "message": {
                        "type": "string",
                        "description": "Optional note appended to the future timeout wake-up message."
                    }
                },
                "required": [
                    "milliseconds"
                ]
            }
        },
        {
            "name": "cancel_timeout",
            "description": "Cancel one timeout by id or cancel all active timeouts across chats for the same user+agent scope.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timeoutId": {
                        "type": "string",
                        "description": "Identifier returned earlier by `set_timeout` or `list_timeouts`."
                    },
                    "allActive": {
                        "type": "boolean",
                        "description": "When true, cancel all currently active timeouts across chats in this user+agent scope."
                    }
                }
            }
        },
        {
            "name": "list_timeouts",
            "description": "List timeout details across all chats for this same user+agent scope so they can be reviewed and managed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "includeFinished": {
                        "type": "boolean",
                        "description": "When true, include completed, failed, and cancelled rows in addition to active timeouts."
                    },
                    "limit": {
                        "type": "number",
                        "description": "Maximum number of rows to return (default 20, max 100)."
                    }
                }
            }
        },
        {
            "name": "update_timeout",
            "description": "Update one timeout (pause/resume, next run, recurrence, payload) or pause/resume all active queued timeouts across chats.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timeoutId": {
                        "type": "string",
                        "description": "Identifier returned earlier by `set_timeout` or `list_timeouts` for one timeout update."
                    },
                    "allActive": {
                        "type": "boolean",
                        "description": "When true, run one bulk pause/resume across all active queued timeouts in this same user+agent scope."
                    },
                    "paused": {
                        "type": "boolean",
                        "description": "Pause (`true`) or resume (`false`) one timeout; with `allActive: true` this pauses/resumes all active queued timeouts."
                    },
                    "dueAt": {
                        "type": "string",
                        "description": "Set the next run timestamp (ISO string). Cannot be used with `extendByMs`."
                    },
                    "extendByMs": {
                        "type": "number",
                        "description": "Move next run by this many milliseconds. Cannot be used with `dueAt`."
                    },
                    "recurrenceIntervalMs": {
                        "type": "number",
                        "description": "Set recurrence interval in milliseconds; pass `null` to disable recurrence."
                    },
                    "message": {
                        "type": "string",
                        "description": "Set wake-up message text for this timeout; pass empty string to clear."
                    },
                    "parameters": {
                        "type": "object",
                        "description": "Replace stored JSON parameters passed back when timeout fires."
                    }
                }
            }
        },
        {
            "name": "send_email",
            "description": "Send an outbound email through configured SMTP credentials. Prefer providing Message-like payload in `message`.",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "object",
                        "description": "Preferred input payload compatible with Promptbook Message type. Use metadata.subject for subject line."
                    },
                    "to": {
                        "type": "string",
                        "description": "Legacy alias for recipients (use comma-separated emails or JSON array encoded as string)."
                    },
                    "cc": {
                        "type": "string",
                        "description": "Optional CC recipients (use comma-separated emails or JSON array encoded as string)."
                    },
                    "subject": {
                        "type": "string",
                        "description": "Legacy alias for subject."
                    },
                    "body": {
                        "type": "string",
                        "description": "Legacy alias for markdown body content."
                    }
                },
                "required": []
            }
        },
        {
            "name": "calendar_list_events",
            "description": "List events from a configured calendar for a time range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "calendarUrl": {
                        "type": "string",
                        "description": "Google Calendar URL configured by USE CALENDAR (for example \"https://calendar.google.com/...\")."
                    },
                    "timeMin": {
                        "type": "string",
                        "description": "Inclusive event start bound in ISO datetime."
                    },
                    "timeMax": {
                        "type": "string",
                        "description": "Exclusive event end bound in ISO datetime."
                    },
                    "query": {
                        "type": "string",
                        "description": "Optional free-text event search query."
                    },
                    "maxResults": {
                        "type": "integer",
                        "description": "Maximum number of events to return."
                    },
                    "singleEvents": {
                        "type": "boolean",
                        "description": "Expand recurring events into individual instances."
                    },
                    "orderBy": {
                        "type": "string",
                        "description": "Optional ordering (\"startTime\" or \"updated\")."
                    },
                    "timeZone": {
                        "type": "string",
                        "description": "Optional IANA timezone for response rendering."
                    }
                },
                "required": []
            }
        },
        {
            "name": "calendar_get_event",
            "description": "Get one event by id from a configured calendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "calendarUrl": {
                        "type": "string",
                        "description": "Google Calendar URL configured by USE CALENDAR (for example \"https://calendar.google.com/...\")."
                    },
                    "eventId": {
                        "type": "string",
                        "description": "Google Calendar event id."
                    }
                },
                "required": [
                    "eventId"
                ]
            }
        },
        {
            "name": "calendar_create_event",
            "description": "Create one event in a configured calendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "calendarUrl": {
                        "type": "string",
                        "description": "Google Calendar URL configured by USE CALENDAR (for example \"https://calendar.google.com/...\")."
                    },
                    "summary": {
                        "type": "string",
                        "description": "Event title/summary."
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional event description."
                    },
                    "location": {
                        "type": "string",
                        "description": "Optional event location."
                    },
                    "start": {
                        "type": "string",
                        "description": "Event start as ISO datetime or date."
                    },
                    "end": {
                        "type": "string",
                        "description": "Event end as ISO datetime or date."
                    },
                    "timeZone": {
                        "type": "string",
                        "description": "Optional timezone for datetime values."
                    },
                    "attendees": {
                        "type": "array",
                        "description": "Optional guest email list.",
                        "items": {
                            "type": "string"
                        }
                    },
                    "reminderMinutes": {
                        "type": "array",
                        "description": "Optional popup reminder minute offsets.",
                        "items": {
                            "type": "integer"
                        }
                    },
                    "sendUpdates": {
                        "type": "string",
                        "description": "Guest update policy (\"all\", \"externalOnly\", \"none\").",
                        "enum": [
                            "all",
                            "externalOnly",
                            "none"
                        ]
                    }
                },
                "required": [
                    "summary",
                    "start",
                    "end"
                ]
            }
        },
        {
            "name": "calendar_update_event",
            "description": "Update one existing event in a configured calendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "calendarUrl": {
                        "type": "string",
                        "description": "Google Calendar URL configured by USE CALENDAR (for example \"https://calendar.google.com/...\")."
                    },
                    "eventId": {
                        "type": "string",
                        "description": "Google Calendar event id."
                    },
                    "summary": {
                        "type": "string",
                        "description": "Updated event summary."
                    },
                    "description": {
                        "type": "string",
                        "description": "Updated event description."
                    },
                    "location": {
                        "type": "string",
                        "description": "Updated event location."
                    },
                    "start": {
                        "type": "string",
                        "description": "Updated event start as ISO datetime or date."
                    },
                    "end": {
                        "type": "string",
                        "description": "Updated event end as ISO datetime or date."
                    },
                    "timeZone": {
                        "type": "string",
                        "description": "Optional timezone for datetime values."
                    },
                    "attendees": {
                        "type": "array",
                        "description": "Optional replacement guest email list.",
                        "items": {
                            "type": "string"
                        }
                    },
                    "reminderMinutes": {
                        "type": "array",
                        "description": "Optional replacement popup reminder minute offsets.",
                        "items": {
                            "type": "integer"
                        }
                    },
                    "sendUpdates": {
                        "type": "string",
                        "description": "Guest update policy (\"all\", \"externalOnly\", \"none\").",
                        "enum": [
                            "all",
                            "externalOnly",
                            "none"
                        ]
                    }
                },
                "required": [
                    "eventId"
                ]
            }
        },
        {
            "name": "calendar_delete_event",
            "description": "Delete one event from a configured calendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "calendarUrl": {
                        "type": "string",
                        "description": "Google Calendar URL configured by USE CALENDAR (for example \"https://calendar.google.com/...\")."
                    },
                    "eventId": {
                        "type": "string",
                        "description": "Google Calendar event id."
                    },
                    "sendUpdates": {
                        "type": "string",
                        "description": "Guest update policy (\"all\", \"externalOnly\", \"none\").",
                        "enum": [
                            "all",
                            "externalOnly",
                            "none"
                        ]
                    }
                },
                "required": [
                    "eventId"
                ]
            }
        },
        {
            "name": "calendar_invite_guests",
            "description": "Add guests to an existing event in a configured calendar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "calendarUrl": {
                        "type": "string",
                        "description": "Google Calendar URL configured by USE CALENDAR (for example \"https://calendar.google.com/...\")."
                    },
                    "eventId": {
                        "type": "string",
                        "description": "Google Calendar event id."
                    },
                    "guests": {
                        "type": "array",
                        "description": "Guest email list to add to the event.",
                        "items": {
                            "type": "string"
                        }
                    },
                    "sendUpdates": {
                        "type": "string",
                        "description": "Guest update policy (\"all\", \"externalOnly\", \"none\").",
                        "enum": [
                            "all",
                            "externalOnly",
                            "none"
                        ]
                    }
                },
                "required": [
                    "eventId",
                    "guests"
                ]
            }
        }
    ],
    "knowledgeSources": [
        "https://uhxrtukoehjtukzd.public.blob.vercel-storage.com/ptbk-agents/user/files/1a/f1023/knowledge-knowledge-calendar-rules-txt.txt"
    ]
}

```

**This is how it should look like:**

```markdown
You are Správce kalendáře

## Goal

Pomáhám lidem plánovat schůzky, hlídat kolize a připravovat stručné agendy i shrnutí.

Dokážu najít vhodný termín a navrhnout agendu schůzky.
Dokážu připravit pravidelná shrnutí dne, týdne nebo vybraných událostí.

## Language

-   Your language is Čeština

## Rules

-   Před vytvořením, změnou nebo zrušením události potvrď termín, účastníky a účel.
-   Pokud objevíš kolizi, navrhni dvě až tři reálné alternativy.
-   Když chybí časové pásmo nebo délka schůzky, zeptej se.
-   Email připrav jako návrh a dej prostor k finálnímu potvrzení.

## Time and date context

-   It is May 2026 now.
-   If you need more precise current time information, use the tool `get_current_time`.

## Timeout scheduling

-   Use `set_timeout` to wake this same chat thread in the future.
-   Use `list_timeouts` to review timeout ids/details across all chats for the same user+agent scope.
-   `cancel_timeout` accepts either one timeout id or `allActive: true` to cancel all active timeouts in this same user+agent scope.
-   Use `update_timeout` to pause/resume, edit next run, edit recurrence, or update timeout payload details.
-   When one timeout elapses, you will receive a new user-like message that explicitly says it is a timeout wake-up and includes the `timeoutId`.
-   Do not claim a timer was set or cancelled unless the tool confirms it.

## Emails

-   Use `send_email` to send outbound emails.
-   Default sender address from commitment: "spravce-kalendare@ptbk.io".

## Calendar

-   Use `calendar_list_events`, `calendar_get_event`, `calendar_create_event`, `calendar_update_event`, `calendar_delete_event`, and `calendar_invite_guests` to manage events in configured calendars.
-   You can inspect and manage events in configured calendars.
-   Supported operations include read, create, update, delete, invite guests, and reminders.

## Sample of communication with the agent:

**Agent:**
Ahoj,
hlídám a spravuju firemní kalendář, takže pomůžu s plánováním, kolizemi i rychlou agendou.

Dokážu najít volný termín, připravit shrnutí dne a navrhnout follow-upy po schůzce.

[Dnes](?message=Jaké události máme naplánované dneska a na co si dát pozor?)
[Tento týden](?message=Jaké důležité události máme naplánované tento týden?)
[Naplánuj standup](?message=Najdi prosím tento týden 20 minut na standup pro 5 lidí mezi 9:00 a 12:00.)
[Denní shrnutí](?message=Pošli mi prosím každý pracovní den v 8:00 na email jana@firma.cz rychlé shrnutí dnešní agendy.)
```

-   Agent source in book generates a model requirements with system message
-   Keep theese guidelines in mind when improving the system message generation logic and output format:
    -   System message is valid markdown and is well structured with clear h2 sections for goal, rules, tools, etc.
    -   Do not expose details of book language, in system message there should be zero-knowledge about the book language, the generated system message is standalone universal system message that goes directly to the model, without any further processing or templating
    -   Agent shouldn't know any secret from the wallet, for example when using `send_email` tool, agent should not know the email credentials, it should just call the tool and the system should handle the credentials internally without exposing them to the agent in any way - Change this in `USE EMAIL` commitment
    -   So there shouldn't be any instructions about manipulation with the secrets in the system message
    -   All the structure for the tools is defined in `modelRequirements.tools` and should not refer to Promptbook internal types - "Prefer `message` argument compatible with Promptbook `Message` type." should be there at all
    -   Commitments like `USE EMAIL` or `USE CALENDAR` can be in the agent source book multiple times, the generated tools and instructions should keep this in mind and should be able to handle multiple email integrations or multiple calendar integrations with the tools that are provided to the model
-   This is relevant for all the commitments which are putting something into the system message.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

## How to Contribute

-   **Add changes in [Changelog](/changelog/_current-preversion.md)**
-   **Test your changes** to ensure they work as expected, use `npm test`

## Code Style

-   Follow the existing code style and structure.
-   Use comments to explain complex logic.

## Emoji in `[brackets]`

-   `[any emoji]` Connects multiple places that are related to each other across the repository
-   `[number]` Connects multiple places that are related to each other across the file
-   `[🧠]` Marks a place where there is something to decide and think about.
-   `[🕕]` List of models _(that should be progresively updated)_
    -   Prompt: Update available models and their prices, search online
-   `[🔼]` Marks an entity (function, class, type,...) in other project (like Promptbook.studio) which should be moved to this repository
-   `[🚉]` Marks an types / interfaces / structures fully serializable as JSON, not marking `string_` and `number_` prefixed aliases
-   `[🧹]` Need to implement garbage collection
-   `[🐣]` Easter eggs
-   `[💩]` Shitty code that needs refactoring
-   `$` When entity (function, class) starts by `$`, it means it is not pure and can have side effects.
-   3x `!` Marks a place that needs to be fixed before releasing a pre-release version.
-   4x (and more) `!` Marks a place that needs to be fixed as soon as possible.
-   `@@@` Marks a place where text / documentation / ... must be written.
-   [⚫] Code in this file should never be published in any package
-   [🟢] Code in this file should never be published into packages that could be imported into browser environment
-   [🔵] Code in this file should never be published outside of `@promptbook/browser`
-   [🟡] Code in this file should never be published outside of `@promptbook/cli`
-   [💞] Ignore a discrepancy between file name and entity name

## Generated code

Across the repository, there are several places where code has been generated automatically.
Do not edit these places manually, as they will be overwritten by the code generation process. Edit the source files instead.

> ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten

## Dictionary

-   **Promptbook Engine vs. Agent Server** sre two distinct parts you should know the difference:
    -   **Promptbook Engine** is the core engine that powers AI agents, it is located in `/src` folder. It is framework-agnostic and can be used in different applications. It can run as standalone javascript/typescript library, CLI environment, or be integrated into different applications. It can be also runned in Agent Server:
    -   **Agent Server** is a specific application that uses the Promptbook Engine to provide a web and API interface for creating and interacting with AI agents. It is located in `/apps/agents-server` folder.
-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `/src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

## Common rules

-   Always analyze the context and requirements before generating any code.
-   Write clear, maintainable, and well-documented code.
-   Write JSDoc comments for all entities - functions, classes, types, top-level constants, etc.
    -   When this entity is exported from the file and it is under `src` folder _(not for example in the `apps` folder)_, it must be marked either as `@public` or `@private` at the end of the JSDoc comment.
    -   For example: "@private internal utility of <Chat/>" / "@public exported from `@promptbook/browser`"
    -   If you don't know, prefer to mark it as private, we can always change it to public later, but changing from public to private may cause breaking changes.
-   You (the AI coding agent) are running inside a Node process, so do not kill all Node processes such as `taskkill /F /IM node.exe`. If you need to stop something you spawned, kill only that specific process, for example by PID or by port.

## Additional context

-   Attached images (if any) are relative to the root of the project.

### The Agents Server menu _(as additional context)_

The menu of the agent server looks like this:

1. The navigation hierarchy
    - Icon and Server name _(for example Promptbook Agents Server)_
    - arrow ">" and Agents or picked agent name (organized in folders)
    - arrow ">" and the view Profile / Chat / Book of the agent or nothing if no agent is picked
2. The menu items
    - Documentation
    - System
3. Control panel and user menu
    - Control panel
    - User menu with the avatar and the name of the user

### Database migrations for Agents server _(as additional context)_

-   Migrations are located in `apps/agents-server/src/database/migrations`
-   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   Migrations should be backwards compatible:
    -   Meaning that earlier versions of the server should be able to run with the database after migration without any issues.
    -   This is important because we want to have the same database for production and preview environments.
    -   This database will be migrated to the latest version of the preview environment, but the production environment should be able to run with it without any issues.
    -   The only thing that can happen is that older versions of the server will not be able to use new features.
    -   Adding new columns, tables, etc. is fine, but do not remove or rename existing ones, and do not change the meaning of existing columns or tables.
    -   When in doubt, prefer to add new things instead of changing existing ones.

### Metadata of Agents server _(as additional context)_

-   There is a table called `Metadata`.
-   It has `key` and `value` fields.
-   It is a similar concept to configuration, but this configuration can be changed by administrators in the Agents Server website.

### Book Language blueprint _(as additional context)_

Book language is a domain-specific language used for defining AI agents in the Promptbook Engine and Agents server.
It has lightweight syntax and keywords (the commitments) that allow you to define the "soul" of the agent.
The book language is designed to be human-readable and easy to write, while also being powerful enough to express complex agent behaviors.

Every agent has its source defined in the book language, which is called "agent source". The agent source is parsed and processed by the Promptbook Engine to create the actual AI agent that can interact with users and perform tasks.
This agent source is internally converted to a structured format called "agent model requirements" which are the actual raw technical instructions for the AI model to run the agent.

There is a standalone book language documentation on each agent server on `/api/docs/book.md` route, for example `https://pavol-hejny.ptbk.io/api/docs/book.md`.
Use it as a reference for the syntax and semantics of the book language, and modify `apps/agents-server/src/utils/bookLanguageDocumentation/createStandaloneBookLanguageMarkdown.ts` if it is relevant to the change you are doing.

#### Commitments _(as additional context and part of Book Language)_

Commitments are basic syntax elements that add specific functionalities to AI agents written in `book` language.

-   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, `CLOSED`, etc.
-   They are in the folder `src/commitments`.
-   Each commitment starts with a keyword, e.g. `PERSONA`, `KNOWLEDGE`, `USE SEARCH ENGINE`, etc. on a beginning of the line and ends by a new commitment or the end of the book.
-   There is a general pattern that the commitment keyword is followed by a space and then by the content of the commitment, for example:
    -   `PERSONA You are a helpful assistant that helps with cooking recipes.`
    -   `USE SEARCH ENGINE Search only in French.`
-   In the commitment context, you can reference external agents, for example:
    -   `TEAM You can talk to {Criminal lawyer} and {Financial advisor}`

## Coding rules

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Keep in mind the SOLID principles.
-   Do a proper analysis of the current functionality before you start implementing.
-   Keep small responsibilities of functions and classes, avoid creating big functions or classes that do many things.
-   When throwing errors, throw [branded errors](src/errors) and use `spaceTrim` utility to write clear and well-formatted multiline detailed error messages.
    -   Format errors as markdown, for example `variables` should be in backticks and important notes can be in bold.
-   Constants should always be `UPPER_SNAKE_CASE`.
-   Boolean variables should always be prefixed with `is`, for example `isUserChatJobLeaseExpired` or `IS_DEBUG_MODE`.
-   Do not use abbreviations, for example use `isExpired` instead of `isExp`, `translateMessage` instead of `t`, etc.
    -   It is fine to use well-known abbreviations, for example `id`, `url`, `html`, etc.
-   When writing multiline strings, use `spaceTrim` utility.
-   Do only the change described in the prompt. Do not add any additional features or make any additional changes that are not described there.
    -   If you find some critical issue that is not described in the prompt, report it to `./AGENT_REPORT.md` in the root of the project.

GITHUB_COPILOT_PROMPT
)" \
    --yolo \
    --no-ask-user \
    --no-color \
    --output-format json \
    --stream off --model gpt-5.4 --reasoning-effort xhigh