import { prompt } from './src/pipeline/prompt-notation';

const customer1 = 'John ~Doe';
const customer2 = 'Adam ~Smith';

const writeEmailPrompt = prompt`
    Write email to the customers ${customer1} and ${customer2} 
`;

const output = writeEmailPrompt.toString();
console.log(output);
