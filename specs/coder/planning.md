# Read-only plánování

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

Současný podporovaný planner harness je OpenAI Codex. Ostatní musí explicitně odmítnout plánovací režim, dokud nemají ekvivalentní schopnosti. Role Developer/Planner nemění capability policy.

Model prochází projekt přes host-mediated read protocol a navrhuje PRD, ne application patches. Nesmí si sám spustit shell, zapsat aplikační soubor ani předat takové oprávnění TEAM poradci. Jen primární plánovač navrhuje tasky a až uživatelská review/save akce je uloží. Povolené PRD změny mají vlastní scoped commit; `plan` nesmí spustit implementační frontu.

Zachovat konverzační `/save` (ready), `/draft` (not-ready), `/discard` a `/exit`; EOF neuložené návrhy zahodí, již uložené soubory zůstanou. Uživatel před zápisem vidí přesnou cestu i obsah, concurrent source edit zneplatní preview. Jeden inference má limit 5 minut a 2 MiB výstupu; nedostupná read-only capability musí plánování odmítnout, nikoli spustit běžný neomezený execution runner.

## Související specifikace

- [Uživatelské a CLI kontrakty](cli.md)
- [Agent Books a kontext](agent-context.md)
- [TEAM konzultace](team.md)
- [Coding harnessy](harnesses.md)
- [Vlastnictví změn a Git persistence](git-persistence.md)
