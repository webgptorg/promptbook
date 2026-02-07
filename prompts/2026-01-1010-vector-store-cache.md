[x] ~$1.28 by OpenAI Codex `gpt-5.2-codex`

[✨🦂] Cache the Vector Stores created in OpenAI

-   Now the vector stores are created on the fly when the Promptbook agent need to answer and are cached in table `Agent` column `preparedExternals`
-   Remove the column `preparedExternals` and create a new table `AgentExternals`
    -   For context look how other tables looks to preserve the consistency and naming conventions.
    -   This table should have at least the following columns:
        -   `id` - primary key
        -   `type` - type of the external _(in this case `VECTOR_STORE`)_
        -   `hash` - hash of the external, for vector stores it should be based solely on the files (not the entire source of the (Promptbook) agent), so if the same files are used, the same vector store will be used, even for different (Promptbook) agents. Also order of the files should not matter, so the hash should be created in a way that the same files in different order will produce the same hash. Just be aware that same file names can have different content, so the hash should be based on the content of the files, not just the names. Use some hashing algorithm for this, for example SHA256 and merkle trees if needed.
    -   In future, this table will be used to store multiple types of externals like skills, MCPs,... But for now, we will focus only on vector stores.
-   When there are two different (Promptbook) agents which have the same files. Now there will be two identical vector stores created for these (Promptbook) agents. With this change, only one vector store will be created and shared between these (Promptbook) agents. Also when the (Promptbook) agent is modified without changing the files, the existing vector store will be reused without any need for creating a new one.
-   Create database migration for the change
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   For additional context, you can look at the [migration file from OpenaAI Assistants to AgentKit](prompts/2026-01-1000-migrate-to-agent-kit.md)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   This should work in the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[ ] !!!!!!!!!!!

[✨🦂] Enhance the caching of Large Vector Stores created on OpenAI.

-   @@@
-   Caching of the vector stores is working, but the computation of the vector store hash key takes sooooooo long _(see the logs below)_
-   Create database migration for the change if needed
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   For additional context, you can look at the [migration file from OpenaAI Assistants to AgentKit](prompts/2026-01-1000-migrate-to-agent-kit.md), [migration 2 file from OpenaAI Assistants to AgentKit](prompts/2026-01-1010-vector-store-cache.md)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   This should work in the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

**Here are the logs from local Vercel `next dev`:**

