[ ]

[🔐] Fix unauthenticated abuse of server-side paid AI APIs in Agents Server

-   Several Agents Server endpoints proxy directly to third-party paid services (OpenAI, ElevenLabs) using the **server's API keys**, but they perform **no authentication check** before doing so. Any anonymous client can hit these routes and burn through the configured API credit, causing financial damage and resource exhaustion. There is also no per-IP rate limiting, so a single attacker can sustain large bills.
-   The vulnerable endpoints are:
    -   [`apps/agents-server/src/app/api/chat/route.ts`](apps/agents-server/src/app/api/chat/route.ts) — unauthenticated `GET` that calls `createOpenAiExecutionTools({ apiKey: process.env.OPENAI_API_KEY }).callChatModel(...)` with an attacker-controlled `message` query parameter.
    -   [`apps/agents-server/src/app/api/chat-streaming/route.ts`](apps/agents-server/src/app/api/chat-streaming/route.ts) — unauthenticated `GET` that opens an OpenAI streaming completion using `process.env.OPENAI_API_KEY` and a caller-supplied `message`.
    -   [`apps/agents-server/src/app/api/openai/v1/audio/transcriptions/route.ts`](apps/agents-server/src/app/api/openai/v1/audio/transcriptions/route.ts) — unauthenticated `POST` that uploads an arbitrary file to OpenAI Whisper / GPT-4o transcription using `process.env.OPENAI_API_KEY` (the `IS_EXPERIMENTAL_VOICE_TTS_STT_ENABLED` metadata flag is the **only** gate and is not an authentication check).
    -   [`apps/agents-server/src/app/api/elevenlabs/tts/route.ts`](apps/agents-server/src/app/api/elevenlabs/tts/route.ts) — unauthenticated `POST` that synthesizes attacker-controlled text via ElevenLabs using `process.env.ELEVEN_LABS_API_KEY`. ElevenLabs charges per character, so this can drain the credit very quickly.
    -   [`apps/agents-server/src/app/api/images/[filename]/route.ts`](apps/agents-server/src/app/api/images/%5Bfilename%5D/route.ts) — unauthenticated `GET` that calls `callImageGenerationModel` (DALL·E-3 / `gemini-3-pro-image-preview`) with a prompt derived from the attacker-controlled `filename` path parameter. Image generation is among the most expensive AI operations.
-   The fix should apply to all five endpoints:
    1.  Require authentication (`getCurrentUser`, `isUserAdmin`, or API-key auth via `validateApiKey`, depending on the intended audience) before performing any paid call. The two "demo" routes (`/api/chat` and `/api/chat-streaming`) appear to be development-only test endpoints — consider removing them or gating them behind `NODE_ENV !== 'production'`.
    2.  Add per-user / per-IP rate limiting and quota enforcement for the audio, image, and TTS routes that are meant to remain user-facing.
    3.  Validate caller-supplied inputs (model, size, language, voice id, text length) against allowlists before forwarding to the paid provider.
-   Do a proper analysis of the current functionality before you start implementing — confirm which of these routes are actually used by the browser UI (search the Agents Server frontend for `/api/chat`, `/api/chat-streaming`, `/api/openai/v1/audio/transcriptions`, `/api/elevenlabs/tts`, `/api/images/`) and pick the right gate for each one. Group all five into this single PRD because they are the same root vulnerability class.
-   Keep in mind the DRY _(don't repeat yourself)_ principle — extract a shared auth/rate-limit guard rather than duplicating the same checks five times.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
