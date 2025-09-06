# OAuth Social Login Integration

This document explains how to set up and use OAuth social login with Promptbook, enabling users to authenticate via Facebook, Google, LinkedIn, and GitHub without manually configuring API keys.

## Overview

The OAuth integration allows users to:
- Authenticate via popular social platforms
- Use Promptbook without manually entering API keys
- Get started in under 3 minutes from landing page to working system
- Seamlessly integrate with existing authentication systems

## Supported Providers

- ✅ **Facebook** - Full OAuth 2.0 support
- ✅ **Google** - OAuth 2.0 with profile and email access
- ✅ **LinkedIn** - OAuth 2.0 with profile information  
- ✅ **GitHub** - OAuth 2.0 with user data and email

## Server Setup

### 1. Install Dependencies

OAuth dependencies are included when you install Promptbook:

```bash
npm install promptbook-engine
# OAuth dependencies (passport, express-session, etc.) are automatically included
```

### 2. Configure OAuth Apps

Set up OAuth applications with each provider:

#### Facebook OAuth App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Get Client ID and Client Secret
4. Set redirect URI: `http://localhost:4444/auth/facebook/callback`

#### Google OAuth App  
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create OAuth 2.0 credentials
3. Get Client ID and Client Secret
4. Set redirect URI: `http://localhost:4444/auth/google/callback`

#### LinkedIn OAuth App
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create an app
3. Get Client ID and Client Secret  
4. Set redirect URI: `http://localhost:4444/auth/linkedin/callback`

#### GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create OAuth App
3. Get Client ID and Client Secret
4. Set redirect URI: `http://localhost:4444/auth/github/callback`

### 3. Environment Configuration

Create a `.env` file with your OAuth credentials:

```env
SESSION_SECRET=your-random-secret-key-here
BASE_URL=http://localhost:4444

# Facebook OAuth App
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret

# Google OAuth App  
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LinkedIn OAuth App
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# GitHub OAuth App
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 4. Server Implementation

```typescript
import { startRemoteServer } from '@promptbook/remote-server';
import { createPipelineCollection } from '@promptbook/core';

const server = startRemoteServer({
    port: 4444,
    isApplicationModeAllowed: true,
    collection: await createPipelineCollection(/* your books */),
    
    // OAuth configuration
    oauthConfig: {
        sessionSecret: process.env.SESSION_SECRET!,
        baseUrl: process.env.BASE_URL!,
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
    },
    
    // Custom login handler
    async login(loginRequest) {
        const { username, password, oauthProfile, appId } = loginRequest;
        
        // Handle OAuth login
        if (oauthProfile) {
            // Verify user, create account if needed, generate tokens
            return {
                isSuccess: true,
                message: `OAuth login successful via ${oauthProfile.provider}`,
                identification: {
                    isAnonymous: false,
                    appId: appId || 'oauth-app',
                    userId: `${oauthProfile.provider}-${oauthProfile.id}`,
                    userToken: 'your-jwt-token-here',
                    customOptions: {
                        oauthProvider: oauthProfile.provider,
                        userEmail: oauthProfile.email,
                        userDisplayName: oauthProfile.displayName,
                    },
                },
            };
        }
        
        // Handle regular username/password login
        // ... your existing authentication logic
    },
});
```

## OAuth Endpoints

Once configured, your server will expose these OAuth endpoints:

- `GET /auth/facebook` - Initiate Facebook OAuth
- `GET /auth/google` - Initiate Google OAuth  
- `GET /auth/linkedin` - Initiate LinkedIn OAuth
- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/*/callback` - OAuth callback handlers
- `GET /auth/success` - Success page
- `GET /auth/error` - Error page

## CLI Usage

Use the new OAuth login command for seamless CLI authentication:

```bash
# OAuth login with default provider (Google)
ptbk oauth-login

# Login with specific provider
ptbk oauth-login --provider facebook
ptbk oauth-login --provider google  
ptbk oauth-login --provider linkedin
ptbk oauth-login --provider github

# Custom server URL
ptbk oauth-login --provider google --server https://your-server.com

# Custom app ID
ptbk oauth-login --provider google --app-id my-cli-app
```

