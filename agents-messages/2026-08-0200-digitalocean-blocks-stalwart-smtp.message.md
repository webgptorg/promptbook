# DigitalOcean prevents the self-contained Stalwart mail server from serving live SMTP traffic

Found while diagnosing the self-contained Agents Server email service on `live.ptbk.io`.

## Evidence

- `live.ptbk.io` resolves to `68.183.19.218`, an address in the DigitalOcean `AS14061` allocation.
- DigitalOcean's current [SMTP-port policy](https://docs.digitalocean.com/support/can-i-use-a-reserved-ip-address-to-send-emails-via-smtp/) states that SMTP ports `25`, `465`, and `587` are blocked on Droplets. Its [Droplet limits](https://docs.digitalocean.com/products/droplets/details/limits/) page reports the same restriction.
- The public MX target is independently stale: `live.ptbk.io` has `MX 10 mail.live.ptbk.io.`, but `mail.live.ptbk.io` resolves to `167.172.180.231` while the running Agents Server resolves to `68.183.19.218`. From the diagnostic host, TCP `25` to the MX target timed out and TCP `465` was refused.

## Consequence

No Stalwart or installer configuration can make `live.ptbk.io` deliver inbound and outbound Internet email while the VPS provider blocks SMTP at the network edge. Opening UFW is insufficient because UFW only controls the guest operating system.

The immediate DNS repair is to point `mail.live.ptbk.io` at the current VPS address and preserve the existing MX record. But reliable self-contained delivery additionally requires a VPS/provider that permits SMTP traffic, or an approved external SMTP relay—which conflicts with the stated no-external-services requirement.

## Follow-up deployment gap

The non-interactive Stalwart bootstrap deliberately sets `requestTlsCertificate: false`, while the VPS Certbot flow requests certificates only for the web domains. The public `mail.<domain>` host therefore has no installer-managed trusted certificate lifecycle. Stalwart's own automatic ACME mode cannot simply be enabled because its TLS-ALPN challenge requires direct control of port `443`, which the Agents Server nginx proxy already owns. A separate, tested certificate-import and renewal design is needed before claiming fully automatic SMTP TLS for every fresh installation.

## Code change made with this finding

The email health snapshot and `/admin/email-server` now verify that `mail.<domain>` resolves to the VPS before reporting the service operational. The installer also explicitly requests the required mail A and MX records alongside the web A record, preventing this stale-MX-host failure on fresh installations.
