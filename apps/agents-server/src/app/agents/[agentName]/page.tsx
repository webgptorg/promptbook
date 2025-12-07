'use server';

import { $provideServer } from '@/src/tools/$provideServer';
import { isUserAdmin } from '@/src/utils/isUserAdmin';
import { PROMPTBOOK_COLOR } from '@promptbook-local/core';
import { notFound } from 'next/navigation';
import { Color } from '../../../../../../src/utils/color/Color';
import { darken } from '../../../../../../src/utils/color/operators/darken';
import { lighten } from '../../../../../../src/utils/color/operators/lighten';
import { getAgentName, getAgentProfile } from './_utils';
import { AgentProfileView } from './AgentProfileView';
import { generateAgentMetadata } from './generateAgentMetadata';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';

export const generateMetadata = generateAgentMetadata;

export default async function AgentPage({ params }: { params: Promise<{ agentName: string }> }) {
    const agentName = await getAgentName(params);
    const isAdmin = await isUserAdmin();

    let agentProfile;
    try {
        agentProfile = await getAgentProfile(agentName);
    } catch (error) {
        if (
            error instanceof Error &&
            // Note: This is a bit hacky, but valid way to check for specific error message
            (error.message.includes('Cannot coerce the result to a single JSON object') ||
                error.message.includes('JSON object requested, multiple (or no) results returned'))
        ) {
            notFound();
        }
        throw error;
    }

    const { publicUrl } = await $provideServer();

    // Build agent page URL for QR and copy
    const agentUrl = `${publicUrl.href}${encodeURIComponent(agentName)}`;
    // <- TODO: [🐱‍🚀] Better

    const agentEmail = `${agentName}@${publicUrl.hostname}`;

    // Extract brand color from meta and create color variations
    const brandColorString = agentProfile.meta.color || PROMPTBOOK_COLOR.toHex();
    const brandColors = brandColorString.split(',').map((c) => Color.fromSafe(c.trim()));

    // Ensure at least one color
    if (brandColors.length === 0) {
        brandColors.push(PROMPTBOOK_COLOR);
    }

    const brandColor = brandColors[0]!;
    const brandColorHex = brandColor.toHex();
    const brandColorLightHex = brandColor.then(lighten(0.2)).toHex();
    const brandColorDarkHex = brandColor.then(darken(0.15)).toHex();
    const brandColorsHex = brandColors.map((c) => c.toHex());

    // Generate Noisy SVG Background
    const color1 = brandColors[0]!;
    const color2 = brandColors[1] || brandColors[0]!; // Use secondary color or fallback to primary

    const color1Light = color1.then(lighten(0.2)).toHex();
    const color1Main = color1.toHex();
    const color1Dark = color1.then(darken(0.2)).toHex();

    const color2Light = color2.then(lighten(0.2)).toHex();
    const color2Main = color2.toHex();
    const color2Dark = color2.then(darken(0.2)).toHex();

    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 1920 1080"
  width="1920" height="1080"
  preserveAspectRatio="xMidYMid slice">
  <defs>
    <!-- Bottom-left -->
    <radialGradient id="grad1" cx="0%" cy="100%" r="90%">
      <stop offset="0%" stop-color="${color1Light}" />
      <stop offset="50%" stop-color="${color1Main}" />
      <stop offset="100%" stop-color="${color1Dark}" />
    </radialGradient>

    <!-- Bottom-right -->
    <radialGradient id="grad2" cx="100%" cy="100%" r="90%">
      <stop offset="0%" stop-color="${color2Light}" />
      <stop offset="50%" stop-color="${color2Main}" />
      <stop offset="100%" stop-color="${color2Dark}" />
    </radialGradient>

    <!-- White top fade -->
    <linearGradient id="whiteTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.7" />
    </linearGradient>

    <!-- Strong grain -->
    <filter id="grain" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="3.5" numOctaves="3" seed="8" result="noise" />
      <feComponentTransfer>
        <feFuncR type="linear" slope="3.5" intercept="-1.2" />
        <feFuncG type="linear" slope="3.5" intercept="-1.2" />
        <feFuncB type="linear" slope="3.5" intercept="-1.2" />
        <feFuncA type="table" tableValues="0 0.8" />
      </feComponentTransfer>
    </filter>
  </defs>

  <!-- White base -->
  <rect width="100%" height="100%" fill="#ffffff" />

  <!-- Gradients -->
  <rect width="100%" height="100%" fill="url(#grad1)" />
  <rect width="100%" height="100%" fill="url(#grad2)" style="mix-blend-mode:screen; opacity:0.85" />

  <!-- White fade on top -->
  <rect width="100%" height="100%" fill="url(#whiteTopGrad)" />

  <!-- Strong visible noise -->
  <rect width="100%" height="100%" filter="url(#grain)"
    style="mix-blend-mode:soft-light; opacity:1.2" />
</svg>
    `.trim();

    const backgroundImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}")`;

    const fullname = (agentProfile.meta.fullname || agentProfile.agentName || 'Agent') as string;
    const imageUrl = (agentProfile.meta.image as string) || null;

    return (
        <>
            <ServiceWorkerRegister scope={`/agents/${encodeURIComponent(agentName)}/`} />
            <AgentProfileView
                agentName={agentName}
                fullname={fullname}
                personaDescription={agentProfile.personaDescription || ''}
                imageUrl={imageUrl}
                agentUrl={agentUrl}
                agentEmail={agentEmail}
                brandColorHex={brandColorHex}
                brandColorLightHex={brandColorLightHex}
                brandColorDarkHex={brandColorDarkHex}
                brandColorsHex={brandColorsHex}
                backgroundImage={backgroundImage}
                meta={agentProfile.meta}
                isAdmin={isAdmin}
            />
        </>
    );
}

/**
 * TODO: [🐱‍🚀] Make this page look nice - 🃏
 * TODO: [🐱‍🚀] Show usage of LLM
 * TODO: [🚗] Components and pages here should be just tiny UI wraper around proper agent logic and conponents
 * TODO: [🎣][🧠] Maybe do API / Page for transpilers, Allow to export each agent
 */
