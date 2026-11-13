# Website licensing and advisory coverage

Owner decision: 13 November 2026. Website/member area owns the verified commercial account, trial, subscriptions, prices, coupons, referrals and capability grants. The control App polls numeric/boolean grants; it never owns a second Stripe checkout or community seats.

A license covers one simultaneously used project within its capabilities. A customer can combine heterogeneous grants and rearrange coverage in the App. Website does not bind a license permanently to an engine identity. Missing/expired/over-capacity licenses and unavailable sync are warnings only: no engine/task/control stop, no automatic paid overage. Authentication, engine ownership, member permissions, user pause and tool safety remain authoritative.

The website license snapshot v1 carries `engineProjects`, `specialists`, `controllingUsers`, `harnessInstances`, `browserProfiles` (number or null for unlimited) and `remoteControl` (boolean), per grant. It contains no plan/price/community content. Account handoff between the website and control App is separate from pairing the engine, and never transfers engine keys or creates an engine member.

## Engine statistics

`summarizeLicenseUsage` exposes local content-free diagnostic counts on `AppConnectionView.licenseUsage`. Specialists exclude core/engine roles, harnesses include enabled and retained instances, browser profiles deduplicate actual profile paths locally and send only a count. A count that is not established is null. Controlling users remain unknown until the actual authorized-user inventory is supplied; local OS users and all registered passkeys are not silently equated with controlling people. These observations are for advice, never a billing meter or enforcement gate.

The existing strict signed heartbeat v1 is unchanged. Its `agents` includes the whole inventory and its `members` counts members with passkeys. Adding commercial fields requires a versioned platform contract and matching App parser; never append unknown fields to v1 or relabel its counts. Until that additive transport lands, the central App must show usage as unknown rather than assert full coverage. Paths, names, prompts, messages, outputs and project content stay outside operational statistics.

Start/Business community places are 1/10, trial Business 10; these live exclusively on the website and are not engine counts. Trial starts explicitly after preparation, lasts 14 days without a card, and never creates an automatic payment. Early users receive a new trial when remote controls are released.
