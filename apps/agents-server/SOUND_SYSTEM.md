# Chat Sound System

This document describes the chat sound system implementation for the Agents Server application.

## Overview

The sound system adds gentle, non-annoying audio feedback to the chat interface for better user experience. All sounds can be muted by the user and the setting is persisted in localStorage.

## Architecture

The sound system follows a decoupled, scalable architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────┐
│           Agents Server Application             │
├─────────────────────────────────────────────────┤
│  AgentChatWrapper                               │
│  └─ createDefaultSoundSystem()                  │
│     └─ SoundSystem (implements ChatSoundSystem) │
└─────────────────────────────────────────────────┘
                     ↓ (soundSystem prop)
┌─────────────────────────────────────────────────┐
│           Promptbook Components                 │
├─────────────────────────────────────────────────┤
│  <Chat/> Component                              │
│  └─ Uses ChatSoundSystem interface              │
│     └─ Triggers sound events                    │
│        └─ message_send, message_receive, etc.   │
└─────────────────────────────────────────────────┘
```

### Key Components

1. **ChatSoundSystem Interface** (`src/book-components/Chat/Chat/ChatProps.tsx`)
   - Defines the contract for sound systems
   - Allows the Chat component to remain decoupled from implementation details
   - Methods: `play(event: string)`, `isEnabled()`, `setEnabled(enabled)`, `toggle()`

2. **SoundSystem Class** (`apps/agents-server/src/utils/sound/SoundSystem.ts`)
   - Implements the `ChatSoundSystem` interface
   - Manages audio assets and playback
   - Handles localStorage persistence
   - Supports volume control and overlap prevention

3. **Chat Component Integration** (`src/book-components/Chat/Chat/Chat.tsx`)
   - Receives `soundSystem` as an optional prop
   - Triggers sounds for various events:
     - User sends message → `message_send`
     - Agent sends message → `message_receive`
     - Agent is typing → `message_typing`
     - Any button click → `button_click`

4. **ChatEffectsSystem Integration** (`src/book-components/Chat/effects/ChatEffectsSystem.tsx`)
   - Receives `soundSystem` via props
   - Triggers sounds when visual effects are shown:
     - Confetti effect (🎉) → `effect_confetti`
     - Hearts effect (❤️) → `effect_hearts`

5. **Sound & Vibration Toggles UI** (`src/book-components/Chat/Chat/ChatSoundToggle.tsx` and `ChatVibrationToggle.tsx`)
   - Provides menu controls for enabling/disabling sounds (🔊/🔇) and haptics (📳/📴)
   - Surface the controls in the global header control panel (`HeaderControlPanelDropdown`/`HeaderControlPanelMobile`) so they feel available across every chat instead of being tucked behind a save menu
   - Persists both states via the SoundSystem
   - The two switches still live inside `ChatSoundAndVibrationPanel`, a compact control card with lucide icons, descriptive labels, and tiny status badges so both controls remain obvious yet unobtrusive

## Sound Events

The following sound events are supported:

| Event | Trigger | Description |
|-------|---------|-------------|
| `message_send` | User sends a message | Subtle "whoosh" sound |
| `message_receive` | Agent sends a complete message | Soft "ding" notification sound |
| `tool_call_chip` | A tool call chip is shown next to an agent message | Subtle "ding" to highlight tool usage |
| `message_typing` | Agent is thinking/typing | Light typing indicator sound |
| `button_click` | Any button is clicked | Light "tap" sound |
| `effect_confetti` | Confetti effect is triggered (🎉) | Celebratory sound |
| `effect_hearts` | Hearts effect is triggered (❤️) | Gentle romantic sound |

### Streaming vibration feedback

- `message_stream_chunk` — Vibrates for each streaming token/chunk emitted by the agent so users can feel the finished response arriving even before the final text is rendered. This event does not play a sound file and is only triggered through `ChatSoundSystem.vibrate`.

## Sound Assets

Sound files should be placed in: `apps/agents-server/public/sounds/`

Required files:
- `whoosh.mp3` - Subtle whoosh for message send
- `ding.mp3` - Soft ding for message receive
- `typing.mp3` - Light typing indicator
- `tap.mp3` - Button click sound
- `confetti.mp3` - Celebration sound
- `hearts.mp3` - Gentle hearts sound

See `apps/agents-server/public/sounds/README.md` for detailed requirements and recommended sources.

## Configuration

### Default Configuration

The default sound system is created with these settings:

```typescript
{
  message_send: { path: '/sounds/whoosh.mp3', volume: 0.3, allowOverlap: false },
  message_receive: { path: '/sounds/ding.mp3', volume: 0.4, allowOverlap: false },
  tool_call_chip: { path: '/sounds/ding.mp3', volume: 0.35, allowOverlap: true },
  message_typing: { path: '/sounds/typing.mp3', volume: 0.2, allowOverlap: false },
  button_click: { path: '/sounds/tap.mp3', volume: 0.25, allowOverlap: true },
  effect_confetti: { path: '/sounds/confetti.mp3', volume: 0.35, allowOverlap: false },
  effect_hearts: { path: '/sounds/hearts.mp3', volume: 0.3, allowOverlap: false },
}
```

### Custom Configuration

You can create a custom sound system:

```typescript
import { SoundSystem } from '@/utils/sound/SoundSystem';

