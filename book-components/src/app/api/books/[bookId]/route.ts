import { TODO_any } from '@promptbook-local/types';
import { serializeError } from '@promptbook-local/utils';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { assertsError } from '../../../../../../src/errors/assertsError';
import { keepUnused } from '../../../../../../src/utils/organization/keepUnused';

/**
 *
 * @returns GET /api/books/[bookId] -> return content of the .book file
 */
export async function GET(request: NextRequest, todoWhatIsThis: TODO_any) {
    try {
        keepUnused(request);
        const { params } = todoWhatIsThis;
        const { bookId } = params;

        if (typeof bookId !== 'string' || !bookId.endsWith('.book')) {
            return NextResponse.json({ error: 'Invalid bookId' }, { status: 400 });
        }
        const filePath = path.resolve(process.cwd(), '../../', 'books/examples', bookId);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }
        const content = fs.readFileSync(filePath, 'utf8');
        // Return the raw .book content as plain text with the custom MIME type
        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': 'text/promptbook; charset=utf-8',
            },
        });
    } catch (error) {
        assertsError(error);

        return NextResponse.json({ error: serializeError(error) }, { status: 500 });
    }
}
