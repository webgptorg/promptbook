# Integrations

Integrations connect Agents Server to external model providers, tools, protocols, and user-facing platform features.

## OpenAI and Promptbook Runtime

Agents Server uses OpenAI-compatible model providers through the Promptbook Engine and AgentKit-style tools.

Runtime MUST:

- Read `OPENAI_API_KEY` or configured provider credentials.
- Resolve model requirements from book source.
- Support streaming and non-streaming chat paths.
- Cache or prepare external artifacts only when they match the current agent fingerprint.

## OpenAI-Compatible API

The server exposes OpenAI-compatible routes for chat completions and model discovery. See [Chat Runtime](chat-runtime.md).

API-compatible responses SHOULD match OpenAI field names and streaming conventions closely enough for OpenAI SDK clients to work.

## GitHub

GitHub integration can support:

- project repository access for agent tools
- GitHub App setup
- external runner message queues through repository files
- project token resolution

GitHub credentials MUST be scoped and passed only to tools or runner operations that need them.

## Google Calendar

Calendar integration stores connections in `CalendarConnection` and activity in `CalendarActivity`.

Calendar behavior:

- Connections are scoped by user and agent.
- Active connections are unique for user, agent, provider, and calendar URL.
- Runtime tools can read or mutate calendar data only through a valid connection.
- Tool calls SHOULD be logged in `CalendarActivity`.

OAuth secrets and state secrets are deployment/configuration concerns and MUST be treated as secrets.

## Email and SendGrid

Agents Server supports message records and inbound/outbound email helpers.

Inbound SendGrid callbacks MUST validate configured signature headers or HMAC secret before parsing multipart form data. They MUST reject stale timestamps and callbacks delivered through unaccepted hosts.

Outbound email attempts SHOULD create `Message` and `MessageSendAttempt` records with provider result data.

## Browser, Search, Scrape, and Page Preview

Agents may use browser/search tools when enabled by book commitments and server configuration.

Page-preview routes can provide live browser-backed previews for citations or URLs that cannot be embedded in an iframe. Active sessions SHOULD be tracked and closed when streams abort.

Browser automation APIs MUST be protected according to current security policy.

## Voice

Voice features are metadata-controlled. Experimental voice calling and speech-to-text/text-to-speech support MAY use provider failover and browser speech APIs.

Voice routes MUST preserve normal chat access control and MUST avoid persisting audio or transcripts beyond the route's declared purpose.

## MCP

Agent-scoped MCP routes expose tool surfaces for compatible clients. They MUST resolve the same agent access and runtime tool permissions as chat routes.

## Embedding and PWA

Embedding behavior is controlled by `IS_EMBEDDING_ALLOWED`. PWA features include manifest, service worker, install controls, notifications, share target, and push subscriptions.

Embedding and PWA routes MUST respect server and agent visibility rules.

## Custom CSS and JavaScript

Custom CSS and JavaScript are administrator-controlled integrations with the rendered UI. They MUST be treated as privileged configuration and excluded from unauthenticated write paths.

