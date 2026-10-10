# Rozsah coderu

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

## Zahrnuté pracovní postupy

- Inicializace projektu; authoring zadání, šablony a plánovací konverzace.
- Jednorázový běh fronty, read-only přehled a dry-run.
- Oprava selhávajících checks bez spuštění běžné fronty.
- Bezpečné Git commity, explicitní pull/push, izolace úkolu ve worktree a recovery.
- Persistentní coder server se sdíleným stavem a ovládáním.
- Sedm stávajících harnessů, agent Books, kontext a TEAM.
- Tasks v Book formátu, migrace Markdownu, not-before a deterministické opakování.
- Ruční ověření výsledku a archivace; pomocné příkazy pro authoring a diagnostiku.

## Co nepřenášet do jádra

Starý pipeline engine, celý Agents Server, Studio, marketingové weby, účtování zákazníků, Supabase/PostgreSQL, vlastní editor a obecné chatové funkce nejsou závislostí coderu. Nepřepisovat celý Promptbook kvůli coderu.

Odloženy jsou: plný `ptbk server` nad Agent Serverem a SQLite (PRD 2026-09-0490 je výslovně `not-ready`), paralelní task workery, přirozenojazyčné/eventové triggery, distribuované řízení napříč klony, marketplace agentů a automatické odvozování backlogu z libovolných cílů.

**Závislosti mezi tasky:** koncept APT je připouští, ale aktuální task PRD nedefinuje vykonatelný kontrakt typu `DEPENDS ON`. Do základní verze se nevymýšlí implicitní DAG ani nová syntaxe. Rozhraní způsobilosti umožní budoucí dependency evaluator; nepodporovaná řídicí syntaxe dnes úkol viditelně zablokuje. Závislosti mezi implementačními etapami v [implementačních etapách](delivery.md) nejsou syntaxí tasků.

Origami avatary z PRD 2026-10-0030 jsou samostatná vizuální dodávka nad sdílenými událostmi. Coder musí mít výměnný renderer identity/stavu a kompatibilní fallback. Fyzikální skládání 3D origami ani úprava Agents Serveru nejsou podmínkou správnosti task enginu. Jejich nezahrnutí do základní dodávky musí být viditelné, nikoli označené jako splněné PRD.

## Související specifikace

- [Základní pojmy a datové kontrakty](domain-model.md)
- [Implementační etapy a Definition of Done](delivery.md)
- [Kompatibilita a vědomé změny](compatibility.md)
