[x] ~$1.58

[✨📰] Show that the GPT assistant is pending in UI

When the agent has a very huge book, the duration of the creation of the underlying GPT assistant is pretty long. It can take, for example, multiple minutes of waiting. This has terrible user experience because the user is waiting and waiting and waiting for the first response.

Make some look how the chips or tool chips are implemented. For example, how it looks when the agent is using a source engine, or when the agent is self-learning, or when the agent is doing some job and create similar mechanism, but not during the call and after call like a self-learning, but before the call. This chip should show something like "Preparing" or "Creating agents", and the user should clearly see that something is happening. They should see that "Oh, now I'm in the phase when the agent is preparing this". This will happen once, and then the GPT assistant is created. At the second call, the preparation won't show because the agent is already cached, but the UI will be much better.

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[x] ~$1.57

[✨📰] When the agent is being prepared, log more info.

-   The operation of the underlying OpenAI assistant can take multiple minutes.
-   During this time, it would be great to log more info about what is happening under the hood.
-   Mark logs with some special tag like `console.info('[🤰]',...)`
-   We need to get your info for making this process much quicker because the current speed is unacceptable.
-   You are not optimizing this process. You are now just logging what is happening in this process.
-   You can also report it into the chip "... Preparing agent..." on the UI If it doesn't require making some substantial changes.
-   You are working with the [Agents Server](apps/agents-server)

![alt text](prompts/screenshots/2026-01-0460-agents-server-pending-creating-assistant.png)
![alt text](prompts/screenshots/2026-01-0460-agents-server-pending-creating-assistant-1.png)

---

[x] ~$0.36

[✨📰] When creating the underlying GPT assistant of the agent, put the hashing key in the agent name.

