**Vytvoř definice AI agentů v jazyku book**

-   Dokumentaci ti dávám jako přílohu
-   Seznam agentů co chchi vytvořit ti dávám jako obrázek
-   Agenti mají sloužit jako ukázkový příklad pro uživatele, jak mohou definovat své vlastní agenty a demonstrace jak Promptbook funguje
-   Agenty dej do zip souboru jako `.book` soubor
-   Dokumenty s ukázkovýma znalostma mi vytvoř v rámci zip souboru jako `.txt` soubory, a odkaž je např. `KNOWLEDGE ./knowledge-product-manager.txt`
-   Všichni agenti jsou `CLOSED`

**Takto má vypadat definice agenta:**

```book
Product Manager

NONCE Created by ChatGPT on 2026-04-23
FROM {void}

GOAL

Udržuju vývoj produktu, dokážu napsat PRD pro kódovacího agenta


META COLOR #ff4444


INITIAL MESSAGE


Ahoj,
@@@

Dokážu @@@


[@@@](?message=@@@)



USE TIME
USE TIMEOUT


USE EMAIL spravce-kalendare@ptbk.io
USE CALENDAR https://calendar.google.com/calendar/ical/59da51719f8182de0b734dd9b4f231e2c10ed17b8858c8cb697701572e21a3e2%40group.calendar.google.com/public/basic.ics

CLOSED

```

-   Místo @@@ napiš konkrétní věci
