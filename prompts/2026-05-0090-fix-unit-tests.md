[ ] !

[✨𓀕] Fix unit tests

```log
me@DESKTOP-2QD9KQQ MINGW64 ~/work/ai/promptbook ((83a0e621f...))
$ npm run test

...

 isValidUrl.ts                         |     100 |      100 |     100 |     100 |
  normalizeDomainForMatching.ts         |     100 |    85.71 |     100 |     100 | 23
 promptbook/src/utils/validators/uuid   |      75 |        0 |     100 |      75 |
  isValidUuid.ts                        |      75 |        0 |     100 |      75 | 13
 promptbook/src/wizard                  |    27.1 |        0 |      10 |   27.88 |
  $getCompiledBook.ts                   |   22.05 |        0 |       0 |   23.07 | 33-198
  wizard.ts                             |   35.89 |        0 |      25 |   35.89 | 67-98,111-162
----------------------------------------|---------|----------|---------|---------|-------------------
Summary of all failing tests
 FAIL  src/scrapers/document/DocumentScraper.test.ts (103.348 s)
  ● how creating knowledge from docx works › should scrape simple information from a .docx file

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: Connection error.·
    Original stack trace:
    Error: Connection error.
        at OpenAI.makeRequest (C:\Users\me\work\ai\promptbook\node_modules\openai\src\client.ts:671:13)
        at processTicksAndRejections (node:internal/process/task_queues:105:5)
        at OpenAiCompatibleRequestManager.makeRequestWithNetworkRetry (C:\Users\me\work\ai\promptbook\src\llm-providers\openai\OpenAiCompatibleRequestManager.ts:68:24)]

      23 |
      24 |     it('should scrape simple information from a .docx file', () =>
    > 25 |         expect(
         |               ^
      26 |             Promise.all([
      27 |                 documentScraperPromise,
      28 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document/DocumentScraper.test.ts:25:15)

  ● how creating knowledge from docx works › should scrape simple information from a .odt file

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: Connection error.·
    Original stack trace:
    Error: Connection error.
        at OpenAI.makeRequest (C:\Users\me\work\ai\promptbook\node_modules\openai\src\client.ts:671:13)
        at processTicksAndRejections (node:internal/process/task_queues:105:5)
        at OpenAiCompatibleRequestManager.makeRequestWithNetworkRetry (C:\Users\me\work\ai\promptbook\src\llm-providers\openai\OpenAiCompatibleRequestManager.ts:68:24)]

      44 |
      45 |     it('should scrape simple information from a .odt file', () =>
    > 46 |         expect(
         |               ^
      47 |             Promise.all([
      48 |                 documentScraperPromise,
      49 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document/DocumentScraper.test.ts:46:15)

  ● how creating knowledge from docx works › should NOT scrape irrelevant information

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: Connection error.·
    Original stack trace:
    Error: Connection error.
        at OpenAI.makeRequest (C:\Users\me\work\ai\promptbook\node_modules\openai\src\client.ts:671:13)
        at processTicksAndRejections (node:internal/process/task_queues:105:5)
        at OpenAiCompatibleRequestManager.makeRequestWithNetworkRetry (C:\Users\me\work\ai\promptbook\src\llm-providers\openai\OpenAiCompatibleRequestManager.ts:68:24)]

      65 |
      66 |     it('should NOT scrape irrelevant information', () =>
    > 67 |         expect(
         |               ^
      68 |             Promise.all([
      69 |                 documentScraperPromise,
      70 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document/DocumentScraper.test.ts:67:15)

 FAIL  src/scrapers/document-legacy/LegacyDocumentScraper.test.ts (43.746 s)
  ● how creating knowledge from docx works › should scrape simple information from a (legacy) .doc file

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: Connection error.·
    Original stack trace:
    Error: Connection error.
        at OpenAI.makeRequest (C:\Users\me\work\ai\promptbook\node_modules\openai\src\client.ts:671:13)
        at processTicksAndRejections (node:internal/process/task_queues:105:5)
        at OpenAiCompatibleRequestManager.makeRequestWithNetworkRetry (C:\Users\me\work\ai\promptbook\src\llm-providers\openai\OpenAiCompatibleRequestManager.ts:68:24)]

      22 |
      23 |     it('should scrape simple information from a (legacy) .doc file', () =>
    > 24 |         expect(
         |               ^
      25 |             Promise.all([
      26 |                 legacyDocumentScraperPromise,
      27 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document-legacy/LegacyDocumentScraper.test.ts:24:15)

  ● how creating knowledge from docx works › should scrape simple information from a .rtf file

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: Connection error.·
    Original stack trace:
    Error: Connection error.
        at OpenAI.makeRequest (C:\Users\me\work\ai\promptbook\node_modules\openai\src\client.ts:671:13)
        at processTicksAndRejections (node:internal/process/task_queues:105:5)
        at OpenAiCompatibleRequestManager.makeRequestWithNetworkRetry (C:\Users\me\work\ai\promptbook\src\llm-providers\openai\OpenAiCompatibleRequestManager.ts:68:24)]

      43 |
      44 |     it('should scrape simple information from a .rtf file', () =>
    > 45 |         expect(
         |               ^
      46 |             Promise.all([
      47 |                 legacyDocumentScraperPromise,
      48 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document-legacy/LegacyDocumentScraper.test.ts:45:15)

  ● how creating knowledge from docx works › should NOT scrape irrelevant information

    expect(received).resolves.toMatchObject()

    Received promise rejected instead of resolved
    Rejected to value: [Error: Connection error.·
    Original stack trace:
    Error: Connection error.
        at OpenAI.makeRequest (C:\Users\me\work\ai\promptbook\node_modules\openai\src\client.ts:671:13)
        at processTicksAndRejections (node:internal/process/task_queues:105:5)
        at OpenAiCompatibleRequestManager.makeRequestWithNetworkRetry (C:\Users\me\work\ai\promptbook\src\llm-providers\openai\OpenAiCompatibleRequestManager.ts:68:24)]

      64 |
      65 |     it('should NOT scrape irrelevant information', () =>
    > 66 |         expect(
         |               ^
      67 |             Promise.all([
      68 |                 legacyDocumentScraperPromise,
      69 |                 makeKnowledgeSourceHandler(

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/scrapers/document-legacy/LegacyDocumentScraper.test.ts:66:15)


Test Suites: 2 failed, 494 passed, 496 total
Tests:       6 failed, 2044 passed, 2050 total
Snapshots:   0 total
Time:        595.462 s, estimated 676 s
Ran all test suites.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
```
