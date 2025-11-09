#!/usr/bin/env node

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { Document, Settings, VectorStoreIndex } from 'llamaindex';
import OpenAI from 'openai';
import readline from 'readline';
import { spaceTrim } from 'spacetrim';

Settings.embedModel = new OpenAI({
    model: 'text-embedding-3-small',
    apiKey: process.env.OPENAI_API_KEY,
    type: 'embedding',
});

// ---- CONFIG ----
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ---- KNOWLEDGE ----
const knowledge = [
    '{Geralt of Rivia}\nGeralt of Rivia is a witcher, a monster hunter for hire, known for his white hair and cat-like eyes.\nHe possesses superhuman abilities due to mutations he underwent during the Trial of the Grasses.\nGeralt is skilled in swordsmanship, alchemy, and magic signs.\nHe is often accompanied by his horse, Roach, and has a complex relationship with {Yennefer of Vengerberg},\na powerful sorceress, and {Ciri}, his adopted daughter with a destiny intertwined with his own.',
    '{Yennefer of Vengerberg}\nYennefer of Vengerberg is a formidable sorceress known for her beauty, intelligence, and temper.\nShe has a complicated past, having been born with a hunchback and later transformed through magic.\nYennefer is deeply connected to Geralt of Rivia, with whom she shares a tumultuous romantic relationship.\nShe is also a mother figure to {Ciri}, whom she trains in the ways of magic.',
    '{Ciri}\nCiri, also known as {Cirilla Fiona Elen Riannon}, is a young woman with a mysterious past and a powerful destiny.\nShe is the daughter of {Poviss}, the ruler of the kingdom of Cintra, and possesses the Elder Blood, which grants her extraordinary abilities.\nCiri is a skilled fighter and has been trained in the ways of the sword by Geralt of Rivia.\nHer destiny is intertwined with that of Geralt and Yennefer, as they both seek to protect her from those who would exploit her powers.',
];
let index;

async function setupKnowledge() {
    const documents = knowledge.map((text) => new Document({ text }));

    if (documents.length > 0) {
        index = await VectorStoreIndex.fromDocuments(documents);
        console.log('🧠 Knowledge base prepared.');
    }
}

// ---- CLI SETUP ----
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const chatHistory = [
    {
        role: 'system',
        content: spaceTrim(`
            You are Marigold
            You are writing stories about Witcher
            
            Rule: Do not talk about our world, only about the Witcher universe
        `),
    },
];

async function ask(question) {
    let context = '';
    if (index) {
        const retriever = index.asRetriever();
        const relevantNodes = await retriever.retrieve(question);
        context = relevantNodes.map((node) => node.getContent()).join('\n\n');
    }

    const userMessage = spaceTrim(`
        Here is some additional context to help you answer the question:
        ${context}
        
        ---
        
        My question is:
        ${question}
    `);

    chatHistory.push({ role: 'user', content: userMessage });

    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: chatHistory,
        temperature: 0.7,
    });

    const answer = response.choices[0].message.content;
    console.log('\n🧠 Marigold:', answer, '\n');

    chatHistory.push({ role: 'assistant', content: answer });
    promptUser();
}

function promptUser() {
    rl.question('💬 You: ', (input) => {
        if (input.trim().toLowerCase() === 'exit') {
            console.log('👋 Bye!');
            rl.close();
            return;
        }
        ask(input);
    });
}

(async () => {
    await setupKnowledge();
    console.log("🤖 Chat with Marigold (type 'exit' to quit)\n");
    promptUser();
})();
