import { spaceTrim } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';

/**
 * MIME type served by the website integration script endpoint.
 */
const JAVASCRIPT_CONTENT_TYPE = 'application/javascript';

/**
 * Cross-origin policy for embeddable website integration script delivery.
 */
const EMBED_SCRIPT_CORS_ORIGIN = '*';

/**
 * Builds the browser script that powers `<promptbook-agent-integration/>`.
 *
 * @param baseUrl - Public base URL of the current Agents Server instance.
 * @returns JavaScript payload returned by `/api/embed.js`.
 */
function createEmbedScript(baseUrl: string): string {
    return spaceTrim(`
        console.info('[🔌] Promptbook integration script from ${baseUrl}');

        (function() {
            if (customElements.get('promptbook-agent-integration')) {
                return;
            }

            const OPEN_MESSAGE_TYPE = 'PROMPTBOOK_AGENT_SET_OPEN';
            const RESIZE_MESSAGE_TYPE = 'PROMPTBOOK_AGENT_RESIZE';
            const DEFAULT_WIDGET_COLOR = '#0f6fe6';
            const DEFAULT_WIDGET_TITLE = 'Chat with Agent';
            const WIDGET_Z_INDEX = '2147483647';

            function parseMeta(rawMeta) {
                if (!rawMeta) {
                    return null;
                }

                try {
                    const parsed = JSON.parse(rawMeta);
                    return parsed && typeof parsed === 'object' ? parsed : null;
                } catch {
                    return null;
                }
            }

            function deriveAgentName(agentUrl) {
                try {
                    const parsedUrl = new URL(agentUrl);
                    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
                    const lastSegment = pathSegments[pathSegments.length - 1];
                    return lastSegment ? decodeURIComponent(lastSegment) : null;
                } catch {
                    return null;
                }
            }

            class PromptbookAgentIntegrationElement extends HTMLElement {
                constructor() {
                    super();
                    this.iframe = null;
                    this.launcherButton = null;
                    this.launcherTitle = null;
                    this.launcherAvatar = null;
                    this.isOpen = false;
                    this.isIframeLoaded = false;

                    this.handleLauncherClick = this.handleLauncherClick.bind(this);
                    this.handleDocumentPointerDown = this.handleDocumentPointerDown.bind(this);
                    this.handleMessage = this.handleMessage.bind(this);
                }

                static get observedAttributes() {
                    return ['agent-url', 'meta'];
                }

                connectedCallback() {
                    if (!this.shadowRoot) {
                        this.attachShadow({ mode: 'open' });
                    }

                    this.render();
                    this.syncLauncherVisuals();

                    window.addEventListener('message', this.handleMessage);
                    document.addEventListener('pointerdown', this.handleDocumentPointerDown, true);
                }

                disconnectedCallback() {
                    window.removeEventListener('message', this.handleMessage);
                    document.removeEventListener('pointerdown', this.handleDocumentPointerDown, true);
                }

                attributeChangedCallback(name, oldValue, newValue) {
                    if ((name === 'agent-url' || name === 'meta') && oldValue !== newValue) {
                        this.syncLauncherVisuals();
                        this.updateIframeSource();
                    }
                }

                render() {
                    if (!this.shadowRoot) {
                        return;
                    }

                    this.shadowRoot.innerHTML = [
                        '<style>',
                        '  :host { position: fixed; inset: 0; z-index: ' + WIDGET_Z_INDEX + '; pointer-events: none; }',
                        '  .launcher {',
                        '    position: fixed;',
                        '    right: 20px;',
                        '    bottom: 20px;',
                        '    display: inline-flex;',
                        '    align-items: center;',
                        '    gap: 10px;',
                        '    min-height: 58px;',
                        '    padding: 9px 16px 9px 10px;',
                        '    border: 1px solid rgba(255, 255, 255, 0.45);',
                        '    border-radius: 999px;',
                        '    cursor: pointer;',
                        '    color: #fff;',
                        '    background: var(--promptbook-widget-color, ' + DEFAULT_WIDGET_COLOR + ');',
                        '    box-shadow: 0 14px 32px rgba(15, 111, 230, 0.3), 0 4px 10px rgba(15, 111, 230, 0.15);',
                        '    transform-origin: bottom right;',
                        '    transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;',
                        '    pointer-events: auto;',
                        '    font-family: "Segoe UI", Tahoma, sans-serif;',
                        '    user-select: none;',
                        '    -webkit-tap-highlight-color: transparent;',
                        '  }',
                        '  .launcher:hover {',
                        '    transform: translateY(-2px) scale(1.01);',
                        '    box-shadow: 0 18px 40px rgba(15, 111, 230, 0.35), 0 6px 14px rgba(15, 111, 230, 0.2);',
                        '  }',
                        '  .launcher:focus-visible {',
                        '    outline: none;',
                        '    box-shadow:',
                        '      0 0 0 3px rgba(255, 255, 255, 0.95),',
                        '      0 0 0 6px rgba(15, 111, 230, 0.65),',
                        '      0 14px 32px rgba(15, 111, 230, 0.3);',
                        '  }',
                        '  .launcher.hidden {',
                        '    opacity: 0;',
                        '    pointer-events: none;',
                        '    transform: translateY(8px) scale(0.96);',
                        '  }',
                        '  .avatar {',
                        '    width: 40px;',
                        '    height: 40px;',
                        '    min-width: 40px;',
                        '    border-radius: 50%;',
                        '    background-size: cover;',
                        '    background-position: center;',
                        '    background-repeat: no-repeat;',
                        '    background-color: rgba(255, 255, 255, 0.35);',
                        '    border: 2px solid rgba(255, 255, 255, 0.72);',
                        '    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);',
                        '  }',
                        '  .copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; text-align: left; }',
                        '  .label { font-size: 14px; font-weight: 700; line-height: 1; }',
                        '  .title { font-size: 12px; opacity: 0.9; max-width: 170px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }',
                        '  @media (max-width: 480px) {',
                        '    .launcher { right: 12px; bottom: 12px; }',
                        '    .title { max-width: 132px; }',
                        '  }',
                        '</style>',
                        '<button type="button" class="launcher" aria-label="Open chat widget">',
                        '  <span class="avatar" aria-hidden="true"></span>',
                        '  <span class="copy">',
                        '    <span class="label">Chat</span>',
                        '    <span class="title"></span>',
                        '  </span>',
                        '</button>',
                    ].join('');

                    this.launcherButton = this.shadowRoot.querySelector('.launcher');
                    this.launcherTitle = this.shadowRoot.querySelector('.title');
                    this.launcherAvatar = this.shadowRoot.querySelector('.avatar');

                    if (this.launcherButton) {
                        this.launcherButton.addEventListener('click', this.handleLauncherClick);
                    }

                    this.applyVisualState();
                }

                handleLauncherClick() {
                    this.setOpenState(true, { syncIframe: true });
                }

                handleDocumentPointerDown(event) {
                    if (!this.isOpen || !this.iframe) {
                        return;
                    }

                    const target = event.target;
                    if (target instanceof Node && this.launcherButton && this.launcherButton.contains(target)) {
                        return;
                    }

                    const iframeRect = this.iframe.getBoundingClientRect();
                    const isInsideIframeBounds =
                        event.clientX >= iframeRect.left &&
                        event.clientX <= iframeRect.right &&
                        event.clientY >= iframeRect.top &&
                        event.clientY <= iframeRect.bottom;

                    if (isInsideIframeBounds) {
                        return;
                    }

                    this.setOpenState(false, { syncIframe: true });
                }

                handleMessage(event) {
                    if (!this.iframe || event.source !== this.iframe.contentWindow) {
                        return;
                    }

                    if (event.data && event.data.type === RESIZE_MESSAGE_TYPE) {
                        this.setOpenState(Boolean(event.data.isOpen), { syncIframe: false });
                    }
                }

                getAgentUrl() {
                    return this.getAttribute('agent-url');
                }

                getMeta() {
                    return parseMeta(this.getAttribute('meta'));
                }

                syncLauncherVisuals() {
                    if (!this.launcherButton || !this.launcherTitle || !this.launcherAvatar) {
                        return;
                    }

                    const agentUrl = this.getAgentUrl();
                    if (!agentUrl) {
                        this.launcherTitle.textContent = DEFAULT_WIDGET_TITLE;
                        this.launcherAvatar.style.backgroundImage = '';
                        this.launcherButton.style.setProperty('--promptbook-widget-color', DEFAULT_WIDGET_COLOR);
                        return;
                    }

                    const meta = this.getMeta();
                    const displayName = meta?.fullname || deriveAgentName(agentUrl) || DEFAULT_WIDGET_TITLE;
                    const avatarUrl = meta?.image || (agentUrl + '/images/default-avatar.png');
                    const color = meta?.color || DEFAULT_WIDGET_COLOR;

                    this.launcherTitle.textContent = displayName;
                    this.launcherButton.setAttribute('aria-label', 'Open chat with ' + displayName);
                    this.launcherButton.style.setProperty('--promptbook-widget-color', color);
                    this.launcherAvatar.style.backgroundImage = "url('" + avatarUrl.replace(/'/g, '%27') + "')";
                }

                buildEmbedUrl(openOnLoad) {
                    const agentUrl = this.getAgentUrl();
                    if (!agentUrl) {
                        return null;
                    }

                    let embedUrl = '${baseUrl}/embed?agentUrl=' + encodeURIComponent(agentUrl);
                    if (openOnLoad) {
                        embedUrl += '&open=1';
                    }

                    const metaAttr = this.getAttribute('meta');
                    if (metaAttr) {
                        const parsedMeta = parseMeta(metaAttr);
                        if (parsedMeta) {
                            embedUrl += '&meta=' + encodeURIComponent(metaAttr);
                        } else {
                            console.error('[🔌] Invalid meta JSON:', metaAttr);
                        }
                    }

                    return embedUrl;
                }

                ensureIframe(openOnLoad) {
                    if (this.iframe) {
                        return this.iframe;
                    }

                    const embedUrl = this.buildEmbedUrl(openOnLoad);
                    if (!embedUrl) {
                        return null;
                    }

                    this.iframe = document.createElement('iframe');
                    this.iframe.style.border = '1px solid rgba(164, 186, 214, 0.45)';
                    this.iframe.style.position = 'fixed';
                    this.iframe.style.bottom = '0';
                    this.iframe.style.right = '0';
                    this.iframe.style.zIndex = WIDGET_Z_INDEX;
                    this.iframe.style.backgroundColor = 'transparent';
                    this.iframe.style.borderRadius = '22px';
                    this.iframe.style.overflow = 'hidden';
                    this.iframe.style.boxShadow = '0 24px 60px rgba(9, 34, 66, 0.24), 0 8px 22px rgba(9, 34, 66, 0.14)';
                    this.iframe.style.transition =
                        'width 0.24s ease, height 0.24s ease, opacity 0.24s ease, transform 0.24s ease';
                    this.iframe.style.transformOrigin = 'bottom right';
                    this.iframe.style.willChange = 'width, height, opacity, transform';
                    this.iframe.setAttribute('allow', 'microphone; autoplay; clipboard-write');
                    this.iframe.src = embedUrl;

                    this.iframe.addEventListener('load', () => {
                        this.isIframeLoaded = true;
                        this.postOpenStateToIframe(this.isOpen);
                    });

                    if (this.shadowRoot) {
                        this.shadowRoot.appendChild(this.iframe);
                    }

                    this.applyVisualState();
                    return this.iframe;
                }

                postOpenStateToIframe(isOpen) {
                    if (!this.iframe || !this.iframe.contentWindow) {
                        return;
                    }

                    this.iframe.contentWindow.postMessage({ type: OPEN_MESSAGE_TYPE, isOpen }, '*');
                }

                setOpenState(nextIsOpen, options = { syncIframe: true }) {
                    const agentUrl = this.getAgentUrl();
                    if (!agentUrl) {
                        return;
                    }

                    if (nextIsOpen) {
                        this.ensureIframe(true);
                    }

                    this.isOpen = nextIsOpen;
                    this.applyVisualState();

                    if (options.syncIframe) {
                        this.postOpenStateToIframe(nextIsOpen);
                    }
                }

                applyVisualState() {
                    if (this.launcherButton) {
                        this.launcherButton.classList.toggle('hidden', this.isOpen);
                    }

                    if (!this.iframe) {
                        return;
                    }

                    if (this.isOpen) {
                        this.iframe.style.width = '420px';
                        this.iframe.style.height = '640px';
                        this.iframe.style.maxHeight = 'calc(80vh + 40px)';
                        this.iframe.style.maxWidth = 'calc(100vw - 20px)';
                        this.iframe.style.opacity = '1';
                        this.iframe.style.pointerEvents = 'auto';
                        this.iframe.style.transform = 'scale(1)';
                    } else {
                        this.iframe.style.width = '1px';
                        this.iframe.style.height = '1px';
                        this.iframe.style.maxHeight = 'none';
                        this.iframe.style.maxWidth = 'none';
                        this.iframe.style.opacity = '0';
                        this.iframe.style.pointerEvents = 'none';
                        this.iframe.style.transform = 'scale(0.97)';
                    }
                }

                updateIframeSource() {
                    if (!this.iframe) {
                        return;
                    }

                    const embedUrl = this.buildEmbedUrl(this.isOpen);
                    if (!embedUrl) {
                        return;
                    }

                    if (this.iframe.src !== embedUrl) {
                        this.iframe.src = embedUrl;
                    }
                }
            }

            customElements.define('promptbook-agent-integration', PromptbookAgentIntegrationElement);
        })();
    `);
}

/**
 * Serves the embeddable website integration script.
 *
 * @param request - Incoming Next.js request context.
 * @returns JavaScript response for `<promptbook-agent-integration/>`.
 */
export async function GET(request: NextRequest) {
    const protocol = request.nextUrl.protocol;
    const host = request.nextUrl.host;
    const baseUrl = `${protocol}//${host}`;
    const script = createEmbedScript(baseUrl);

    return new NextResponse(script, {
        headers: {
            'Content-Type': JAVASCRIPT_CONTENT_TYPE,
            'Access-Control-Allow-Origin': EMBED_SCRIPT_CORS_ORIGIN,
        },
    });
}
