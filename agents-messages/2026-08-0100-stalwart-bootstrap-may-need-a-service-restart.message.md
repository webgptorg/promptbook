# Completing the Stalwart bootstrap may require a `stalwart` service restart that Agents Server cannot perform

Found while making the self-contained Stalwart mail server complete its own bootstrap (see [`changelog/_current-preversion.md`](../changelog/_current-preversion.md)). The reported bootstrap-mode error is fixed — this message is about a **remaining limitation** the prompt did not cover, so it was deliberately not implemented here.

## What happens

Stalwart decides whether it runs in bootstrap mode **at startup**, and in that mode it opens only its management listener:

```
Jul 31 12:45:28 stalwart[118394]: WARN Server started in bootstrap mode (server.bootstrap-mode)
                                  details = "No configuration file was found. Port 8080 is open for initial setup."
Jul 31 12:45:28 stalwart[118394]: INFO Network listener started listenerId = "http-recovery", localPort = 8080
```

The mail listeners on `25`, `465`, `993`, `995` and `4190` only appear after the service is restarted — which is exactly what `bootstrap_stalwart_mail_server` in [`install.sh`](../install.sh) does one second after its `x:Bootstrap/set` call.

Whether `x:Bootstrap/set` alone makes a **running** instance leave bootstrap mode was **not** established. It could not be observed on `live.ptbk.io`, because the installer restarted the service immediately after the bootstrap, and the state cannot be reproduced there without taking the production mail server down:

-   The Stalwart schema (`/api/schema`) documents no reload or restart semantics for `x:Bootstrap`, and its web administration bundle contains no restart guidance.
-   Stalwart keeps its listeners as `x:NetworkListener` objects in the data store, and the seven objects on `live.ptbk.io` match the seven ports the restarted instance binds.

## Why it matters

Agents Server now performs the bootstrap itself during every domain synchronization (startup and **Synchronize Stalwart**). It then verifies the result by asking Stalwart again for up to 15 seconds:

-   If Stalwart applies the bootstrap on its own, the synchronization continues and the mail server is fully provisioned without any manual step.
-   If a restart is required, the synchronization fails with a message naming that exact remaining step instead of a raw `forbidden` response, and the next `install.sh` run repairs it.

The second case is the limitation: Agents Server is a web application and does not manage the `stalwart` systemd unit, so it cannot finish that path alone. On `live.ptbk.io` the Agents Server process happens to run as `root`, but that is not guaranteed — `install.sh` resolves its own run user — so calling `systemctl restart stalwart` from a request handler is neither portable nor an appropriate privilege for the application to take on its own.

## Why it was not fixed here

The prompt asked to fix the email server, not to grant the web application control over VPS services. Restricting that to a safe, explicit mechanism is a real design decision with more than one reasonable answer:

-   **A narrow `sudoers.d` rule** installed by `install.sh` allowing only `systemctl restart stalwart` for the Agents Server run user — smallest possible privilege, but it does add a privileged escape hatch to the web application.
-   **A systemd path/timer unit** that watches for a bootstrap marker and restarts Stalwart — keeps every privileged action inside systemd, at the cost of one more installed unit.
-   **Nothing** — accept that a bootstrap performed by the application is completed by the next installer run, which is what happens today.

## Suggested next step

First establish the fact: on a throwaway VPS, bootstrap a fresh Stalwart through `x:Bootstrap/set` **without** restarting it, and check whether port `25` starts listening. If it does, the current implementation already self-heals completely and nothing further is needed. If it does not, choose one of the options above.
