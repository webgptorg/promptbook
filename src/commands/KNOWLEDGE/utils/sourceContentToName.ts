import { SHA256 as sha256 } from 'crypto-js';
import hexEncoder from 'crypto-js/enc-hex';
import { normalizeToKebabCase } from '../../../_packages/utils.index';
import { string_knowledge_source_content, string_name } from '../../../types/typeAliases';

/**
 * Creates unique name for the source
 *
 * @private within the repository
 */
export function sourceContentToName(sourceContent: string_knowledge_source_content): string_name {
    // TODO: !!!!!! Better name for source than gibberish hash
    const hash = sha256(hexEncoder.parse(JSON.stringify(sourceContent)))
        //    <- TODO: [🥬] Encapsulate sha256 to some private utility function
        .toString(/* hex */)
        .substring(0, 20);
    //    <- TODO: [🥬] Make some system for hashes and ids of promptbook
    const semanticName = normalizeToKebabCase(sourceContent.substring(0, 20));

    const pieces = ['source', semanticName, hash].filter((piece) => piece !== '');

    const name = pieces.join('-').split('--').join('-');
    // <- TODO: Use MAX_FILENAME_LENGTH

    return name;

    /*
    TODO: !!!!!! Remove or use
    if (isValidFilePath(sourceContent)) {
      if (!$isRunningInNode()) {
          throw new EnvironmentMismatchError('Importing knowledge source file works only in Node.js environment');
      }

      if (rootDirname === null) {
          throw new EnvironmentMismatchError('Can not import file knowledge in non-file pipeline');
          //          <- TODO: [🧠] What is the best error type here`
      }

      const filename = join(rootDirname, sourceContent).split('\\').join('/');
      const fileExtension = getFileExtension(filename);
      const mimeType = extensionToMimeType(fileExtension || '');

      // TODO: !!!!!! Test that file exists and is accessible
      // TODO: !!!!!! Test security file - file is scoped to the project (maybe do this in `filesystemTools`)

      return {
          source: name,
          filename,
          url: null,
          mimeType,
          async asBlob() {
              const content = await readFile(filename);
              //  <- Note: Its OK to use sync in tooling for tests
              return new Blob(
                  [
                      content,

                      // <- TODO: !!!!!! Maybe not working
                  ],
                  { type: mimeType },
              );
          },
          async asJson() {
              return JSON.parse(await readFile(filename, 'utf-8'));
              //  <- Note: Its OK to use sync in tooling for tests
          },
          async asText() {
              return await readFile(filename, 'utf-8');
              //  <- Note: Its OK to use sync in tooling for tests
          },
      };
  } else if (isValidUrl(sourceContent)) {
      const url = sourceContent;
      const response = await fetch(url); // <- TODO: [🧠] Scraping and fetch proxy
      const mimeType = response.headers.get('content-type')?.split(';')[0] || 'text/html';

      return {
          source: name,
          filename: null,
          url,
          mimeType,
          async asBlob() {
              // TODO: [👨🏻‍🤝‍👨🏻] This can be called multiple times BUT when called second time, response in already consumed
              const content = await response.blob();
              return content;
          },
          async asJson() {
              // TODO: [👨🏻‍🤝‍👨🏻]
              const content = await response.json();
              return content;
          },
          async asText() {
              // TODO: [👨🏻‍🤝‍👨🏻]
              const content = await response.text();
              return content;
          },
      };
  } else {
      return {
          source: name,
          filename: null,
          url: null,
          mimeType: 'text/markdown',
          asText() {
              return knowledgeSource.sourceContent;
          },
          asJson() {
              throw new UnexpectedError(
                  'Did not expect that `markdownScraper` would need to get the content `asJson`',
              );
          },
          asBlob() {
              throw new UnexpectedError(
                  'Did not expect that `markdownScraper` would need to get the content `asBlob`',
              );
          },
      };
  }
  */
}

/**
 * TODO: [🐱‍🐉][🧠] Make some smart crop NOT source-i-m-pavol-a-develop-... BUT source-i-m-pavol-a-developer-...
 */
