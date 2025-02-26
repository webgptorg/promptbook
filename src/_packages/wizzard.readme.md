# 🧙‍♂️ Wizard

Run books without any settings, boilerplate or struggle in Node.js:

```typescript
import { wizzard } from '@promptbook/wizzard';

const {
    outputParameters: { joke },
} = await wizzard.execute(`https://github.com/webgptorg/book/blob/main/books/templates/generic.book`, {
    topic: 'Prague',
});

console.info(joke);
```