const customSoundSystem = new SoundSystem(
  {
    message_send: { path: '/custom/send.mp3', volume: 0.5 },
    // ... other events
  },
  'my_custom_storage_key'
);
```

### Default preferences via metadata

Admins can configure the initial sound and vibration state via the metadata keys `DEFAULT_IS_SOUNDS_ON` (default `false`) and `DEFAULT_IS_VIBRATION_ON` (default `true`). The layout fetches those defaults and feeds them into the shared `SoundSystemProvider`, which in turn builds the `createDefaultSoundSystem`, so the first experience matches the server settings before a user saves any preference. Update the metadata entry through the admin Metadata screen or `/api/metadata` to adjust the defaults without touching the client storage.

## Usage

### In Agents Server

The sound system is automatically integrated via `AgentChatWrapper`:

```typescript
// apps/agents-server/src/app/agents/[agentName]/AgentChatWrapper.tsx
const soundSystem = useMemo(() => {
  if (typeof window === 'undefined') return undefined;
  return createDefaultSoundSystem();
}, []);

return (
  <AgentChat
    soundSystem={soundSystem}
    // ... other props
  />
);
```

The save menu now surfaces both `ChatSoundToggle` and `ChatVibrationToggle`, letting users mute audio while keeping haptics (or vice versa). Each toggle persists its state in localStorage and honors the metadata defaults that were described above.

### In Custom Chat Implementations

```typescript
import { Chat } from '@promptbook/components';
import { createDefaultSoundSystem } from '@/utils/sound/createDefaultSoundSystem';

function MyChat() {
  const soundSystem = useMemo(() => createDefaultSoundSystem(), []);

  return (
    <Chat
      soundSystem={soundSystem}
      messages={messages}
      onMessage={handleMessage}
      // ... other props
    />
  );
}
```

### Programmatic Control

```typescript
// Enable/disable sounds
soundSystem.setEnabled(false);

// Toggle sounds
const newState = soundSystem.toggle(); // Returns new enabled state

// Check if enabled
if (soundSystem.isEnabled()) {
  console.log('Sounds are on');
}

// Play a specific sound
await soundSystem.play('message_send');

// Change volume for specific event
soundSystem.setVolume('message_receive', 0.8);

// Change global volume
soundSystem.setGlobalVolume(0.5);

// Stop all sounds
soundSystem.stopAll();
```

## User Experience

### Sound Design Principles

All sounds follow these principles:
1. **Gentle** - Not jarring or startling
2. **Short** - Less than 2 seconds duration
3. **Professional** - Appropriate for work environments
4. **Subtle** - Low volume by default (0.2-0.4)
5. **User-controllable** - Can be muted at any time

### Persistence

The enabled/disabled state for sound and vibration is saved in localStorage with the keys `promptbook_chat_sounds_enabled` and `promptbook_chat_vibration_enabled`. This means:
- User preferences persist across browser sessions
- Each browser/device has its own setting
- No server-side configuration needed

### Accessibility

- Sounds are optional and can be disabled
- Visual feedback is always provided alongside sounds
- Sounds never convey critical information alone
- Screen readers are not affected by the sound system

## Extension Guide

### Adding New Sound Events

1. Add the event type to `SoundEvent` in `SoundSystem.ts`:

```typescript
export type SoundEvent =
  | 'message_send'
  | 'message_receive'
  // ... existing events
  | 'my_new_event'; // Add here
