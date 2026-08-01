# The Stalwart management port `8080` is reachable from the public internet on `live.ptbk.io`

Found while fixing the self-contained Stalwart mail server (see [`changelog/_current-preversion.md`](../changelog/_current-preversion.md)). The mail server itself is fixed — this message is about a **security exposure** the original prompt did not cover, so it was deliberately not implemented here.

## What happens

Stalwart binds its HTTP listener to all interfaces, not to the loopback address:

```
$ ss -ltnp | grep stalwart
LISTEN 0 1024 *:8080  users:(("stalwart",pid=119142,fd=39))
LISTEN 0 1024 *:34131 users:(("stalwart",pid=119142,fd=38))
```

Port `8080` serves both the Stalwart web administration UI (`/admin/`) and the JMAP management endpoint (`/jmap/`) that Agents Server drives. Anyone who can reach the VPS on that port can attempt to authenticate as the Stalwart administrator.

On `live.ptbk.io` this is currently not mitigated at the host level either:

```
$ ufw status
Status: inactive
```

The firewall is inactive because `configure_firewall` runs *after* `configure_stalwart_mail_server` in both `apply_vps_runtime_configuration` and the fresh-install flow, and the Stalwart step aborted the installer every time (the `promptbook.invalid` bug fixed in this change). Once a VPS runs the fixed installer, `configure_firewall` will execute again — but that only helps if it actually denies `8080`, which should be verified.

## Why it was not fixed here

The prompt asked to make the email server work, not to change the network exposure of the VPS. Restricting the listener is also a real behavioral decision with more than one reasonable answer:

-   **Bind Stalwart's HTTP listener to `127.0.0.1`** via its `NetworkListener` configuration — the tightest option, and Agents Server already talks to `http://127.0.0.1:8080/jmap/`. It does mean the Stalwart web admin is only reachable through an SSH tunnel, which is what `print_summary` already tells administrators to do.
-   **Deny `8080` (and `34131`) in `configure_firewall`** — keeps the Stalwart configuration untouched, but leaves the service listening publicly if the firewall is ever disabled.
-   **Both** — defense in depth.

Note that this change makes `STALWART_RECOVERY_ADMIN` a permanent fixed administrator credential (it is the credential Agents Server authenticates with; see the note in `configure_stalwart_mail_server`). That is the same secret already stored in the Agents Server `.env`, so it does not add a new secret — but it does mean a permanently valid administrator login sits behind a publicly reachable port until one of the options above is applied.

## Suggested next step

Bind the Stalwart HTTP listener to loopback in `configure_stalwart_mail_server`, and additionally verify that `configure_firewall` denies `8080` and `34131` while keeping the mail ports `25`, `465`, `993`, `995`, and `4190` open.
