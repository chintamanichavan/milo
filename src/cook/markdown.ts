/** A small, safe Markdown: bold, italic, headings and lists — nothing else gets through. */

const escape = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** **bold**, *italic* and _italic_, inside a single line */
export function mdInline(text: string): string {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,!?:;]|$)/g, '$1<i>$2</i>')
    .replace(/(^|[\s(])_(?!\s)(.+?)_(?=[\s).,!?:;]|$)/g, '$1<i>$2</i>');
}

/** a block of notes: headings, bullet and numbered lists, paragraphs */
export function md(text: string): string {
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];
  const flushPara = (): void => {
    if (para.length) out.push(`<p>${para.map(mdInline).join('<br>')}</p>`);
    para = [];
  };
  const closeList = (): void => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (!line.trim()) {
      flushPara();
      closeList();
    } else if (heading) {
      flushPara();
      closeList();
      out.push(`<h4 class="md-h">${mdInline(heading[2])}</h4>`);
    } else if (bullet || numbered) {
      flushPara();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${mdInline((bullet ?? numbered)![1])}</li>`);
    } else {
      closeList();
      para.push(line);
    }
  }
  flushPara();
  closeList();
  return `<div class="md">${out.join('')}</div>`;
}
