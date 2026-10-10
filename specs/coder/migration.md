# Migrace Markdown tasků na Books

[Hlavní specifikace](../_main.md) · [Dictionary](../dictionary.md)

```bash
ptbk coder migrate --path ./projekt --tasks ./work-items --dry-run
ptbk coder migrate --path ./projekt --tasks ./work-items
```

Migrace je explicitní jednosměrná lokální operace. Neprovádí modelové volání, instalaci nástroje, checks, implementaci, server startup ani databázovou migraci. Legacy běh musí fungovat bez migrace; jedna neblokující rada za invokaci může nabídnout správný příkaz.

1. Pod společnými adapters analyzovat skutečné task sekce a sestavit převodní plán. Jedna sekce vytvoří jeden Book, pojmenování a ID jsou deterministické.
2. Zachovat payload, title/emoji identifikaci, stav, prioritu, routing OR alternativy, časový instant, poznámky a dostupnou historii. Relativní reference přepočítat strukturálně, ne globálním nahrazováním v kódu a URL.
3. Opaque legacy tokeny převést na `RUNNER`, časové na `AFTER`; nehádát, který token je model nebo agent.
4. Převést všechny sekce jednoho zdrojového souboru, znovu přečíst nové Books a ověřit ekvivalenci normalizovaného významu.
5. Teprve poté vyřadit originál z aktivní fronty do neexekutivního archivu při zachování původních bytes a dostupnosti assets. Nelze archivovat originál, když část jeho sekcí selhala.
6. Úspěšnou migraci uložit jedním scoped lokálním commitem, pokud není `--no-commit`; push není implicitní.

Dry-run nesmí vytvořit adresář, lock/journal, source ID, soubor ani commit; návrhy drží v paměti. Reálná migrace musí používat mutační lease a recovery transaction s origin metadata/checksumy. Task s live claimem odmítne.

Při přerušení nesmějí být obě reprezentace nezávisle spustitelné. Runtime musí znát autoritativní reprezentaci podle migration provenance/journalu; nejednoznačné kopie blokuje. Opakovaná dokončená migrace nic neduplikuje ani necommituje znovu. Změněný source/destination, kolize ID nebo ztrátový konstrukt vyžaduje explicitní rozřešení, nikoli overwrite.

Neúplné, not-ready, failed a in-progress sekce se nesmějí převodem aktivovat. Starší coder bez Book podpory nové tasky neumí vykonat; kompatibilitu nelze slíbit i pro staré binaries. Nový init/authoring preferuje Books, existující custom šablony a skripty zůstanou zachovány.

## Související specifikace

- [Projektové cesty a zdroje tasků](workspace.md)
- [Legacy Markdown tasky](task-markdown.md)
- [Task Books](task-books.md)
- [Mutační lease, journal a recovery](recovery.md)
- [Kompatibilita a vědomé změny](compatibility.md)
