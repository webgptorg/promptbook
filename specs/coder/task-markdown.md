# Legacy Markdown tasky

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

## Načtení a stavy

Načítat pouze top-level `.md` v legacy zdroji. Ignorovat README podle existujícího pravidla a soubory obsahující `<!--ptbk-coder-ignore-->`. Nevstupovat rekurzivně do archivů, traces, šablon ani screenshots.

Legacy parser dělí soubor podle samostatné řádky `---`. Každá neprázdná sekce je samostatný task. Jeho stav určuje první neprázdný řádek, ne checklist acceptance criteria v těle. Původní parser není plnohodnotný Markdown AST; jeho chování musí mít kompatibilitní fixtures. Přepis nesmí bez výslovné migrace předefinovat hranice existujících sekcí.

| Marker | Normalizovaný stav | Automatické nové spuštění |
| --- | --- | --- |
| `[ ]` | `todo` | Ano, pokud splní všechny další podmínky. |
| Žádný marker | `todo`, priorita 0 | Ano, pokud je sekce úplná; při zahájení se doplní stavový řádek. |
| `[-]`, historické `[.]` | `not-ready` | Ne. |
| `[^]` | `in-progress` | Ne; jen explicitní ověřená recovery. |
| `[x]`, `[X]` | `done` | Ne. |
| `[!]` | `failed` | Ne; vyžaduje vědomé opakování/recovery. |

Známý marker s neplatnými řídicími metadaty nesmí spadnout do implicitního `todo`. Sekce obsahující authoring placeholder `@@@` se nevykonává. Obyčejný úvodní emoji tag není stav úkolu.

## Priority a routing

Počet `!` ve stavových metadatech určuje nezápornou prioritu; větší číslo se spouští dříve. Při shodě zachovat stabilní pořadí podle zdrojových cest a pořadí sekcí. **Nové rozhodnutí:** v mixed frontě explicitně dokumentovat stabilní sekundární klíč `normalizovaná relativní cesta + sekce/ID`, aby výsledek nezávisel na pořadí filesystemu.

Nečasové backtick tokeny jsou historická **any-of** skupina. Normalizovaný token se porovnává jako substring názvu harnessu, modelu a aliasů vybraného Book agenta. Například `gpt` nebo `opus` není striktní model ID. Několik tokenů znamená OR, nikoli povinné splnění všech.

```markdown
[ ] !! use `gpt` `claude`

[název nebo emoji] Oprav export CSV
Zachovej názvy sloupců a doplň ověření uvozovek.
```

Routing filtr v legacy Markdownu sám nemění vybraného providera. Při status update zachovat původní routing a časové anotace jako zdrojová metadata oddělená od historie použitého runneru; historický model v hotovém reportu se nesmí stát novým omezením.

## Změny zdroje během práce

Adapter musí znát soubor, sekci, verzi obsahu a umístění řídicího řádku. Před zápisem stav znovu ověří. Smí zachovat záměrné task-owned změny těla, ale nesmí přepsat konkurenční editaci, přiřadit výsledek nově vložené sekci podle pouhého indexu nebo ignorovat zmizení původního úkolu.

**Nové rozhodnutí:** zdrojové revize porovnávat pomocí content hash a očekávaného task/section fingerprintu. Konflikt zastaví finalizaci a zachová obě verze k rozřešení. Zachovat newline styl a okolní obsah tam, kde to neodporuje explicitnímu normalizačnímu kroku.

## Související specifikace

- [Task Books](task-books.md)
- [Způsobilost tasku](eligibility.md)
- [Not-before: nejdřívější spuštění](not-before.md)
- [Migrace Markdown tasků na Books](migration.md)
- [Mutační lease, journal a recovery](recovery.md)
