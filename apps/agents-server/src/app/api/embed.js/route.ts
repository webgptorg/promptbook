import { spaceTrim } from '@promptbook-local/utils';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const protocol = request.nextUrl.protocol;
    const host = request.nextUrl.host;
    const baseUrl = `${protocol}//${host}`;

    const script = spaceTrim(`
        console.info('[🔌] Promptbook integration script from ${baseUrl}');

        (function() {
            if (customElements.get('promptbook-agent-integration')) {
                return;
            }

            class PromptbookAgentIntegrationElement extends HTMLElement {
                constructor() {
                    super();
                    console.info('[🔌] Initializing <promptbook-agent-integration/>',this);
                    this.iframe = null;
                }

                static get observedAttributes() {
                    return ['agent-url', 'meta'];
                }

                connectedCallback() {
                    this.render();
                    window.addEventListener('message', this.handleMessage.bind(this));
                }

                disconnectedCallback() {
                    window.removeEventListener('message', this.handleMessage.bind(this));
                }

                attributeChangedCallback(name, oldValue, newValue) {
                    if ((name === 'agent-url' || name === 'meta') && oldValue !== newValue) {
                        this.render();
                    }
                }

                handleMessage(event) {
                    if (event.data && event.data.type === 'PROMPTBOOK_AGENT_RESIZE') {
                        if (event.data.isOpen) {
                            // Match PromptbookAgentSeamlessIntegration.module.css dimensions
                            this.iframe.style.width = '400px';
                            this.iframe.style.height = '620px';
                            this.iframe.style.maxHeight = '80vh';
                            this.iframe.style.maxWidth = 'calc(100vw - 40px)';
                        } else {
                            // Closed state - just the button area
                            this.iframe.style.width = '140px';
                            this.iframe.style.height = '60px';
                            this.iframe.style.maxHeight = 'none';
                            this.iframe.style.maxWidth = 'none';
                        }
                    }
                }

                render() {
                    const agentUrl = this.getAttribute('agent-url');
                    if (!agentUrl) return;

                    if (!this.iframe) {
                        this.attachShadow({ mode: 'open' });
                        this.iframe = document.createElement('iframe');
                        this.iframe.style.border = 'none';
                        this.iframe.style.position = 'fixed';
                        this.iframe.style.bottom = '0';
                        this.iframe.style.right = '0';
                        // Initial size for the closed button state
                        this.iframe.style.width = '140px';
                        this.iframe.style.height = '60px';
                        this.iframe.style.zIndex = '2147483647'; // Max z-index
                        this.iframe.style.transition = 'width 0.3s ease, height 0.3s ease';
                        this.iframe.style.backgroundColor = 'transparent';
                        this.iframe.setAttribute('allow', 'microphone'); // Allow microphone if needed for voice
                        this.shadowRoot.appendChild(this.iframe);
                    }

                    // Construct embed URL pointing to the Next.js page we created
                    let embedUrl = '${baseUrl}/embed?agentUrl=' + encodeURIComponent(agentUrl);
                    
                    // Add meta parameter if provided
                    const metaAttr = this.getAttribute('meta');
                    if (metaAttr) {
                        try {
                            // Validate that it's valid JSON
                            JSON.parse(metaAttr);
                            embedUrl += '&meta=' + encodeURIComponent(metaAttr);
                        } catch (e) {
                            console.error('[🔌] Invalid meta JSON:', e);
                        }
                    }
                    
                    this.iframe.src = embedUrl;
                }
            }

            customElements.define('promptbook-agent-integration', PromptbookAgentIntegrationElement);
        })();
    `);

    return new NextResponse(script, {
        headers: {
            'Content-Type': 'application/javascript',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
