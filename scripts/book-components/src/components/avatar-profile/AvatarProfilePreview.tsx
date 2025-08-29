// AvatarProfilePreview.tsx
import { AvatarProfile, AvatarProfileFromSource } from '@promptbook-local/components';
import type { AgentBasicInformation } from '@promptbook-local/types';

const demoAgent: AgentBasicInformation = {
    agentName: "Jane Doe",
    profileImageUrl: "https://randomuser.me/api/portraits/women/44.jpg",
    personaDescription: "A friendly AI assistant."
};

function AvatarProfilePreview() {
    return (
        <div style={{ display: "flex", gap: 32 }}>
            <AvatarProfile avatarBasicInformation={demoAgent} isSelected />
            <AvatarProfileFromSource source={demoAgent} />
        </div>
    );
}

export default AvatarProfilePreview;
