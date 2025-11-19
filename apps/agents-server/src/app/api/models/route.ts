import { getSingleLlmExecutionTools } from '@promptbook-local/core';
import { NextResponse } from 'next/server';
import { $provideExecutionToolsForServer } from '../../tools/$provideExecutionToolsForServer';

export async function GET() {
    const executionTools = await $provideExecutionToolsForServer();
    const models = await getSingleLlmExecutionTools(executionTools.llm).listModels();
    return NextResponse.json(models);
}
