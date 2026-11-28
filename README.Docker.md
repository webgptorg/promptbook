# 🐋 Promptbook Docker Image

Run the production **Promptbook Agents Server** from Docker.

- Docker Hub: [`hejny/promptbook`](https://hub.docker.com/r/hejny/promptbook)
- Source repository: [`webgptorg/promptbook`](https://github.com/webgptorg/promptbook)

This image is built from the repository [`Dockerfile`](https://github.com/webgptorg/promptbook/blob/main/Dockerfile), starts the production Agents Server from [`apps/agents-server`](https://github.com/webgptorg/promptbook/tree/main/apps/agents-server), and listens on port `4440`.

## Build the image locally

```bash
docker build -t hejny/promptbook:local .
```

If you cloned the repository, you can also use the included [`docker-compose.yml`](https://github.com/webgptorg/promptbook/blob/main/docker-compose.yml):

```bash
docker compose up --build
```

## Run the published image

The publish workflow currently pushes versioned Docker tags, so choose a published tag from Docker Hub and run the container with your environment variables:

```bash
docker pull hejny/promptbook:<tag>

docker run --rm -p 4440:4440 --env-file .env hejny/promptbook:<tag>
```

## Required configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public base URL of the server, for example `http://localhost:4440` when running locally. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL used by the Agents Server. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser-side Supabase key used by the web application. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side Supabase key used by APIs, workers, and migrations. |
| `OPENAI_API_KEY` | Yes for AI chat and tools | OpenAI key used by agent chat and execution routes. |
| `ADMIN_PASSWORD` | Recommended | Enables the built-in `admin` login for self-hosted administration. |

Example `.env`:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:4440
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=sk-your-openai-key
ADMIN_PASSWORD=change-me
```

## Use the image

1. Start the container and open `http://localhost:4440`.
2. Sign in as `admin` with `ADMIN_PASSWORD` if you configured one.
3. Create or import your agents and Books in the web UI.
4. Keep your Supabase project and provider keys available; the container itself is stateless and stores operational data in the configured backend services.

For the broader Promptbook ecosystem, architecture, and non-Docker usage, see the [main project README](https://github.com/webgptorg/promptbook/blob/main/README.md).
