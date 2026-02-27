import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { parseAgentSource } from './parseAgentSource';
import { validateBook } from './string_book';

describe('parseAgentSource', () => {
    it('parses minimal agent source (only name)', () => {
        const agentSource = validateBook('Agent Name');
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('agent-name');
        expect(result.personaDescription).toBe(null);
        // expect(result.meta.image).toBe('/agents/agent-name/images/default-avatar.png'); // Should be a default avatar URL
        expect(result.parameters).toEqual([]);
    });

    it('parses agent with persona and profile image', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                PERSONA A helpful assistant
                META IMAGE https://img.url/pic.png
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toMatchObject({
            agentName: 'agent-name',
            personaDescription: 'A helpful assistant',
            meta: {
                image: 'https://img.url/pic.png',
            },
            parameters: [],
        });
    });

    it('parses agent with system message lines', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                PERSONA A helpful assistant
                META IMAGE https://img.url/pic.png
                NOTE This is a note
                And another line of note
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toMatchObject({
            agentName: 'agent-name',
            personaDescription: 'A helpful assistant',
            meta: {
                image: 'https://img.url/pic.png',
            },
            parameters: [],
        });
    });

    it('parses agent with only system message', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                This is a system message.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('agent-name');
        expect(result.personaDescription).toBe(null);
        // expect(result.meta.image).toBe('/agents/agent-name/images/default-avatar.png'); // Should be a default avatar URL
    });

    it('handles empty or whitespace input', () => {
        expect(parseAgentSource(validateBook(''))).toMatchObject({
            agentName: 'agent-9bee7d',
            parameters: [],
            personaDescription: null,
            meta: {
                // image: '/agents/agent-9bee7d/images/default-avatar.png', // Should be a default avatar URL
            },
        });
        expect(parseAgentSource(validateBook('   '))).toMatchObject({
            agentName: 'agent-e3b0c4',
            agentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            parameters: [],
            personaDescription: null,
            meta: {
                // image: '/agents/agent-e3b0c4/images/default-avatar.png', // Should be a default avatar URL for 'Anonymous Agent'
            },
        });
    });

    it('handles blank lines in system message', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name

                This is a system message.

                Another line.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('agent-name');
        expect(result.personaDescription).toBe(null);
        // expect(result.meta.image).toBe('/agents/agent-name/images/default-avatar.png'); // Should be a default avatar URL
    });

    it('ignores malformed PERSONA and META IMAGE lines', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                PERSONA
                META IMAGE
                NOTE Some random note
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('agent-name');
        expect(result.personaDescription).toBe('');
        // expect(result.meta.image).toBe('/agents/agent-name/images/default-avatar.png'); // Should be a default avatar URL
    });

    it('parses agent with custom META commitments', () => {
        const agentSource = validateBook(
            spaceTrim(`
                AI Avatar

                PERSONA A friendly AI assistant that helps you with your tasks
                META FOO foo
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toMatchObject({
            agentName: 'ai-avatar',
            personaDescription: 'A friendly AI assistant that helps you with your tasks',
            meta: {
                // image: '/agents/ai-avatar/images/default-avatar.png', // Should be a default avatar URL
                foo: 'foo',
            },
            parameters: [],
        });
    });

    it('parses agent with multiple META commitments and overrides', () => {
        const agentSource = validateBook(
            spaceTrim(`
                AI Avatar

                PERSONA A friendly AI assistant that helps you with your tasks
                META FOO foo
                META IMAGE ./picture.png
                META BAR bar
                META foo foo2
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result).toMatchObject({
            agentName: 'ai-avatar',
            personaDescription: 'A friendly AI assistant that helps you with your tasks',
            meta: {
                image: './picture.png',
                foo: 'foo2', // Later should override earlier
                bar: 'bar',
            },
            parameters: [],
        });
    });

    it('handles META commitments case insensitively', () => {
        const agentSource = validateBook(
            spaceTrim(`
                AI Avatar

                META TITLE My Title
                META title Another Title
                META Link https://example.com
                META LINK https://example2.com
                META Description First description
                META DESCRIPTION Second description
            `),
        );
        const result = parseAgentSource(agentSource);

        expect(result.meta).toMatchObject({
            fullname: 'AI Avatar',
            title: 'Another Title', // Later should override earlier
            link: 'https://example2.com', // Later should override earlier
            description: 'Second description', // Later should override earlier
        });
    });

    it('parses META DOMAIN and normalizes hostname values', () => {
        const agentSource = validateBook(
            spaceTrim(`
                AI Avatar
                META DOMAIN https://Sub.Example.com:4440/path
            `),
        );
        const result = parseAgentSource(agentSource);

        expect(result.meta.domain).toBe('sub.example.com');
    });

    it('supports DOMAIN alias and last-value override', () => {
        const agentSource = validateBook(
            spaceTrim(`
                AI Avatar
                DOMAIN first.example.com
                META DOMAIN second.example.com
            `),
        );
        const result = parseAgentSource(agentSource);

        expect(result.meta.domain).toBe('second.example.com');
    });

    it('parses META DISCLAIMER with multiline markdown content', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Legal Assistant
                META DISCLAIMER
                ## Warning
                This assistant provides information only.
                Always verify important facts independently.
            `),
        );
        const result = parseAgentSource(agentSource);

        expect(result.meta.disclaimer).toBe(
            spaceTrim(`
                ## Warning
                This assistant provides information only.
                Always verify important facts independently.
            `),
        );
    });

    it('parses META DISCLAIMER with inline content and allows override', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Legal Assistant
                META DISCLAIMER First disclaimer
                META DISCLAIMER
                Final disclaimer line 1.
                Final disclaimer line 2.
            `),
        );
        const result = parseAgentSource(agentSource);

        expect(result.meta.disclaimer).toBe(
            spaceTrim(`
                Final disclaimer line 1.
                Final disclaimer line 2.
            `),
        );
    });

    it('parses MESSAGE SUFFIX with multiline markdown content', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Branded Assistant
                MESSAGE SUFFIX
                _Generated by Promptbook_
                Please verify important information independently.
            `),
        );
        const result = parseAgentSource(agentSource);

        expect(result.meta.messageSuffix).toBe(
            spaceTrim(`
                _Generated by Promptbook_
                Please verify important information independently.
            `),
        );
    });

    it('parses MESSAGE SUFFIX with inline content and allows override', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Branded Assistant
                MESSAGE SUFFIX First suffix
                MESSAGE SUFFIX
                Final suffix line 1.
                Final suffix line 2.
            `),
        );
        const result = parseAgentSource(agentSource);

        expect(result.meta.messageSuffix).toBe(
            spaceTrim(`
                Final suffix line 1.
                Final suffix line 2.
            `),
        );
    });

    it('parses INITIAL MESSAGE', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                INITIAL MESSAGE Hello! I am ready to help you.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.initialMessage).toBe('Hello! I am ready to help you.');
    });

    it('parses INITIAL MESSAGE with overrides', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                INITIAL MESSAGE First message
                INITIAL MESSAGE Second message (override)
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.initialMessage).toBe('Second message (override)');
    });

    it('parses INITIAL MESSAGE into samples', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                INITIAL MESSAGE Hello! I am ready to help you.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.samples).toContainEqual({ question: null, answer: 'Hello! I am ready to help you.' });
    });

    it('parses USE USER LOCATION capability', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                USE USER LOCATION
            `),
        );
        const result = parseAgentSource(agentSource);

        expect(result.capabilities).toContainEqual({
            type: 'user-location',
            label: 'User location',
            iconName: 'MapPin',
        });
    });

    it('parses USE PRIVACY capability', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                USE PRIVACY
            `),
        );
        const result = parseAgentSource(agentSource);

        expect(result.capabilities).toContainEqual({
            type: 'privacy',
            label: 'Privacy',
            iconName: 'Shield',
        });
    });

    it('parses USE PROJECT capability', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                USE PROJECT https://github.com/example/project
            `),
        );
        const result = parseAgentSource(agentSource);

        expect(result.capabilities).toContainEqual({
            type: 'project',
            label: 'example/project',
            iconName: 'Code',
        });
    });

    it('parses WALLET capability', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                WALLET
            `),
        );
        const result = parseAgentSource(agentSource);

        expect(result.capabilities).toContainEqual({
            type: 'wallet',
            label: 'Wallet',
            iconName: 'Shield',
        });
    });

    it('parses IMAGE and COLOR aliases', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Agent Name
                IMAGE https://example.com/image.png
                COLOR #ff0000
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.meta.image).toBe('https://example.com/image.png');
        expect(result.meta.color).toBe('#ff0000');
    });

    it('parses META FULLNAME', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Pavol Hejný

                PERSONA Developer with 10 years of experience in building AI applications.
                META FULLNAME Dr. Ing. Pavol Hejný, PhD.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('pavol-hejny');
        expect(result.meta.fullname).toBe('Dr. Ing. Pavol Hejný, PhD.');
    });

    it('uses agent name as fallback for fullname', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Pavol Hejný

                PERSONA Developer with 10 years of experience in building AI applications.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('pavol-hejny');
        expect(result.meta.fullname).toBe('Pavol Hejný');
    });

    it('horizontal line ends commitment', () => {
        const agentSource = validateBook(
            spaceTrim(`
                Benjamin Brown

                FROM http://localhost:4440/agents/benjamin-white
                META COLOR #A52A2A

                ---

                USER MESSAGE
                Hello, can you tell me about yourself?

                AGENT MESSAGE
                Hello! I'm an AI language model designed to assist with a wide range of inquiries.
            `),
        );
        const result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('benjamin-brown');
        expect(result.meta.color).toBe('#A52A2A');
        // The META COLOR should end at ---, not include the messages as content
        expect(result.meta.color).not.toContain('USER MESSAGE');
    });

    it('horizontal line with various formats ends commitment', () => {
        // Test with simple ---
        let agentSource = validateBook(
            spaceTrim(`
                Agent Name
                META TITLE My Title
                ---
                Some non-commitment text
            `),
        );
        let result = parseAgentSource(agentSource);
        expect(result.meta.title).toBe('My Title');

        // Test with more hyphens -----
        agentSource = validateBook(
            spaceTrim(`
                Agent Name
                META TITLE My Title
                -----
                Some non-commitment text
            `),
        );
        result = parseAgentSource(agentSource);
        expect(result.meta.title).toBe('My Title');

        // Test with spaces between hyphens
        agentSource = validateBook(
            spaceTrim(`
                Agent Name
                META TITLE My Title
                - - -
                Some non-commitment text
            `),
        );
        result = parseAgentSource(agentSource);
        expect(result.meta.title).toBe('My Title');
    });

    it('parses COLOR with comma separator', () => {
        const agentSource = validateBook(`
            COLOR red, blue, green
            PERSONA You are a helper
        `);
        const result = parseAgentSource(agentSource);
        expect(result.meta.color).toBe('red, blue, green');
    });

    it('parses COLOR with space separator', () => {
        const agentSource = validateBook(`
            COLOR red blue green
            PERSONA You are a helper
        `);
        const result = parseAgentSource(agentSource);
        expect(result.meta.color).toBe('red, blue, green');
    });

    it('parses FONT with comma separator', () => {
        const agentSource = validateBook(`
            FONT Arial, sans-serif
            PERSONA You are a helper
        `);
        const result = parseAgentSource(agentSource);
        expect(result.meta.font).toBe('Arial, sans-serif');
    });

    it('parses FONT with space separator', () => {
        const agentSource = validateBook(`
            FONT Arial sans-serif
            PERSONA You are a helper
        `);
        const result = parseAgentSource(agentSource);
        expect(result.meta.font).toBe('Arial, sans-serif');
    });

    it('parses FONT with spaces in name (treated as list)', () => {
        const agentSource = validateBook(`
            FONT Times New Roman
            PERSONA You are a helper
        `);
        const result = parseAgentSource(agentSource);
        expect(result.meta.font).toBe('Times, New, Roman');
    });

    it('parses agentName from first non-empty line that is not a commitment or horizontal line', () => {
        // First non-empty is agent name
        let agentSource = validateBook(`
            John Doe
            PERSONA You are a helpful assistant.
        `);
        let result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('john-doe');

        // Empty lines before agent name
        agentSource = validateBook(`


            John Doe
            PERSONA You are a helpful assistant.
        `);
        result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('john-doe');

        // Horizontal line before agent name
        agentSource = validateBook(`
            ---

            John Doe
            PERSONA You are a helpful assistant.
        `);
        result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('john-doe');

        // Non-commitment line before agent name (should take first one)
        agentSource = validateBook(`
            x

            John Doe
            PERSONA You are a helpful assistant.
        `);
        result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('x');

        // Commitment as first non-empty (agentName should be null, fallback to default)
        agentSource = validateBook(`
            COLOR red, blue, green
            PERSONA You are a helper
        `);
        result = parseAgentSource(agentSource);
        expect(result.agentName).toBe('agent-3daa54'); // Default hash since no name
    });

    describe('parses linked agents', () => {
        it('parses FROM commitment (local)', () => {
            const agentSource = validateBook(`
                Agent Name
                FROM ./other-agent
            `);
            const result = parseAgentSource(agentSource);
            expect(result.capabilities).toContainEqual({
                type: 'inheritance',
                label: 'other-agent',
                iconName: 'SquareArrowUpRight',
                agentUrl: './other-agent',
            });
        });

        it('parses FROM commitment (remote)', () => {
            const agentSource = validateBook(`
                Agent Name
                FROM https://other-server.com/agents/other-agent
            `);
            const result = parseAgentSource(agentSource);
            expect(result.capabilities).toContainEqual({
                type: 'inheritance',
                label: 'https://other-server.com/agents/other-agent',
                iconName: 'SquareArrowOutUpRight',
                agentUrl: 'https://other-server.com/agents/other-agent',
            });
        });

        it('parses IMPORT commitment (local)', () => {
            const agentSource = validateBook(`
                Agent Name
                IMPORT ./other-agent
            `);
            const result = parseAgentSource(agentSource);
            expect(result.capabilities).toContainEqual({
                type: 'import',
                label: 'other-agent',
                iconName: 'Link',
                agentUrl: './other-agent',
            });
        });

        it('parses IMPORT commitment (remote)', () => {
            const agentSource = validateBook(`
                Agent Name
                IMPORT https://other-server.com/agents/other-agent
            `);
            const result = parseAgentSource(agentSource);
            expect(result.capabilities).toContainEqual({
                type: 'import',
                label: 'other-server.com.../other-agent',
                iconName: 'ExternalLink',
                agentUrl: 'https://other-server.com/agents/other-agent',
            });
        });

        it('parses TEAM commitment', () => {
            const agentSource = validateBook(`
                Agent Name
                TEAM https://agents.ptbk.ik/agents/joe-green
            `);
            const result = parseAgentSource(agentSource);
            expect(result.capabilities).toContainEqual({
                type: 'team',
                label: 'Joe Green',
                iconName: 'Users',
                agentUrl: 'https://agents.ptbk.ik/agents/joe-green',
            });
        });

        it('ignores Adam agent in FROM commitment', () => {
            const agentSource = validateBook(`
                Agent Name
                FROM Adam
            `);
            const result = parseAgentSource(agentSource);
            expect(result.capabilities).toEqual([]);
        });

        it('handles VOID agent in FROM commitment', () => {
            const agentSource = validateBook(`
                Agent Name
                FROM VOID
            `);
            const result = parseAgentSource(agentSource);
            expect(result.capabilities).toContainEqual({
                type: 'inheritance',
                label: '{Void}',
                iconName: 'ShieldAlert',
                agentUrl: 'VOID',
            });
        });

        it('handles `{Void}` pseudo-agent in FROM commitment', () => {
            const agentSource = validateBook(`
                Agent Name
                FROM {vOiD}
            `);
            const result = parseAgentSource(agentSource);
            expect(result.capabilities).toContainEqual({
                type: 'inheritance',
                label: '{Void}',
                iconName: 'ShieldAlert',
                agentUrl: '{vOiD}',
            });
        });
    });
});
