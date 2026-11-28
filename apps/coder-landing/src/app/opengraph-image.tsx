import {
    renderSocialShareImage,
    SOCIAL_SHARE_IMAGE_ALT,
    SOCIAL_SHARE_IMAGE_CONTENT_TYPE,
    SOCIAL_SHARE_IMAGE_SIZE,
} from '@/components/SocialShareImage/renderSocialShareImage';

/**
 * Alternative text of the Open Graph image.
 */
export const alt = SOCIAL_SHARE_IMAGE_ALT;

/**
 * Size of the Open Graph image.
 */
export const size = SOCIAL_SHARE_IMAGE_SIZE;

/**
 * Format of the Open Graph image.
 */
export const contentType = SOCIAL_SHARE_IMAGE_CONTENT_TYPE;

/**
 * Renders the image shown when the landing page is shared on Facebook, LinkedIn, Discord, Slack and others.
 */
export default function OpengraphImage() {
    return renderSocialShareImage();
}
