import { TODO_any } from '@promptbook-local/types';
import { NextRequest } from 'next/server';
import { Readable } from 'node:stream';

export async function nextRequestToNodeRequest(nextRequest: NextRequest): Promise<Readable> {
    const reader = nextRequest.body?.getReader();

    if (!reader) {
        throw new Error(`Can not get nextRequest.body.getReader()`);
    }

    const nodeStream = new Readable({
        async read() {
            const { done, value } = await reader.read();
            if (done) this.push(null);
            else this.push(Buffer.from(value));
        },
    });

    // Fake IncomingMessage with headers
    (nodeStream as TODO_any).headers = Object.fromEntries(nextRequest.headers.entries());
    (nodeStream as TODO_any).method = nextRequest.method;
    (nodeStream as TODO_any).url = nextRequest.url;
    (nodeStream as TODO_any).socket = {}; // required by formidable

    return nodeStream;
}
