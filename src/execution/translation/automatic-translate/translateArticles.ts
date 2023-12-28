import chalk from 'chalk';
import { readFile, writeFile } from 'fs';
import glob from 'glob-promise';
import { basename, join } from 'path';
import { Converter } from 'showdown';
import { spaceTrim } from 'spacetrim';
import { promisify } from 'util';
import { prettify } from '../_common-utils/prettify';
import { IAutomaticTranslator } from './automatic-translators/IAutomaticTranslator';
import { ITranslatorOptions } from './automatic-translators/ITranslatorOptions';
import { mapEachMessageInHtml } from './mapEachMessageInHtml';

export async function translateArticles({
    automaticTranslator,
    from,
    to,
}: { automaticTranslator: IAutomaticTranslator } & ITranslatorOptions) {
    const markdownConverter = new Converter();

    for (const format of ['html', 'md']) {
        for (const articlePath of await glob(join(__dirname, `../../assets/articles/**/*.${from}.${format}`))) {
            console.info(chalk.bgGrey(`🌐 Translating ${basename(articlePath)}`));

            let articleData = await promisify(readFile)(articlePath, 'utf8');
            let translatedFormat = format;

            if (format === 'md') {
                articleData = markdownConverter.makeHtml(articleData);
                translatedFormat = 'html';
            }

            // TODO: Probbably also make the folder
            await promisify(writeFile)(
                articlePath.split(`.${from}.${format}`).join(`.${to}.${translatedFormat}`),
                await prettify(
                    await spaceTrim(
                        async (block) => `

                          <!-- Note: This article was automatically translated from ${from} to ${to} -->

                          ${block(
                              await mapEachMessageInHtml({
                                  html: articleData,
                                  async map(message) {
                                      message = spaceTrim(message);
                                      if (message === '') {
                                          return '';
                                      }
                                      const translated = await automaticTranslator.translate(message);
                                      console.info(chalk.gray(`${message} ▶️   ${translated}`));
                                      return translated;
                                  },
                              }),
                          )}

                        `,
                    ),
                    'html',
                ),
                'utf8',
            );
        }
    }
}
