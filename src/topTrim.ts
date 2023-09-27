
/**
 * topTrim trims given string from top
 */
export function topTrim(content: string): string {
  const linesWithContent: string[] = [];
  let contentStarted = false;

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim() !== '') {
      contentStarted = true;
    }

    if (contentStarted) {
      linesWithContent.push(line);
    }
  }

  return linesWithContent.join('\n');
}
