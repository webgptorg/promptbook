import { book } from '@promptbook-local/core';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { AvatarProfileFromSource } from '../../../../../src/book-components/AvatarProfile/AvatarProfile/AvatarProfileFromSource';

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

                        AI Avatar

                        PERSONA A friendly AI assistant that helps you with your tasks

                    ` as string_book
                }
            />
            <AvatarProfileFromSource
                agentSource={
                    book`

                        AI Avatar

                        PERSONA A friendly AI assistant that helps you with your tasks

                    ` as string_book
                }
            />
        </div>
    );
}
