import type { string_name } from '../../types/typeAliases';
import { just } from '../../utils/just';

export async function isGithubNameFree(name: string_name): Promise<boolean> {
    just(name);
    const response = await fetch('https://github.com/organizations/check_name', {
        headers: {
            accept: '*/*',
            'accept-language': 'en,cs;q=0.9,en-US;q=0.8,cs-CZ;q=0.7',
            'cache-control': 'no-cache',
            'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryLj1jj6mDB8aoupcS',
            pragma: 'no-cache',
            priority: 'u=1, i',
            'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
        },
        referrer:
            'https://github.com/account/organizations/new?plan=free&ref_cta=Join%2520for%2520free&ref_loc=organization_plan%2520comparison&ref_page=%2Forganizations%2Fplan',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: '------WebKitFormBoundaryLj1jj6mDB8aoupcS\r\nContent-Disposition: form-data; name="authenticity_token"\r\n\r\nP1s9_auiZnFmQJ4U2Q7iZcHQA5ilpWWuR8MXZDSHheXPNsx9kTGWHpPjLsHzGTGAvdrPtfaV8C4VyXNQzV8YAg\r\n------WebKitFormBoundaryLj1jj6mDB8aoupcS\r\nContent-Disposition: form-data; name="value"\r\n\r\npromptbook\r\n------WebKitFormBoundaryLj1jj6mDB8aoupcS--\r\n',
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
    });

    console.log(response);

    const data = await response.text();

    console.log(data);

    return false;
}

/**
 * TODO: [🍓][🧠] Test and implement `isGithubNameFree`
 * TODO: Export via some (and probably new) NPM package
 */
