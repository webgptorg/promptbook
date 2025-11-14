import { forTime } from 'waitasecond';
import { just } from '../../../../../../src/utils/organization/just';

export async function GET() {
    const readableStream = new ReadableStream({
        async start(controller) {
            while (just(true)) {
                await forTime(100);
                controller.enqueue(new TextEncoder().encode('x'));
            }

            controller.close();
        },
    });

    return new Response(readableStream, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
    });
}
