import { serializeError } from '@promptbook-local/utils';
import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { assertsError } from '../../../../../src/errors/assertsError';

/**
 * GET /api/books -> list all .book files in books/examples/
 */
export async function GET() {
    const examplesDir = path.resolve(process.cwd(), '../../', 'books/examples');
    try {
        const files = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.book'));
        return NextResponse.json(files);
    } catch (error) {
        assertsError(error);

        return NextResponse.json({ error: serializeError(error) }, { status: 500 });
    }
}
