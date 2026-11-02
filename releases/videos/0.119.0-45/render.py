"""Render a caption-only release overview from factual cards and actual parser output."""
import json
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

# Production paths are relative to this script, never to personal media folders.
ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / 'frames'
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
MONO = '/System/Library/Fonts/Menlo.ttc'
# Each segment pairs its factual visual with the full spoken caption.
SCENES = [
    ('Promptbook 0.119.0-45', 'Invite agents. Keep task history.',
     'A short overview of Promptbook 0.119.0-45: explicit agent invitations and changes that keep task history intact. This is a caption-only technical overview with no voice impersonation.'),
    ('A release, not a draft', 'npm: ptbk@0.119.0-45\nGit: 039c470bb6f1\nBaseline: 0.119.0-44',
     'The exact package is available on the public npm registry. Its Git revision matches the version tag. The preceding published version is prerelease forty four. The examples here select a few changes in that release, rather than describe everything in the accumulated changelog.'),
    ('Explicit invitations', 'Plain @Adam refers to an agent.\n+@Adam asks the agent to reply.\n+{Frontend Developer} supports a full name.',
     'In a chat message, a plain reference names an agent. Add a plus to invite that agent and ask it to reply. Full names work in single braces. Code and illustrative examples do not trigger invitations. That distinction lets you discuss an agent without accidentally calling it.'),
    ('Actual parser output', (ROOT / 'demo.txt').read_text(),
     'Here is actual output from the release\'s invitation parser. A plain reference returns no invitation. Plus Adam returns Adam. The same text inside code, or introduced as an example, returns none. A full name returns Frontend Developer. This is a safe parser demonstration; no chat message was sent.'),
    ('Change a task; preserve its history', 'ILLUSTRATIVE BOOK EXAMPLE\n\nTASK Prepare release notes\nGOAL Explain verified changes.\nTASK DONE 2026-11-01T02:59:00+01:00\nTASK REOPEN 2026-11-01T03:00:00+01:00\nTASK CHANGE 2026-11-01T03:01:00+01:00 task\nInclude a reproducible demonstration.',
     'Task changes are appended to the Book, so the original instructions remain visible. Task reopen continues the same finished work while preserving earlier results. This card is an illustrative Book, not a recording of a running task. The release includes task-control tests for these behaviors.'),
    ('Saved / Delivered / Applied', 'Saved: the source retains the change.\nDelivered: the target accepted it.\nApplied: incorporation is evidenced.\n\nAn uploaded draft is not a public video.',
     'Saved, delivered and applied are separate evidence. A change saved in a Book is not automatically proof that a running worker used it. The same principle applies to release videos: prepared media or an uploaded draft does not prove public publication. Links to the exact package, source and comparison are in the description.')
]


def run(arguments):
    """Run one local production command and stop on a real failure."""
    return subprocess.run(arguments, check=True, capture_output=True, text=True).stdout


def wrapped(draw, text, font, width):
    """Wrap text by measured pixel width, preserving authored line breaks."""
    result = []
    for paragraph in text.split('\n'):
        line = ''
        for word in paragraph.split():
            candidate = f'{line} {word}'.strip()
            if draw.textlength(candidate, font=font) > width and line:
                result.append(line)
                line = word
            else:
                line = candidate
        result.append(line)
    return result


def main():
    """Create captioned cards and combine them into a silent H.264 video."""
    FRAMES.mkdir(exist_ok=True)
    duration_lines, metadata = [], []
    for index, (title, body, narration) in enumerate(SCENES):
        # Allow reading both the explanatory captions and the technical example.
        duration = max(16, round((len(narration.split()) + len(body.split())) / 2.4))
        image = Image.new('RGB', (1920, 1080), '#101c31')
        draw = ImageDraw.Draw(image)
        heading = ImageFont.truetype(FONT, 66)
        content = ImageFont.truetype(MONO if index in (3, 4) else FONT, 32 if index in (3, 4) else 44)
        caption = ImageFont.truetype(FONT, 29)
        draw.rectangle((70, 70, 85, 740), fill='#55d5bc')
        draw.text((115, 75), 'ptbk / RELEASE NOTES', font=ImageFont.truetype(FONT, 25), fill='#55d5bc')
        draw.text((115, 130), title, font=heading, fill='white')
        for row, line in enumerate(wrapped(draw, body, content, 1680)):
            draw.text((115, 250 + row * 53), line, font=content, fill='#d9e4f4')
        # Full narration stays readable as captions throughout the matching card.
        draw.rectangle((0, 800, 1920, 1080), fill='#08101e')
        for row, line in enumerate(wrapped(draw, narration, caption, 1690)):
            draw.text((115, 830 + row * 39), line, font=caption, fill='#e3eaf6')
        draw.text((115, 1040), f'0.119.0-45 | Caption-only overview | {index + 1}/{len(SCENES)}', font=ImageFont.truetype(FONT, 22), fill='#55d5bc')
        frame = FRAMES / f'{index}.png'
        image.save(frame)
        duration_lines.extend([f"file '{index}.png'", f'duration {duration}'])
        metadata.append({'title': title, 'seconds': duration, 'narration': narration})
    duration_lines.append(f"file '{len(SCENES) - 1}.png'")
    (FRAMES / 'images.txt').write_text('\n'.join(duration_lines) + '\n')
    (ROOT / 'narration.txt').write_text('\n\n'.join(scene[2] for scene in SCENES) + '\n')
    (ROOT / 'slides.json').write_text(json.dumps(metadata, indent=2) + '\n')
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(FRAMES / 'images.txt'), '-t', str(sum(scene['seconds'] for scene in metadata)), '-r', '24', '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', str(ROOT / 'video.mp4')])
    print(json.dumps({'duration': sum(scene['seconds'] for scene in metadata), 'video': str(ROOT / 'video.mp4')}))


if __name__ == '__main__':
    main()
