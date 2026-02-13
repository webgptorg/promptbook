import { redirect } from 'next/navigation';

/**
 * Legacy route kept for compatibility after moving Story to `/experiments/story`.
 */
export default function LegacyStoryRedirectPage() {
    redirect('/experiments/story');
}
