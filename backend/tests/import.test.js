const { fileToDocument, markdownToBlocks } = require('../src/services/import.service');
const { sanitizeContent } = require('../src/services/content.service');

const fakeFile = (name, text) => ({ originalname: name, buffer: Buffer.from(text, 'utf8') });

describe('markdown import', () => {
  it('maps headings, inline formatting and nested lists to Editor.js blocks', () => {
    const blocks = markdownToBlocks(
      ['# Title', '', 'Some **bold** and *italic* text.', '', '- one', '  - nested', '- two', '', '1. first', '', '---'].join('\n'),
    );

    expect(blocks[0]).toEqual({ type: 'header', data: { text: 'Title', level: 1 } });
    expect(blocks[1]).toEqual({ type: 'paragraph', data: { text: 'Some <b>bold</b> and <i>italic</i> text.' } });
    expect(blocks[2].type).toBe('list');
    expect(blocks[2].data.style).toBe('unordered');
    expect(blocks[2].data.items[0].content).toBe('one');
    expect(blocks[2].data.items[0].items[0].content).toBe('nested');
    expect(blocks[3].data.style).toBe('ordered');
    expect(blocks[4]).toEqual({ type: 'delimiter', data: {} });
  });

  it('strips scripts and unsafe links from imported markdown', () => {
    const blocks = markdownToBlocks('Hello <script>alert(1)</script> [x](javascript:alert(1))');
    expect(blocks[0].data.text).not.toMatch(/script/);
    expect(blocks[0].data.text).not.toMatch(/javascript:/);
  });
});

describe('fileToDocument', () => {
  it('turns a .txt file into escaped paragraphs titled after the file', () => {
    const doc = fileToDocument(fakeFile('meeting notes.txt', 'line one\nline two\n\n<b>not bold</b>'));
    expect(doc.title).toBe('meeting notes');
    expect(doc.content.blocks).toEqual([
      { type: 'paragraph', data: { text: 'line one<br>line two' } },
      { type: 'paragraph', data: { text: '&lt;b&gt;not bold&lt;/b&gt;' } },
    ]);
  });

  it('rejects empty and binary files', () => {
    expect(() => fileToDocument(fakeFile('empty.txt', '   \n'))).toThrow('File is empty');
    expect(() => fileToDocument(fakeFile('bin.txt', 'abc\u0000def'))).toThrow('does not look like a text file');
    expect(() => fileToDocument(undefined)).toThrow('choose a .txt or .md file');
  });
});

describe('sanitizeContent', () => {
  it('keeps strikethrough, highlight and inline code from the toolbar', () => {
    const out = sanitizeContent({
      blocks: [{ type: 'paragraph', data: { text: '<strike>s</strike><mark class="cdx-marker">m</mark><code class="inline-code">c</code><mark class="evil">x</mark>' } }],
    });
    expect(out.blocks[0].data.text).toBe('<s>s</s><mark class="cdx-marker">m</mark><code class="inline-code">c</code><mark>x</mark>');
  });

  it('drops unknown blocks and unsafe HTML but keeps formatting', () => {
    const out = sanitizeContent({
      blocks: [
        { type: 'paragraph', data: { text: '<b>ok</b><img src=x onerror=alert(1)><u class="cdx-underline">u</u>' } },
        { type: 'raw', data: { html: '<script></script>' } },
        { type: 'header', data: { text: 'H', level: 9 } },
      ],
    });
    expect(out.blocks).toEqual([
      { type: 'paragraph', data: { text: '<b>ok</b><u class="cdx-underline">u</u>' } },
      { type: 'header', data: { text: 'H', level: 4 } },
    ]);
  });
});
