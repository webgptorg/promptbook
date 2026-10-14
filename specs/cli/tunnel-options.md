# Tunnel provider decision

[Main specification](../_main.md) · [Remote-access contract](remote-access.md)

Research checked on 2026-10-14. This is a provider selection note, not evidence of a deployed tunnel or measured service reliability. Provider capabilities/terms must be rechecked when integrating. The product requirement is protected scan-to-open access from another network, without requiring a separate user-run tunnel process.

| Option | Fit and constraints | Decision |
| --- | --- | --- |
| Cloudflare Quick Tunnel | Temporary HTTPS address without a Cloudflare account/domain. A separate cloudflared client is needed. No uptime guarantee; hostname changes when recreated. The documented limit is 200 in-flight requests and SSE is unsupported. | Initial zero-account development default; integrate client lifecycle and a compatible live-update path. Never describe it as stable production hosting. |
| Managed/named Cloudflare Tunnel | User-managed application hostname and tunnel; publishing requires a Cloudflare account, domain configuration and connector credentials. | Explicit alternative for durable access. Reuse supplied setup, never provision account/DNS or assume credentials. |
| Localtunnel | Small Node-oriented CLI and programmatic client, with public HTTPS and an available self-hosted server. Its public service has an anti-abuse consent/password flow using the creator's public IP. | Not the default scan-to-open path: the interstitial adds unrelated steps and is not project authorization. A self-hosted relay entails operating infrastructure. |
| ngrok | Managed endpoints with account/authtoken setup. The free tier places a browser warning in front of HTML traffic and has plan limits. | Useful with existing configuration, but not the zero-account default. Do not automate a paid upgrade or pretend QR navigation can supply a warning-bypass header. |
| Tailscale Funnel | Public HTTPS can be visited without installing Tailscale on the phone. The serving host needs Tailscale/tailnet setup, MagicDNS, certificates and Funnel policy permission; bandwidth limits apply. | Useful for existing Tailscale users, not a setup-free dependency for every Promptbook user. Private Serve is a different access model. |

The default choice optimizes first use, not an uptime promise. Keep routing and authentication independent of the provider so future replacement does not redesign dashboards. A months-long local agenda can continue independently of an ephemeral remote endpoint; users requiring a stable remote service should configure the named alternative. Listing other candidates here does not add their integrations to the required command surface.

Regardless of provider, the application must authenticate access before exposure, show truthful connection health, support explicit opt-out and recover without interrupting local task ownership. A random URL, provider interstitial or HTTPS certificate alone is insufficient authorization.

## Primary sources

- [Cloudflare setup and account-free Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/) and [Quick Tunnel limits](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
- [Localtunnel client and API](https://github.com/localtunnel/localtunnel), [server](https://github.com/localtunnel/server) and [maintainer's public-service consent/password announcement](https://github.com/localtunnel/localtunnel/issues/598). The announcement is evidence of that service flow, not a substitute for retesting the deployed service.
- [ngrok agent setup](https://ngrok.com/docs/gateway/endpoints/agent-cli-quickstart) and [free-plan browser warning/limits](https://ngrok.com/docs/pricing-limits/free-plan-limits).
- [Tailscale Funnel requirements and limits](https://tailscale.com/docs/features/tailscale-funnel).
