# User Chats

User chats are durable conversations stored in `UserChat` and advanced by queued `UserChatJob` records. They are separate from stateless chat history.

## Scope

Durable chat routes are scoped by:

- current authenticated user
- target agent
- chat id
- source

Private mode disables durable chat APIs. Requests in private mode MUST return `403`.

Frozen chat sources, such as OpenAI API or team-member conversations, are view-only in the web UI. The server MUST reject edits, deletes, or new web messages for frozen chats.

## Listing Chats

`GET /agents/<agentName>/api/user-chats` returns:

- `chats`: chat summaries
- `activeChatId`
- `activeMessages`
- `activeDraftMessage`
- `activeJobs`
- `activeTimeouts`

Query parameters:

- `chat`: active chat id.
- `showExternalChats`: `1`, `true`, or empty string enables external chats when the current user is allowed.

Admins MAY include external chats when explicitly requested.

## Creating Chats

`POST /agents/<agentName>/api/user-chats` accepts:

```json
{
  "chatId": "optional-client-id",
  "messages": []
}
```

It creates a `WEB_UI` chat for the current user and agent and returns chat detail with status `201`.

## Reading, Updating, and Deleting Chats

`GET /agents/<agentName>/api/user-chats/<chatId>` returns chat detail when scoped access succeeds.

`PATCH /agents/<agentName>/api/user-chats/<chatId>` replaces the messages array for editable web chats. It MUST validate reply references and message shape.

`DELETE /agents/<agentName>/api/user-chats/<chatId>` deletes an editable web chat and returns success.

Scope failures MUST distinguish unauthorized, forbidden, and not-found states where the API already exposes that distinction.

## Enqueuing a Message

`POST /agents/<agentName>/api/user-chats/<chatId>/messages` appends a user turn and queues an assistant answer.

Required body:

```json
{
  "clientMessageId": "client-generated-id",
  "message": "Hello",
  "attachments": [],
  "parameters": {},
  "threadId": "optional-thread",
  "repliedToMessageId": "optional-message-id"
}
```

Rules:

- `clientMessageId` is required and nonempty.
- Message text may be blank only when attachments are present.
- Message text MUST NOT exceed 20,000 characters.
- Attachments MUST be normalized.
- Meta disclaimer acceptance MUST be verified before enqueue.
- Duplicate `clientMessageId` MUST be idempotent and return the current chat detail plus existing job.

The enqueue operation MUST create:

- a user message
- an assistant placeholder
- a `QUEUED` `UserChatJob`

The job SHOULD be created first; if chat append fails, the job must be removed or otherwise made unreachable.

The response status is `202` and includes chat detail plus the job.

## Job Status Lifecycle

`UserChatJob.status` values:

- `QUEUED`
- `RUNNING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

Claiming a job MUST atomically transition `QUEUED` to `RUNNING`, set start/heartbeat/lease timestamps, increment `attemptCount`, and avoid double-claiming under concurrent workers.

Terminal transitions MUST update the assistant placeholder, status timestamps, and failure details when applicable.

Expired `RUNNING` jobs MUST be recovered and marked failed with diagnostic details.

## User Chat Stream

`GET /agents/<agentName>/api/user-chats/<chatId>/stream` returns newline-delimited JSON frames.

Frame types:

```json
{"type":"snapshot","payload":{}}
{"type":"keepalive"}
```

Behavior:

- Emit an initial snapshot.
- Poll actively while jobs or timeouts are active.
- Poll more slowly while idle.
- Emit only when the chat signature changes.
- Emit keepalive frames to keep the connection open.
- End when the chat is deleted or no longer accessible.

## Local Runner Contract

The local runner processes jobs through a filesystem message-folder contract.

On enqueue to the local runner, the server MUST:

- Load the chat and a snapshot of the local agent source.
- Build runner-visible thread messages.
- Include the initial agent greeting for the first durable turn when required.
- Include attachment context in the generated message book.
- Ensure the local agent folder exists.
- Write a queued message book under `messages/queued`.
- Store runner metadata in job parameters.
- Mark the assistant placeholder as running with a progress card.

Synchronization MUST:

- Detect finished answer files and complete the job.
- Detect failed files and fail the job.
- Time out stale jobs.
- Treat already-failed synchronized jobs as stable and avoid immediate requeue loops.

## External Runner Contract

The external runner uses the same message-book contract through a GitHub repository.

It writes queued message books to the configured repository, stores repository metadata in the job parameters, and synchronizes finished or failed answers from repository files. External runner timeout behavior MAY be shorter than local runner timeout behavior.

## In-Process Runner

The older in-process runner executes the model directly from a claimed job. It is deprecated but defines compatible behavior:

- Build the thread before the queued user message.
- Resolve runtime context like stateless chat.
- Heartbeat while running.
- Persist streamed assistant updates periodically.
- Support cancellation through abort.
- Apply terminal status and self-learning rules.

## Chat Timeouts

Chat timeouts are delayed or recurring chat actions stored in `UserChatTimeout`.

`GET /agents/<agentName>/api/timeouts` returns timeout items and counters for the current user and agent.

`POST /agents/<agentName>/api/timeouts/actions` supports:

- `cancel_all_active`
- `pause_all_active`
- `resume_all_paused`

The response reports matched ids, update counts, `hasMore`, and generation time.

Timeout worker behavior is defined in [Background Workers](operations/background-workers.md).

