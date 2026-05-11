[!] failed after a few seconds by GitHub Copilot `gpt-5.4`

[✨⛰] Better generated system message and logic how commitment works

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

---

[-]

[✨⛰] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨⛰] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨⛰] foo

-   @@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   Add the changes into the [changelog](changelog/_current-preversion.md)
