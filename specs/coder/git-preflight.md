# Git preflight

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Read-only příkaz smí pracovat nad adresářem bez Gitu. Mutující příkaz vyřeší Git před instalací harnessu, generováním souborů nebo placeným voláním. Běžná mutující akce může v interaktivním terminálu nabídnout `git init`; odmítnutí musí být bez částečných vedlejších změn. V neinteraktivním režimu chybějící repozitář skončí s návodem. Výjimkou je explicitní `ptbk init` / `coder init`: samotný příkaz už vyjadřuje záměr inicializovat a může založit Git i s `--no-questions`, bez dalšího potvrzení.

`git init` nikdy samo necommitne původní uživatelské soubory. Případný explicitní initialization commit zahrne pouze skutečně vytvořené/změněné inicializační artefakty. Repozitář bez prvního commitu je platný podporovaný stav. Rozlišit chybějící executable Git, poškozený repozitář a bare repository; žádný z těchto problémů neskrývat novým `git init`.

Uvnitř existujícího repozitáře nikdy nezakládat vnořené `.git`. Zachovat Git worktrees i variantu, kde `.git` je soubor. Výchozí nastavení nesmí přidat remote, force-pushovat nebo přepsat cizí historii.

## Související specifikace

- [Projektové cesty a zdroje tasků](workspace.md)
- [Inicializace projektu](initialization.md)
- [Vlastnictví změn a Git persistence](git-persistence.md)
