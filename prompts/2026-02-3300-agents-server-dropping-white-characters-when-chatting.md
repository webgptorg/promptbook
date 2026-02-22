[ ]

[✨🔰] Fix the missing white space characters in chat

-   When chatting it sometimes drops a white character, white space or new line.

**For example:**

```
Potřebuju z tebe dostat fakta. Podle nich ti řeknu, jestli řešíš přestupek, trestný čin (typicky ublížení na zdraví z nedbalosti) a  co dělat hned teď.

## 1) Co udělej okamžitě (když se to stalo dnes / před chvílí)
1. **Zavolej155** (pokud je zraněný nebo si nejsi jistý), a  **158**, pokud už policie na místě nebyla.
2. **Místo zajisti**, neodjížděj (odjezd může být průšvih).
3. **Nedohaduj se o vině** a  nic nepodepisuj bez přečtení (hlavně "uznání viny" apod.).
4. **Zdokumentuj**: fotky stop, polohy auta, brzdné stopy, poškození, osvětlení, počasí, značení, případní svědci.5. **Neřeš to "domluvou"** bez policie, pokud je **jakékoli zranění** - později se to obrátí proti tobě.

## 2) Klíčové: zranění a  alkohol- **Je soused zraněný?** (odřeniny / zhmoždění / zlomenina / hospitalizace?)
- **Byl jsi na alkoholu nebo drogách?** (i "jedno pivo")
Tohle zásadně rozhoduje, jestli půjde jen o přestupek/pojistku, nebo o trestní věc a  potenciálně zákaz řízení.

## 3) Teď mi odpověz na těchto 10 otázek (stručně, bodově)
1. **Kdy a  kde** se to stalo (obec/ulice, uvnitř obce)?
2. **Soused šel pěšky nebo jel na kole?** Byl na přechodu?
3. **Jaká byla rychlost** cca a  situace (tma, déšť, zatáčka, výjezd z dvora)?
4. **Zranění**: co přesně, byl odvoz do nemocnice?
5. **Volala se policie a  záchranka?** Máš číslo jednací / záznam?
6. **Dechová zkouška** proběhla? výsledek?
7. **Svědci / kamera** (dům, obchod, obecní kamera)?
8. **Tvoje pojištění**: povinné ručení máš?
9. **Co jsi řekl na místě** (přiznání, omluva, "neviděl jsem ho")?
10. **Škoda na autě / věcech** (odhad)?

## 4) Co typicky hrozí (bez cukrování)
- **Bez zranění**: často přestupek + pojistka; i tak může být pokuta a  body, podle porušení pravidel.
- **Se zraněním**: velmi snadno **trestní řízení z nedbalosti**. U těžšího zranění nebo alkoholu se to láme do tvrdších následků (zákaz řízení, vyšší tresty).
- **Útěk od nehody / neoznámení** je skoro vždy špatný nápad - bývá to přitěžující a  může to otevřít další problémy.

Napiš odpovědi na těch 10 bodů. Pak ti řeknu konkrétně, co čekat a  jak postupovat při výslechu/podání vysvětlení.
(Nečerpal jsem teď z žádného externího zdroje; potřebuji nejdřív fakta.)
```

-   When transmitting a chat stream replace the white spaces with special tokens, for example `[SPACE]`, `[NEWLINE]`, etc. and when rendering the chat stream on the frontend, replace these tokens back to white spaces.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of chat streaming before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)

---

[-]

[✨🔰] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🔰] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🔰] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
