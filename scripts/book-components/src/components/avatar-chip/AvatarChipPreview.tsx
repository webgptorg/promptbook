// AvatarChipPreview.tsx
'use client';

import { AvatarChip } from '@promptbook-local/components';
import type { AgentBasicInformation } from '@promptbook-local/types';
import { useState } from 'react';

/**
 * Renders a preview of `<AvatarChip />` component.
 */
export default function AvatarChipPreview() {
    const [selected, setSelected] = useState(false);

    const sampleAvatar: AgentBasicInformation = {
        agentName: 'Jane Doe',
        profileImageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
        personaDescription: 'A friendly AI assistant.',
        // Add other required fields if needed
    };

    return (
        <div className="flex gap-6 items-center">
            <AvatarChip
                avatarBasicInformation={sampleAvatar}
                isTemplate={false}
                isSelected={selected}
                onSelect={() => setSelected(!selected)}
            />
            <AvatarChip
                avatarBasicInformation={sampleAvatar}
                isTemplate={true}
                isSelected={!selected}
                onSelect={() => setSelected(!selected)}
            />
        </div>
    );
}
