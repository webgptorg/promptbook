# Projektové cesty a zdroje tasků

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Projektový kořen, Git working tree a adresář instalovaného balíčku jsou tři různé cesty. Změna `--path` musí konzistentně ovlivnit Books, kontext, tasky, šablony, cwd subprocessů, checks a artefakty. Git operace používají nalezený obalující repozitář, ale nesmějí kvůli tomu přesunout tasky pod jeho kořen.

## Konfigurace task zdroje

`--tasks <directory>` má default `tasks` relativně k vybranému projektu. Legacy zdroj zůstává `prompts`. Absolutní cesta uvnitř projektu je dovolena; cesty s mezerami musí fungovat. Pro mutace ověřit skutečné cesty a symlinky, aby nebylo možné zapisovat do jiného workspace.

Implicitní neexistující zdroj je prázdný. Explicitní chybějící nebo neplatný `--tasks` je pro read/run chyba; `init` a `migrate` smějí validovaný cíl vytvořit. Při aliasování cest se každý adaptér aplikuje pouze jednou. Stejnou vyřešenou konfiguraci používají všechny příkazy, child workery a izolované worktrees.

Z task zdroje načítat pouze top-level `.book` soubory, stejně nerekurzivně jako legacy frontu. Podadresáře se šablonami, archivy a traces nejsou discovery zdroj.

## Související specifikace

- [Inicializace projektu](initialization.md)
- [Git preflight](git-preflight.md)
- [Legacy Markdown tasky](task-markdown.md)
- [Task Books](task-books.md)
- [Izolace tasku ve worktree](isolation.md)
