import { AvatarPlaygroundPage } from '../avatars/AvatarPlaygroundPage';

/**
 * Renders the dedicated fractal-avatar utility page.
 */
export default function FractalAvatarPage() {
    return (
        <AvatarPlaygroundPage
            title="Fractal Avatar"
            description="Focused playground for the fractal avatar renderer, with the full built-in gallery still available for comparison."
            defaultVisualId="fractal"
        />
    );
}
