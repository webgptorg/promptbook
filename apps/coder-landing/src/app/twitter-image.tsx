import {
    renderSocialShareImage,
    SOCIAL_SHARE_IMAGE_ALT,
    SOCIAL_SHARE_IMAGE_CONTENT_TYPE,
    SOCIAL_SHARE_IMAGE_SIZE,
} from '@/components/SocialShareImage/renderSocialShareImage';

/**
 * Alternative text of the Twitter card image.
 */
export const alt = SOCIAL_SHARE_IMAGE_ALT;

/**
 * Size of the Twitter card image.
 */
export const size = SOCIAL_SHARE_IMAGE_SIZE;

/**
 * Format of the Twitter card image.
 */
export const contentType = SOCIAL_SHARE_IMAGE_CONTENT_TYPE;

/**
 * Renders the image shown when the landing page is shared on X (Twitter).
 *
 * Note: It is the very same image as the Open Graph one, only announced by the `twitter:image` tag as well.
 */
export default function TwitterImage() {
    return renderSocialShareImage();
}