-   Now the GPT assistants are 1:1 called like the agent.
-   Agent is names "My Agent", the underlying GPT assistant is also named "My Agent".
-   Change is such as the underlying GPT assistant is named like "My Agent - abcd1234" where "abcd1234" is some hashing key which is derived from the agents model requirements.
-   Use first 8 characters of the hashing key.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server) with the agent chat _(for example, [here](https://my-agent-server.com/agents/FVLv8APAf2S1WV/chat))_
-   Add the changes into the [changelog](changelog/_current-preversion.md)

![alt text](prompts/screenshots/2026-01-0460-agents-server-pending-creating-assistant-2.png)

---

[x] ~$0.00
[x] $1.89 - `claude-sonnet-4.5`
[x]

[✨📰] When creating the underlying GPT assistant of the agent, the caching is not working very well

-   The Assistant is sometimes cached, but very often it is unnecessarily re-created again and again.
-   The thing that the agent isnt cached properly but re-re-created again and again is indicated by "Preparing agent" chip under a chat message _(see the screenshot)_
-   You should use `preparedExternals` in `Agent` table - Store there the cached underlying GPT assistant id from the OpenAI
-   Store this assistant ID from the OpenAI first time agent is called and then reuse it for the next calls.
-   When the agent is called, check if there is already some cached underlying GPT assistant in `preparedExternals`
    -   If yes, check if the underlying GPT assistant with this id exists and is up-to-date with the agent requirements (hashing key)
        -   If yes, use it
        -   If not, create a new underlying GPT assistant, and store its id into `preparedExternals`
-   Purpose of `Agent.preparedExternals` is to store things like IDs created outside of the Agents Server, so we have connection between the agent and the underlying GPT assistant created in the OpenAI or some other system.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server) with the agent chat _(for example, [here](https://my-agent-server.com/agents/FVLv8APAf2S1WV/chat))_

![alt text](prompts/screenshots/2026-01-0460-agents-server-agents-taking-sooooooo-long-to-prepare-and-answer.png)
![alt text](prompts/screenshots/2026-01-0460-agents-server-agents-taking-sooooooo-long-to-prepare-and-answer-1.png)

---

[x] ~$1.07 by OpenAI Codex `gpt-5.2-codex`

[✨📰] Show the chip "... Preparing agent: Creating assistant ..." only on cache miss, when the `Agent.preparedExternals.openaiAssistantId` is used, do not show The agent is being prepared.

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server) with the agent chat _(for example, [here](https://my-agent-server.com/agents/FVLv8APAf2S1WV/chat))_

![alt text](prompts/screenshots/2026-01-0460-agents-server-agents-taking-sooooooo-long-to-prepare-and-answer.png)

---

[x] ~$1.04 by OpenAI Codex `gpt-5.2-codex`

[✨📰] Agent with large knowledgebase takes sooooooo long to prepare and answer, and often just ends up stucked

**This is the agent source:**

```book
Praha 13 2026-02-05


PERSONA Jsi asistent pro zaměstnance Prahy 13.
Odpovídáš v češtině a poskytujte užitečné informace o úředních postupech, projektech a službách Prahy 13. Buď profesionální, přátelský a nápomocný.

GOAL Máš pomáhat zaměstnancům úřadu Prahy 13 s prací a postupy. Tvým úkolem je pomoci a navést.

RULE Odpovídáte na otázky ohledně vnitřních dokumentů Prahy 13
RULE Odpovídáš v češtině
RULE Uvádíš zdroje, označuj místa v dokumentech odkud čerpáš
RULE Nepíšeš obecné postupy jak a co se má dít

Radíš konkrétnímu člověku v konkrétní situaci.
Např. pokud mu přišel email, nepiš obecný postup s datovkou.
Např. pokud řeší veřejnou zakázku s hodnotou X, nepíšeš o obecných postupech a pravidlech veřejných zakázek, ale o zakázce X.

RULE očíslované kroky postupu (stručný popis, vždy se lze dál dotazovat -
nechceme uživatele vyděsit dlouhým textem)
RULE návrh dalšího postupu, kde to bude možné
RULE připomenutí, na co nezapomenout
RULE návrh kontaktu na odbor, který danou problematiku řeší
+ uvádět zdroje pod jejich pravým jménem = žádné číslované zdroje jako 5:12
atp. Musí to být název vybraného dokumentu (např. Nařízení tajemníka
409/2025 - Ekonomická směrnice)

CONTEXT
Dovětkem každé otázky je "Jak postupovat"

Tvým cílem není pouze suše odpovědět na otázku, ale implikovat postup a řešení problému.

Odpovídáš co KONKRÉTNĚ má udělat zaměstnanec Prahy 13, nikoliv obecný postup co má být.


CONTEXT Důležitá nařízení / směrnice:

Nařízení tajemníka
360/2021 Pracovní řád ÚMČ Praha 13
329/2019 Provozní řád ÚMČ Praha 13
389/2024 Spisový řád ÚMČ Praha 13
409/2025 Ekonomická směrnice
378/2023
Postupy pro jednotné číslování smluv, dohod, objednávek a jejich náležitosti při vystavování, podepisování a archivaci. Správa v SW Ginis


Směrnice starosty
1/2025 Zadávání veřejných zakázek Městskou částí Praha 13 dle zákona č. 134/2016 Sb., o zadávání veřejných zakázek
1/2016 Pravidla pro přijímání petic, stížností, oznámení, podnětů a vyřizování podání na možná korupční jednání, podaných orgánům MČ Praha 13
1/2022 Uzavírání smluv a dohod městskou částí Praha 13
1/2023 O aplikaci zákona č. 340/2015 Sb., o zvláštních podmínkách účinnosti některých smluv, uveřejňování těchto smluv a o registru smluv (zákon o registru smluv) na Úřadu MČ Praha 13
2/2023 Přijímání a vyřizování žádostí o poskytnutí informací podle zákona č. 106/1999 Sb., o svobodném přístupu k informacím, ve znění pozdějších předpisů



SAMPLE

Takto ANO:

> Zkontrolujte, zda žádost obsahuje všechny povinné údaje podle zákona č. 106/1999 Sb.
<- Mluvíš na člověka nikoliv obecně
<- Jsi konkrétní a cituješ konkrétní zákon

Takto NE:

> Žádost bude zkontrolována, zda obsahuje všechny povinné údaje podle zákona.
<- Mluvíš co se obecně děje
<- Jsi vágní a nekonkrétní


META COLOR #3CAA3D
META IMAGE https://ptbk.io/k/a7/5002b/matrice-znaku-opravena-kopie.jpg


INITIAL MESSAGE
**Dobrý den, jsem Váš interní asistent pro vnitřní předpisy ÚMČ Praha 13.**

Mým úkolem je usnadnit Vám orientaci ve **směrnicích starosty** a **nařízeních tajemníka**. Popište mi, jakou situaci řešíte, a já pro Vás vyhledám správný postup.

**S čím Vám mohu v tuto chvíli poradit?**




KNOWLEDGE https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-r3eASWn0Kig20li4yEwhrbAnT6xEVo.pdf
KNOWLEDGE https://ptbk.io/k/nt-117-2003-otevreny-ohen-i9DAgAJCzZ3aBl6PSHhGqoXBWJybJo.pdf
KNOWLEDGE https://ptbk.io/k/nt-213-2011-inventarizace-NPQVRVY84VK8WPDuM1tUrDSTuuu7Uw.pdf
KNOWLEDGE https://ptbk.io/k/nt-220-2012-aplikace-zakona-o-dph-pUqdRxC55uPUj1RxX079sQuhbBqgzL.pdf
KNOWLEDGE https://ptbk.io/k/nt-242-2014-vystroj-ostrahy-radnice-P6eHXuc8VESvLJ8mRfVlpAOXyWm5IT.pdf
KNOWLEDGE https://ptbk.io/k/nt-243-2014-odpovednost-za-kontrolu-a-revize-elektrickych-zarizeni-ftg6W2PGYDQlEmtGI6o2q30McYEzDD.pdf
KNOWLEDGE https://ptbk.io/k/nt-255-2015-poskytovani-osobnich-ochrannych-pracovnich-prostredku-pgupxPh5986hkBb13cxC9YJm5l9rCo.pdf
KNOWLEDGE https://ptbk.io/k/nt-256-2015-inovace-73WthpbpNA1LHp6LfnjwoPsm3nRqlH.pdf
KNOWLEDGE https://ptbk.io/k/nt-257-2015-materialy-do-rmc-a-zmc-5pU3Wt90PEhgxf8kKDV1JeHPJxC5OH.pdf
KNOWLEDGE https://ptbk.io/k/nt-289-2018-adaptacni-proces-novych-zamestnancu-2hmtUytz1XqUqO06I2eEBrpCEeoT81.pdf
KNOWLEDGE https://ptbk.io/k/nt-290-2018-odpisovani-dlouhodobeho-majetku-OMOZI4p7bTQFpLtpfP6jMnTzVHvURF.pdf
KNOWLEDGE https://ptbk.io/k/nt-291-2018-transfery-FmpUE6zmhNTRAiMkQIjXLNxzhV0Tys.pdf
KNOWLEDGE https://ptbk.io/k/nt-299-2018-pr-pro-archiv-stav-YHUh6gVFZmIhtDUl8hcuZ31NrFHZJ4.pdf
KNOWLEDGE https://ptbk.io/k/nt-300-2018-pr-pro-s-208-RbUMb2jrZk6PPdueZxFbIQXLyaF0Pj.pdf
KNOWLEDGE https://ptbk.io/k/nt-301-2018-rad-ohlasovny-pozaru-YiAcUpOu1f95fUULf0j6aa3SwPREyw.pdf
KNOWLEDGE https://ptbk.io/k/nt-302-2018-pr-pro-mistnost-nahradniho-zdroje-el-UcTOZ0hd1Jbohx366mgA7xXOjE9dO8.pdf
KNOWLEDGE https://ptbk.io/k/nt-304-2018-mistni-rad-skladu-G3osILuBxmTEQECaFp4MxHrngV22WZ.pdf
KNOWLEDGE https://ptbk.io/k/nt-305-2018-dokumentace-o-zacleneni-zvysene-pozarni-nebezpeci-lglHcHhvolrIFyBYbmXWO3FSVOpTe6.pdf
KNOWLEDGE https://ptbk.io/k/nt-306-2018-pr-pro-budovu-radnice-Uk0krKCcKV6NUIycPixLQDaKd9Fpej.pdf
KNOWLEDGE https://ptbk.io/k/nt-308-2018-pozarni-rad-pro-pg-jGXpFZyCMEiGnMK1RjHUSMo6wx4HIz.pdf
KNOWLEDGE https://ptbk.io/k/nt-309-2018-pozarni-evakuacni-plan-x7GaYbYxJ0PxRRzbAtDr7UDCYZVX9b.pdf
KNOWLEDGE https://ptbk.io/k/nt-310-2018-dokumentace-zdolavani-pozaru-dKCPM8c1se8YlxhHBqvcMB03Lx9mq8.pdf
KNOWLEDGE https://ptbk.io/k/nt-311-2018-revizni-rad-GRsfZd6fT7TXLH2KVDcVtDJkiCYSQ3.pdf
KNOWLEDGE https://ptbk.io/k/nt-312-2018-cestovni-nahrady-KNXnQUQWoKwiEgTCpLSJDM5v8dLCy9.pdf
KNOWLEDGE https://ptbk.io/k/nt-312-2018-cestovni-nahrady-dodatek-6-dqedfZv6j077iBCVgr2hvBjgkVf9iw.pdf
KNOWLEDGE https://ptbk.io/k/nt-314-2018-kategorizace-pro-hpp-lwUIAhjV75X5Tw3kP4mXwpszWWKsWy.pdf
KNOWLEDGE https://ptbk.io/k/nt-315-2018-kategorizace-pro-dpp-a-dpc-gHOdjT167EYkpb4zTPMuyrwsacnsDL.pdf
KNOWLEDGE https://ptbk.io/k/nt-316-2018-zajisteni-vychovy-a-vzdelavani-v-oblasti-bozp-2BXyX55szqhqjsx1cLoI7zVrvGSwX5.pdf
KNOWLEDGE https://ptbk.io/k/nt-317-2018-prikazove-bloky-9pLPk4aFiAI54bJQNPa4r7h4QG2SjC.pdf
KNOWLEDGE https://ptbk.io/k/nt-319-2018-mistni-provozne-bezpecnostni-predpis-N6U1xYYA7zr9nNhZA25ZANtGQi4FpI.pdf
KNOWLEDGE https://ptbk.io/k/nt-320-2018-metodika-k-organizaci-kulturnich-akci-WhQshlsBHXXtPxK8DBl0Zy9bdjKXuN.pdf
KNOWLEDGE https://ptbk.io/k/nt-321-2018-pracovni-volno-bez-nahrady-yzcJxPMRDocvw22XMvnlndOIHsEezo.pdf
KNOWLEDGE https://ptbk.io/k/nt-324-2019-socialne-pravni-ochrana-deti-na-umc-p13-GXTnRdw3ZvzLpfq2Az0ZDq13Rkdmmf.pdf
KNOWLEDGE https://ptbk.io/k/nt-326-2019-organizace-autoprovozu-wo0SgC2VQV8JO2vUxHNRljz6us4mwx.pdf
KNOWLEDGE https://ptbk.io/k/nt-327-2019-telekomunikacni-zarizeni-cOKL6BGR011LJboijiP5W3EcGBg0yU.pdf
KNOWLEDGE https://ptbk.io/k/nt-329-2019-provozni-rad-umc-p-13-cH0FsV0t3CrGszkfPTJliVdGZCmJNk.pdf
KNOWLEDGE https://ptbk.io/k/nt-333-2020-oznaceni-uradu-pisemnosti-razitek-jUHogIhcNqYff43FqpXAUsIFBqbB7s.pdf
KNOWLEDGE https://ptbk.io/k/nt-334-2020-tehotne-kojici-zamestnankyne-7gpkBvtOKUwJ7eStbVAGEdJv0U2zGr.pdf
KNOWLEDGE https://ptbk.io/k/nt-335-2020-havarijni-plan-f5F929GO8c7ZTtOBmuRl0GWHCz0C7s.pdf
KNOWLEDGE https://ptbk.io/k/nt-336-2020-pracovni-urazy-xbN5eXPDMaKkCgQ2Tc0iIUG2oPTrQj.pdf
KNOWLEDGE https://ptbk.io/k/nt-337-2020-traumatologicky-plan-FR6KKI1gRfIBTqdyvOQwm7zl1QEPjn.pdf
KNOWLEDGE https://ptbk.io/k/nt-338-2020-pokyny-pro-cinnost-preventivni-pozarni-hlidky-NJwGQHqsQ9CS4YkuwxJRbOtFfOqXYp.pdf
KNOWLEDGE https://ptbk.io/k/nt-342-2020-tvorba-vnitrnich-predpisu-knCyryAju2onSAAh16KZpB17uATaIK.pdf
KNOWLEDGE https://ptbk.io/k/nt-344-2020-realizace-dotacnich-projektu-xq3UtsAlddr7h8uYjyOnRDIRSKCuci.pdf
KNOWLEDGE https://ptbk.io/k/nt-346-2020-pravidla-pro-komunikaci-g872TOometpnOrJEPVU4tmzJsD0FaL.pdf
KNOWLEDGE https://ptbk.io/k/nt-348-2020-ochrana-ou-zamestnancu-pMRLMmgWQeySo9ieEBq8i2kH8D2bDy.pdf
KNOWLEDGE https://ptbk.io/k/nt-353-2020-dan-z-pridane-hodnoty-vuLmWEmSywEf9tDrnJgpIf0ajP686i.pdf
KNOWLEDGE https://ptbk.io/k/nt-354-2021-ochrana-osobnich-udaju-v-prostredi-umc-praha-13-pG4z7RiFZqhhS8eRhWprrO5BZDeoq0.pdf
KNOWLEDGE https://ptbk.io/k/nt-357-2021-uplatnovani-sankci-u-mistnich-poplatku-umc-praha-13-K8ghlQ0FySsxRerjCllDG52IstblPY.pdf
KNOWLEDGE https://ptbk.io/k/nt-359-2021-projednavani-skod-a-likvidace-majetku-F0yw85tTbKov8GDobFq6uEbAneIELI.pdf
KNOWLEDGE https://ptbk.io/k/nt-360-2021-pracovni-rad-ApTKQElb229oD3b6UanHr8n8swnL6q.pdf
KNOWLEDGE https://ptbk.io/k/nt-363-2021-majetek-zLKvdNuY7FYBgv9j9AM0W3hJEd6CrU.pdf
KNOWLEDGE https://ptbk.io/k/nt-366-2022-eticky-kodex-dugA8qvhNRI61r8MPnfSBDeuYk9aNC.pdf
KNOWLEDGE https://ptbk.io/k/nt-367-2022-komunikace-pri-mimoradne-udalosti-jxHPbEcPNyPfN24idZLSA3W6NziIJ9.pdf
KNOWLEDGE https://ptbk.io/k/nt-368-2022-hodnoceni-zamestnancu-biFW7xLRU2cvOQea4Fo0qFHMwPX3lQ.pdf
KNOWLEDGE https://ptbk.io/k/nt-370-2022-bezpecnostni-smernice-le78hNbD9zDhFDgdB9ZooRJe9f6MCA.pdf
KNOWLEDGE https://ptbk.io/k/nt-371-2022-realna-hodnota-u-majetku-urceneho-k-prodeji-3zdR3oVuUdVRFCIIwC5CKAeTiPQiiQ.pdf
KNOWLEDGE https://ptbk.io/k/nt-374-2022-casove-rozliseni-74fwwFaUSzuRqAXtHSZLes8Sx8oOJO.pdf
KNOWLEDGE https://ptbk.io/k/nt-378-2023-postupy-pro-jednotne-cislovani-smluv-a-dohod-toKlFR5mDUSPw4I3aohEtADByZMc42.pdf
KNOWLEDGE https://ptbk.io/k/nt-379-2023-zajisteni-pracovnelekarskych-sluzeb-pro-zamestnance-umc-praha-13-1lZvecGVdtJ7O2HaPcXaKciczLrYzA.pdf
KNOWLEDGE https://ptbk.io/k/nt-386-2024-prirucka-isms-2024-OhaYcL2S5BVE02qGfesrjoShsYSNy0.pdf
KNOWLEDGE https://ptbk.io/k/nt-387-2024-evidence-prestupku-l7XXH1vihScqye4AiOwTK8jVtHieul.pdf
KNOWLEDGE https://ptbk.io/k/nt-388-2024-plan-inventur-na-rok-2024-xUyfWwruvAnchEsWR7TJzcf2MyEhmi.pdf
KNOWLEDGE https://ptbk.io/k/nt-389-2024-spisovy-rad-lzO0PHLbbXtQLsWtJP7tzrZcE93iPE.pdf
KNOWLEDGE https://ptbk.io/k/nt-390-2025-podpisovy-rad-BtFI2dxS7tNNRRs9N18NwECl2nfk4I.pdf
KNOWLEDGE https://ptbk.io/k/nt-391-2025-evidence-a-vymahani-pohledavek-evidence-a-vraceni-preplatku-VlYBEpej1t60HVGPoNOyakLJ6vZKLb.pdf
KNOWLEDGE https://ptbk.io/k/nt-392-2025-vzdelavani-KFATJoNIWCixfCDygBZ4py5HyylkAy.pdf
KNOWLEDGE https://ptbk.io/k/nt-393-2025-antidiskriminacni-pravidla-915le6mDxHu6j3fuK6KclvZwzVp8gd.pdf
KNOWLEDGE https://ptbk.io/k/nt-394-2025-pouziti-automatizovaneho-externiho-defibrilatoru-x1xJ7f7okupR7JVb2IKHVt8BDfk1Ug.pdf
KNOWLEDGE https://ptbk.io/k/nt-396-2025-ostraha-objektu-lUhphwErwcf1gxLyWpwfBHix6Y1gId.pdf
KNOWLEDGE https://ptbk.io/k/nt-397-2025-prijimani-novych-zamestnancu-ngxp3Wems2ICtECvihCBnUbvb3KtDH.pdf
KNOWLEDGE https://ptbk.io/k/nt-398-2025-postup-pri-realizaci-vyberovych-rizeni-8VePoODgg8D7lYhXLFvOC0s0Gu4jaY.pdf
KNOWLEDGE https://ptbk.io/k/nt-399-2025-jina-vydelecna-cinnost-uredniku-HtA0jcx8COhLbyqlKdMzx7uTiKhymW.pdf
KNOWLEDGE https://ptbk.io/k/nt-400-2025-platova-politika-umc-p13-zJX9WqS1yGN8YCqL000fujpZ6vfVPF.pdf
KNOWLEDGE https://ptbk.io/k/nt-400-2025-d-platova-politika-umc-p13-dodatek-1-j8Qbb0GrT0FYmXXVJAcRSSbj82Kh4M.pdf
KNOWLEDGE https://ptbk.io/k/nt-401-2025-uhrada-stravneho-iSf0CZttVsq38rKY4pm0vN0Vgo0xTO.pdf
KNOWLEDGE https://ptbk.io/k/nt-402-2025-kontroly-zamestnancu-na-neschopence-3APOCr2IOmeUGDYccXdkNr9gMgLp2g.pdf
KNOWLEDGE https://ptbk.io/k/nt-404-2025-pokladni-sluzba-Nzm7l7k8aya7gTLpVUSkuIdLAL0e04.pdf
KNOWLEDGE https://ptbk.io/k/nt-405-2025-zajisteni-evidence-dodrzovani-a-vyuzivani-pracovni-doby-JTgTyYfwUynr9T9qp8OI7p10RjT91u.pdf
KNOWLEDGE https://ptbk.io/k/nt-406-2025-podrozvaha-a-rezervy-oYGi5ZbONRrGBgWfqpiDKKZC5QT32J.pdf
KNOWLEDGE https://ptbk.io/k/nt-407-2025-pokladni-sluzba-ReNjhUkiO7tXKuLQUZN27Cwu1OfMrz.pdf
KNOWLEDGE https://ptbk.io/k/nt-408-2025-obeh-rozpoctovych-a-ucetnich-dokladu-1ywNhpqlirreIhQTVa6Yu7lxPlroy9.pdf
KNOWLEDGE https://ptbk.io/k/nt-409-2025-ekonomicka-smernice-JRo87v7JBwK2CziRWvADyfUsc9cm4K.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2016-dodatek-c-1-k-pravidla-pro-prijimani-petic-stiznosti-Xx0jFHTrSNxFbcluYbteAVJlTrbIB6.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2016-pravidla-pro-prijimani-petic-stiznosti-oznameni-podnetu-a-vyrizovani-podani-na-mozna-korupcni-jednani-podanych-organum-mc-p13-yLN5JxPfyQTTN6OZW3vYfj34X5vuim.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2017-dodatek-c-1-zadavani-vz-Po35Eg5q9Kfz6idD7Du0ERBm4sVXv5.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2017-dodatek-c-2-zadavani-vz-6iJ2oNtHBNTj7S8EzUIP29SaxjkJcp.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2017-dodatek-c-3-zadavani-vz-cJki0d4775xpxK8ePxBN4l662PvGL3.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2017-dodatek-c-4-zadavani-vz-I8KsZg4ulQ3M8vocsC5iFGqMmNOi4v.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2017-priloha-c-1-5-zadavani-vz-Ojl0jsNbQGXZiHpXEbeaBFaGXpIF7j.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2017-zadavani-vz-mc-praha-13-dle-zakona-c-134-2016-sb-o-zadavani-vz-qOk2nlHP3ae9F0zWx1nyzzrC04O7al.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2018-gdpr-sd7H6Ha0s6n6lkReI2tYMBkzQPirHj.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2020-statut-interniho-auditu-umc-praha-13-Y33H8y83edfjWjX7YvLc186uLdqI9S.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2022-uzavirani-smluv-a-dohod-mestskou-casti-praha-13-YmgaoOwnHERTPdPXEakCeNL45fQ3qa.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2023-o-aplikaci-zakona-c-34-2015-sb-zakon-o-registru-smluv-wJoCuRDZGkVEc2VFLG27FeVehmPPyE.pdf
KNOWLEDGE https://ptbk.io/k/ss-1-2024-ochrana-oznamovatelu-YygJqRvzN0EaP1nz7ozoKqXUcrbLtN.pdf
KNOWLEDGE https://ptbk.io/k/ss-2-2015-dodatek-c-1-postupy-pro-organizovani-a-provadeni-nasledne-verejnospravni-kontroly-po-ovnWPQRavbRbyMGgZa90xIqEk9lT5P.pdf
KNOWLEDGE https://ptbk.io/k/ss-2-2015-dodatek-c-2-postupy-pro-organizovani-a-provadeni-nasledne-verejnospravni-kontroly-po-vMtQbX4omeD84uPPCSZqPC9vqUagCw.pdf
KNOWLEDGE https://ptbk.io/k/ss-2-2015-postupy-pro-organizovani-a-prov-verejnospravni-kontroly-pris-org-jXT7QiQyIMOfQKTvDJcVPlWIojxVjO.pdf
KNOWLEDGE https://ptbk.io/k/ss-2-2019-rizeni-rizik-priloha-c-1-metodika-analyzy-rizik-VEBIMhC3D22MVBdK89OeqfC8N8CmgB.pdf
KNOWLEDGE https://ptbk.io/k/ss-2-2019-rizeni-rizik-priloha-c-2-vzor-karty-agendy-T5HJ1FvGll7UByska9ADpAEKEbEJfu.pdf
KNOWLEDGE https://ptbk.io/k/ss-2-2019-rizeni-rizik-QmTDXjDflGTmX2iKg9F7Qyo4QgS98q.pdf
KNOWLEDGE https://ptbk.io/k/ss-2-2023-informace-106-syRjDruyxkspiYvNqDM2LYS0NS2aGM.pdf
KNOWLEDGE https://ptbk.io/k/ss-3-2019-vnitrni-kontrolni-system-WYZcHnXWvOlCbGaY0R9dhtVmujeLf2.pdf
KNOWLEDGE https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-dodatek-1-kzEv2vkRhFnIRfdm2lNWDVrpgbOIM7.pdf


CLOSED

```

**This is log from Vercel**

```log

[BJtSoMr3rfn8rs] / status=200

[🐱‍🚀] Returning cached OpenAiAssistantExecutionTools
[🤰] Resolving assistant cache key {
  agentName: 'BJtSoMr3rfn8rs',
  cacheKey: 'fc201453ae79e71f451e8b4e9c93a6776363e24b40b5dd86fec23aa607020b78',
  includeDynamicContext: true,
  instructionsLength: 218,
  baseSourceLength: 14245,
  agentId: 'BJtSoMr3rfn8rs'
}
[🤰] Assistant cache hit (Agent table) {
  agentId: 'BJtSoMr3rfn8rs',
  cacheKey: 'fc201453ae79e71f451e8b4e9c93a6776363e24b40b5dd86fec23aa607020b78',
  assistantId: 'asst_59Ft3LZbRidr4h8xI6A2VDtP'
}
[🤰] Assistant cache hit {
  agentName: 'BJtSoMr3rfn8rs',
  cacheKey: 'fc201453ae79e71f451e8b4e9c93a6776363e24b40b5dd86fec23aa607020b78',
  assistantId: 'asst_59Ft3LZbRidr4h8xI6A2VDtP'
}
You have not provided any `LlmExecutionTools`
This means that you won't be able to execute any prompts that require large language models like GPT-4 or Anthropic's Claude.

Technically, it's not an error, but it's probably not what you want because it does not make sense to use Promptbook without language models.
[🤰] Preparing agent model requirements { agent: 'Praha 13 2026-02-05' }
[🤰] Available models resolved for agent { agent: 'Praha 13 2026-02-05', modelCount: 121, elapsedMs: 356 }
[🤰] Agent model requirements ready { agent: 'Praha 13 2026-02-05', elapsedMs: 12, totalElapsedMs: 381 }
!!!! promptWithAgentModelRequirements: {
  title: 'Chat with agent BJtSoMr3rfn8rs',
  parameters: {},
  modelRequirements: {
    modelVariant: 'CHAT',
    systemMessage: 'You are Praha 13 2026-02-05\n' +
      'Jsi asistent pro zaměstnance Prahy 13.\n' +
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
      'Postupy pro jednotné číslování smluv, dohod, objednávek a jejich náležitosti při vystavování, podepisování a archivaci. Správa v SW Ginis\n' +
      '\n' +
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
      'Knowledge Source URL: https://ptbk.io/k/nt-220-2012-aplikace-zakona-o-dph-pUqdRxC55uPUj1RxX079sQuhbBqgzL.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-242-2014-vystroj-ostrahy-radnice-P6eHXuc8VESvLJ8mRfVlpAOXyWm5IT.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-243-2014-odpovednost-za-kontrolu-a-revize-elektrickych-zarizeni-ftg6W2PGYDQlEmtGI6o2q30McYEzDD.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-255-2015-poskytovani-osobnich-ochrannych-pracovnich-prostredku-pgupxPh5986hkBb13cxC9YJm5l9rCo.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-256-2015-inovace-73WthpbpNA1LHp6LfnjwoPsm3nRqlH.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-257-2015-materialy-do-rmc-a-zmc-5pU3Wt90PEhgxf8kKDV1JeHPJxC5OH.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-289-2018-adaptacni-proces-novych-zamestnancu-2hmtUytz1XqUqO06I2eEBrpCEeoT81.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-290-2018-odpisovani-dlouhodobeho-majetku-OMOZI4p7bTQFpLtpfP6jMnTzVHvURF.pdf (will be processed for retrieval during chat)\n' +
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
      'Knowledge Source URL: https://ptbk.io/k/nt-306-2018-pr-pro-budovu-radnice-Uk0krKCcKV6NUIycPixLQDaKd9Fpej.pdf (will be processed for retrieval during chat)\n' +
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
      'Knowledge Source URL: https://ptbk.io/k/nt-316-2018-zajisteni-vychovy-a-vzdelavani-v-oblasti-bozp-2BXyX55szqhqjsx1cLoI7zVrvGSwX5.pdf (will be processed for retrieval during chat)\n' +
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
      'Knowledge Source URL: https://ptbk.io/k/nt-329-2019-provozni-rad-umc-p-13-cH0FsV0t3CrGszkfPTJliVdGZCmJNk.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-333-2020-oznaceni-uradu-pisemnosti-razitek-jUHogIhcNqYff43FqpXAUsIFBqbB7s.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-334-2020-tehotne-kojici-zamestnankyne-7gpkBvtOKUwJ7eStbVAGEdJv0U2zGr.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-335-2020-havarijni-plan-f5F929GO8c7ZTtOBmuRl0GWHCz0C7s.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-336-2020-pracovni-urazy-xbN5eXPDMaKkCgQ2Tc0iIUG2oPTrQj.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-337-2020-traumatologicky-plan-FR6KKI1gRfIBTqdyvOQwm7zl1QEPjn.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-338-2020-pokyny-pro-cinnost-preventivni-pozarni-hlidky-NJwGQHqsQ9CS4YkuwxJRbOtFfOqXYp.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-342-2020-tvorba-vnitrnich-predpisu-knCyryAju2onSAAh16KZpB17uATaIK.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-344-2020-realizace-dotacnich-projektu-xq3UtsAlddr7h8uYjyOnRDIRSKCuci.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge Source URL: https://ptbk.io/k/nt-346-2020-pravidla-pro-komunikaci-g872TOometpnOrJEPVU4tmzJsD0FaL.pdf (will be processed for retrieval during chat)\n' +
      '\n' +
      'Knowledge S'... 10647 more characters,
    modelName: 'gemini-2.5-flash-lite',
    temperature: 0.7,
    topP: 0.9,
    topK: 50,
    metadata: {
      agentName: 'Praha 13 2026-02-05',
      PERSONA: 'Jsi asistent pro zaměstnance Prahy 13.\n' +
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
  content: 'Ahoj',
  thread: [
    {
      id: 'user_1770287841109',
      createdAt: '2026-02-05T10:37:21.109Z',
      sender: 'USER',
      content: 'Ahoj',
      isComplete: true,
      attachments: []
    }
  ]
}
[🤰] Creating new OpenAI Assistant { agent: 'Praha 13 2026-02-05' }
[🤰] Starting OpenAI assistant creation {
  name: 'Praha 13 2026-02-05',
  knowledgeSourcesCount: 105,
  toolsCount: 0,
  instructionsLength: 20647
}
[🤰] Creating vector store with knowledge sources { name: 'Praha 13 2026-02-05', knowledgeSourcesCount: 105 }
[🤰] Vector store created { vectorStoreId: 'vs_698472e3b1fc8191b1e5953c0c68c3eb' }
[🤰] Processing knowledge source {
  index: 1,
  total: 105,
  source: 'https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-r3eASWn0Kig20li4yEwhrbAnT6xEVo.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 2,
  total: 105,
  source: 'https://ptbk.io/k/nt-117-2003-otevreny-ohen-i9DAgAJCzZ3aBl6PSHhGqoXBWJybJo.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 3,
  total: 105,
  source: 'https://ptbk.io/k/nt-213-2011-inventarizace-NPQVRVY84VK8WPDuM1tUrDSTuuu7Uw.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 4,
  total: 105,
  source: 'https://ptbk.io/k/nt-220-2012-aplikace-zakona-o-dph-pUqdRxC55uPUj1RxX079sQuhbBqgzL.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 5,
  total: 105,
  source: 'https://ptbk.io/k/nt-242-2014-vystroj-ostrahy-radnice-P6eHXuc8VESvLJ8mRfVlpAOXyWm5IT.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 6,
  total: 105,
  source: 'https://ptbk.io/k/nt-243-2014-odpovednost-za-kontrolu-a-revize-elektrickych-zarizeni-ftg6W2PGYDQlEmtGI6o2q30McYEzDD.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 7,
  total: 105,
  source: 'https://ptbk.io/k/nt-255-2015-poskytovani-osobnich-ochrannych-pracovnich-prostredku-pgupxPh5986hkBb13cxC9YJm5l9rCo.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 8,
  total: 105,
  source: 'https://ptbk.io/k/nt-256-2015-inovace-73WthpbpNA1LHp6LfnjwoPsm3nRqlH.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 9,
  total: 105,
  source: 'https://ptbk.io/k/nt-257-2015-materialy-do-rmc-a-zmc-5pU3Wt90PEhgxf8kKDV1JeHPJxC5OH.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 10,
  total: 105,
  source: 'https://ptbk.io/k/nt-289-2018-adaptacni-proces-novych-zamestnancu-2hmtUytz1XqUqO06I2eEBrpCEeoT81.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 11,
  total: 105,
  source: 'https://ptbk.io/k/nt-290-2018-odpisovani-dlouhodobeho-majetku-OMOZI4p7bTQFpLtpfP6jMnTzVHvURF.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 12,
  total: 105,
  source: 'https://ptbk.io/k/nt-291-2018-transfery-FmpUE6zmhNTRAiMkQIjXLNxzhV0Tys.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 13,
  total: 105,
  source: 'https://ptbk.io/k/nt-299-2018-pr-pro-archiv-stav-YHUh6gVFZmIhtDUl8hcuZ31NrFHZJ4.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 14,
  total: 105,
  source: 'https://ptbk.io/k/nt-300-2018-pr-pro-s-208-RbUMb2jrZk6PPdueZxFbIQXLyaF0Pj.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 15,
  total: 105,
  source: 'https://ptbk.io/k/nt-301-2018-rad-ohlasovny-pozaru-YiAcUpOu1f95fUULf0j6aa3SwPREyw.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 16,
  total: 105,
  source: 'https://ptbk.io/k/nt-302-2018-pr-pro-mistnost-nahradniho-zdroje-el-UcTOZ0hd1Jbohx366mgA7xXOjE9dO8.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 17,
  total: 105,
  source: 'https://ptbk.io/k/nt-304-2018-mistni-rad-skladu-G3osILuBxmTEQECaFp4MxHrngV22WZ.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 18,
  total: 105,
  source: 'https://ptbk.io/k/nt-305-2018-dokumentace-o-zacleneni-zvysene-pozarni-nebezpeci-lglHcHhvolrIFyBYbmXWO3FSVOpTe6.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 19,
  total: 105,
  source: 'https://ptbk.io/k/nt-306-2018-pr-pro-budovu-radnice-Uk0krKCcKV6NUIycPixLQDaKd9Fpej.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 20,
  total: 105,
  source: 'https://ptbk.io/k/nt-308-2018-pozarni-rad-pro-pg-jGXpFZyCMEiGnMK1RjHUSMo6wx4HIz.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 21,
  total: 105,
  source: 'https://ptbk.io/k/nt-309-2018-pozarni-evakuacni-plan-x7GaYbYxJ0PxRRzbAtDr7UDCYZVX9b.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 22,
  total: 105,
  source: 'https://ptbk.io/k/nt-310-2018-dokumentace-zdolavani-pozaru-dKCPM8c1se8YlxhHBqvcMB03Lx9mq8.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 23,
  total: 105,
  source: 'https://ptbk.io/k/nt-311-2018-revizni-rad-GRsfZd6fT7TXLH2KVDcVtDJkiCYSQ3.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 24,
  total: 105,
  source: 'https://ptbk.io/k/nt-312-2018-cestovni-nahrady-KNXnQUQWoKwiEgTCpLSJDM5v8dLCy9.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 25,
  total: 105,
  source: 'https://ptbk.io/k/nt-312-2018-cestovni-nahrady-dodatek-6-dqedfZv6j077iBCVgr2hvBjgkVf9iw.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 26,
  total: 105,
  source: 'https://ptbk.io/k/nt-314-2018-kategorizace-pro-hpp-lwUIAhjV75X5Tw3kP4mXwpszWWKsWy.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 27,
  total: 105,
  source: 'https://ptbk.io/k/nt-315-2018-kategorizace-pro-dpp-a-dpc-gHOdjT167EYkpb4zTPMuyrwsacnsDL.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 28,
  total: 105,
  source: 'https://ptbk.io/k/nt-316-2018-zajisteni-vychovy-a-vzdelavani-v-oblasti-bozp-2BXyX55szqhqjsx1cLoI7zVrvGSwX5.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 29,
  total: 105,
  source: 'https://ptbk.io/k/nt-317-2018-prikazove-bloky-9pLPk4aFiAI54bJQNPa4r7h4QG2SjC.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 30,
  total: 105,
  source: 'https://ptbk.io/k/nt-319-2018-mistni-provozne-bezpecnostni-predpis-N6U1xYYA7zr9nNhZA25ZANtGQi4FpI.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 31,
  total: 105,
  source: 'https://ptbk.io/k/nt-320-2018-metodika-k-organizaci-kulturnich-akci-WhQshlsBHXXtPxK8DBl0Zy9bdjKXuN.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 32,
  total: 105,
  source: 'https://ptbk.io/k/nt-321-2018-pracovni-volno-bez-nahrady-yzcJxPMRDocvw22XMvnlndOIHsEezo.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 33,
  total: 105,
  source: 'https://ptbk.io/k/nt-324-2019-socialne-pravni-ochrana-deti-na-umc-p13-GXTnRdw3ZvzLpfq2Az0ZDq13Rkdmmf.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 34,
  total: 105,
  source: 'https://ptbk.io/k/nt-326-2019-organizace-autoprovozu-wo0SgC2VQV8JO2vUxHNRljz6us4mwx.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 35,
  total: 105,
  source: 'https://ptbk.io/k/nt-327-2019-telekomunikacni-zarizeni-cOKL6BGR011LJboijiP5W3EcGBg0yU.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 36,
  total: 105,
  source: 'https://ptbk.io/k/nt-329-2019-provozni-rad-umc-p-13-cH0FsV0t3CrGszkfPTJliVdGZCmJNk.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 37,
  total: 105,
  source: 'https://ptbk.io/k/nt-333-2020-oznaceni-uradu-pisemnosti-razitek-jUHogIhcNqYff43FqpXAUsIFBqbB7s.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 38,
  total: 105,
  source: 'https://ptbk.io/k/nt-334-2020-tehotne-kojici-zamestnankyne-7gpkBvtOKUwJ7eStbVAGEdJv0U2zGr.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 39,
  total: 105,
  source: 'https://ptbk.io/k/nt-335-2020-havarijni-plan-f5F929GO8c7ZTtOBmuRl0GWHCz0C7s.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 40,
  total: 105,
  source: 'https://ptbk.io/k/nt-336-2020-pracovni-urazy-xbN5eXPDMaKkCgQ2Tc0iIUG2oPTrQj.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 41,
  total: 105,
  source: 'https://ptbk.io/k/nt-337-2020-traumatologicky-plan-FR6KKI1gRfIBTqdyvOQwm7zl1QEPjn.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 42,
  total: 105,
  source: 'https://ptbk.io/k/nt-338-2020-pokyny-pro-cinnost-preventivni-pozarni-hlidky-NJwGQHqsQ9CS4YkuwxJRbOtFfOqXYp.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 43,
  total: 105,
  source: 'https://ptbk.io/k/nt-342-2020-tvorba-vnitrnich-predpisu-knCyryAju2onSAAh16KZpB17uATaIK.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 44,
  total: 105,
  source: 'https://ptbk.io/k/nt-344-2020-realizace-dotacnich-projektu-xq3UtsAlddr7h8uYjyOnRDIRSKCuci.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 45,
  total: 105,
  source: 'https://ptbk.io/k/nt-346-2020-pravidla-pro-komunikaci-g872TOometpnOrJEPVU4tmzJsD0FaL.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 46,
  total: 105,
  source: 'https://ptbk.io/k/nt-348-2020-ochrana-ou-zamestnancu-pMRLMmgWQeySo9ieEBq8i2kH8D2bDy.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 47,
  total: 105,
  source: 'https://ptbk.io/k/nt-353-2020-dan-z-pridane-hodnoty-vuLmWEmSywEf9tDrnJgpIf0ajP686i.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 48,
  total: 105,
  source: 'https://ptbk.io/k/nt-354-2021-ochrana-osobnich-udaju-v-prostredi-umc-praha-13-pG4z7RiFZqhhS8eRhWprrO5BZDeoq0.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 49,
  total: 105,
  source: 'https://ptbk.io/k/nt-357-2021-uplatnovani-sankci-u-mistnich-poplatku-umc-praha-13-K8ghlQ0FySsxRerjCllDG52IstblPY.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 50,
  total: 105,
  source: 'https://ptbk.io/k/nt-359-2021-projednavani-skod-a-likvidace-majetku-F0yw85tTbKov8GDobFq6uEbAneIELI.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 51,
  total: 105,
  source: 'https://ptbk.io/k/nt-360-2021-pracovni-rad-ApTKQElb229oD3b6UanHr8n8swnL6q.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 52,
  total: 105,
  source: 'https://ptbk.io/k/nt-363-2021-majetek-zLKvdNuY7FYBgv9j9AM0W3hJEd6CrU.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 53,
  total: 105,
  source: 'https://ptbk.io/k/nt-366-2022-eticky-kodex-dugA8qvhNRI61r8MPnfSBDeuYk9aNC.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 54,
  total: 105,
  source: 'https://ptbk.io/k/nt-367-2022-komunikace-pri-mimoradne-udalosti-jxHPbEcPNyPfN24idZLSA3W6NziIJ9.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 55,
  total: 105,
  source: 'https://ptbk.io/k/nt-368-2022-hodnoceni-zamestnancu-biFW7xLRU2cvOQea4Fo0qFHMwPX3lQ.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 56,
  total: 105,
  source: 'https://ptbk.io/k/nt-370-2022-bezpecnostni-smernice-le78hNbD9zDhFDgdB9ZooRJe9f6MCA.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 57,
  total: 105,
  source: 'https://ptbk.io/k/nt-371-2022-realna-hodnota-u-majetku-urceneho-k-prodeji-3zdR3oVuUdVRFCIIwC5CKAeTiPQiiQ.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 58,
  total: 105,
  source: 'https://ptbk.io/k/nt-374-2022-casove-rozliseni-74fwwFaUSzuRqAXtHSZLes8Sx8oOJO.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 59,
  total: 105,
  source: 'https://ptbk.io/k/nt-378-2023-postupy-pro-jednotne-cislovani-smluv-a-dohod-toKlFR5mDUSPw4I3aohEtADByZMc42.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 60,
  total: 105,
  source: 'https://ptbk.io/k/nt-379-2023-zajisteni-pracovnelekarskych-sluzeb-pro-zamestnance-umc-praha-13-1lZvecGVdtJ7O2HaPcXaKciczLrYzA.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 61,
  total: 105,
  source: 'https://ptbk.io/k/nt-386-2024-prirucka-isms-2024-OhaYcL2S5BVE02qGfesrjoShsYSNy0.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 62,
  total: 105,
  source: 'https://ptbk.io/k/nt-387-2024-evidence-prestupku-l7XXH1vihScqye4AiOwTK8jVtHieul.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 63,
  total: 105,
  source: 'https://ptbk.io/k/nt-388-2024-plan-inventur-na-rok-2024-xUyfWwruvAnchEsWR7TJzcf2MyEhmi.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 64,
  total: 105,
  source: 'https://ptbk.io/k/nt-389-2024-spisovy-rad-lzO0PHLbbXtQLsWtJP7tzrZcE93iPE.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 65,
  total: 105,
  source: 'https://ptbk.io/k/nt-390-2025-podpisovy-rad-BtFI2dxS7tNNRRs9N18NwECl2nfk4I.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 66,
  total: 105,
  source: 'https://ptbk.io/k/nt-391-2025-evidence-a-vymahani-pohledavek-evidence-a-vraceni-preplatku-VlYBEpej1t60HVGPoNOyakLJ6vZKLb.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 67,
  total: 105,
  source: 'https://ptbk.io/k/nt-392-2025-vzdelavani-KFATJoNIWCixfCDygBZ4py5HyylkAy.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 68,
  total: 105,
  source: 'https://ptbk.io/k/nt-393-2025-antidiskriminacni-pravidla-915le6mDxHu6j3fuK6KclvZwzVp8gd.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 69,
  total: 105,
  source: 'https://ptbk.io/k/nt-394-2025-pouziti-automatizovaneho-externiho-defibrilatoru-x1xJ7f7okupR7JVb2IKHVt8BDfk1Ug.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 70,
  total: 105,
  source: 'https://ptbk.io/k/nt-396-2025-ostraha-objektu-lUhphwErwcf1gxLyWpwfBHix6Y1gId.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 71,
  total: 105,
  source: 'https://ptbk.io/k/nt-397-2025-prijimani-novych-zamestnancu-ngxp3Wems2ICtECvihCBnUbvb3KtDH.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 72,
  total: 105,
  source: 'https://ptbk.io/k/nt-398-2025-postup-pri-realizaci-vyberovych-rizeni-8VePoODgg8D7lYhXLFvOC0s0Gu4jaY.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 73,
  total: 105,
  source: 'https://ptbk.io/k/nt-399-2025-jina-vydelecna-cinnost-uredniku-HtA0jcx8COhLbyqlKdMzx7uTiKhymW.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 74,
  total: 105,
  source: 'https://ptbk.io/k/nt-400-2025-platova-politika-umc-p13-zJX9WqS1yGN8YCqL000fujpZ6vfVPF.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 75,
  total: 105,
  source: 'https://ptbk.io/k/nt-400-2025-d-platova-politika-umc-p13-dodatek-1-j8Qbb0GrT0FYmXXVJAcRSSbj82Kh4M.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 76,
  total: 105,
  source: 'https://ptbk.io/k/nt-401-2025-uhrada-stravneho-iSf0CZttVsq38rKY4pm0vN0Vgo0xTO.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 77,
  total: 105,
  source: 'https://ptbk.io/k/nt-402-2025-kontroly-zamestnancu-na-neschopence-3APOCr2IOmeUGDYccXdkNr9gMgLp2g.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 78,
  total: 105,
  source: 'https://ptbk.io/k/nt-404-2025-pokladni-sluzba-Nzm7l7k8aya7gTLpVUSkuIdLAL0e04.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 79,
  total: 105,
  source: 'https://ptbk.io/k/nt-405-2025-zajisteni-evidence-dodrzovani-a-vyuzivani-pracovni-doby-JTgTyYfwUynr9T9qp8OI7p10RjT91u.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 80,
  total: 105,
  source: 'https://ptbk.io/k/nt-406-2025-podrozvaha-a-rezervy-oYGi5ZbONRrGBgWfqpiDKKZC5QT32J.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 81,
  total: 105,
  source: 'https://ptbk.io/k/nt-407-2025-pokladni-sluzba-ReNjhUkiO7tXKuLQUZN27Cwu1OfMrz.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 82,
  total: 105,
  source: 'https://ptbk.io/k/nt-408-2025-obeh-rozpoctovych-a-ucetnich-dokladu-1ywNhpqlirreIhQTVa6Yu7lxPlroy9.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 83,
  total: 105,
  source: 'https://ptbk.io/k/nt-409-2025-ekonomicka-smernice-JRo87v7JBwK2CziRWvADyfUsc9cm4K.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 84,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2016-dodatek-c-1-k-pravidla-pro-prijimani-petic-stiznosti-Xx0jFHTrSNxFbcluYbteAVJlTrbIB6.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 85,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2016-pravidla-pro-prijimani-petic-stiznosti-oznameni-podnetu-a-vyrizovani-podani-na-mozna-korupcni-jednani-podanych-organum-mc-p13-yLN5JxPfyQTTN6OZW3vYfj34X5vuim.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 86,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-1-zadavani-vz-Po35Eg5q9Kfz6idD7Du0ERBm4sVXv5.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 87,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-2-zadavani-vz-6iJ2oNtHBNTj7S8EzUIP29SaxjkJcp.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 88,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-3-zadavani-vz-cJki0d4775xpxK8ePxBN4l662PvGL3.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 89,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2017-dodatek-c-4-zadavani-vz-I8KsZg4ulQ3M8vocsC5iFGqMmNOi4v.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 90,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2017-priloha-c-1-5-zadavani-vz-Ojl0jsNbQGXZiHpXEbeaBFaGXpIF7j.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 91,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2017-zadavani-vz-mc-praha-13-dle-zakona-c-134-2016-sb-o-zadavani-vz-qOk2nlHP3ae9F0zWx1nyzzrC04O7al.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 92,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2018-gdpr-sd7H6Ha0s6n6lkReI2tYMBkzQPirHj.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 93,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2020-statut-interniho-auditu-umc-praha-13-Y33H8y83edfjWjX7YvLc186uLdqI9S.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 94,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2022-uzavirani-smluv-a-dohod-mestskou-casti-praha-13-YmgaoOwnHERTPdPXEakCeNL45fQ3qa.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 95,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2023-o-aplikaci-zakona-c-34-2015-sb-zakon-o-registru-smluv-wJoCuRDZGkVEc2VFLG27FeVehmPPyE.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 96,
  total: 105,
  source: 'https://ptbk.io/k/ss-1-2024-ochrana-oznamovatelu-YygJqRvzN0EaP1nz7ozoKqXUcrbLtN.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 97,
  total: 105,
  source: 'https://ptbk.io/k/ss-2-2015-dodatek-c-1-postupy-pro-organizovani-a-provadeni-nasledne-verejnospravni-kontroly-po-ovnWPQRavbRbyMGgZa90xIqEk9lT5P.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 98,
  total: 105,
  source: 'https://ptbk.io/k/ss-2-2015-dodatek-c-2-postupy-pro-organizovani-a-provadeni-nasledne-verejnospravni-kontroly-po-vMtQbX4omeD84uPPCSZqPC9vqUagCw.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 99,
  total: 105,
  source: 'https://ptbk.io/k/ss-2-2015-postupy-pro-organizovani-a-prov-verejnospravni-kontroly-pris-org-jXT7QiQyIMOfQKTvDJcVPlWIojxVjO.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 100,
  total: 105,
  source: 'https://ptbk.io/k/ss-2-2019-rizeni-rizik-priloha-c-1-metodika-analyzy-rizik-VEBIMhC3D22MVBdK89OeqfC8N8CmgB.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 101,
  total: 105,
  source: 'https://ptbk.io/k/ss-2-2019-rizeni-rizik-priloha-c-2-vzor-karty-agendy-T5HJ1FvGll7UByska9ADpAEKEbEJfu.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 102,
  total: 105,
  source: 'https://ptbk.io/k/ss-2-2019-rizeni-rizik-QmTDXjDflGTmX2iKg9F7Qyo4QgS98q.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 103,
  total: 105,
  source: 'https://ptbk.io/k/ss-2-2023-informace-106-syRjDruyxkspiYvNqDM2LYS0NS2aGM.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 104,
  total: 105,
  source: 'https://ptbk.io/k/ss-3-2019-vnitrni-kontrolni-system-WYZcHnXWvOlCbGaY0R9dhtVmujeLf2.pdf',
  sourceType: 'url'
}
[🤰] Processing knowledge source {
  index: 105,
  total: 105,
  source: 'https://ptbk.io/k/nt-084-2000-obsah-internetovych-stranek-dodatek-1-kzEv2vkRhFnIRfdm2lNWDVrpgbOIM7.pdf',
  sourceType: 'url'
}
```

-   You are working with the [Agents Server](apps/agents-server) with the agent chat _(for example, [here](https://my-agent-server.com/agents/FVLv8APAf2S1WV/chat))_

---

[-]

[✨📰] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server) with the agent chat _(for example, [here](https://my-agent-server.com/agents/FVLv8APAf2S1WV/chat))_
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨📰] bar

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   You are working with the [Agents Server](apps/agents-server) with the agent chat _(for example, [here](https://my-agent-server.com/agents/FVLv8APAf2S1WV/chat))_
-   Add the changes into the [changelog](changelog/_current-preversion.md)

