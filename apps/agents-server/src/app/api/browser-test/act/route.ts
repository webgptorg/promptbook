import { $provideBrowserForServer } from '@/src/tools/$provideBrowserForServer';
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

export const maxDuration = 60; // Allow longer timeout for agent actions

export async function POST(request: NextRequest) {
    try {
        const { goal, action, plan } = await request.json();

        if (!goal) {
            return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
        }

        const browserContext = await $provideBrowserForServer();
        const pages = browserContext.pages();
        let page = pages[0];

        if (!page) {
            page = await browserContext.newPage();
            await page.goto('https://www.facebook.com/');
        }

        // Ensure we are on Facebook
        if (!page.url().includes('facebook.com')) {
            await page.goto('https://www.facebook.com/');
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Get page context (simplified for now: just text content)
        // In a real scenario, we would use accessibility tree or screenshots
        const pageText = await page.evaluate(() => document.body.innerText.slice(0, 10000)); // Limit text size

        if (action === 'plan') {
            const systemPrompt = `
                You are an autonomous agent interacting with Facebook.
                Your goal is to help the user achieve: "${goal}".
                Analyze the current page content and propose a step-by-step plan.
                Keep the plan concise and actionable.
                Do not execute any actions yet, just list them.
            `;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Current page text (truncated):\n${pageText}` },
                ],
            });

            const plan = completion.choices[0].message.content;
            return NextResponse.json({ plan });
        } else if (action === 'execute') {
            // This is a simplified execution. Ideally, this would be a loop.
            // We ask the LLM to give us a JSON of actions to perform immediately.
            
            const systemPrompt = `
                You are an autonomous agent interacting with Facebook.
                Your goal is to help the user achieve: "${goal}".
                ${plan ? `You have previously agreed to this plan:\n${plan}\n\n` : ''}
                Based on the current page content, generate a list of low-level actions to perform NOW to advance the plan.
                
                Supported actions:
                - { "type": "click", "selector": "css selector", "description": "reason" }
                - { "type": "type", "selector": "css selector", "text": "text to type", "description": "reason" }
                - { "type": "scroll", "amount": number, "description": "reason" }
                - { "type": "wait", "ms": number, "description": "reason" }
                - { "type": "navigate", "url": "url", "description": "reason" }

                Return a JSON object with a key "actions" containing an array of these actions.
                Example: { "actions": [{ "type": "scroll", "amount": 500, "description": "scanning feed" }, { "type": "click", "selector": "...", "description": "liking post" }] }
                
                IMPORTANT: Return ONLY valid JSON.
            `;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Current page text (truncated):\n${pageText}` },
                ],
                response_format: { type: 'json_object' },
            });

            const responseContent = completion.choices[0].message.content;
            if (!responseContent) {
                throw new Error('No response from AI');
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { actions } = JSON.parse(responseContent) as { actions: any[] };
            const results = [];

            for (const act of actions) {
                console.log('Executing action:', act);
                try {
                    if (act.type === 'click') {
                        // Try to find element and click
                        // We might need to use evaluate if selector is complex or text-based, but let's stick to CSS for now
                        // Or ask LLM to give text-based selector?
                        // Playwright's locator is powerful.
                        // Let's assume standard CSS selectors for now.
                        if (act.selector) {
                            // Try to wait for it briefly
                            await page.waitForSelector(act.selector, { timeout: 2000 });
                            await page.click(act.selector);
                        }
                    } else if (act.type === 'type') {
                        if (act.selector && act.text) {
                            await page.waitForSelector(act.selector, { timeout: 2000 });
                            await page.type(act.selector, act.text);
                        }
                    } else if (act.type === 'scroll') {
                        await page.evaluate((y) => window.scrollBy(0, y), act.amount || 500);
                    } else if (act.type === 'wait') {
                        await page.waitForTimeout(act.ms || 1000);
                    } else if (act.type === 'navigate') {
                        if (act.url) await page.goto(act.url);
                    }
                    results.push({ action: act, status: 'success' });
                } catch (error) {
                    console.error('Action failed:', act, error);
                    results.push({ action: act, status: 'error', error: String(error) });
                }
                // Small delay between actions
                await page.waitForTimeout(500);
            }

            return NextResponse.json({ success: true, results });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Error in Act on Facebook:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
