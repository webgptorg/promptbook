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
# Each segment pairs its factual visual with the full explanatory caption.
SCENES = [('Promptbook 0.119.0-47',
  'External actions: impact, batches and priority',
  'This release adds impact reporting to the External activity log. This caption-only overview demonstrates '
  'selected changes using the released code and synthetic records. No emails are sent. There is no spoken or '
  'synthetic narration.'),
 ('Verified release and baseline',
  'npm: ptbk@0.119.0-47\nRevision: fd1860136b55\nPreceding published version: 0.119.0-45',
  'The public npm registry confirms this exact version and its Git revision. Version forty six is absent, so '
  'the comparison starts at forty five. The new impact module and its release tests provide the evidence for '
  'this demonstration. This video does not cover every release change.'),
 ('Impact adds in weights',
  'Weight = 10 ^ impact\nAggregate = log10(sum of weights)\n\n1,000 actions at impact 1 => impact 4',
  'An extra impact point means ten times the weight. The executing agent estimates the consequence if an '
  'action succeeds; outcome is recorded separately. Batches combine their members without adding the batch '
  'again. The example is a synthetic campaign, not an actual mailing.'),
 ('Actual release output',
  'ACTUAL RELEASE OUTPUT / SYNTHETIC FIXTURE\n'
  '1,000 actions at impact 1 => 4\n'
  'Default view => 1 batch row\n'
  'Outcomes => {"failed":10,"success":990}\n'
  'Batch drill-down => 1000 records\n'
  'Impact 4 after 30 days => priority 3\n'
  'Missing impact => unknown\n',
  'This is actual output from the immutable release module. One thousand fixture records become one batch '
  'row, with 990 successful and 10 failed outcomes. Opening that batch exposes all 1,000 records. The '
  'fixture tests calculations and view construction; it is not a recording of the dashboard.'),
 ('Priority ages; saved impact stays',
  'Impact 4, recorded 30 days ago\nCurrent priority: 3\nSaved impact: 4\n\nUnknown impact stays unknown.',
  "Smart ordering lowers each action's priority by one point per 30 elapsed days, then combines the aged "
  'weights. Saved impact stays unchanged. Unknown impact is shown explicitly. The default impact cutoff is '
  '1, applied after grouping; Show all removes that cutoff. Outcome does not lower the impact estimate.'),
 ('Reproduce the demonstration',
  'node releases/videos/0.119.0-47/demo.mjs\n'
  '\n'
  'Add --release-tests to run the release tests.\n'
  '11 tests passed in the isolated fixture.',
  'The demonstration compiles the impact module directly from the exact release revision. It also runs that '
  "revision's own tests in a disposable local fixture. Package, source and comparison links are in the "
  'description. No private project records, credentials or browser footage appear in this video.')]


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
        content = ImageFont.truetype(MONO if index in (3, 5) else FONT, 32 if index in (3, 5) else 44)
        caption = ImageFont.truetype(FONT, 29)
        draw.rectangle((70, 70, 85, 740), fill='#55d5bc')
        draw.text((115, 75), 'PTBK / RELEASE NOTES', font=ImageFont.truetype(FONT, 25), fill='#55d5bc')
        draw.text((115, 130), title, font=heading, fill='white')
        for row, line in enumerate(wrapped(draw, body, content, 1680)):
            draw.text((115, 250 + row * 53), line, font=content, fill='#d9e4f4')
        # Full narration stays readable as captions throughout the matching card.
        draw.rectangle((0, 800, 1920, 1080), fill='#08101e')
        for row, line in enumerate(wrapped(draw, narration, caption, 1690)):
            draw.text((115, 830 + row * 39), line, font=caption, fill='#e3eaf6')
        draw.text((115, 1040), f'0.119.0-47 | Caption-only overview | {index + 1}/{len(SCENES)}', font=ImageFont.truetype(FONT, 22), fill='#55d5bc')
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
