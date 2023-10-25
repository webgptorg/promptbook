import { Wizzard } from './Wizzard';

const { comment } = Wizzard.takeCookbook({ url: 'https://ptp.example.com/samples/', isLazy: true })
    .useOpenAi({ apiKey: 'sss' })
    .askUserInCallback()
    .askUserInStdio()
    .takeRecipe('comment.ptp.md@v1')
    .cook();

console.info({ comment });
//==============

const wizzard = Wizzard.takeCookbook({
    sources: {
        /* ... */
    },
})
    .useOpenAi({ apiKey: 'sss' })
    .askUser()
    .allowScripts()
    .denyPython()
    .askUserWithUglyBrowserPrompt();

const recipe = wizzard.takeRecipe('website.ptp.md@v1');
const { websiteContent } = recipe.cook();

console.info({ websiteContent });

/**
url, sources nebo folder
 * TODO: [🧠] OpenAi apiKey vs token
 */
