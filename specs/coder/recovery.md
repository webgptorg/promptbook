# Mutační lease, journal a recovery

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Jeden zapisující vlastník koordinuje agentní změny, checks, status writers, migraci zdrojů, index, integraci a Git operace v dotčeném checkoutu. Live worker blokuje druhou invokaci. Stale zámek se nesmí automaticky ukrást jen podle věku.

**Nové rozhodnutí:** uložit identitu workspace/run/worktree, náhodný ownership token, PID/host a heartbeat do `.promptbook/ptbk-coder`; kritická rozhodnutí nespoléhají jen na PID. Související worktrees/nested projekty musí sdílet koordinaci operací, které zasahují tentýž Git index nebo integrační větev. Umístění společné koordinace vyřešit explicitním workspace contextem, nikoli zápisem do `.git`.

Journal uchovává hranici fáze, source hash, baseline a výsledné content/index snapshots, očekávaný HEAD, task/occurrence identity, intent vytvořit commit a již nalezený commit. Zápisy jsou atomické a verzované; porušený stav se diagnostikuje, ne resetuje na prázdno. Při restartu nejprve reconcile s historií, potom nabídnout přesný bezpečný krok pokračování.

**Nové rozhodnutí - ovladatelná recovery:** doplnit `ptbk coder recover <task-id>` jako read-only přehled zvoleného přerušeného/blocked výskytu. Mutující akce se zadá explicitně přes `--action resume`, `retry` nebo `acknowledge` a podle potřeby `--occurrence <id>`. `resume` pokračuje jen v prokázané nedokončené fázi, `retry` vědomě opakuje neúspěšný výskyt se stejnou identitou a novým attempt záznamem, `acknowledge` uzavře blokující výskyt jako přijaté selhání, nikoli úspěch. U recurrence pak smí pokračovat až novější due slot. Nejasné vnější účinky vyžadují konkrétní potvrzení obsažené v recovery plánu; příkaz nikdy nevytváří ownership nad neprokázanými bytes. `--dry-run` vypíše plán bez zápisu a všechny akce podléhají lease/revizím. Jde o nový explicitní UX kontrakt, ne existující příkaz analyzovaného coderu.

## Související specifikace

- [Základní pojmy a datové kontrakty](domain-model.md)
- [Vlastnictví změn a Git persistence](git-persistence.md)
- [Execution lifecycle](execution.md)
- [Opakované task Books](recurrence.md)
- [Migrace Markdown tasků na Books](migration.md)
