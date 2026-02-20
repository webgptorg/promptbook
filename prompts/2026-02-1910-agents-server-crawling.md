[x] ~$0.74 an hour by OpenAI Codex `gpt-5.3-codex`

[✨🔳] Allow to specify knowledge freely in the text of the `KNOWLEDGE` commitment.

-   The knowledge commitment works in two modes:
    -   URL mode: when the knowledge is specified as a URL, then the agent will use the scraper to get the content and use it as knowledge.
    -   Text mode: when the knowledge is specified as a free text, then the agent will just create the text document which is used in the Vector store.
-   Change it in a such way that you can freely reference any URL in the text, and everything will be put as a knowledge.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, Create or use some function which can extract all URLs from an arbitrary string.
-   Do a proper analysis of the current functionality of `KNOWLEDGE` commitment, scrapers, agents, and all related things before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

## Example

```book
Bitcoin Agent

PERSONA Helpful assistant answering questions about Bitcoin protocol.
KNOWLEDGE You should look at https://ptbk.io/k/mb-260205-UHNjmldhHAQhyFeubJ8e5tSVDH8kCy.pdf for more information about the Bitcoin protocol. Also look at https://ptbk.io/k/bips-UHNjmldhHAQhyFeubJ8e5tSVDH8kCy.pdf for examples of BIPs (Bitcoin Improvement Proposals) which are design documents providing information to the Bitcoin community, or describing a new feature for Bitcoin or its processes or environment.


RULE Answer only things about Bitcoin.
```

## Commitments

Commitments are basic syntax elements that add specific functionalities to AI agents written in `book` language.

-   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
-   Commitments are in the folder `/src/commitments`
-   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
-   Agent source with commitments is parsed by two functions:
    -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
    -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.
-   `KNOWLEDGE` commitment is specific commitment which allows to specify knowledge for the agent

---

[x] ~$0.38 an hour by OpenAI Codex `gpt-5.3-codex`

[✨🔳] Allow to specify website in `KNOWLEDGE` commitment.

-   Now you can specify only the documents which are then uploaded to the Vector store.
-   It would be good to allow specifying websites in the `KNOWLEDGE` commitment, so the agent can use the scraper to get the content and use it as knowledge.
-   Do not implement full crawling for now. Just look at this one URL and shallowly scrape it.
-   Keep in mind the DRY _(don't repeat yourself)_ principle, Look at the existing scrapers which are implemented here in the project.
-   Do a proper analysis of the current functionality of `KNOWLEDGE` commitment, scrapers, agents, and all related things before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

## Example

```book
Bitcoin Agent

PERSONA Helpful assistant answering questions about Bitcoin protocol.
KNOWLEDGE You should look at https://ptbk.io/k/mb-260205-UHNjmldhHAQhyFeubJ8e5tSVDH8kCy.pdf for more information about the Bitcoin protocol. Also look at https://github.com/bitcoin/bips for examples of BIPs (Bitcoin Improvement Proposals) which are design documents providing information to the Bitcoin community, or describing a new feature for Bitcoin or its processes or environment.


RULE Answer only things about Bitcoin.
```

## Commitments

Commitments are basic syntax elements that add specific functionalities to AI agents written in `book` language.

-   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
-   Commitments are in the folder `/src/commitments`
-   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
-   Agent source with commitments is parsed by two functions:
    -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
    -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.
-   `KNOWLEDGE` commitment is specific commitment which allows to specify knowledge for the agent

---

[ ]

[✨🔳] qux

-   @@@
-   PASU
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

```csv
,,
,Název stránky,URL
"Rozvojové projekty – národní úroveň (OP, ministerstva, infrastruktura)",DotaceEU.cz (oficiální zastřešující portál EU fondů v ČR),https://www.dotaceeu.cz
,OP Jan Amos Komenský (OP JAK),https://opjak.cz
,OP Zaměstnanost Plus (OPZ+),https://www.esfcr.cz
,OP Technologie a aplikace pro konkurenceschopnost (OP TAK),https://optak.cz
,Integrovaný regionální operační program (IROP),https://irop.mmr.cz
,OP Životní prostředí,https://www.opzp.cz
,OP Spravedlivá transformace,https://www.opst.cz
,Ministerstvo školství – rozvojové programy VŠ,https://www.msmt.cz/vzdelavani/vysoke-skoly
,Jednotný dotační portál (MF ČR),https://jdp.mf.gov.cz
,"Dotační.info (neoficiální, poradenský portál)",https://www.dotacni.info
,,
Projekty na úrovni Evropské unie (centrálně řízené EU),EU Funding & Tenders Portal (hlavní portál EK),https://ec.europa.eu/info/funding-tenders
,Horizon Europe – oficiální stránky,https://research-and-innovation.ec.europa.eu
,Horizon Europe – český informační portál,https://www.horizontevropa.cz
,Erasmus+ (Evropská komise),https://erasmus-plus.ec.europa.eu
,"Dům zahraniční spolupráce (Erasmus+, ČR)",https://www.dzs.cz
,Creative Europe (Evropská komise),https://culture.ec.europa.eu
,Creative Europe Desk ČR,https://www.creativeeurope.cz
,"CERV – Citizens, Equality, Rights and Values",https://commission.europa.eu/funding-tenders
,LIFE Programme,https://cinea.ec.europa.eu/life_en
,EURAXESS (neoficiální informační portál EK),https://euraxess.ec.europa.eu
,,
"Výzkumné projekty – národní úroveň (grantové agentury, rezorty)",Grantová agentura ČR (GA ČR),https://gacr.cz
,Technologická agentura ČR (TA ČR),https://www.tacr.cz
,Agentura pro zdravotnický výzkum (AZV ČR),https://www.azvcr.cz
,Ministerstvo vnitra – bezpečnostní výzkum,https://www.mvcr.cz/vyzkum.aspx
,Ministerstvo kultury – program NAKI,https://www.mkcr.cz/vyzkum-a-vyvoj
,Ministerstvo životního prostředí – výzkum,https://www.mzp.cz
,Ministerstvo práce a sociálních věcí – výzkum,https://www.mpsv.cz
,Národní agentura pro zemědělský výzkum (NAZV),https://www.nazv.cz
,VědaVýzkum.cz (neoficiální odborný portál),https://vedavyzkum.cz
,"Research Professional (neplacené části, neoficiální)",https://www.researchprofessional.com

```

---

[-]

[✨🔳] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🔳] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)

---

[-]

[✨🔳] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)


