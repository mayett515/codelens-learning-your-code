// Inline Markdown links/images only. Reference links and HTML are outside this guard.
export function inlineLinkTargets(markdown: string): string[] {
  let fence: { character: string; length: number } | undefined;
  const prose = markdown.split(/\r?\n/).map((line) => {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence.character && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      return '';
    }
    if (marker) { fence = { character: marker[1][0], length: marker[1].length }; return ''; }
    return line;
  }).join('\n').replace(/(?<!`)(`+)(?!`)(?:(?!\n\s*\n)[\s\S])*?(?<!`)\1(?!`)/g, '');
  const links = /\]\(\s*(?:<([^>\n]*)>|((?:\\.|[^\s()\\]|\([^()\n]*\))+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^\n)]*\)))?\s*\)/g;
  return [...prose.matchAll(links)].map((match) => (match[1] ?? match[2]).replace(/\\([\\()[\]<> ])/g, '$1'));
}
