import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Agent Profile';
export const size = {
    width: 1200,
    height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'white',
                }}
            >
                <h1>Hello</h1>
            </div>
        ),
        {
            ...size,
            emoji: 'openmoji',
        },
    );
}

/**
 * TODO:  [webpack.cache.PackFileCacheStrategy] Serializing big strings (126kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
 */
