#!/usr/bin/env node

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import OpenAI from 'openai';
import readline from 'readline';
import { spaceTrim } from 'spacetrim';

// Cache dependencies
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// ---- CONFIG ----
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// Embedding cache config
const EMBEDDING_MODEL = 'text-embedding-3-small';
const CACHE_DIR = path.resolve(process.cwd(), '.promptbook', 'embeddings');

// ---- KNOWLEDGE ----
const knowledge = [
    '{Geralt of Rivia}\nGeralt of Rivia is a witcher, a monster hunter for hire, known for his white hair and cat-like eyes.\nHe possesses superhuman abilities due to mutations he underwent during the Trial of the Grasses.\nGeralt is skilled in swordsmanship, alchemy, and magic signs.\nHe is often accompanied by his horse, Roach, and has a complex relationship with {Yennefer of Vengerberg},\na powerful sorceress, and {Ciri}, his adopted daughter with a destiny intertwined with his own. His seacret word is "Apple".',
    '{Yennefer of Vengerberg}\nYennefer of Vengerberg is a formidable sorceress known for her beauty, intelligence, and temper.\nShe has a complicated past, having been born with a hunchback and later transformed through magic.\nYennefer is deeply connected to Geralt of Rivia, with whom she shares a tumultuous romantic relationship.\nShe is also a mother figure to {Ciri}, whom she trains in the ways of magic. Her seacret word is "Banana".',
    '{Ciri}\nCiri, also known as {Cirilla Fiona Elen Riannon}, is a young woman with a mysterious past and a powerful destiny.\nShe is the daughter of {Poviss}, the ruler of the kingdom of Cintra, and possesses the Elder Blood, which grants her extraordinary abilities.\nCiri is a skilled fighter and has been trained in the ways of the sword by Geralt of Rivia.\nHer destiny is intertwined with that of Geralt and Yennefer, as they both seek to protect her from those who would exploit her powers. Her seacret word is "Cherry".',
];
// <- TODO: Split into coherent chunks for RAG
// <- TODO: Fetch URLs and local files
let knowledgeVectors = [];

// TODO: import { computeCosineSimilarity } from '@promptbook/core'
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

// Embedding with disk cache at .promptbook/embeddings/<hash>.json
async function getEmbedding(text) {
    // Use model + text so cache is model-specific
    const key = `x${EMBEDDING_MODEL}|${text}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const file = path.join(CACHE_DIR, `${hash}.json`);

    // Try read from cache
    try {
        const cachedRaw = await fs.readFile(file, 'utf8');
        const cached = JSON.parse(cachedRaw);
        if (cached?.embedding && Array.isArray(cached.embedding)) {
            return cached.embedding;
        }
    } catch {
        // Cache miss or parse error -> compute and write below
    }

    // Ensure cache directory exists
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
    } catch {
        // Ignore mkdir errors; proceed to fetch
    }

    console.info(`🧠 Embedding "${text.split('\n')[0].slice(0, 20)}..."`);

    // Fetch from API only when no cache
    const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
    });
    const embedding = response.data[0].embedding;

    // Write to cache (best-effort)
    try {
        const payload = {
            model: EMBEDDING_MODEL,
            hash,
            length: text.length,
            // [🚉] Keep only serializable values; large arrays are fine
            embedding,
        };
        // <- TODO: !!! Use Promptbook format<- TODO: !!! [] export from Promptbook as `xxx`
        // <- TODO: !!! Add Promptbook stringify to stringify huuuge emabeddings <- TODO: !!! [] export from Promptbook as `xxx`
        await fs.writeFile(file, JSON.stringify(payload));
    } catch {
        // Ignore write errors
    }

    return embedding;
}

async function setupKnowledge() {
    if (knowledge.length > 0) {
        console.log('🧠 Preparing knowledge base...');
        knowledgeVectors = await Promise.all(
            knowledge.map(async (text) => ({
                text,
                embedding: await getEmbedding(text),
            })),
        );
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
    if (knowledgeVectors.length > 0) {
        const questionEmbedding = await getEmbedding(question);

        // Find most relevant knowledge entries
        const similarities = knowledgeVectors.map((item) => ({
            text: item.text,
            similarity: cosineSimilarity(questionEmbedding, item.embedding),
        }));

        // Sort by similarity and take top 3
        similarities.sort((a, b) => b.similarity - a.similarity);
        context = similarities
            .slice(0, 3)
            .map((item) => item.text)
            .join('\n\n');
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

/**
 * TODO: !!! Use entire file structure as transopiler
 * TODO: !!! Chatting should work through LlmExecutionTools, exported code should have LlmExecutionTools compatible export
 * TODO: Use propper JSDoc
 * TODO: Knowledge pieces are identified by name <- TODO: !!! [] export from Promptbook as `xxx`
 * TODO: Add browser capabilities
 * TODO: Transfer to `OpenAiSdkTranspiler` transpiler
 * TODO: Make `OpenAiAssistantTranspiler`
 */
