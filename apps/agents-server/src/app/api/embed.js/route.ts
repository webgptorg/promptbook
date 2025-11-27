import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const protocol = request.nextUrl.protocol;
    const host = request.nextUrl.host;
    const baseUrl = `${protocol}//${host}`;

    const script = `
(function() {
    if (customElements.get('promptbook-agent')) {
        return;
    }

    class PromptbookAgentElement extends HTMLElement {
        constructor() {
            super();
            this.iframe = null;
        }

        static get observedAttributes() {
            return ['agent-url'];
        }

        connectedCallback() {
            this.render();
            window.addEventListener('message', this.handleMessage.bind(this));
        }

        disconnectedCallback() {
            window.removeEventListener('message', this.handleMessage.bind(this));
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (name === 'agent-url' && oldValue !== newValue) {
                this.render();
            }
        }

        handleMessage(event) {
            if (event.data && event.data.type === 'PROMPTBOOK_AGENT_RESIZE') {
                if (event.data.isOpen) {
                    this.iframe.style.width = '450px';
                    this.iframe.style.height = '650px';
                    this.iframe.style.maxHeight = '90vh';
                    this.iframe.style.maxWidth = '90vw';
                    this.iframe.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    this.iframe.style.borderRadius = '12px';
                } else {
                    this.iframe.style.width = '60px';
                    this.iframe.style.height = '60px';
                    this.iframe.style.boxShadow = 'none';
                    this.iframe.style.borderRadius = '0';
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
                this.iframe.style.bottom = '20px';
                this.iframe.style.right = '20px';
                this.iframe.style.width = '60px';
                this.iframe.style.height = '60px';
                this.iframe.style.zIndex = '2147483647'; // Max z-index
                this.iframe.style.transition = 'width 0.3s ease, height 0.3s ease';
                this.iframe.style.backgroundColor = 'transparent';
                this.iframe.setAttribute('allow', 'microphone'); // Allow microphone if needed for voice
                this.shadowRoot.appendChild(this.iframe);
            }

            // Construct embed URL pointing to the Next.js page we created
            const embedUrl = '${baseUrl}/embed?agentUrl=' + encodeURIComponent(agentUrl);
            this.iframe.src = embedUrl;
        }
    }

    customElements.define('promptbook-agent', PromptbookAgentElement);
})();
    `;

    return new NextResponse(script, {
        headers: {
            'Content-Type': 'application/javascript',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
