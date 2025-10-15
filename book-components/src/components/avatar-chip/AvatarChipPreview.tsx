// AvatarChipPreview.tsx
'use client';

import { AvatarChip } from '@promptbook-local/components';
import { useState } from 'react';

/**
 * Renders a preview of `<AvatarChip />` component.
 */
export default function AvatarChipPreview() {
    const [selected, setSelected] = useState(false);

    const sampleAvatar = {
        agentName: 'Jane Doe',
        personaDescription: 'A friendly AI assistant.',
        meta: {
            image: 'https://randomuser.me/api/portraits/women/44.jpg',
        },
        // Add other required fields if needed
    } as const;

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
