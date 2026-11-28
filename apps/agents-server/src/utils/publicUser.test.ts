import { describe, expect, it } from '@jest/globals';
import { PUBLIC_USER_SELECT_COLUMNS, toPublicUser, type PublicUser } from './publicUser';

describe('PUBLIC_USER_SELECT_COLUMNS', () => {
    it('does not select password hashes', () => {
        const SELECTED_COLUMNS = PUBLIC_USER_SELECT_COLUMNS.split(',').map((COLUMN) => COLUMN.trim());

        expect(SELECTED_COLUMNS).not.toContain('passwordHash');
    });
});

describe('toPublicUser', () => {
    it('does not return password hashes from user rows', () => {
        const USER_ROW = {
            id: 1,
            username: 'admin',
            isAdmin: true,
            createdAt: '2026-06-29T00:00:00.000Z',
            updatedAt: '2026-06-29T00:00:00.000Z',
            profileImageUrl: null,
            email: 'admin@example.com',
            displayName: 'Admin User',
            authenticationProvider: 'LOCAL',
            passwordHash: '$2b$10$example',
        } satisfies PublicUser & { readonly passwordHash: string };

        const PUBLIC_USER = toPublicUser(USER_ROW);

        expect(PUBLIC_USER).toEqual({
            id: 1,
            username: 'admin',
            isAdmin: true,
            createdAt: '2026-06-29T00:00:00.000Z',
            updatedAt: '2026-06-29T00:00:00.000Z',
            profileImageUrl: null,
            email: 'admin@example.com',
            displayName: 'Admin User',
            authenticationProvider: 'LOCAL',
        });
        expect('passwordHash' in PUBLIC_USER).toBe(false);
    });
});
