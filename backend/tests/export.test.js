const { buildPdfDefinition, exportFilename, inlineRuns, renderPdf } = require('../src/services/export.service');

const pageCount = (buffer) => (buffer.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;

describe('inlineRuns', () => {
  it('maps inline formatting to pdfmake text runs', () => {
    const runs = inlineRuns(
      'Plain <b>bold <i>both</i></b> <u>u</u><s>s</s> <mark class="cdx-marker">hi</mark> <a href="https://example.com">link</a>&amp;<br>next',
    );
    expect(runs).toEqual([
      { text: 'Plain ' },
      { text: 'bold ', bold: true },
      { text: 'both', bold: true, italics: true },
      { text: ' ' },
      { text: 'u', decoration: 'underline' },
      { text: 's', decoration: 'lineThrough' },
      { text: ' ' },
      { text: 'hi', background: '#fde68a' },
      { text: ' ' },
      { text: 'link', link: 'https://example.com', color: '#1a5fd0', decoration: 'underline' },
      { text: '&' },
      { text: '\n' },
      { text: 'next' },
    ]);
  });

  it('drops unsafe markup and keeps empty paragraphs as a blank line', () => {
    expect(inlineRuns('<script>alert(1)</script>ok <a href="javascript:alert(1)">x</a>')).toEqual([{ text: 'ok ' }, { text: 'x' }]);
    expect(inlineRuns('')).toEqual([{ text: ' ' }]);
  });
});

describe('buildPdfDefinition', () => {
  const doc = {
    title: 'Report',
    owner: { name: 'Alice' },
    content: {
      blocks: [
        { type: 'header', data: { text: 'Title', level: 1 } },
        { type: 'list', data: { style: 'ordered', meta: {}, items: [{ content: 'a', meta: {}, items: [{ content: 'b', meta: {}, items: [] }] }] } },
        { type: 'delimiter', data: {} },
      ],
    },
    settings: {
      pageSize: 'letter',
      orientation: 'landscape',
      margins: { top: 0.5, right: 1, bottom: 0.5, left: 1 },
      header: 'ACME',
      footer: 'Internal',
      showPageNumbers: true,
    },
  };

  it('applies paper size, orientation and margins in points', () => {
    const def = buildPdfDefinition(doc);
    expect(def.pageSize).toEqual({ width: 792, height: 612 }); // 11in x 8.5in
    expect(def.pageMargins).toEqual([72, 36, 72, 36]);
    expect(def.info).toMatchObject({ title: 'Report', author: 'Alice' });
  });

  it('renders the header, footer and page numbers on every page', () => {
    const def = buildPdfDefinition(doc);
    expect(def.header().text).toBe('ACME');
    const footer = def.footer(2, 5);
    expect(footer.columns[0].text).toBe('Internal');
    expect(footer.columns[1].text).toBe('Page 2 of 5');
  });

  it('maps blocks, including nested lists and dividers', () => {
    const [heading, list, divider] = buildPdfDefinition(doc).content;
    expect(heading).toMatchObject({ bold: true, fontSize: 22 });
    expect(list.ol[0].stack[1].ol).toHaveLength(1);
    expect(divider.canvas[0].x2).toBe(792 - 144); // full text width
  });

  it('omits header and footer when they are not set', () => {
    const def = buildPdfDefinition({ ...doc, settings: {} });
    expect(def.header).toBeUndefined();
    expect(def.footer).toBeUndefined();
    expect(def.pageSize).toEqual({ width: 8.27 * 72, height: 11.69 * 72 }); // A4 default
  });

  it('produces a real multi-page PDF', async () => {
    const long = { ...doc, content: { blocks: Array.from({ length: 120 }, (_, i) => ({ type: 'paragraph', data: { text: `Line ${i}` } })) } };
    const buffer = await renderPdf(buildPdfDefinition(long));
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(buffer)).toBeGreaterThan(1);
  });
});

describe('exportFilename', () => {
  it('strips characters that are invalid in file names', () => {
    expect(exportFilename('Q1: plan / "draft"?', 'pdf')).toBe('Q1 plan draft.pdf');
    expect(exportFilename('   ', 'pdf')).toBe('Untitled document.pdf');
    expect(exportFilename('Café notes', 'pdf')).toBe('Café notes.pdf');
  });
});