```

2. Add the sound configuration in `createDefaultSoundSystem.ts`:

```typescript
export function createDefaultSoundSystem(): SoundSystem {
  return new SoundSystem({
    // ... existing events
    my_new_event: {
      path: '/sounds/my_sound.mp3',
      volume: 0.3,
      allowOverlap: false,
    },
  });
}
```

3. Trigger the sound in your component:

```typescript
if (soundSystem) {
  soundSystem.play('my_new_event');
}
```

### Creating Custom Effects

To add sounds to new visual effects:

1. Add the effect type to `ChatEffectConfig`
2. Update `ChatEffectsSystem` to map the effect to a sound event
3. Add the sound configuration to `createDefaultSoundSystem()`

## ElevenLabs speech playback

-   Each completed chat bubble now exposes a Play button that sanitizes the markdown, sends it to `/api/elevenlabs/speech`, and streams back the generated mp3 instead of letting the browser hold the API key.
-   Enable the feature by setting `ELEVENLABS_API_KEY` on the server and optionally editing `apps/agents-server/config/elevenlabs-voice.json` (or overriding `ELEVENLABS_VOICE_ID` when the file is absent) to tweak the voice choice.

## Testing

### Manual Testing

1. Open the Agents Server chat interface
2. Send messages and verify sounds play
3. Click buttons and verify tap sound
4. Trigger effects (🎉, ❤️) and verify effect sounds
5. Toggle sounds off/on via save menu
6. Refresh page and verify setting persists

### Browser Console Testing

```javascript
// Create a test sound system
const testSound = new Audio('/sounds/ding.mp3');
testSound.volume = 0.4;
testSound.play();

// Check localStorage
localStorage.getItem('promptbook_chat_sounds_enabled'); // Should return 'true' or 'false'
```

## Troubleshooting

### Sounds Not Playing

1. **Check browser autoplay policy**
   - Some browsers block autoplay until user interaction
   - First sound may not play immediately

2. **Check sound files exist**
   - Verify files are in `apps/agents-server/public/sounds/`
   - Check browser console for 404 errors

3. **Check volume settings**
   - Verify computer/browser volume is not muted
   - Check SoundSystem volume configuration

4. **Check enabled state**
   - Open browser console: `localStorage.getItem('promptbook_chat_sounds_enabled')`
   - Should be `'true'` or `null` (defaults to enabled)

### Performance Issues

If sounds cause lag:
1. Reduce the number of audio instances in `preloadSounds()` (default is 3)
2. Use smaller audio files
3. Disable overlap for more events (`allowOverlap: false`)

## Best Practices

1. **Always check for soundSystem presence**
   ```typescript
   if (soundSystem) {
     soundSystem.play('event');
   }
   ```

2. **Don't await sound playback in critical paths**
   ```typescript
   // Good - non-blocking
   /* not await */ soundSystem.play('message_send');
   await sendMessageToServer();

   // Bad - blocks execution
   await soundSystem.play('message_send');
   await sendMessageToServer();
   ```

3. **Use appropriate volumes**
   - Background sounds: 0.2-0.3
   - Notification sounds: 0.3-0.4
   - Effect sounds: 0.3-0.4
   - Button clicks: 0.2-0.3

4. **Respect user preferences**
   - Always provide a way to disable sounds
   - Make the toggle easily discoverable
   - Persist the setting

## References

- Sound system implementation: `apps/agents-server/src/utils/sound/`
- Chat component integration: `src/book-components/Chat/Chat/Chat.tsx`
- Effects integration: `src/book-components/Chat/effects/ChatEffectsSystem.tsx`
- Props interface: `src/book-components/Chat/Chat/ChatProps.tsx`
- Changelog entry: `changelog/_current-preversion.md`