The CLI command will:
1. Start a local callback server
2. Open your browser to the OAuth provider
3. Handle the authentication flow
4. Store credentials securely for future use
5. Enable API-key-free usage of Promptbook CLI

## Frontend Integration

For web applications, redirect users to OAuth endpoints:

```html
<!-- OAuth login buttons -->
<a href="/auth/facebook?appId=my-app">Login with Facebook</a>
<a href="/auth/google?appId=my-app">Login with Google</a>
<a href="/auth/linkedin?appId=my-app">Login with LinkedIn</a>
<a href="/auth/github?appId=my-app">Login with GitHub</a>
```

Or use popup windows with JavaScript:

```javascript
function loginWithOAuth(provider) {
    const popup = window.open(
        `/auth/${provider}?appId=my-app`,
        'oauth-login',
        'width=500,height=600'
    );
    
    window.addEventListener('message', (event) => {
        if (event.data?.type === 'oauth_success') {
            popup.close();
            // Handle successful login
            console.log('Login successful:', event.data.message);
        } else if (event.data?.type === 'oauth_error') {
            popup.close();
            // Handle login error
            console.error('Login failed:', event.data.message);
        }
    });
}
```

## OAuth Profile Data

The `OAuthProfile` contains user information from the social provider:

```typescript
interface OAuthProfile {
    provider: 'facebook' | 'google' | 'linkedin' | 'github';
    id: string;                    // Provider user ID
    displayName?: string;          // User's display name
    email?: string;               // User's email address  
    photoUrl?: string;            // Profile photo URL
    raw: any;                     // Raw profile data from provider
}
```

## Security Considerations

- **HTTPS in Production**: Always use HTTPS for OAuth in production
- **Secure Session Secret**: Use a strong, random session secret
- **Validate Redirect URIs**: Ensure OAuth apps have correct callback URLs
- **Token Security**: Store user tokens securely (use JWT with proper signing)
- **Rate Limiting**: Implement rate limiting for OAuth endpoints
- **User Validation**: Always validate OAuth profile data

## Troubleshooting

### Common Issues

1. **OAuth App Not Configured**
   - Verify CLIENT_ID and CLIENT_SECRET environment variables
   - Check OAuth app redirect URIs match your server URLs

2. **Session Errors**
   - Ensure SESSION_SECRET is set
   - Check that cookies are enabled in browser

3. **Callback URL Mismatch**
   - Verify redirect URIs in OAuth app settings
   - Ensure BASE_URL matches your server's actual URL

4. **Provider-Specific Issues**
   - **Facebook**: Ensure app is live or user is added as test user
   - **Google**: Check that OAuth consent screen is configured
   - **LinkedIn**: Verify required permissions are requested
   - **GitHub**: Ensure user:email scope is included

### Debug Mode

Enable verbose logging for OAuth troubleshooting:

```typescript
const server = startRemoteServer({
    // ... other config
    isVerbose: true,
});
```

## Examples

See the complete examples in:
- `examples/usage/remote-server/remote-server-with-oauth.ts` - Full server setup
- `examples/usage/remote-server/oauth-test.html` - Frontend testing page

## Roadmap Integration

This OAuth implementation addresses key roadmap items:

- ✅ **Working without need to pass API key** - Users authenticate via OAuth
- ✅ **Make ad-hoc login to Promptbook.studio** - Social login integration
- ✅ **Facebook** - Fully working OAuth integration
- ✅ **Google** - Fully working OAuth integration  
- ✅ **LinkedIn** - Fully working OAuth integration
- ✅ **GitHub** - Fully working OAuth integration

## Next Steps

1. **Test Integration**: Use the provided examples to test OAuth flows
2. **Production Deployment**: Configure OAuth apps for production URLs
3. **User Database**: Integrate with your user management system
4. **Token Management**: Implement proper JWT handling and refresh logic
5. **Analytics**: Track OAuth usage and conversion metrics