```bash
 POST /agents/RLcP3snv2ifR3H/api/chat 200 in 38780ms
[🤰] Returning cached OpenAiAgentKitExecutionTools
[??] Resolving AgentKit cache key {
  agentName: 'RLcP3snv2ifR3H',
  assistantCacheKey: '578cd6ecab37b5a1d5970e087b8a10b8b15c7f59e12bd3605d7da7227ebce425',
  includeDynamicContext: true,
  instructionsLength: 224,
  baseSourceLength: 14252,
  agentId: 'RLcP3snv2ifR3H'
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-r3eASWn0Kig20li4yEwhrbAnT6xEVo.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-r3eASWn0Kig20li4yEwhrbAnT6xEVo.pdf',
  sizeBytes: 167078,
  elapsedMs: 358
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-117-2003-otevreny-ohen-i9DAgAJCzZ3aBl6PSHhGqoXBWJybJo.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-117-2003-otevreny-ohen-i9DAgAJCzZ3aBl6PSHhGqoXBWJybJo.pdf',
  sizeBytes: 80459,
  elapsedMs: 216
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-213-2011-inventarizace-NPQVRVY84VK8WPDuM1tUrDSTuuu7Uw.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-213-2011-inventarizace-NPQVRVY84VK8WPDuM1tUrDSTuuu7Uw.pdf',
  sizeBytes: 176115,
  elapsedMs: 210
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-220-2012-aplikace-zakona-o-dph-pUqdRxC55uPUj1RxX079sQuhbBqgzL.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-220-2012-aplikace-zakona-o-dph-pUqdRxC55uPUj1RxX079sQuhbBqgzL.pdf',
  sizeBytes: 459068,
  elapsedMs: 217
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-242-2014-vystroj-ostrahy-radnice-P6eHXuc8VESvLJ8mRfVlpAOXyWm5IT.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-242-2014-vystroj-ostrahy-radnice-P6eHXuc8VESvLJ8mRfVlpAOXyWm5IT.pdf',
  sizeBytes: 159219,
  elapsedMs: 197
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-243-2014-odpovednost-za-kontrolu-a-revize-elektrickych-zarizeni-ftg6W2PGYDQlEmtGI6o2q30McYEzDD.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-243-2014-odpovednost-za-kontrolu-a-revize-elektrickych-zarizeni-ftg6W2PGYDQlEmtGI6o2q30McYEzDD.pdf',
  sizeBytes: 98457,
  elapsedMs: 228
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-255-2015-poskytovani-osobnich-ochrannych-pracovnich-prostredku-pgupxPh5986hkBb13cxC9YJm5l9rCo.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-255-2015-poskytovani-osobnich-ochrannych-pracovnich-prostredku-pgupxPh5986hkBb13cxC9YJm5l9rCo.pdf',
  sizeBytes: 414079,
  elapsedMs: 280
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-256-2015-inovace-73WthpbpNA1LHp6LfnjwoPsm3nRqlH.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-256-2015-inovace-73WthpbpNA1LHp6LfnjwoPsm3nRqlH.pdf',
  sizeBytes: 202194,
  elapsedMs: 249
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-257-2015-materialy-do-rmc-a-zmc-5pU3Wt90PEhgxf8kKDV1JeHPJxC5OH.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-257-2015-materialy-do-rmc-a-zmc-5pU3Wt90PEhgxf8kKDV1JeHPJxC5OH.pdf',
  sizeBytes: 164529,
  elapsedMs: 208
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-289-2018-adaptacni-proces-novych-zamestnancu-2hmtUytz1XqUqO06I2eEBrpCEeoT81.pdf',
  timeoutMs: 30000
}
(node:46572) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-289-2018-adaptacni-proces-novych-zamestnancu-2hmtUytz1XqUqO06I2eEBrpCEeoT81.pdf',
  sizeBytes: 352535,
  elapsedMs: 313
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-290-2018-odpisovani-dlouhodobeho-majetku-OMOZI4p7bTQFpLtpfP6jMnTzVHvURF.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-290-2018-odpisovani-dlouhodobeho-majetku-OMOZI4p7bTQFpLtpfP6jMnTzVHvURF.pdf',
  sizeBytes: 126633,
  elapsedMs: 263
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-291-2018-transfery-FmpUE6zmhNTRAiMkQIjXLNxzhV0Tys.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-291-2018-transfery-FmpUE6zmhNTRAiMkQIjXLNxzhV0Tys.pdf',
  sizeBytes: 141098,
  elapsedMs: 193
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-299-2018-pr-pro-archiv-stav-YHUh6gVFZmIhtDUl8hcuZ31NrFHZJ4.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-299-2018-pr-pro-archiv-stav-YHUh6gVFZmIhtDUl8hcuZ31NrFHZJ4.pdf',
  sizeBytes: 136850,
  elapsedMs: 214
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-300-2018-pr-pro-s-208-RbUMb2jrZk6PPdueZxFbIQXLyaF0Pj.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-300-2018-pr-pro-s-208-RbUMb2jrZk6PPdueZxFbIQXLyaF0Pj.pdf',
  sizeBytes: 187445,
  elapsedMs: 199
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-301-2018-rad-ohlasovny-pozaru-YiAcUpOu1f95fUULf0j6aa3SwPREyw.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-301-2018-rad-ohlasovny-pozaru-YiAcUpOu1f95fUULf0j6aa3SwPREyw.pdf',
  sizeBytes: 178880,
  elapsedMs: 213
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-302-2018-pr-pro-mistnost-nahradniho-zdroje-el-UcTOZ0hd1Jbohx366mgA7xXOjE9dO8.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-302-2018-pr-pro-mistnost-nahradniho-zdroje-el-UcTOZ0hd1Jbohx366mgA7xXOjE9dO8.pdf',
  sizeBytes: 106191,
  elapsedMs: 194
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-304-2018-mistni-rad-skladu-G3osILuBxmTEQECaFp4MxHrngV22WZ.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-304-2018-mistni-rad-skladu-G3osILuBxmTEQECaFp4MxHrngV22WZ.pdf',
  sizeBytes: 1175718,
  elapsedMs: 285
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-305-2018-dokumentace-o-zacleneni-zvysene-pozarni-nebezpeci-lglHcHhvolrIFyBYbmXWO3FSVOpTe6.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-305-2018-dokumentace-o-zacleneni-zvysene-pozarni-nebezpeci-lglHcHhvolrIFyBYbmXWO3FSVOpTe6.pdf',
  sizeBytes: 147168,
  elapsedMs: 189
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-306-2018-pr-pro-budovu-radnice-Uk0krKCcKV6NUIycPixLQDaKd9Fpej.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-306-2018-pr-pro-budovu-radnice-Uk0krKCcKV6NUIycPixLQDaKd9Fpej.pdf',
  sizeBytes: 131064,
  elapsedMs: 203
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-308-2018-pozarni-rad-pro-pg-jGXpFZyCMEiGnMK1RjHUSMo6wx4HIz.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-308-2018-pozarni-rad-pro-pg-jGXpFZyCMEiGnMK1RjHUSMo6wx4HIz.pdf',
  sizeBytes: 136169,
  elapsedMs: 196
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-309-2018-pozarni-evakuacni-plan-x7GaYbYxJ0PxRRzbAtDr7UDCYZVX9b.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-309-2018-pozarni-evakuacni-plan-x7GaYbYxJ0PxRRzbAtDr7UDCYZVX9b.pdf',
  sizeBytes: 102269,
  elapsedMs: 188
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-310-2018-dokumentace-zdolavani-pozaru-dKCPM8c1se8YlxhHBqvcMB03Lx9mq8.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-310-2018-dokumentace-zdolavani-pozaru-dKCPM8c1se8YlxhHBqvcMB03Lx9mq8.pdf',
  sizeBytes: 184432,
  elapsedMs: 204
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-311-2018-revizni-rad-GRsfZd6fT7TXLH2KVDcVtDJkiCYSQ3.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-311-2018-revizni-rad-GRsfZd6fT7TXLH2KVDcVtDJkiCYSQ3.pdf',
  sizeBytes: 284753,
  elapsedMs: 205
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-312-2018-cestovni-nahrady-KNXnQUQWoKwiEgTCpLSJDM5v8dLCy9.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-312-2018-cestovni-nahrady-KNXnQUQWoKwiEgTCpLSJDM5v8dLCy9.pdf',
  sizeBytes: 205775,
  elapsedMs: 202
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-312-2018-cestovni-nahrady-dodatek-6-dqedfZv6j077iBCVgr2hvBjgkVf9iw.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-312-2018-cestovni-nahrady-dodatek-6-dqedfZv6j077iBCVgr2hvBjgkVf9iw.pdf',
  sizeBytes: 81584,
  elapsedMs: 207
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-314-2018-kategorizace-pro-hpp-lwUIAhjV75X5Tw3kP4mXwpszWWKsWy.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-314-2018-kategorizace-pro-hpp-lwUIAhjV75X5Tw3kP4mXwpszWWKsWy.pdf',
  sizeBytes: 1799394,
  elapsedMs: 335
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-315-2018-kategorizace-pro-dpp-a-dpc-gHOdjT167EYkpb4zTPMuyrwsacnsDL.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-315-2018-kategorizace-pro-dpp-a-dpc-gHOdjT167EYkpb4zTPMuyrwsacnsDL.pdf',
  sizeBytes: 531505,
  elapsedMs: 224
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-316-2018-zajisteni-vychovy-a-vzdelavani-v-oblasti-bozp-2BXyX55szqhqjsx1cLoI7zVrvGSwX5.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-316-2018-zajisteni-vychovy-a-vzdelavani-v-oblasti-bozp-2BXyX55szqhqjsx1cLoI7zVrvGSwX5.pdf',
  sizeBytes: 303282,
  elapsedMs: 204
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-317-2018-prikazove-bloky-9pLPk4aFiAI54bJQNPa4r7h4QG2SjC.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-317-2018-prikazove-bloky-9pLPk4aFiAI54bJQNPa4r7h4QG2SjC.pdf',
  sizeBytes: 127450,
  elapsedMs: 187
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-319-2018-mistni-provozne-bezpecnostni-predpis-N6U1xYYA7zr9nNhZA25ZANtGQi4FpI.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-319-2018-mistni-provozne-bezpecnostni-predpis-N6U1xYYA7zr9nNhZA25ZANtGQi4FpI.pdf',
  sizeBytes: 489337,
  elapsedMs: 238
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-320-2018-metodika-k-organizaci-kulturnich-akci-WhQshlsBHXXtPxK8DBl0Zy9bdjKXuN.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-320-2018-metodika-k-organizaci-kulturnich-akci-WhQshlsBHXXtPxK8DBl0Zy9bdjKXuN.pdf',
  sizeBytes: 151169,
  elapsedMs: 189
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-321-2018-pracovni-volno-bez-nahrady-yzcJxPMRDocvw22XMvnlndOIHsEezo.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-321-2018-pracovni-volno-bez-nahrady-yzcJxPMRDocvw22XMvnlndOIHsEezo.pdf',
  sizeBytes: 144725,
  elapsedMs: 190
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-324-2019-socialne-pravni-ochrana-deti-na-umc-p13-GXTnRdw3ZvzLpfq2Az0ZDq13Rkdmmf.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-324-2019-socialne-pravni-ochrana-deti-na-umc-p13-GXTnRdw3ZvzLpfq2Az0ZDq13Rkdmmf.pdf',
  sizeBytes: 1340701,
  elapsedMs: 312
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-326-2019-organizace-autoprovozu-wo0SgC2VQV8JO2vUxHNRljz6us4mwx.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-326-2019-organizace-autoprovozu-wo0SgC2VQV8JO2vUxHNRljz6us4mwx.pdf',
  sizeBytes: 1273567,
  elapsedMs: 304
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-327-2019-telekomunikacni-zarizeni-cOKL6BGR011LJboijiP5W3EcGBg0yU.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-327-2019-telekomunikacni-zarizeni-cOKL6BGR011LJboijiP5W3EcGBg0yU.pdf',
  sizeBytes: 108254,
  elapsedMs: 198
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-329-2019-provozni-rad-umc-p-13-cH0FsV0t3CrGszkfPTJliVdGZCmJNk.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-329-2019-provozni-rad-umc-p-13-cH0FsV0t3CrGszkfPTJliVdGZCmJNk.pdf',
  sizeBytes: 449178,
  elapsedMs: 206
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-333-2020-oznaceni-uradu-pisemnosti-razitek-jUHogIhcNqYff43FqpXAUsIFBqbB7s.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-333-2020-oznaceni-uradu-pisemnosti-razitek-jUHogIhcNqYff43FqpXAUsIFBqbB7s.pdf',
  sizeBytes: 141570,
  elapsedMs: 184
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-334-2020-tehotne-kojici-zamestnankyne-7gpkBvtOKUwJ7eStbVAGEdJv0U2zGr.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-334-2020-tehotne-kojici-zamestnankyne-7gpkBvtOKUwJ7eStbVAGEdJv0U2zGr.pdf',
  sizeBytes: 130363,
  elapsedMs: 215
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-335-2020-havarijni-plan-f5F929GO8c7ZTtOBmuRl0GWHCz0C7s.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-335-2020-havarijni-plan-f5F929GO8c7ZTtOBmuRl0GWHCz0C7s.pdf',
  sizeBytes: 196424,
  elapsedMs: 203
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-336-2020-pracovni-urazy-xbN5eXPDMaKkCgQ2Tc0iIUG2oPTrQj.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-336-2020-pracovni-urazy-xbN5eXPDMaKkCgQ2Tc0iIUG2oPTrQj.pdf',
  sizeBytes: 197303,
  elapsedMs: 214
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-337-2020-traumatologicky-plan-FR6KKI1gRfIBTqdyvOQwm7zl1QEPjn.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-337-2020-traumatologicky-plan-FR6KKI1gRfIBTqdyvOQwm7zl1QEPjn.pdf',
  sizeBytes: 134148,
  elapsedMs: 190
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-338-2020-pokyny-pro-cinnost-preventivni-pozarni-hlidky-NJwGQHqsQ9CS4YkuwxJRbOtFfOqXYp.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-338-2020-pokyny-pro-cinnost-preventivni-pozarni-hlidky-NJwGQHqsQ9CS4YkuwxJRbOtFfOqXYp.pdf',
  sizeBytes: 207056,
  elapsedMs: 209
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-342-2020-tvorba-vnitrnich-predpisu-knCyryAju2onSAAh16KZpB17uATaIK.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-342-2020-tvorba-vnitrnich-predpisu-knCyryAju2onSAAh16KZpB17uATaIK.pdf',
  sizeBytes: 213816,
  elapsedMs: 277
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-344-2020-realizace-dotacnich-projektu-xq3UtsAlddr7h8uYjyOnRDIRSKCuci.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-344-2020-realizace-dotacnich-projektu-xq3UtsAlddr7h8uYjyOnRDIRSKCuci.pdf',
  sizeBytes: 130408,
  elapsedMs: 240
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-346-2020-pravidla-pro-komunikaci-g872TOometpnOrJEPVU4tmzJsD0FaL.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-346-2020-pravidla-pro-komunikaci-g872TOometpnOrJEPVU4tmzJsD0FaL.pdf',
  sizeBytes: 686059,
  elapsedMs: 248
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-348-2020-ochrana-ou-zamestnancu-pMRLMmgWQeySo9ieEBq8i2kH8D2bDy.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-348-2020-ochrana-ou-zamestnancu-pMRLMmgWQeySo9ieEBq8i2kH8D2bDy.pdf',
  sizeBytes: 143026,
  elapsedMs: 190
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-353-2020-dan-z-pridane-hodnoty-vuLmWEmSywEf9tDrnJgpIf0ajP686i.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-353-2020-dan-z-pridane-hodnoty-vuLmWEmSywEf9tDrnJgpIf0ajP686i.pdf',
  sizeBytes: 236240,
  elapsedMs: 223
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-354-2021-ochrana-osobnich-udaju-v-prostredi-umc-praha-13-pG4z7RiFZqhhS8eRhWprrO5BZDeoq0.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-354-2021-ochrana-osobnich-udaju-v-prostredi-umc-praha-13-pG4z7RiFZqhhS8eRhWprrO5BZDeoq0.pdf',
  sizeBytes: 153643,
  elapsedMs: 252
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-357-2021-uplatnovani-sankci-u-mistnich-poplatku-umc-praha-13-K8ghlQ0FySsxRerjCllDG52IstblPY.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-357-2021-uplatnovani-sankci-u-mistnich-poplatku-umc-praha-13-K8ghlQ0FySsxRerjCllDG52IstblPY.pdf',
  sizeBytes: 122735,
  elapsedMs: 220
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-359-2021-projednavani-skod-a-likvidace-majetku-F0yw85tTbKov8GDobFq6uEbAneIELI.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-359-2021-projednavani-skod-a-likvidace-majetku-F0yw85tTbKov8GDobFq6uEbAneIELI.pdf',
  sizeBytes: 308441,
  elapsedMs: 214
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-360-2021-pracovni-rad-ApTKQElb229oD3b6UanHr8n8swnL6q.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-360-2021-pracovni-rad-ApTKQElb229oD3b6UanHr8n8swnL6q.pdf',
  sizeBytes: 549412,
  elapsedMs: 264
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-363-2021-majetek-zLKvdNuY7FYBgv9j9AM0W3hJEd6CrU.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-363-2021-majetek-zLKvdNuY7FYBgv9j9AM0W3hJEd6CrU.pdf',
  sizeBytes: 219233,
  elapsedMs: 237
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-366-2022-eticky-kodex-dugA8qvhNRI61r8MPnfSBDeuYk9aNC.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-366-2022-eticky-kodex-dugA8qvhNRI61r8MPnfSBDeuYk9aNC.pdf',
  sizeBytes: 119416,
  elapsedMs: 207
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-367-2022-komunikace-pri-mimoradne-udalosti-jxHPbEcPNyPfN24idZLSA3W6NziIJ9.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-367-2022-komunikace-pri-mimoradne-udalosti-jxHPbEcPNyPfN24idZLSA3W6NziIJ9.pdf',
  sizeBytes: 108933,
  elapsedMs: 186
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-368-2022-hodnoceni-zamestnancu-biFW7xLRU2cvOQea4Fo0qFHMwPX3lQ.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-368-2022-hodnoceni-zamestnancu-biFW7xLRU2cvOQea4Fo0qFHMwPX3lQ.pdf',
  sizeBytes: 348601,
  elapsedMs: 220
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-370-2022-bezpecnostni-smernice-le78hNbD9zDhFDgdB9ZooRJe9f6MCA.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-370-2022-bezpecnostni-smernice-le78hNbD9zDhFDgdB9ZooRJe9f6MCA.pdf',
  sizeBytes: 346453,
  elapsedMs: 232
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-371-2022-realna-hodnota-u-majetku-urceneho-k-prodeji-3zdR3oVuUdVRFCIIwC5CKAeTiPQiiQ.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-371-2022-realna-hodnota-u-majetku-urceneho-k-prodeji-3zdR3oVuUdVRFCIIwC5CKAeTiPQiiQ.pdf',
  sizeBytes: 196547,
  elapsedMs: 279
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-374-2022-casove-rozliseni-74fwwFaUSzuRqAXtHSZLes8Sx8oOJO.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-374-2022-casove-rozliseni-74fwwFaUSzuRqAXtHSZLes8Sx8oOJO.pdf',
  sizeBytes: 227613,
  elapsedMs: 210
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-378-2023-postupy-pro-jednotne-cislovani-smluv-a-dohod-toKlFR5mDUSPw4I3aohEtADByZMc42.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-378-2023-postupy-pro-jednotne-cislovani-smluv-a-dohod-toKlFR5mDUSPw4I3aohEtADByZMc42.pdf',
  sizeBytes: 356382,
  elapsedMs: 274
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-379-2023-zajisteni-pracovnelekarskych-sluzeb-pro-zamestnance-umc-praha-13-1lZvecGVdtJ7O2HaPcXaKciczLrYzA.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-379-2023-zajisteni-pracovnelekarskych-sluzeb-pro-zamestnance-umc-praha-13-1lZvecGVdtJ7O2HaPcXaKciczLrYzA.pdf',
  sizeBytes: 186741,
  elapsedMs: 213
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-386-2024-prirucka-isms-2024-OhaYcL2S5BVE02qGfesrjoShsYSNy0.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-386-2024-prirucka-isms-2024-OhaYcL2S5BVE02qGfesrjoShsYSNy0.pdf',
  sizeBytes: 604489,
  elapsedMs: 287
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-387-2024-evidence-prestupku-l7XXH1vihScqye4AiOwTK8jVtHieul.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-387-2024-evidence-prestupku-l7XXH1vihScqye4AiOwTK8jVtHieul.pdf',
  sizeBytes: 85461,
  elapsedMs: 197
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-388-2024-plan-inventur-na-rok-2024-xUyfWwruvAnchEsWR7TJzcf2MyEhmi.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-388-2024-plan-inventur-na-rok-2024-xUyfWwruvAnchEsWR7TJzcf2MyEhmi.pdf',
  sizeBytes: 1422043,
  elapsedMs: 322
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-389-2024-spisovy-rad-lzO0PHLbbXtQLsWtJP7tzrZcE93iPE.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-389-2024-spisovy-rad-lzO0PHLbbXtQLsWtJP7tzrZcE93iPE.pdf',
  sizeBytes: 2145537,
  elapsedMs: 379
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-390-2025-podpisovy-rad-BtFI2dxS7tNNRRs9N18NwECl2nfk4I.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-390-2025-podpisovy-rad-BtFI2dxS7tNNRRs9N18NwECl2nfk4I.pdf',
  sizeBytes: 172234,
  elapsedMs: 201
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-391-2025-evidence-a-vymahani-pohledavek-evidence-a-vraceni-preplatku-VlYBEpej1t60HVGPoNOyakLJ6vZKLb.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-391-2025-evidence-a-vymahani-pohledavek-evidence-a-vraceni-preplatku-VlYBEpej1t60HVGPoNOyakLJ6vZKLb.pdf',
  sizeBytes: 326928,
  elapsedMs: 202
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-392-2025-vzdelavani-KFATJoNIWCixfCDygBZ4py5HyylkAy.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-392-2025-vzdelavani-KFATJoNIWCixfCDygBZ4py5HyylkAy.pdf',
  sizeBytes: 196851,
  elapsedMs: 216
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-393-2025-antidiskriminacni-pravidla-915le6mDxHu6j3fuK6KclvZwzVp8gd.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-393-2025-antidiskriminacni-pravidla-915le6mDxHu6j3fuK6KclvZwzVp8gd.pdf',
  sizeBytes: 237727,
  elapsedMs: 215
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-394-2025-pouziti-automatizovaneho-externiho-defibrilatoru-x1xJ7f7okupR7JVb2IKHVt8BDfk1Ug.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-394-2025-pouziti-automatizovaneho-externiho-defibrilatoru-x1xJ7f7okupR7JVb2IKHVt8BDfk1Ug.pdf',
  sizeBytes: 113153,
  elapsedMs: 195
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-396-2025-ostraha-objektu-lUhphwErwcf1gxLyWpwfBHix6Y1gId.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-396-2025-ostraha-objektu-lUhphwErwcf1gxLyWpwfBHix6Y1gId.pdf',
  sizeBytes: 219143,
  elapsedMs: 196
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-397-2025-prijimani-novych-zamestnancu-ngxp3Wems2ICtECvihCBnUbvb3KtDH.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-397-2025-prijimani-novych-zamestnancu-ngxp3Wems2ICtECvihCBnUbvb3KtDH.pdf',
  sizeBytes: 139595,
  elapsedMs: 207
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-398-2025-postup-pri-realizaci-vyberovych-rizeni-8VePoODgg8D7lYhXLFvOC0s0Gu4jaY.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-398-2025-postup-pri-realizaci-vyberovych-rizeni-8VePoODgg8D7lYhXLFvOC0s0Gu4jaY.pdf',
  sizeBytes: 284876,
  elapsedMs: 235
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-399-2025-jina-vydelecna-cinnost-uredniku-HtA0jcx8COhLbyqlKdMzx7uTiKhymW.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-399-2025-jina-vydelecna-cinnost-uredniku-HtA0jcx8COhLbyqlKdMzx7uTiKhymW.pdf',
  sizeBytes: 113502,
  elapsedMs: 187
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-400-2025-platova-politika-umc-p13-zJX9WqS1yGN8YCqL000fujpZ6vfVPF.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-400-2025-platova-politika-umc-p13-zJX9WqS1yGN8YCqL000fujpZ6vfVPF.pdf',
  sizeBytes: 340597,
  elapsedMs: 207
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-400-2025-d-platova-politika-umc-p13-dodatek-1-j8Qbb0GrT0FYmXXVJAcRSSbj82Kh4M.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-400-2025-d-platova-politika-umc-p13-dodatek-1-j8Qbb0GrT0FYmXXVJAcRSSbj82Kh4M.pdf',
  sizeBytes: 172128,
  elapsedMs: 184
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-401-2025-uhrada-stravneho-iSf0CZttVsq38rKY4pm0vN0Vgo0xTO.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-401-2025-uhrada-stravneho-iSf0CZttVsq38rKY4pm0vN0Vgo0xTO.pdf',
  sizeBytes: 179195,
  elapsedMs: 201
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-402-2025-kontroly-zamestnancu-na-neschopence-3APOCr2IOmeUGDYccXdkNr9gMgLp2g.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-402-2025-kontroly-zamestnancu-na-neschopence-3APOCr2IOmeUGDYccXdkNr9gMgLp2g.pdf',
  sizeBytes: 107945,
  elapsedMs: 181
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-404-2025-pokladni-sluzba-Nzm7l7k8aya7gTLpVUSkuIdLAL0e04.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-404-2025-pokladni-sluzba-Nzm7l7k8aya7gTLpVUSkuIdLAL0e04.pdf',
  sizeBytes: 130451,
  elapsedMs: 210
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-405-2025-zajisteni-evidence-dodrzovani-a-vyuzivani-pracovni-doby-JTgTyYfwUynr9T9qp8OI7p10RjT91u.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-405-2025-zajisteni-evidence-dodrzovani-a-vyuzivani-pracovni-doby-JTgTyYfwUynr9T9qp8OI7p10RjT91u.pdf',
  sizeBytes: 868507,
  elapsedMs: 274
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-406-2025-podrozvaha-a-rezervy-oYGi5ZbONRrGBgWfqpiDKKZC5QT32J.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-406-2025-podrozvaha-a-rezervy-oYGi5ZbONRrGBgWfqpiDKKZC5QT32J.pdf',
  sizeBytes: 190696,
  elapsedMs: 241
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-407-2025-pokladni-sluzba-ReNjhUkiO7tXKuLQUZN27Cwu1OfMrz.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-407-2025-pokladni-sluzba-ReNjhUkiO7tXKuLQUZN27Cwu1OfMrz.pdf',
  sizeBytes: 133838,
  elapsedMs: 198
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-408-2025-obeh-rozpoctovych-a-ucetnich-dokladu-1ywNhpqlirreIhQTVa6Yu7lxPlroy9.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-408-2025-obeh-rozpoctovych-a-ucetnich-dokladu-1ywNhpqlirreIhQTVa6Yu7lxPlroy9.pdf',
  sizeBytes: 559708,
  elapsedMs: 226
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-409-2025-ekonomicka-smernice-JRo87v7JBwK2CziRWvADyfUsc9cm4K.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-409-2025-ekonomicka-smernice-JRo87v7JBwK2CziRWvADyfUsc9cm4K.pdf',
  sizeBytes: 431252,
  elapsedMs: 212
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2016-dodatek-c-1-k-pravidla-pro-prijimani-petic-stiznosti-Xx0jFHTrSNxFbcluYbteAVJlTrbIB6.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2016-dodatek-c-1-k-pravidla-pro-prijimani-petic-stiznosti-Xx0jFHTrSNxFbcluYbteAVJlTrbIB6.pdf',
  sizeBytes: 86643,
  elapsedMs: 181
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2016-pravidla-pro-prijimani-petic-stiznosti-oznameni-podnetu-a-vyrizovani-podani-na-mozna-korupcni-jednani-podanych-organum-mc-p13-yLN5JxPfyQTTN6OZW3vYfj34X5vuim.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2016-pravidla-pro-prijimani-petic-stiznosti-oznameni-podnetu-a-vyrizovani-podani-na-mozna-korupcni-jednani-podanych-organum-mc-p13-yLN5JxPfyQTTN6OZW3vYfj34X5vuim.pdf',
  sizeBytes: 169629,
  elapsedMs: 213
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-1-zadavani-vz-Po35Eg5q9Kfz6idD7Du0ERBm4sVXv5.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-1-zadavani-vz-Po35Eg5q9Kfz6idD7Du0ERBm4sVXv5.pdf',
  sizeBytes: 88673,
  elapsedMs: 220
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-2-zadavani-vz-6iJ2oNtHBNTj7S8EzUIP29SaxjkJcp.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-2-zadavani-vz-6iJ2oNtHBNTj7S8EzUIP29SaxjkJcp.pdf',
  sizeBytes: 214400,
  elapsedMs: 196
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-3-zadavani-vz-cJki0d4775xpxK8ePxBN4l662PvGL3.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-3-zadavani-vz-cJki0d4775xpxK8ePxBN4l662PvGL3.pdf',
  sizeBytes: 85758,
  elapsedMs: 203
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-4-zadavani-vz-I8KsZg4ulQ3M8vocsC5iFGqMmNOi4v.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-4-zadavani-vz-I8KsZg4ulQ3M8vocsC5iFGqMmNOi4v.pdf',
  sizeBytes: 152357,
  elapsedMs: 227
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-priloha-c-1-5-zadavani-vz-Ojl0jsNbQGXZiHpXEbeaBFaGXpIF7j.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-priloha-c-1-5-zadavani-vz-Ojl0jsNbQGXZiHpXEbeaBFaGXpIF7j.pdf',
  sizeBytes: 306113,
  elapsedMs: 206
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-zadavani-vz-mc-praha-13-dle-zakona-c-134-2016-sb-o-zadavani-vz-qOk2nlHP3ae9F0zWx1nyzzrC04O7al.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2017-zadavani-vz-mc-praha-13-dle-zakona-c-134-2016-sb-o-zadavani-vz-qOk2nlHP3ae9F0zWx1nyzzrC04O7al.pdf',
  sizeBytes: 354567,
  elapsedMs: 209
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2018-gdpr-sd7H6Ha0s6n6lkReI2tYMBkzQPirHj.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2018-gdpr-sd7H6Ha0s6n6lkReI2tYMBkzQPirHj.pdf',
  sizeBytes: 686872,
  elapsedMs: 245
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2020-statut-interniho-auditu-umc-praha-13-Y33H8y83edfjWjX7YvLc186uLdqI9S.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2020-statut-interniho-auditu-umc-praha-13-Y33H8y83edfjWjX7YvLc186uLdqI9S.pdf',
  sizeBytes: 141057,
  elapsedMs: 207
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2022-uzavirani-smluv-a-dohod-mestskou-casti-praha-13-YmgaoOwnHERTPdPXEakCeNL45fQ3qa.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2022-uzavirani-smluv-a-dohod-mestskou-casti-praha-13-YmgaoOwnHERTPdPXEakCeNL45fQ3qa.pdf',
  sizeBytes: 165126,
  elapsedMs: 201
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2023-o-aplikaci-zakona-c-34-2015-sb-zakon-o-registru-smluv-wJoCuRDZGkVEc2VFLG27FeVehmPPyE.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2023-o-aplikaci-zakona-c-34-2015-sb-zakon-o-registru-smluv-wJoCuRDZGkVEc2VFLG27FeVehmPPyE.pdf',
  sizeBytes: 208260,
  elapsedMs: 196
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2024-ochrana-oznamovatelu-YygJqRvzN0EaP1nz7ozoKqXUcrbLtN.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-1-2024-ochrana-oznamovatelu-YygJqRvzN0EaP1nz7ozoKqXUcrbLtN.pdf',
  sizeBytes: 201665,
  elapsedMs: 209
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2015-dodatek-c-1-postupy-pro-organizovani-a-provadeni-nasledne-verejnospravni-kontroly-po-ovnWPQRavbRbyMGgZa90xIqEk9lT5P.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2015-dodatek-c-1-postupy-pro-organizovani-a-provadeni-nasledne-verejnospravni-kontroly-po-ovnWPQRavbRbyMGgZa90xIqEk9lT5P.pdf',
  sizeBytes: 67887,
  elapsedMs: 191
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2015-dodatek-c-2-postupy-pro-organizovani-a-provadeni-nasledne-verejnospravni-kontroly-po-vMtQbX4omeD84uPPCSZqPC9vqUagCw.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2015-dodatek-c-2-postupy-pro-organizovani-a-provadeni-nasledne-verejnospravni-kontroly-po-vMtQbX4omeD84uPPCSZqPC9vqUagCw.pdf',
  sizeBytes: 70634,
  elapsedMs: 192
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2015-postupy-pro-organizovani-a-prov-verejnospravni-kontroly-pris-org-jXT7QiQyIMOfQKTvDJcVPlWIojxVjO.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2015-postupy-pro-organizovani-a-prov-verejnospravni-kontroly-pris-org-jXT7QiQyIMOfQKTvDJcVPlWIojxVjO.pdf',
  sizeBytes: 204407,
  elapsedMs: 205
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2019-rizeni-rizik-priloha-c-1-metodika-analyzy-rizik-VEBIMhC3D22MVBdK89OeqfC8N8CmgB.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2019-rizeni-rizik-priloha-c-1-metodika-analyzy-rizik-VEBIMhC3D22MVBdK89OeqfC8N8CmgB.pdf',
  sizeBytes: 452776,
  elapsedMs: 268
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2019-rizeni-rizik-priloha-c-2-vzor-karty-agendy-T5HJ1FvGll7UByska9ADpAEKEbEJfu.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2019-rizeni-rizik-priloha-c-2-vzor-karty-agendy-T5HJ1FvGll7UByska9ADpAEKEbEJfu.pdf',
  sizeBytes: 60643,
  elapsedMs: 170
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2019-rizeni-rizik-QmTDXjDflGTmX2iKg9F7Qyo4QgS98q.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2019-rizeni-rizik-QmTDXjDflGTmX2iKg9F7Qyo4QgS98q.pdf',
  sizeBytes: 218425,
  elapsedMs: 201
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2023-informace-106-syRjDruyxkspiYvNqDM2LYS0NS2aGM.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-2-2023-informace-106-syRjDruyxkspiYvNqDM2LYS0NS2aGM.pdf',
  sizeBytes: 584543,
  elapsedMs: 217
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-3-2019-vnitrni-kontrolni-system-WYZcHnXWvOlCbGaY0R9dhtVmujeLf2.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/ss-3-2019-vnitrni-kontrolni-system-WYZcHnXWvOlCbGaY0R9dhtVmujeLf2.pdf',
  sizeBytes: 201743,
  elapsedMs: 183
}
[??] Hashing knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-dodatek-1-kzEv2vkRhFnIRfdm2lNWDVrpgbOIM7.pdf',
  timeoutMs: 30000
}
[??] Hashed knowledge source content {
  agentName: 'RLcP3snv2ifR3H',
  source: 'https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-dodatek-1-kzEv2vkRhFnIRfdm2lNWDVrpgbOIM7.pdf',
  sizeBytes: 151374,
  elapsedMs: 179
}
[??] Computed vector store hash {
  agentName: 'RLcP3snv2ifR3H',
  vectorStoreHash: '37493d6244e314ec67d5adead66aaf063b2eab0e2c99a03809ee500f6a7b88a8',
  fileCount: 105
}
[??] AgentKit cache hit (vector store) {
  agentName: 'RLcP3snv2ifR3H',
  assistantCacheKey: '578cd6ecab37b5a1d5970e087b8a10b8b15c7f59e12bd3605d7da7227ebce425',
  vectorStoreHash: '37493d6244e314ec67d5adead66aaf063b2eab0e2c99a03809ee500f6a7b88a8',
  vectorStoreId: 'vs_69872cb1a2408191bfec0f6e4d9a21fb'
}
[??] Preparing AgentKit agent via cache manager {
  agentName: 'RLcP3snv2ifR3H',
  agentKitName: 'praha-13-monolit-3 - 578cd6ec',
  instructionsLength: 20654,
  knowledgeSourcesCount: 105,
  toolsCount: 0
}
[🤰] Preparing OpenAI AgentKit agent {
  name: 'praha-13-monolit-3 - 578cd6ec',
  instructionsLength: 20654,
  knowledgeSourcesCount: 105,
  toolsCount: 0
}
[🤰] Using cached vector store for AgentKit agent {
  name: 'praha-13-monolit-3 - 578cd6ec',
  vectorStoreId: 'vs_69872cb1a2408191bfec0f6e4d9a21fb'
}
[🤰] OpenAI AgentKit agent ready {
  name: 'praha-13-monolit-3 - 578cd6ec',
  model: 'gpt-5.2',
  toolCount: 1,
  hasVectorStore: true
}
You have not provided any `LlmExecutionTools`
This means that you won't be able to execute any prompts that require large language models like GPT-4 or Anthropic's Claude.

Technically, it's not an error, but it's probably not what you want because it does not make sense to use Promptbook without language models.
[🤰] Preparing agent model requirements { agent: 'Praha 13 (monolit 3)' }
[🤰] Available models resolved for agent { agent: 'Praha 13 (monolit 3)', modelCount: 121, elapsedMs: 449 }
[🤰] Agent model requirements ready { agent: 'Praha 13 (monolit 3)', elapsedMs: 18, totalElapsedMs: 485 }
!!!! promptWithAgentModelRequirements: {
  title: 'Chat with agent RLcP3snv2ifR3H',
  parameters: {},
  modelRequirements: {
    modelVariant: 'CHAT',
    systemMessage: 'You are Praha 13 (monolit 3)\n' +
      'Jsi asistent pro zaměstnance Prahy 13. (xxx)\n' +
      'Odpovídáš v češtině a poskytujte užitečné informace o úředních postupech, projektech a službách Prahy 13. Buď profesionální, přátelský a nápomocný.\n' +
      '\n' +
      'Goal: Máš pomáhat zaměstnancům úřadu Prahy 13 s prací a postupy. Tvým úkolem je pomoci a navést.\n' +
      '\n' +
      'Rule: Odpovídáte na otázky ohledně vnitřních dokumentů Prahy 13\n' +
      '\n' +
      'Rule: Odpovídáš v češtině\n' +
      '\n' +
      'Rule: Uvádíš zdroje, označuj místa v dokumentech odkud čerpáš\n' +
      '\n' +
      'Rule: Nepíšeš obecné postupy jak a co se má dít\n' +
      '\n' +
      'Radíš konkrétnímu člověku v konkrétní situaci.\n' +
      'Např. pokud mu přišel email, nepiš obecný postup s datovkou.\n' +
      'Např. pokud řeší veřejnou zakázku s hodnotou X, nepíšeš o obecných postupech a pravidlech veřejných zakázek, ale o zakázce X.\n' +
      '\n' +
      'Rule: očíslované kroky postupu (stručný popis, vždy se lze dál dotazovat -\n' +
      'nechceme uživatele vyděsit dlouhým textem)\n' +
      '\n' +
      'Rule: návrh dalšího postupu, kde to bude možné\n' +
      '\n' +
      'Rule: připomenutí, na co nezapomenout\n' +
      '\n' +
      'Rule: návrh kontaktu na odbor, který danou problematiku řeší\n' +
      '+ uvádět zdroje pod jejich pravým jménem = žádné číslované zdroje jako 5:12\n' +
      'atp. Musí to být název vybraného dokumentu (např. Nařízení tajemníka\n' +
      '409/2025 - Ekonomická směrnice)\n' +
      '\n' +
      'CONTEXT Dovětkem každé otázky je "Jak postupovat"\n' +
      '\n' +
      'Tvým cílem není pouze suše odpovědět na otázku, ale implikovat postup a řešení problému.\n' +
      '\n' +
      'Odpovídáš co KONKRÉTNĚ má udělat zaměstnanec Prahy 13, nikoliv obecný postup co má být.\n' +
      '\n' +
      'CONTEXT Důležitá nařízení / směrnice:\n' +
      '\n' +
      'Nařízení tajemníka\n' +
      '360/2021 Pracovní řád ÚMČ Praha 13\n' +
      '329/2019 Provozní řád ÚMČ Praha 13\n' +
      '389/2024 Spisový řád ÚMČ Praha 13\n' +
      '409/2025 Ekonomická směrnice\n' +
      '378/2023\n' +
      'Postupy pro jednotné číslování smluv, dohod, objednávek a jejich náležitosti při vystavování, podepisování a archivaci. Správa v SW Ginis\n' +      '\n' +
      '\n' +
      'Směrnice starosty\n' +
      '1/2025 Zadávání veřejných zakázek Městskou částí Praha 13 dle zákona č. 134/2016 Sb., o zadávání veřejných zakázek\n' +
      '1/2016 Pravidla pro přijímání petic, stížností, oznámení, podnětů a vyřizování podání na možná korupční jednání, podaných orgánům MČ Praha 13\n' +
      '1/2022 Uzavírání smluv a dohod městskou částí Praha 13\n' +
      '1/2023 O aplikaci zákona č. 340/2015 Sb., o zvláštních podmínkách účinnosti některých smluv, uveřejňování těchto smluv a o registru smluv (zákon o registru smluv) na Úřadu MČ Praha 13\n' +
      '2/2023 Přijímání a vyřizování žádostí o poskytnutí informací podle zákona č. 106/1999 Sb., o svobodném přístupu k informacím, ve znění pozdějších předpisů\n' +
      '\n' +
      'Example: Takto ANO:\n' +
      '\n' +
      '> Zkontrolujte, zda žádost obsahuje všechny povinné údaje podle zákona č. 106/1999 Sb.\n' +
      '<- Mluvíš na člověka nikoliv obecně\n' +
      '<- Jsi konkrétní a cituješ konkrétní zákon\n' +
      '\n' +
      'Takto NE:\n' +
      '\n' +
      '> Žádost bude zkontrolována, zda obsahuje všechny povinné údaje podle zákona.\n' +
      '<- Mluvíš co se obecně děje\n' +
      '<- Jsi vágní a nekonkrétní\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-r3eASWn0Kig20li4yEwhrbAnT6xEVo.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-117-2003-otevreny-ohen-i9DAgAJCzZ3aBl6PSHhGqoXBWJybJo.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-213-2011-inventarizace-NPQVRVY84VK8WPDuM1tUrDSTuuu7Uw.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-220-2012-aplikace-zakona-o-dph-pUqdRxC55uPUj1RxX079sQuhbBqgzL.pdf (will be processed for retrieval
during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-242-2014-vystroj-ostrahy-radnice-P6eHXuc8VESvLJ8mRfVlpAOXyWm5IT.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-243-2014-odpovednost-za-kontrolu-a-revize-elektrickych-zarizeni-ftg6W2PGYDQlEmtGI6o2q30McYEzDD.pdf
(will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-255-2015-poskytovani-osobnich-ochrannych-pracovnich-prostredku-pgupxPh5986hkBb13cxC9YJm5l9rCo.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-256-2015-inovace-73WthpbpNA1LHp6LfnjwoPsm3nRqlH.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-257-2015-materialy-do-rmc-a-zmc-5pU3Wt90PEhgxf8kKDV1JeHPJxC5OH.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-289-2018-adaptacni-proces-novych-zamestnancu-2hmtUytz1XqUqO06I2eEBrpCEeoT81.pdf (will be processed
for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-290-2018-odpisovani-dlouhodobeho-majetku-OMOZI4p7bTQFpLtpfP6jMnTzVHvURF.pdf (will be processed for
retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-291-2018-transfery-FmpUE6zmhNTRAiMkQIjXLNxzhV0Tys.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-299-2018-pr-pro-archiv-stav-YHUh6gVFZmIhtDUl8hcuZ31NrFHZJ4.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-300-2018-pr-pro-s-208-RbUMb2jrZk6PPdueZxFbIQXLyaF0Pj.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-301-2018-rad-ohlasovny-pozaru-YiAcUpOu1f95fUULf0j6aa3SwPREyw.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-302-2018-pr-pro-mistnost-nahradniho-zdroje-el-UcTOZ0hd1Jbohx366mgA7xXOjE9dO8.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-304-2018-mistni-rad-skladu-G3osILuBxmTEQECaFp4MxHrngV22WZ.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-305-2018-dokumentace-o-zacleneni-zvysene-pozarni-nebezpeci-lglHcHhvolrIFyBYbmXWO3FSVOpTe6.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-306-2018-pr-pro-budovu-radnice-Uk0krKCcKV6NUIycPixLQDaKd9Fpej.pdf (will be processed for retrieval
during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-308-2018-pozarni-rad-pro-pg-jGXpFZyCMEiGnMK1RjHUSMo6wx4HIz.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-309-2018-pozarni-evakuacni-plan-x7GaYbYxJ0PxRRzbAtDr7UDCYZVX9b.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-310-2018-dokumentace-zdolavani-pozaru-dKCPM8c1se8YlxhHBqvcMB03Lx9mq8.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-311-2018-revizni-rad-GRsfZd6fT7TXLH2KVDcVtDJkiCYSQ3.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-312-2018-cestovni-nahrady-KNXnQUQWoKwiEgTCpLSJDM5v8dLCy9.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-312-2018-cestovni-nahrady-dodatek-6-dqedfZv6j077iBCVgr2hvBjgkVf9iw.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-314-2018-kategorizace-pro-hpp-lwUIAhjV75X5Tw3kP4mXwpszWWKsWy.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-315-2018-kategorizace-pro-dpp-a-dpc-gHOdjT167EYkpb4zTPMuyrwsacnsDL.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-316-2018-zajisteni-vychovy-a-vzdelavani-v-oblasti-bozp-2BXyX55szqhqjsx1cLoI7zVrvGSwX5.pdf (will be
processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-317-2018-prikazove-bloky-9pLPk4aFiAI54bJQNPa4r7h4QG2SjC.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-319-2018-mistni-provozne-bezpecnostni-predpis-N6U1xYYA7zr9nNhZA25ZANtGQi4FpI.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-320-2018-metodika-k-organizaci-kulturnich-akci-WhQshlsBHXXtPxK8DBl0Zy9bdjKXuN.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-321-2018-pracovni-volno-bez-nahrady-yzcJxPMRDocvw22XMvnlndOIHsEezo.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-324-2019-socialne-pravni-ochrana-deti-na-umc-p13-GXTnRdw3ZvzLpfq2Az0ZDq13Rkdmmf.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-326-2019-organizace-autoprovozu-wo0SgC2VQV8JO2vUxHNRljz6us4mwx.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-327-2019-telekomunikacni-zarizeni-cOKL6BGR011LJboijiP5W3EcGBg0yU.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-329-2019-provozni-rad-umc-p-13-cH0FsV0t3CrGszkfPTJliVdGZCmJNk.pdf (will be processed for retrieval
during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-333-2020-oznaceni-uradu-pisemnosti-razitek-jUHogIhcNqYff43FqpXAUsIFBqbB7s.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-334-2020-tehotne-kojici-zamestnankyne-7gpkBvtOKUwJ7eStbVAGEdJv0U2zGr.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-335-2020-havarijni-plan-f5F929GO8c7ZTtOBmuRl0GWHCz0C7s.pdf (will be processed for retrieval during
chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-336-2020-pracovni-urazy-xbN5eXPDMaKkCgQ2Tc0iIUG2oPTrQj.pdf (will be processed for retrieval during
chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-337-2020-traumatologicky-plan-FR6KKI1gRfIBTqdyvOQwm7zl1QEPjn.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-338-2020-pokyny-pro-cinnost-preventivni-pozarni-hlidky-NJwGQHqsQ9CS4YkuwxJRbOtFfOqXYp.pdf (will be
processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-342-2020-tvorba-vnitrnich-predpisu-knCyryAju2onSAAh16KZpB17uATaIK.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-344-2020-realizace-dotacnich-projektu-xq3UtsAlddr7h8uYjyOnRDIRSKCuci.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-346-2020-pravidla-pro-komunikaci-g872TOometpnOrJEPVU4tmzJsD0FaL.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Know'... 10654 more characters,
    modelName: 'gemini-2.5-flash-lite',
    temperature: 0.7,
    topP: 0.9,
    topK: 50,
    metadata: {
      agentName: 'Praha 13 (monolit 3)',
      PERSONA: 'Jsi asistent pro zaměstnance Prahy 13. (xxx)\n' +
        'Odpovídáš v češtině a poskytujte užitečné informace o úředních postupech, projektech a službách Prahy 13. Buď profesionální, přátelský a nápomocný.',
      isClosed: true
    },
    samples: [ [Object] ],
    knowledgeSources: [
      'https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-r3eASWn0Kig20li4yEwhrbAnT6xEVo.pdf',
      'https://ptbk.io/k/nt-117-2003-otevreny-ohen-i9DAgAJCzZ3aBl6PSHhGqoXBWJybJo.pdf',
      'https://ptbk.io/k/nt-213-2011-inventarizace-NPQVRVY84VK8WPDuM1tUrDSTuuu7Uw.pdf',
      'https://ptbk.io/k/nt-220-2012-aplikace-zakona-o-dph-pUqdRxC55uPUj1RxX079sQuhbBqgzL.pdf',
      'https://ptbk.io/k/nt-242-2014-vystroj-ostrahy-radnice-P6eHXuc8VESvLJ8mRfVlpAOXyWm5IT.pdf',
      'https://ptbk.io/k/nt-243-2014-odpovednost-za-kontrolu-a-revize-elektrickych-zarizeni-ftg6W2PGYDQlEmtGI6o2q30McYEzDD.pdf',
      'https://ptbk.io/k/nt-255-2015-poskytovani-osobnich-ochrannych-pracovnich-prostredku-pgupxPh5986hkBb13cxC9YJm5l9rCo.pdf',
      'https://ptbk.io/k/nt-256-2015-inovace-73WthpbpNA1LHp6LfnjwoPsm3nRqlH.pdf',
      'https://ptbk.io/k/nt-257-2015-materialy-do-rmc-a-zmc-5pU3Wt90PEhgxf8kKDV1JeHPJxC5OH.pdf',
      'https://ptbk.io/k/nt-289-2018-adaptacni-proces-novych-zamestnancu-2hmtUytz1XqUqO06I2eEBrpCEeoT81.pdf',
      'https://ptbk.io/k/nt-290-2018-odpisovani-dlouhodobeho-majetku-OMOZI4p7bTQFpLtpfP6jMnTzVHvURF.pdf',
      'https://ptbk.io/k/nt-291-2018-transfery-FmpUE6zmhNTRAiMkQIjXLNxzhV0Tys.pdf',
      'https://ptbk.io/k/nt-299-2018-pr-pro-archiv-stav-YHUh6gVFZmIhtDUl8hcuZ31NrFHZJ4.pdf',
      'https://ptbk.io/k/nt-300-2018-pr-pro-s-208-RbUMb2jrZk6PPdueZxFbIQXLyaF0Pj.pdf',
      'https://ptbk.io/k/nt-301-2018-rad-ohlasovny-pozaru-YiAcUpOu1f95fUULf0j6aa3SwPREyw.pdf',
      'https://ptbk.io/k/nt-302-2018-pr-pro-mistnost-nahradniho-zdroje-el-UcTOZ0hd1Jbohx366mgA7xXOjE9dO8.pdf',
      'https://ptbk.io/k/nt-304-2018-mistni-rad-skladu-G3osILuBxmTEQECaFp4MxHrngV22WZ.pdf',
      'https://ptbk.io/k/nt-305-2018-dokumentace-o-zacleneni-zvysene-pozarni-nebezpeci-lglHcHhvolrIFyBYbmXWO3FSVOpTe6.pdf',
      'https://ptbk.io/k/nt-306-2018-pr-pro-budovu-radnice-Uk0krKCcKV6NUIycPixLQDaKd9Fpej.pdf',
      'https://ptbk.io/k/nt-308-2018-pozarni-rad-pro-pg-jGXpFZyCMEiGnMK1RjHUSMo6wx4HIz.pdf',
      'https://ptbk.io/k/nt-309-2018-pozarni-evakuacni-plan-x7GaYbYxJ0PxRRzbAtDr7UDCYZVX9b.pdf',
      'https://ptbk.io/k/nt-310-2018-dokumentace-zdolavani-pozaru-dKCPM8c1se8YlxhHBqvcMB03Lx9mq8.pdf',
      'https://ptbk.io/k/nt-311-2018-revizni-rad-GRsfZd6fT7TXLH2KVDcVtDJkiCYSQ3.pdf',
      'https://ptbk.io/k/nt-312-2018-cestovni-nahrady-KNXnQUQWoKwiEgTCpLSJDM5v8dLCy9.pdf',
      'https://ptbk.io/k/nt-312-2018-cestovni-nahrady-dodatek-6-dqedfZv6j077iBCVgr2hvBjgkVf9iw.pdf',
      'https://ptbk.io/k/nt-314-2018-kategorizace-pro-hpp-lwUIAhjV75X5Tw3kP4mXwpszWWKsWy.pdf',
      'https://ptbk.io/k/nt-315-2018-kategorizace-pro-dpp-a-dpc-gHOdjT167EYkpb4zTPMuyrwsacnsDL.pdf',
      'https://ptbk.io/k/nt-316-2018-zajisteni-vychovy-a-vzdelavani-v-oblasti-bozp-2BXyX55szqhqjsx1cLoI7zVrvGSwX5.pdf',
      'https://ptbk.io/k/nt-317-2018-prikazove-bloky-9pLPk4aFiAI54bJQNPa4r7h4QG2SjC.pdf',
      'https://ptbk.io/k/nt-319-2018-mistni-provozne-bezpecnostni-predpis-N6U1xYYA7zr9nNhZA25ZANtGQi4FpI.pdf',
      'https://ptbk.io/k/nt-320-2018-metodika-k-organizaci-kulturnich-akci-WhQshlsBHXXtPxK8DBl0Zy9bdjKXuN.pdf',
      'https://ptbk.io/k/nt-321-2018-pracovni-volno-bez-nahrady-yzcJxPMRDocvw22XMvnlndOIHsEezo.pdf',
      'https://ptbk.io/k/nt-324-2019-socialne-pravni-ochrana-deti-na-umc-p13-GXTnRdw3ZvzLpfq2Az0ZDq13Rkdmmf.pdf',
      'https://ptbk.io/k/nt-326-2019-organizace-autoprovozu-wo0SgC2VQV8JO2vUxHNRljz6us4mwx.pdf',
      'https://ptbk.io/k/nt-327-2019-telekomunikacni-zarizeni-cOKL6BGR011LJboijiP5W3EcGBg0yU.pdf',
      'https://ptbk.io/k/nt-329-2019-provozni-rad-umc-p-13-cH0FsV0t3CrGszkfPTJliVdGZCmJNk.pdf',
      'https://ptbk.io/k/nt-333-2020-oznaceni-uradu-pisemnosti-razitek-jUHogIhcNqYff43FqpXAUsIFBqbB7s.pdf',
      'https://ptbk.io/k/nt-334-2020-tehotne-kojici-zamestnankyne-7gpkBvtOKUwJ7eStbVAGEdJv0U2zGr.pdf',
      'https://ptbk.io/k/nt-335-2020-havarijni-plan-f5F929GO8c7ZTtOBmuRl0GWHCz0C7s.pdf',
      'https://ptbk.io/k/nt-336-2020-pracovni-urazy-xbN5eXPDMaKkCgQ2Tc0iIUG2oPTrQj.pdf',
      'https://ptbk.io/k/nt-337-2020-traumatologicky-plan-FR6KKI1gRfIBTqdyvOQwm7zl1QEPjn.pdf',
      'https://ptbk.io/k/nt-338-2020-pokyny-pro-cinnost-preventivni-pozarni-hlidky-NJwGQHqsQ9CS4YkuwxJRbOtFfOqXYp.pdf',
      'https://ptbk.io/k/nt-342-2020-tvorba-vnitrnich-predpisu-knCyryAju2onSAAh16KZpB17uATaIK.pdf',
      'https://ptbk.io/k/nt-344-2020-realizace-dotacnich-projektu-xq3UtsAlddr7h8uYjyOnRDIRSKCuci.pdf',
      'https://ptbk.io/k/nt-346-2020-pravidla-pro-komunikaci-g872TOometpnOrJEPVU4tmzJsD0FaL.pdf',
      'https://ptbk.io/k/nt-348-2020-ochrana-ou-zamestnancu-pMRLMmgWQeySo9ieEBq8i2kH8D2bDy.pdf',
      'https://ptbk.io/k/nt-353-2020-dan-z-pridane-hodnoty-vuLmWEmSywEf9tDrnJgpIf0ajP686i.pdf',
      'https://ptbk.io/k/nt-354-2021-ochrana-osobnich-udaju-v-prostredi-umc-praha-13-pG4z7RiFZqhhS8eRhWprrO5BZDeoq0.pdf',
      'https://ptbk.io/k/nt-357-2021-uplatnovani-sankci-u-mistnich-poplatku-umc-praha-13-K8ghlQ0FySsxRerjCllDG52IstblPY.pdf',
      'https://ptbk.io/k/nt-359-2021-projednavani-skod-a-likvidace-majetku-F0yw85tTbKov8GDobFq6uEbAneIELI.pdf',
      'https://ptbk.io/k/nt-360-2021-pracovni-rad-ApTKQElb229oD3b6UanHr8n8swnL6q.pdf',
      'https://ptbk.io/k/nt-363-2021-majetek-zLKvdNuY7FYBgv9j9AM0W3hJEd6CrU.pdf',
      'https://ptbk.io/k/nt-366-2022-eticky-kodex-dugA8qvhNRI61r8MPnfSBDeuYk9aNC.pdf',
      'https://ptbk.io/k/nt-367-2022-komunikace-pri-mimoradne-udalosti-jxHPbEcPNyPfN24idZLSA3W6NziIJ9.pdf',
      'https://ptbk.io/k/nt-368-2022-hodnoceni-zamestnancu-biFW7xLRU2cvOQea4Fo0qFHMwPX3lQ.pdf',
      'https://ptbk.io/k/nt-370-2022-bezpecnostni-smernice-le78hNbD9zDhFDgdB9ZooRJe9f6MCA.pdf',
      'https://ptbk.io/k/nt-371-2022-realna-hodnota-u-majetku-urceneho-k-prodeji-3zdR3oVuUdVRFCIIwC5CKAeTiPQiiQ.pdf',
      'https://ptbk.io/k/nt-374-2022-casove-rozliseni-74fwwFaUSzuRqAXtHSZLes8Sx8oOJO.pdf',
      'https://ptbk.io/k/nt-378-2023-postupy-pro-jednotne-cislovani-smluv-a-dohod-toKlFR5mDUSPw4I3aohEtADByZMc42.pdf',
      'https://ptbk.io/k/nt-379-2023-zajisteni-pracovnelekarskych-sluzeb-pro-zamestnance-umc-praha-13-1lZvecGVdtJ7O2HaPcXaKciczLrYzA.pdf',
      'https://ptbk.io/k/nt-386-2024-prirucka-isms-2024-OhaYcL2S5BVE02qGfesrjoShsYSNy0.pdf',
      'https://ptbk.io/k/nt-387-2024-evidence-prestupku-l7XXH1vihScqye4AiOwTK8jVtHieul.pdf',
      'https://ptbk.io/k/nt-388-2024-plan-inventur-na-rok-2024-xUyfWwruvAnchEsWR7TJzcf2MyEhmi.pdf',
      'https://ptbk.io/k/nt-389-2024-spisovy-rad-lzO0PHLbbXtQLsWtJP7tzrZcE93iPE.pdf',
      'https://ptbk.io/k/nt-390-2025-podpisovy-rad-BtFI2dxS7tNNRRs9N18NwECl2nfk4I.pdf',
      'https://ptbk.io/k/nt-391-2025-evidence-a-vymahani-pohledavek-evidence-a-vraceni-preplatku-VlYBEpej1t60HVGPoNOyakLJ6vZKLb.pdf',
      'https://ptbk.io/k/nt-392-2025-vzdelavani-KFATJoNIWCixfCDygBZ4py5HyylkAy.pdf',
      'https://ptbk.io/k/nt-393-2025-antidiskriminacni-pravidla-915le6mDxHu6j3fuK6KclvZwzVp8gd.pdf',
      'https://ptbk.io/k/nt-394-2025-pouziti-automatizovaneho-externiho-defibrilatoru-x1xJ7f7okupR7JVb2IKHVt8BDfk1Ug.pdf',
      'https://ptbk.io/k/nt-396-2025-ostraha-objektu-lUhphwErwcf1gxLyWpwfBHix6Y1gId.pdf',
      'https://ptbk.io/k/nt-397-2025-prijimani-novych-zamestnancu-ngxp3Wems2ICtECvihCBnUbvb3KtDH.pdf',
      'https://ptbk.io/k/nt-398-2025-postup-pri-realizaci-vyberovych-rizeni-8VePoODgg8D7lYhXLFvOC0s0Gu4jaY.pdf',
      'https://ptbk.io/k/nt-399-2025-jina-vydelecna-cinnost-uredniku-HtA0jcx8COhLbyqlKdMzx7uTiKhymW.pdf',
      'https://ptbk.io/k/nt-400-2025-platova-politika-umc-p13-zJX9WqS1yGN8YCqL000fujpZ6vfVPF.pdf',
      'https://ptbk.io/k/nt-400-2025-d-platova-politika-umc-p13-dodatek-1-j8Qbb0GrT0FYmXXVJAcRSSbj82Kh4M.pdf',
      'https://ptbk.io/k/nt-401-2025-uhrada-stravneho-iSf0CZttVsq38rKY4pm0vN0Vgo0xTO.pdf',
      'https://ptbk.io/k/nt-402-2025-kontroly-zamestnancu-na-neschopence-3APOCr2IOmeUGDYccXdkNr9gMgLp2g.pdf',
      'https://ptbk.io/k/nt-404-2025-pokladni-sluzba-Nzm7l7k8aya7gTLpVUSkuIdLAL0e04.pdf',
      'https://ptbk.io/k/nt-405-2025-zajisteni-evidence-dodrzovani-a-vyuzivani-pracovni-doby-JTgTyYfwUynr9T9qp8OI7p10RjT91u.pdf',
      'https://ptbk.io/k/nt-406-2025-podrozvaha-a-rezervy-oYGi5ZbONRrGBgWfqpiDKKZC5QT32J.pdf',
      'https://ptbk.io/k/nt-407-2025-pokladni-sluzba-ReNjhUkiO7tXKuLQUZN27Cwu1OfMrz.pdf',
      'https://ptbk.io/k/nt-408-2025-obeh-rozpoctovych-a-ucetnich-dokladu-1ywNhpqlirreIhQTVa6Yu7lxPlroy9.pdf',
      'https://ptbk.io/k/nt-409-2025-ekonomicka-smernice-JRo87v7JBwK2CziRWvADyfUsc9cm4K.pdf',
      'https://ptbk.io/k/ss-1-2016-dodatek-c-1-k-pravidla-pro-prijimani-petic-stiznosti-Xx0jFHTrSNxFbcluYbteAVJlTrbIB6.pdf',
      'https://ptbk.io/k/ss-1-2016-pravidla-pro-prijimani-petic-stiznosti-oznameni-podnetu-a-vyrizovani-podani-na-mozna-korupcni-jednani-podanych-organum-mc-p13-yLN5JxPfyQTTN6OZW3vYfj34X5vuim.pdf',
      'https://ptbk.io/k/ss-1-2017-dodatek-c-1-zadavani-vz-Po35Eg5q9Kfz6idD7Du0ERBm4sVXv5.pdf',
      'https://ptbk.io/k/ss-1-2017-dodatek-c-2-zadavani-vz-6iJ2oNtHBNTj7S8EzUIP29SaxjkJcp.pdf',
      'https://ptbk.io/k/ss-1-2017-dodatek-c-3-zadavani-vz-cJki0d4775xpxK8ePxBN4l662PvGL3.pdf',
      'https://ptbk.io/k/ss-1-2017-dodatek-c-4-zadavani-vz-I8KsZg4ulQ3M8vocsC5iFGqMmNOi4v.pdf',
      'https://ptbk.io/k/ss-1-2017-priloha-c-1-5-zadavani-vz-Ojl0jsNbQGXZiHpXEbeaBFaGXpIF7j.pdf',
      'https://ptbk.io/k/ss-1-2017-zadavani-vz-mc-praha-13-dle-zakona-c-134-2016-sb-o-zadavani-vz-qOk2nlHP3ae9F0zWx1nyzzrC04O7al.pdf',
      'https://ptbk.io/k/ss-1-2018-gdpr-sd7H6Ha0s6n6lkReI2tYMBkzQPirHj.pdf',
      'https://ptbk.io/k/ss-1-2020-statut-interniho-auditu-umc-praha-13-Y33H8y83edfjWjX7YvLc186uLdqI9S.pdf',
      'https://ptbk.io/k/ss-1-2022-uzavirani-smluv-a-dohod-mestskou-casti-praha-13-YmgaoOwnHERTPdPXEakCeNL45fQ3qa.pdf',
      'https://ptbk.io/k/ss-1-2023-o-aplikaci-zakona-c-34-2015-sb-zakon-o-registru-smluv-wJoCuRDZGkVEc2VFLG27FeVehmPPyE.pdf',
      'https://ptbk.io/k/ss-1-2024-ochrana-oznamovatelu-YygJqRvzN0EaP1nz7ozoKqXUcrbLtN.pdf',
      'https://ptbk.io/k/ss-2-2015-dodatek-c-1-postupy-pro-organizovani-a-provadeni-nasledne-verejnospravni-kontroly-po-ovnWPQRavbRbyMGgZa90xIqEk9lT5P.pdf',
      'https://ptbk.io/k/ss-2-2015-dodatek-c-2-postupy-pro-organizovani-a-provadeni-nasledne-verejnospravni-kontroly-po-vMtQbX4omeD84uPPCSZqPC9vqUagCw.pdf',
      'https://ptbk.io/k/ss-2-2015-postupy-pro-organizovani-a-prov-verejnospravni-kontroly-pris-org-jXT7QiQyIMOfQKTvDJcVPlWIojxVjO.pdf',
      'https://ptbk.io/k/ss-2-2019-rizeni-rizik-priloha-c-1-metodika-analyzy-rizik-VEBIMhC3D22MVBdK89OeqfC8N8CmgB.pdf',
      ... 5 more items
    ],
    tools: undefined
  },
  content: 'A kdo je Technik požární ochrany',
  thread: [
    {
      id: 'user_1770467231236',
      createdAt: '2026-02-07T12:27:11.236Z',
      sender: 'USER',
      content: 'Kam volat, když hoří.',
      isComplete: true,
      attachments: []
    },
    {
      id: 'assistant_1770467231236',
      createdAt: '2026-02-07T12:27:50.237Z',
      sender: 'AGENT',
      content: '1) **Okamžitě volejte Hasičský záchranný sbor: 150** (případně **tísňovou linku 112**) – to je primární hlášení požáru dle Řádu ohlašovny požárů  a Pokynů pro činnost preventivní požární hlídky .  \n' +
        '\n' +
        '2) **Pokud jste v budově Radnice ÚMČ Praha 13, současně informujte místní ohlašovnu požárů (vrátnice/ostraha): vnitřní linka 123** (externě
**235 011 123**) – ohlašovna je trvale na **vstupní vrátnici** . Havarijní plán výslovně uvádí hlášení na HZS (150) a zároveň na místní ohlašovnu – **linka 123** .\n' +
        '\n' +
        '3) **Do telefonátu nahlaste minimálně:** kdo a odkud volá, co hoří/jaká jsou rizika, počet zraněných .\n' +
        '\n' +
        'Nezapomeňte: i když požár zvládnete uhasit, podle havarijního plánu se **každý požár hlásí** (zaměstnavateli/ohlašovně) .\n' +
        '\n' +
        'Kontakt na řešení na úřadě: **Ohlašovna požárů – ostraha objektu (Odbor hospodářské správy), vrátnice, linka 123 / 235 011 123** .',
      isComplete: true,
      toolCalls: [],
      completedToolCalls: [],
      generationDurationMs: 39001
    },
*linka 123** .\n' +
        '\n' +
        '3) **Do telefonátu nahlaste minimálně:** kdo a odkud volá, co hoří/jaká jsou rizika, počet zraněných .\n' +
        '\n' +
        'Nezapomeňte: i když požár zvládnete uhasit, podle havarijního plánu se **každý požár hlásí** (zaměstnavateli/ohlašovně) .\n' +
        '\n' +
        'Kontakt na řešení na úřadě: **Ohlašovna požárů – ostraha objektu (Odbor hospodářské správy), vrátnice, linka 123 / 235 011 123** .',
      isComplete: true,
      toolCalls: [],
      completedToolCalls: [],
      generationDurationMs: 39001
    },
        '3) **Do telefonátu nahlaste minimálně:** kdo a odkud volá, co hoří/jaká jsou rizika, počet zraněných .\n' +
        '\n' +
        'Nezapomeňte: i když požár zvládnete uhasit, podle havarijního plánu se **každý požár hlásí** (zaměstnavateli/ohlašovně) .\n' +
        '\n' +
        'Kontakt na řešení na úřadě: **Ohlašovna požárů – ostraha objektu (Odbor hospodářské správy), vrátnice, linka 123 / 235 011 123** .',
      isComplete: true,
      toolCalls: [],
      completedToolCalls: [],
      generationDurationMs: 39001
    },
        'Kontakt na řešení na úřadě: **Ohlašovna požárů – ostraha objektu (Odbor hospodářské správy), vrátnice, linka 123 / 235 011 123** .',
      isComplete: true,
      toolCalls: [],
      completedToolCalls: [],
      generationDurationMs: 39001
    },
      completedToolCalls: [],
      generationDurationMs: 39001
    },
    },
    {
      id: 'user_1770467295747',
    {
    {
      id: 'user_1770467295747',
      createdAt: '2026-02-07T12:28:15.747Z',
      sender: 'USER',
      content: 'A kdo je Technik požární ochrany',
      isComplete: true,
      attachments: []
    }
  ]
}
POST /agents/RLcP3snv2ifR3H/api/chat 200 in 35932ms
```

---

[ ] !!!!!!!!!!!

[✨🦂] Use locking mechanism to avoid creating two same vector stores at once.

-   (@@@ - Just remove)
-   Use the `GenerationLock` already used for preventing from generating the same image twice.
-   Leverage to the same principle when creating vector stores in OpenAI.
-   Create database migration for the change if needed
    -   Migrations are located in `/apps/agents-server/src/database/migrations`
    -   Be aware that table names in migrations have prefix `prefix_` _(look at existing migrations for reference)_
-   For additional context, you can look at the [migration file from OpenaAI Assistants to AgentKit](prompts/2026-01-1000-migrate-to-agent-kit.md), [migration 2 file from OpenaAI Assistants to AgentKit](prompts/2026-01-1010-vector-store-cache.md)
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   This should work in the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🦂] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)

---

[-]

[✨🦂] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the [changelog](./changelog/_current-preversion.md)
