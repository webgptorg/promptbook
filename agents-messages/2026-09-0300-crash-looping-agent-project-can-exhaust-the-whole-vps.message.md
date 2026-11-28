# A single crash-looping agent project can exhaust the whole VPS

While fixing the `live.ptbk.io` outage caused by duplicate pm2 project processes
(see [`agentProjectRuntimePm2.ts`](../apps/agents-server/src/utils/agentProjects/agentProjectRuntimePm2.ts)), a second,
**independent** weakness became visible. It was left untouched because it is outside the scope of that prompt.

## What happened on `live.ptbk.io`

Eight pm2 processes of the project `vetny-rozbor` were online, each of them restarted **705+ times** within roughly one
hour. Their dev command binds a port of its own choosing (`4173`) instead of the `PORT` handed to it, so every copy but
one died immediately with:

```text
OSError: [Errno 98] Address already in use
```

pm2 restarted each of them in a tight loop. The restart storm alone drove the load average of a 2 vCPU / 2 GB droplet to
**~9** and exhausted the thread limit, which is what finally killed the Agents Server itself:

```text
node[2863932]: pthread_create: Resource temporarily unavailable
Assertion failed: (0) == (uv_thread_create(t.get(), start_thread, this))
```

## Why this is not fixed by the duplicate fix

Removing the duplicates removes _this_ trigger, but not the amplifier. A project runtime is started with

```sh
pm2 start bash --name promptbook-project-<hash>-<label> --time --cwd <project> -- -lc 'exec npm run dev'
```

with **no restart bound of any kind**. So a single project whose dev command exits immediately — a syntax error, a
missing dependency, a port it cannot bind — is restarted by pm2 forever at full speed. Nothing in the Agents Server
notices, and nothing stops one broken project of one agent from starving every other project, every other server of the
VPS, and the Agents Server process itself.

Note that the project runtimes are the only pm2 processes without such a guard: the Agents Server app converges to a
single instance through `cleanup_orphan_agents_server_pm2_processes()` in [`install.sh`](../install.sh), and its comment
already calls the orphan restart loops out as a known way to burn "memory + CPU for nothing".

## Suggested next step

Give project runtimes a restart budget when they are registered, rather than relying on them never crashing:

-   `--exp-backoff-restart-delay <ms>` makes pm2 space the restarts out instead of hammering, and resets once the
    process stays up — a slow-but-recovering project still recovers, a hopeless one stops costing CPU.
-   `--max-restarts <count>` additionally lets pm2 give up, which would surface the broken project as `errored` in the
    project list instead of hiding it behind a permanently `starting` status.

Both are single flags on the existing `pm2 start` call in `createAgentProjectRuntimePm2Command`'s caller, so the change
is small — but it changes the runtime behavior of every project, which is why it is reported here instead of being
bundled into an unrelated fix.
