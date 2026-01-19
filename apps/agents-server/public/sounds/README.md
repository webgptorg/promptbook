# Chat Sound Assets

This directory contains sound effects for the chat interface.

## Required Sound Files

The following MP3 files are needed:

1. **whoosh.mp3** - Subtle whoosh sound when user sends a message
2. **ding.mp3** - Soft ding/notification sound when agent sends a message
3. **typing.mp3** - Light typing indicator sound when agent is thinking
4. **tap.mp3** - Light tap sound for button clicks
5. **confetti.mp3** - Celebratory sound for confetti effect (🎉)
6. **hearts.mp3** - Gentle sound for hearts effect (❤️)

## Sound Requirements

- Format: MP3
- Duration: 0.5-2 seconds (short and subtle)
- Volume: Gentle, non-annoying
- Quality: Medium (128kbps is sufficient for UI sounds)

## Where to Get Free Sound Effects

You can find free, gentle UI sound effects from:

- **Freesound.org** - https://freesound.org/ (CC licensed sounds)
- **Zapsplat** - https://www.zapsplat.com/ (Free for personal/commercial use)
- **Mixkit** - https://mixkit.co/free-sound-effects/ (Royalty-free)
- **BBC Sound Effects** - https://sound-effects.bbcrewind.co.uk/ (Creative Commons)

## Recommended Search Terms

- "gentle notification", "soft ding", "subtle beep"
- "whoosh ui", "swipe sound", "soft swoosh"
- "keyboard typing short", "typing click"
- "button click", "soft tap", "ui click"
- "celebration short", "success sound", "achievement"
- "soft chime", "gentle bell", "positive notification"

## File Placement

Place all MP3 files directly in this directory:
```
apps/agents-server/public/sounds/
├── whoosh.mp3
├── ding.mp3
├── typing.mp3
├── tap.mp3
├── confetti.mp3
└── hearts.mp3
```

## Testing Sounds

After adding the sound files, you can test them in the browser console:

```javascript
const audio = new Audio('/sounds/ding.mp3');
audio.play();
```

## Note

Make sure all sounds are:
- Short (< 2 seconds)
- Gentle (not jarring or loud)
- Appropriate for a professional chat interface
- Properly licensed for commercial use if needed
