import { book } from '@promptbook-local/core';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { AvatarProfileFromSource } from '../../../../../src/playground/AvatarProfile/AvatarProfile/AvatarProfileFromSource';

export default function AvatarProfilePreview() {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px',
            }}
        >
            <AvatarProfileFromSource
                agentSource={
                    book`

                        Paul

                        PERSONA A friendly AI assistant that develops and maintains software

                    ` as string_book
                }
            />
            <AvatarProfileFromSource
                agentSource={
                    book`

                        George

                        PERSONA A friendly AI assistant that helps you with your social media posts

                    ` as string_book
                }
            />
        </div>
    );
}
