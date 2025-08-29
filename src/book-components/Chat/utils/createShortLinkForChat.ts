/**
 * Create a short link for chat sharing.
 * Simplified version without Supabase dependency.
 *
 * @private utility of `<Chat/>` component
 */
export async function createShortLinkForChat(utmUrl: string): Promise<string> {
    // Simplified implementation - just return the UTM URL
    // In a full implementation, this would create a short link via API
    console.info('Short link would be created for:', utmUrl);
    return utmUrl;
}
