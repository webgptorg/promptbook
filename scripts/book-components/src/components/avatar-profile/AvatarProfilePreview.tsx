import { AvatarProfileFromSource } from '../../../../../src/book-components/AvatarProfile/AvatarProfile/AvatarProfileFromSource';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';

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
                    `
          CzechGPT
          PERSONA
          You are a large language model, trained by Google.
          META IMAGE https://www.reshot.com/preview-assets/icons/GE9N5D2B3A/robot-GE9N5D2B3A.svg
        ` as string_book
                }
            />
            <AvatarProfileFromSource
                agentSource={
                    `
          CharacterGenius
          PERSONA
          I can generate characters for your stories.
          META IMAGE https://www.reshot.com/preview-assets/icons/GE9N5D2B3A/robot-GE9N5D2B3A.svg
        ` as string_book
                }
            />
        </div>
    );
}
