#!/usr/bin/env ts-node

import { writeFileSync } from 'fs';
import { join } from 'path';
import { spaceTrim } from 'spacetrim';
import { createPipelineCollection } from '../../../src/collection/constructors/createPipelineCollection';
import { startRemoteServer } from '../../../src/remote-server/startRemoteServer';

/**
 * Sample Remote Server with OAuth social login integration
 * 
 * This example shows how to set up a Promptbook remote server with 
 * Facebook, Google, LinkedIn, and GitHub OAuth authentication.
 */
async function main() {
    console.info(`🚀 Starting OAuth-enabled Promptbook Server`);

    // Create a sample pipeline collection
    const collection = await createPipelineCollection(
        // Sample book content
        spaceTrim(`
            # Hello World Pipeline

            Show how to use promptbook with OAuth authentication

            -   PERSONA Jane, marketing specialist
            -   PIPELINE_URL https://promptbook.studio/hello-world
            -   MODEL VARIANT Completion
            -   MODEL NAME gpt-4o-mini
            -   INPUT  PARAMETER {rawName} Name of the user
            -   OUTPUT PARAMETER {greeting} Greeting for the user

            ## Welcome message

            - MODEL NAME gpt-4o-mini

            \`\`\`
            Hello {rawName}!
            You have successfully authenticated via OAuth.
            Please provide a personalized welcome message.
            \`\`\`

            -> {greeting}
        `),
    );

    // OAuth configuration (these would come from environment variables in production)
    const oauthConfig = {
        sessionSecret: process.env.SESSION_SECRET || 'your-secret-key-here',
        baseUrl: process.env.BASE_URL || 'http://localhost:4444',
        facebook: process.env.FACEBOOK_CLIENT_ID ? {
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
        } : undefined,
        google: process.env.GOOGLE_CLIENT_ID ? {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        } : undefined,
        linkedin: process.env.LINKEDIN_CLIENT_ID ? {
            clientId: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
        } : undefined,
        github: process.env.GITHUB_CLIENT_ID ? {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        } : undefined,
    };

    const server = startRemoteServer({
        port: 4444,
        isApplicationModeAllowed: true,
        collection,
        oauthConfig,
        
        // Custom login handler that supports both regular and OAuth login
        async login(loginRequest) {
            const { username, password, oauthProfile, appId } = loginRequest;
            
            console.info(`🔐 Login attempt:`, {
                username,
                hasOAuth: !!oauthProfile,
                provider: oauthProfile?.provider,
                appId,
            });

            // Handle OAuth login
            if (oauthProfile) {
                // In a real application, you would:
                // 1. Check if user exists in your database
                // 2. Create user if doesn't exist
                // 3. Generate appropriate user token
                // 4. Set up user permissions
                
                return {
                    isSuccess: true,
                    message: `OAuth login successful via ${oauthProfile.provider}`,
                    identification: {
                        isAnonymous: false,
                        appId: appId || 'oauth-app',
                        userId: `${oauthProfile.provider}-${oauthProfile.id}`,
                        userToken: `oauth-token-${Date.now()}`, // In production, use proper JWT
                        customOptions: {
                            oauthProvider: oauthProfile.provider,
                            userEmail: oauthProfile.email,
                            userDisplayName: oauthProfile.displayName,
                        },
                    },
                };
            }

            // Handle regular username/password login
            // In a real application, verify credentials against your database
            if (username === 'admin' && password === 'password') {
                return {
                    isSuccess: true,
                    message: 'Regular login successful',
                    identification: {
                        isAnonymous: false,
                        appId: appId || 'admin-app',
                        userId: username,
                        userToken: `token-${Date.now()}`,
                    },
                };
            }

            return {
                isSuccess: false,
                message: 'Invalid credentials',
            };
        },

        // Optional: Custom LLM execution tools based on user
        async createLlmExecutionTools(identification) {
            console.info(`🤖 Creating LLM tools for user:`, identification.userId);
            
            // In a real application, you might:
            // - Use different API keys based on user tier
            // - Apply rate limiting per user
            // - Log usage for billing
            
            // For this example, we'll use environment variables or default configuration
            return undefined; // Use default tools
        },
    });

    console.info(`✨ OAuth-enabled Promptbook Server is running on http://localhost:4444`);
    console.info(``);
    console.info(`Available OAuth providers:`);
    if (oauthConfig.facebook) console.info(`  🔵 Facebook: http://localhost:4444/auth/facebook`);
    if (oauthConfig.google) console.info(`  🔴 Google: http://localhost:4444/auth/google`);
    if (oauthConfig.linkedin) console.info(`  🔷 LinkedIn: http://localhost:4444/auth/linkedin`);
    if (oauthConfig.github) console.info(`  ⚫ GitHub: http://localhost:4444/auth/github`);
    console.info(``);
    console.info(`Regular login: POST http://localhost:4444/login`);
    console.info(`  Body: {"username": "admin", "password": "password", "appId": "test-app"}`);
    console.info(``);
    console.info(`API Documentation: http://localhost:4444/api-docs`);
    console.info(``);
    
    // Write sample .env file
    const envContent = spaceTrim(`
        # OAuth Configuration for Promptbook Server
        # Copy this to .env and fill in your OAuth app credentials
        
        SESSION_SECRET=your-random-secret-key-here
        BASE_URL=http://localhost:4444
        
        # Facebook OAuth App
        # FACEBOOK_CLIENT_ID=your-facebook-app-id
        # FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
        
        # Google OAuth App  
        # GOOGLE_CLIENT_ID=your-google-client-id
        # GOOGLE_CLIENT_SECRET=your-google-client-secret
        
        # LinkedIn OAuth App
        # LINKEDIN_CLIENT_ID=your-linkedin-client-id
        # LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
        
        # GitHub OAuth App
        # GITHUB_CLIENT_ID=your-github-client-id
        # GITHUB_CLIENT_SECRET=your-github-client-secret
    `);
    
    writeFileSync(join(__dirname, '.env.example'), envContent);
    console.info(`📄 Created .env.example file with OAuth configuration template`);
}

if (require.main === module) {
    main().catch(console.error);
}

/**
 * Note: To set up OAuth apps:
 * 
 * Facebook:
 * 1. Go to https://developers.facebook.com/
 * 2. Create an app, get Client ID and Secret
 * 3. Set redirect URI: http://localhost:4444/auth/facebook/callback
 * 
 * Google:
 * 1. Go to https://console.developers.google.com/
 * 2. Create OAuth 2.0 credentials
 * 3. Set redirect URI: http://localhost:4444/auth/google/callback
 * 
 * LinkedIn:
 * 1. Go to https://www.linkedin.com/developers/
 * 2. Create an app, get Client ID and Secret
 * 3. Set redirect URI: http://localhost:4444/auth/linkedin/callback
 * 
 * GitHub:
 * 1. Go to https://github.com/settings/developers
 * 2. Create OAuth App, get Client ID and Secret
 * 3. Set redirect URI: http://localhost:4444/auth/github/callback
 */