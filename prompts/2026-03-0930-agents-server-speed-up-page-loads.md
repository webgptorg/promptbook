[ ]

[🐢⚡] Speed up Agents Server page loads + perceived performance

-   Overall loading of the Agents Server pages is perceived as super slow. Do a performance-first audit of the request waterfall + SSR/CSR split and implement improvements that reduce both real and perceived latency.
-   The server should look and behave same as before, but the loading experience should be much faster.
-   Out of scope (unless found necessary during audit): full rewrite, switching frameworks, major redesign.
-   Implementation should be incremental and safe; each change should be measurable and reversible.
-   You are working with the [Agents Server](apps/agents-server)
