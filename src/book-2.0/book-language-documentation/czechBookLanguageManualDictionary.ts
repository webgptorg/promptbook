import { spaceTrim } from 'spacetrim';
import type { BookLanguageManualDictionary } from './BookLanguageManualDictionary';

/**
 * Czech translation of the standalone Book language manual.
 *
 * Commitment keywords are intentionally kept in English, because they are part
 * of the Book language syntax and must be written exactly as-is.
 *
 * @private internal constant of `createStandaloneBookLanguageMarkdown`
 */
export const czechBookLanguageManualDictionary: BookLanguageManualDictionary = {
    language: 'cs',
    title: 'Příručka jazyka Book',
    introLines: [
        'Ucelený samostatný průvodce jazykem Book pro agenty Promptbooku.',
        'Vygenerováno z repozitáře https://github.com/webgptorg/promptbook',
    ],
    metadataLabels: {
        bookLanguageVersion: 'Verze jazyka Book',
        generatedAt: 'Vygenerováno',
        commitmentGroups: 'Skupin commitmentů',
        implementedCommitments: 'Hotových commitmentů',
        placeholderCommitments: 'Připravovaných commitmentů',
    },
    tableOfContentsTitle: 'Obsah',
    chapters: {
        whatIs: {
            title: 'Co je jazyk Book',
            body: spaceTrim(`
                Book je doménově specifický jazyk pro zápis **AI agentů** v podobě prostého textu.
                Řeší tyto problémy:

                - **Jediný upravitelný zdroj pravdy** pro chování agenta, nástroje, paměť i profilová metadata.
                - **Skládatelná architektura agentů** pomocí commitmentů jako \`FROM\`, \`IMPORT\` a \`TEAM\`.
                - **Předvídatelná příprava běhu**, kdy se zdroj rozparsuje a přeloží do požadavků na model.
                - **Přenositelné definice agentů**, které lze kopírovat, verzovat a revidovat jako text.

                V tomto repozitáři znamená „jazyk Book“ vždy **jazyk agentů Book 2.0**.
            `),
        },
        mentalModel: {
            title: 'Jak o agentovi přemýšlet',
            body: spaceTrim(`
                Na zdroj jednoho agenta se dívejte jako na čtyři vrstvy:

                1. **Vrstva identity a profilu**:
                Jméno agenta (první řádek, který není commitment), poslední \`GOAL\` a commitmenty \`META*\`.
                2. **Vrstva chování**:
                \`RULE\`, \`KNOWLEDGE\`, \`WRITING SAMPLE\`, \`WRITING RULES\`, \`LANGUAGE\`, \`GOAL\` a příbuzné commitmenty.
                3. **Vrstva schopností**:
                \`USE*\`, \`MEMORY\` a další nástrojové commitmenty, které agentovi otevírají běhové schopnosti.
                4. **Vrstva skládání**:
                Dědičnost přes \`FROM\`, znovupoužití přes \`IMPORT\` a delegování přes \`TEAM\`.
            `),
        },
        howToStructure: {
            title: 'Jak psát dobré agenty',
            body: spaceTrim(`
                Doporučené postupy a jejich kompromisy:

                1. **Nejdřív jedna jasná role**:
                Začněte jedním úzce vymezeným \`GOAL\`, který popisuje, za co agent odpovídá.
                Kompromis: menší počáteční volnost, výrazně vyšší spolehlivost.
                2. **Mantinely hned na začátku**:
                Přidejte konkrétní commitmenty \`RULE\` dřív, než začnete přidávat nástroje.
                Kompromis: víc přemýšlení předem, míň překvapení za běhu.
                3. **Opora ve zdrojích místo improvizace**:
                U odpovědí s vysokou cenou chyby dejte přednost \`KNOWLEDGE\` a výslovnému pravidlu o citování.
                Kompromis: údržba zdrojů navíc, lepší kontrola nad fakty.
                4. **Skládání místo jednoho velkého agenta**:
                Na specializované odpovědnosti použijte \`TEAM\` nebo \`IMPORT\`.
                Kompromis: režie s koordinací, výrazně lepší modularita a znovupoužitelnost.
                5. **Řízená paměť**:
                Pokud používáte \`MEMORY\`, popište, co se pamatovat má a co v žádném případě ne.
                Kompromis: přísnější návrh pravidel, lepší soukromí i kvalita zapamatovaného.
            `),
        },
        primitives: {
            title: 'Přehled stavebních prvků',
            body: '',
        },
        commitmentCatalog: {
            title: 'Katalog commitmentů',
            body: spaceTrim(`
                Tato kapitola se generuje z definic commitmentů v \`src/commitments\`.
                U každé skupiny commitmentů najdete:

                - shrnutí významu (popis, ikona, stav)
                - schéma pro parsování (\`createTypeRegex\` a \`createRegex\`)
                - úplnou dokumentaci

                Klíčová slova commitmentů jsou součástí syntaxe, a proto zůstávají anglicky.
                Anglicky zůstávají i jejich referenční popisy, které jsou závaznou specifikací jazyka.
            `),
        },
        examples: {
            title: 'Ucelené příklady',
        },
        pitfalls: {
            title: 'Časté chyby a čemu se vyhnout',
        },
        tutorial: {
            title: 'Postavte agenta od nuly (návod bez internetu)',
            body: spaceTrim(`
                Tento návod si vystačí bez přístupu k internetu.

                1. **Určete roli a cíl**
                Napište krátký řádek se jménem a jeden srozumitelný \`GOAL\`.
                2. **Přidejte mantinely chování**
                Přidejte 3-6 konkrétních commitmentů \`RULE\` pro rozsah, tón a bezpečnostní hranice.
                3. **Přidejte oporu ve znalostech**
                Přidejte commitmenty \`KNOWLEDGE\` (přímý text, nebo lokální či importovatelné zdroje).
                4. **Přidejte schopnosti**
                Přidejte jen ty commitmenty \`USE*\` a \`MEMORY\`, které agent opravdu potřebuje.
                5. **Doplňte profilová metadata**
                Přidejte \`META DESCRIPTION\`, \`META AVATAR\` / \`META VISUAL\` nebo \`META IMAGE\`, \`META INPUT PLACEHOLDER\`, \`META THINKING MESSAGE\` a případná upozornění.
                6. **Připravte první interakci**
                Přidejte \`INITIAL MESSAGE\` a případně ukázkové dvojice \`USER MESSAGE\` / \`AGENT MESSAGE\`.
                7. **Uzavřete agenta pro předvídatelné chování (volitelné)**
                Přidejte \`CLOSED\`, pokud chcete stabilní chování bez úprav za chodu.
            `),
        },
        lowLevelCommitments: {
            title: 'Nízkoúrovňové commitmenty',
            body: spaceTrim(`
                Následující commitmenty jsou plnohodnotnou součástí jazyka Book, ale jsou určené jen pro pokročilé použití.
                Většina agentů je nikdy nepotřebuje a jejich nesprávné použití agenta zbytečně zkomplikuje.

                Sáhněte po nich teprve tehdy, když konkrétní technický požadavek nejde vyjádřit commitmenty z předchozích kapitol.
            `),
        },
    },
    mentalModelSections: {
        detectedIntro: 'Commitmenty pro skládání agentů v aktuálním běhovém prostředí:',
        detectedProfileLabel: 'Nalezené commitmenty pro profil',
        detectedBehaviorLabel: 'Nalezené commitmenty pro chování',
        detectedToolingLabel: 'Nalezené commitmenty pro nástroje a běh',
        detectedCompositionLabel: 'Nalezené commitmenty pro skládání',
        meta: {
            title: 'Commitmenty META a profil agenta',
            body: spaceTrim(`
                Commitmenty \`META*\` řídí profilová data zobrazovaná v rozhraní (například avatar, obrázek, popis, upozornění, doménu nebo text v poli pro zprávu).
                Ovlivňují spíš prezentaci a metadata než chování nástrojů.
            `),
        },
        inheritance: {
            title: 'Dědičnost přes FROM',
            body: spaceTrim(`
                \`FROM\` odkazuje na zdroj rodičovského agenta. Při vyhodnocení dědičnosti platí:

                - Obsah rodiče se sloučí do výsledného zdroje.
                - \`FROM {Void}\` / \`FROM VOID\` znamená výslovné „žádný rodič“.
                - Chybějící odkazy se do výsledného zdroje propíší jako poznámky.
            `),
        },
        composition: {
            title: 'TEAM a IMPORT',
            body: spaceTrim(`
                - \`TEAM\` zpřístupní kolegy jako nástroje, které lze zavolat.
                - \`IMPORT\` vloží obsah importovaného agenta nebo souboru do kontextu agenta.
                - V Agents Serveru se zkrácené odkazy jako \`{Legal Reviewer}\` umí navázat na agenty vložené přímo v knize.
            `),
        },
        capabilities: {
            title: 'Commitmenty USE',
            body: spaceTrim(`
                Commitmenty \`USE*\` zapínají schopnosti (vyhledávání, prohlížeč, napojení na projekt, e-mail, generování obrázků a další).
                Zpřístupňují běhové nástroje a doplňují pokyny do systémové zprávy.
            `),
        },
    },
    primitivesSections: {
        coreSyntax: {
            title: 'Základní prvky syntaxe',
            body: spaceTrim(`
                1. **Jméno agenta**:
                První neprázdný řádek, který není klíčovým slovem commitmentu.
                2. **Blok commitmentu**:
                Začíná klíčovým slovem commitmentu a pokračuje až k dalšímu commitmentu nebo oddělovači.
                3. **Vodorovný oddělovač**:
                Řádky jako \`---\` dělí zdroj na části; v Agents Serveru jimi lze oddělit agenty vložené přímo v knize.
                4. **Bloky kódu**:
                Uvnitř obsahu commitmentu zůstávají zachované; hodí se pro ukázky a instrukce.
                5. **Parametry**:
                Podporovaný a rozpoznávaný je zápis \`@parametr\` i \`{parametr}\`.
            `),
        },
        references: {
            title: 'Odkazy a zástupní agenti',
            body: spaceTrim(`
                - Zkrácené odkazy jako \`{Jméno agenta}\` vyhodnocuje resolver odkazů v Agents Serveru.
                - V příslušných commitmentech lze použít i zástupné agenty (například \`{User}\` nebo \`{Void}\`).
                - \`{User}\` je určený pro \`TEAM\`; \`{Void}\` se hodí pro výslovné zrušení dědičnosti.
            `),
        },
        keywordsTitle: 'Aktuálně rozpoznávaná klíčová slova commitmentů',
    },
    commitmentCatalogTitleSuffixes: {
        usedFirst: ' (nejdřív používané commitmenty)',
        all: ' (všechny commitmenty)',
    },
    commitmentLabels: {
        status: 'Stav',
        aliases: 'Varianty zápisu',
        semantics: 'Význam',
        typeSchema: 'Schéma klíčového slova',
        blockSchema: 'Schéma bloku',
        lowLevelNotice: 'Nízkoúrovňový commitment',
        usage: 'Použití u vybraných agentů',
        usageOccurrence: 'výskyt',
        usageOccurrences: 'výskytů',
        statusImplemented: 'Hotovo',
        statusPlaceholder: 'Připravuje se (zatím není plně hotové)',
        noAliases: 'Žádné',
    },
    exampleLabels: {
        commitmentsUsed: 'Použité commitmenty',
        fullSource: 'Celý zdroj',
        goal: 'Cíl',
        walkthrough: 'Rozbor',
        noCommitments: 'Žádné',
    },
    exampleTexts: {
        'minimal-hello-world-agent': {
            title: 'Nejmenší funkční agent',
            goal: 'Vytvořit nejmenšího užitečného agenta s identitou a pozdravem.',
            walkthrough: [
                'První řádek (`Hello World Agent`) je jméno agenta.',
                '`GOAL` určuje výslednou roli a text profilu.',
                '`INITIAL MESSAGE` nastavuje předvídatelnou první zprávu nové konverzace.',
                '`CLOSED` brání tomu, aby se agent upravoval během konverzace.',
            ],
        },
        'tool-using-browser-search-agent': {
            title: 'Agent s nástroji (prohlížeč a vyhledávač)',
            goal: 'Umožnit rešerši na internetu s jasnou prací se zdroji.',
            walkthrough: [
                '`USE SEARCH ENGINE` zpřístupní vyhledávání na webu a volitelné pokyny k němu.',
                '`USE BROWSER` zapne stahování adres a interaktivní procházení webu.',
                'Commitmenty `RULE` dělají požadavky na spolehlivost výslovnými a opakovatelnými.',
                'Tento vzor se hodí pro agenty na aktuální dění a ověřování faktů.',
            ],
        },
        'rule-and-knowledge-agent': {
            title: 'Agent s RULE a KNOWLEDGE',
            goal: 'Opřít odpovědi o výslovná omezení a připravené zdroje.',
            walkthrough: [
                '`KNOWLEDGE` může být přímý text i externí adresa nebo dokument.',
                'Commitmenty `RULE` definují nepřekročitelná omezení chování.',
                'Jejich kombinace vede k předvídatelným a doloženým odpovědím.',
                'Tento vzor použijte pro compliance, podporu a interní postupy.',
            ],
        },
        'memory-agent-with-long-term-memory': {
            title: 'Agent s dlouhodobou pamětí (MEMORY)',
            goal: 'Uchovat preference uživatele napříč konverzacemi.',
            walkthrough: [
                '`MEMORY` přidá běhové nástroje paměti a příslušné pokyny do systémové zprávy.',
                'Commitmenty `RULE` zúží, co se smí pamatovat, a snižují tak rizika pro soukromí.',
                'V Agents Serveru je paměť vedená za běhu a je vázaná na konkrétního uživatele.',
                'Hodí se pro asistenty, kteří si musí držet kontext v čase.',
            ],
        },
        'use-project-and-wallet-integration-agent': {
            title: 'Napojení na projekt (USE PROJECT) a peněženku',
            goal: 'Pracovat s repozitáři na GitHubu a s přihlašovacími údaji z peněženky.',
            walkthrough: [
                '`USE PROJECT` zapne nástroje pro výpis, čtení a úpravy souborů a pro zakládání pull requestů.',
                'Přihlašovací údaje se v Agents Serveru za běhu načtou ze záznamů v peněžence.',
                '`WALLET` je zde ponechaný jen kvůli zpětné kompatibilitě, aktuální parsování Book 2.0 ho ignoruje.',
                'V současném chování zajišťují napojení s přihlašovacími údaji commitmenty jako `USE PROJECT` a `USE EMAIL`.',
            ],
        },
        'use-calendar-integration-agent': {
            title: 'Napojení na kalendář (USE CALENDAR)',
            goal: 'Domlouvat schůzky a hlídat program v napojeném Google Kalendáři.',
            walkthrough: [
                '`USE CALENDAR` zapne nástroje pro výpis, čtení, zakládání, úpravy a mazání událostí.',
                'První adresa kalendáře určuje, které napojení se má použít.',
                '`SCOPES` umí výslovně vyžádat potřebná oprávnění OAuth pro Google Kalendář.',
                'Přihlašovací údaje se v Agents Serveru za běhu načtou ze záznamů OAuth v peněžence.',
            ],
        },
        'agents-team-example': {
            title: 'Tým agentů (TEAM s kolegy v jedné knize)',
            goal: 'Předávat dílčí úkoly specializovaným kolegům.',
            walkthrough: [
                'Hlavní agent deleguje práci commitmentem `TEAM`.',
                'Odkazy v `{...}` se vyhodnocují proti agentům vloženým ve stejné knize (oddělených pomocí `---`).',
                'Každého kolegu lze pomocí `FROM VOID` oddělit a získat tak předvídatelnou specializaci.',
                'Tento vzor se osvědčuje u vícerolových revizí a podpory rozhodování.',
            ],
        },
    },
    pitfallLabels: {
        dont: 'Nedělejte',
        doInstead: 'Udělejte místo toho',
    },
    pitfalls: [
        {
            title: 'Příliš široké zadání agenta',
            dont: 'Jeden agent má být zároveň právník, vývojář, marketér i rešeršista.',
            doInstead: 'Rozdělte ho na soustředěné agenty a propojte je pomocí TEAM nebo IMPORT.',
        },
        {
            title: 'Neověřitelná tvrzení',
            dont: 'Agent odpovídá na otázky závislé na internetu bez nástrojů nebo bez uvedení zdrojů.',
            doInstead: 'Přidejte `USE SEARCH ENGINE` / `USE BROWSER` a `RULE` zaměřené na citování.',
        },
        {
            title: 'Chybějící mantinely',
            dont: 'Je vyplněný jen cíl agenta a žádná omezení chování.',
            doInstead: 'Přidejte konkrétní commitmenty `RULE` pro bezpečnost, rozsah a tón.',
        },
        {
            title: 'Přetížená dědičnost',
            dont: 'Dlouhé řetězce `FROM` bez vysvětlení, proč je každý rodič potřeba.',
            doInstead: 'Držte dědičnost mělkou a pro znovupoužití sáhněte po cíleném IMPORT nebo TEAM.',
        },
        {
            title: 'Nebezpečné zacházení s pamětí',
            dont: 'Ukládání každého detailu do paměti bez jakýchkoli hranic.',
            doInstead: 'Doplňte `MEMORY` výslovnými pravidly, co se smí uchovávat.',
        },
    ],
    tutorialSections: {
        serverAgentsHint:
            'Vyjděte z některého z ukázkových agentů tohoto serveru výše a ponechte jen ty commitmenty, které nový agent potřebuje.',
        templateIntro: 'Šablona ke zkopírování:',
        checklistTitle: 'Kontrolní seznam:',
        checklistBody: spaceTrim(`
            - Má každý commitment jasný účel?
            - Jsou výslovně ošetřené vymyšlené odpovědi a nebezpečné chování?
            - Jsou zapnuté jen ty nástroje, které jsou opravdu potřeba?
            - Je práce s pamětí omezená srozumitelnými pravidly?
            - Je skládání (\`FROM\`/\`TEAM\`/\`IMPORT\`) opodstatněné a pochopitelné?
        `),
    },
    footer: {
        title: 'Vygenerováno z:',
        body: spaceTrim(`
            - Registru commitmentů a běhové dokumentace v \`src/commitments\`
            - Chování parseru a překladače v \`src/book-2.0/agent-source\`
            - Vyhodnocení odkazů a dědičnosti v Agents Serveru v \`apps/agents-server/src/utils\`
            - Zdrojových bloků samostatné dokumentace v \`apps/agents-server/src/utils/bookLanguageDocumentation\`
        `),
    },
};
