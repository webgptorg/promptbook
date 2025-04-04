import type { string_promptbook_server_url } from './src/types/typeAliases';


type ServerConfiguration = {
  title: string;

  description: string;

  /**
   * URL of the server
   */
  urls: Array<string_promptbook_server_url>;

}


/**
 * Available remote servers for the Promptbook
 *
 * @public exported from `@promptbook/core`
 */
export const REMOTE_SERVER_URLS: Array<string_promptbook_server_url> = [
    'https://s4.ptbk.io/promptbook',
    'https://s3.ptbk.io/promptbook',
    'https://s2.ptbk.io/promptbook',
    'https://s1.ptbk.io/promptbook',
    'https://api.pavolhejny.com/promptbook',
];
