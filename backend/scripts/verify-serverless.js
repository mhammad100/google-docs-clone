/**
 * Loads the API the way Vercel's Node runtime does and exercises every lazily-loaded path.
 *
 * Run with require(esm) disabled:  npm run verify:serverless
 *
 * Why: Node 22.12+/24 can require() ES modules locally, but Vercel's function loader cannot.
 * If a dependency upgrade pulls in an ESM-only package (e.g. htmlparser2 >= 10 via
 * sanitize-html >= 2.18, or fontkit via pdfmake 0.3), the deployed function crashes on
 * startup with ERR_REQUIRE_ESM. This script fails first, locally and in the test suite.
 */
const path = require('path');

// Placeholder config: nothing here connects to a database
process.env.DATABASE_URL ||= 'postgres://user:pass@localhost:5432/verify';
process.env.JWT_SECRET ||= 'verify-serverless';

const root = path.resolve(__dirname, '..');
const load = (file) => require(path.join(root, file));

const main = async () => {
  const app = load('api/index.js');
  if (typeof app !== 'function') throw new Error('api/index.js must export the Express app');

  // Lazily used code paths: sanitizer, markdown import, password hashing, DB driver, PDF export
  const { sanitizeContent } = load('src/services/content.service');
  const { fileToDocument } = load('src/services/import.service');
  const { buildPdfDefinition, renderPdf } = load('src/services/export.service');
  const bcrypt = require('bcryptjs');
  const db = load('src/db/knex');

  const clean = sanitizeContent({ blocks: [{ type: 'paragraph', data: { text: '<b>ok</b><script>x</script>' } }] });
  if (clean.blocks[0].data.text !== '<b>ok</b>') throw new Error('sanitizer returned unexpected output');

  const imported = fileToDocument({ originalname: 'check.md', buffer: Buffer.from('# Title\n\n- **item**') });
  await bcrypt.hash('check', 4);
  db.client.driver; // forces knex to require('pg')

  const pdf = await renderPdf(
    buildPdfDefinition({ title: 'check', content: imported.content, settings: { header: 'h', showPageNumbers: true } }),
  );
  if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error('PDF export did not produce a PDF');

  await db.destroy();
  console.log('OK: API loads and runs without require(esm), as on Vercel');
};

main().catch((err) => {
  console.error(`FAILED: ${err.code || ''} ${err.message}`);
  process.exit(1);
});
