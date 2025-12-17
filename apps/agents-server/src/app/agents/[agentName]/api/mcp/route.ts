import { $provideAgentCollectionForServer } from '@/src/tools/$provideAgentCollectionForServer';
import { $provideExecutionToolsForServer } from '@/src/tools/$provideExecutionToolsForServer';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { Agent } from '@promptbook-local/core';
import { ChatMessage, Prompt, TODO_any } from '@promptbook-local/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Global map to store active transports
// Note: This works in stateful environments or single-instance deployments.
// In serverless with multiple instances, this will fail if POST lands on a different instance.
// However, for standard deployments or sticky sessions, it works.
const sessions = new Map<string, SSENextJsTransport>();

class SSENextJsTransport implements Transport {
    public onmessage?: (message: JSONRPCMessage) => void;
    public onclose?: () => void;
    public onError?: (error: Error) => void;
    private controller: ReadableStreamDefaultController<TODO_any>;
    private encoder = new TextEncoder();
    public sessionId: string;

    constructor(controller: ReadableStreamDefaultController<TODO_any>, sessionId: string) {
        this.controller = controller;
        this.sessionId = sessionId;
    }

    async start(): Promise<void> {
        // No-op for SSE
    }

    async close(): Promise<void> {
        this.onclose?.();
        sessions.delete(this.sessionId);
    }

    async send(message: JSONRPCMessage): Promise<void> {
        const event = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
        this.controller.enqueue(this.encoder.encode(event));
    }

    async handlePostMessage(message: JSONRPCMessage): Promise<void> {
        this.onmessage?.(message);
    }

    sendEndpointEvent(endpoint: string) {
        const event = `event: endpoint\ndata: ${endpoint}\n\n`;
        this.controller.enqueue(this.encoder.encode(event));
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentName: string }> }) {
    const { agentName } = await params;

    // Check if agent exists
    try {
        const collection = await $provideAgentCollectionForServer();
        await collection.getAgentSource(agentName);
    } catch (error) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const sessionId = crypto.randomUUID();

    const stream = new ReadableStream({
        start: async (controller) => {
            const transport = new SSENextJsTransport(controller, sessionId);
            sessions.set(sessionId, transport);

            // Send endpoint event
            // Construct the POST endpoint URL
            // We assume the client can construct it or we send relative/absolute path
            // The user wants: /agents/[agentName]/api/mcp
            // We can send specific query param
            const endpoint = `/agents/${agentName}/api/mcp?sessionId=${sessionId}`;
            transport.sendEndpointEvent(endpoint);

            // Initialize MCP Server
            const server = new McpServer({
                name: `Agent ${agentName}`,
                version: '1.0.0',
            });

            // Register Chat Tool
            server.tool(
                'chat',
                {
                    messages: z.array(
                        z.object({
                            role: z.enum(['user', 'assistant', 'system']),
                            content: z.string(),
                        }),
                    ),
                    model: z.string().optional(),
                },
                async ({ messages }) => {
                    try {
                        const collection = await $provideAgentCollectionForServer();
                        const agentSource = await collection.getAgentSource(agentName);

                        const executionTools = await $provideExecutionToolsForServer();
                        const agent = new Agent({
                            agentSource,
                            executionTools,
                            isVerbose: true,
                        });

                        // Prepare thread and content
                        const lastMessage = messages[messages.length - 1];
                        const previousMessages = messages.slice(0, -1);

                        const thread: ChatMessage[] = previousMessages.map((msg: TODO_any, index: number) => ({
                            channel: 'PROMPTBOOK_CHAT',
                            id: `msg-${index}`,
                            sender: msg.role === 'assistant' ? 'agent' : 'user', // Mapping standard roles
                            content: msg.content,
                            isComplete: true,
                            date: new Date(),
                        }));

                        const prompt: Prompt = {
                            title: 'MCP Chat Completion',
                            content: lastMessage.content,
                            modelRequirements: {
                                modelVariant: 'CHAT',
                            },
                            parameters: {},
                            thread,
                        } as Prompt;

                        const result = await agent.callChatModel(prompt);

                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: result.content,
                                },
                            ],
                        };
                    } catch (error) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Error: ${(error as Error).message}`,
                                },
                            ],
                            isError: true,
                        };
                    }
                },
            );

            await server.connect(transport);

            // Handle connection close
            // In ReadableStream, verify if there is a way to detect close from client side in Next.js?
            // Usually if client disconnects, the stream might be cancelled.
            // But we don't have a direct hook here unless we return logic in 'cancel'.
        },
        cancel() {
            sessions.delete(sessionId);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}

export async function POST(request: NextRequest /*, { params }: { params: Promise<{ agentName: string }> }*/) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const transport = sessions.get(sessionId);
    if (!transport) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    try {
        const body = await request.json();
        await transport.handlePostMessage(body);
        return NextResponse.json({ success: true }); // Accepted
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
