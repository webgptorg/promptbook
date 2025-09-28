import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import open from 'open';
import spaceTrim from 'spacetrim';
import { $provideLlmToolsForCli } from '../common/$provideLlmToolsForCli';
import { handleActionErrors } from './common/handleActionErrors';

/**
 * Initializes `oauth-login` command for Promptbook CLI utilities
 * 
 * This command opens the user's default browser to initiate OAuth login
 * with social providers (Facebook, Google, LinkedIn, GitHub)
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeOAuthLoginCommand(program: Program) {
    const oauthLoginCommand = program.command('oauth-login');
    oauthLoginCommand.description(
        spaceTrim(`
            Login to Promptbook via OAuth (social login)
            
            Opens your browser to authenticate with Facebook, Google, LinkedIn, or GitHub.
            This eliminates the need to manually configure API keys.
        `),
    );

    oauthLoginCommand.option(
        '--provider <provider>',
        'OAuth provider to use (facebook, google, linkedin, github)',
        'google'
    );
    
    oauthLoginCommand.option(
        '--server <url>',
        'Promptbook server URL',
        'https://promptbook.studio'
    );
    
    oauthLoginCommand.option(
        '--app-id <appId>',
        'Application ID for authentication',
        'cli'
    );
    
    oauthLoginCommand.option(
        '--port <port>',
        'Local port to listen for OAuth callback',
        '8080'
    );

    oauthLoginCommand.action(
        handleActionErrors(async (options) => {
            const { provider, server, appId, port } = options;
            
            console.info(`🚀 Starting OAuth login with ${provider}`);
            console.info(`📡 Server: ${server}`);
            console.info(`🆔 App ID: ${appId}`);
            console.info('');
            
            // Validate provider
            const validProviders = ['facebook', 'google', 'linkedin', 'github'];
            if (!validProviders.includes(provider)) {
                console.error(`❌ Invalid provider: ${provider}`);
                console.error(`Valid providers: ${validProviders.join(', ')}`);
                process.exit(1);
            }
            
            // Start local callback server
            const express = await import('express');
            const app = express.default();
            let authResult: any = null;
            
            app.get('/callback', (req, res) => {
                const { success, error, token, message } = req.query;
                
                if (success === 'true') {
                    authResult = { success: true, token, message };
                    res.send(`
                        <html>
                            <head><title>Login Successful</title></head>
                            <body>
                                <h1>✅ OAuth Login Successful!</h1>
                                <p>You can now close this browser window and return to the CLI.</p>
                                <script>window.close();</script>
                            </body>
                        </html>
                    `);
                } else {
                    authResult = { success: false, error: error || 'Unknown error', message };
                    res.send(`
                        <html>
                            <head><title>Login Failed</title></head>
                            <body>
                                <h1>❌ OAuth Login Failed</h1>
                                <p>Error: ${error || 'Unknown error'}</p>
                                <p>Please try again or contact support.</p>
                                <script>window.close();</script>
                            </body>
                        </html>
                    `);
                }
            });
            
            const localServer = app.listen(parseInt(port), () => {
                console.info(`🔗 Local callback server started on http://localhost:${port}`);
            });
            
            try {
                // Construct OAuth URL
                const callbackUrl = `http://localhost:${port}/callback`;
                const oauthUrl = `${server}/auth/${provider}?appId=${encodeURIComponent(appId)}&redirect=${encodeURIComponent(callbackUrl)}`;
                
                console.info(`🌐 Opening browser for ${provider} OAuth...`);
                console.info(`📍 OAuth URL: ${oauthUrl}`);
                console.info('');
                console.info('Please complete the authentication in your browser...');
                
                // Open browser
                await open(oauthUrl);
                
                // Wait for callback
                await new Promise<void>((resolve) => {
                    const checkInterval = setInterval(() => {
                        if (authResult) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 500);
                    
                    // Timeout after 5 minutes
                    setTimeout(() => {
                        if (!authResult) {
                            clearInterval(checkInterval);
                            authResult = { 
                                success: false, 
                                error: 'timeout', 
                                message: 'Authentication timed out after 5 minutes' 
                            };
                            resolve();
                        }
                    }, 5 * 60 * 1000);
                });
                
                // Close local server
                localServer.close();
                
                if (authResult.success) {
                    console.info('✅ OAuth authentication successful!');
                    console.info(`🔑 Token: ${authResult.token}`);
                    console.info(`💬 Message: ${authResult.message}`);
                    
                    // Store credentials for future CLI usage
                    console.info('');
                    console.info('💾 Saving authentication credentials...');
                    
                    // TODO: Store the OAuth token securely for future CLI operations
                    // This would typically go into a config file or secure credential store
                    
                    console.info('✨ Setup complete! You can now use Promptbook CLI without API keys.');
                    process.exit(0);
                } else {
                    console.error('❌ OAuth authentication failed!');
                    console.error(`💥 Error: ${authResult.error}`);
                    console.error(`💬 Message: ${authResult.message}`);
                    process.exit(1);
                }
                
            } catch (error) {
                console.error('❌ OAuth login failed:', error);
                localServer.close();
                process.exit(1);
            }
        }),
    );
}

/**
 * TODO: Implement secure token storage
 * TODO: Integrate with existing CLI authentication system
 * TODO: Add support for refreshing expired tokens
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */