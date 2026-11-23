# Architecture note

## What I prioritized

1. **A coherent core loop over breadth.**
   - The core loop is: create → write with formatting → autosave → reopen → share → collaborator opens it with the right permissions.
   - Each step has loading, empty and error states.
   - I skipped real-time co-editing, version history, comments and `.docx` import.
2. **Access control that is correct and tested.** Sharing is the riskiest part to get wrong, so:
   - All permission checks live in one place, `document.service.getAccess()`.
   - Every document and share operation goes through it.
   - Most API tests target it.
3. **A clear, predictable code shape**, the same on both sides:
   - **Backend:** `routes → validators → controllers → services`, one error handler, and one response envelope `{ data, status, message, error }`.
   - **Frontend:** API functions never throw. `asyncCatcher` returns `{ data, message, error }`, so every caller follows the same `if (res.error) return;` pattern.

## Key decisions

**Editor.js and block JSON storage.**
- Editor.js outputs structured JSON blocks (`header`, `paragraph`, `list`, …) instead of a single HTML string.
- I store that JSON as-is in a Postgres `jsonb` column. Formatting round-trips exactly, and the content can be inspected or migrated later.
- Inline formatting (bold, italic, underline, links) is a small HTML subset inside each block's text.

**A Docs-style toolbar on top of Editor.js.**
- Editor.js ships with floating, block-level UI only. The fixed toolbar and menus drive it from outside, through `src/editor/formatting.js`:
  - **Inline styles** use `document.execCommand` on the current selection. Highlight and code are wrapped manually.
  - **Block styles** (headings, lists, quote) replace the block under the caret through the Editor.js blocks API.
- I convert blocks myself instead of using `blocks.convert()`, because that strips inline formatting. Turning a bold sentence into a heading should keep it bold.
- Toolbar buttons `preventDefault` on mousedown, so clicking them never steals the editor's selection.
- Editor.js only keeps inline tags that a registered tool declares. That's why strikethrough is a tiny custom inline tool, and highlight/code use the official marker and inline-code tools, even though the toolbar is what triggers them.

**Page setup and print.**
- Settings (`pageSize`, `orientation`, `margins`, `header`, `footer`, `showPageNumbers`) live in a `settings` JSONB column. They're validated by express-validator, including a check that the margins leave room for text, and normalised by `settings.service`.
- **On screen** the document is a sheet with the real paper width and margins (1in = 96px), continuous text, and dashed guides where pages end.
- **Print** uses a generated `@page` rule for the size and margins. CSS page-margin boxes (`@top-center`, `@bottom-right` with `counter(page)`) repeat the header, footer and page numbers on every printed page.
- I chose this over true on-screen pagination, which would mean measuring and splitting blocks across pages. That's a large, fragile feature, and print gives exact pages where it matters.

**Sanitize on the server, not only in the editor.**
- The API is the trust boundary. A client could send any JSON, so:
  - The validator rejects unknown block types.
  - `content.service.sanitizeContent()` rebuilds each block from known fields and strips inline HTML down to an allow-list (`b i u s a br mark code`, with allowed classes only, and `http(s)/mailto` links only).
- Imported files go through the same path. Markdown is parsed with `marked`'s lexer into blocks, and plain text is HTML-escaped.

**Sharing model.**
- A `document_shares(document_id, user_id, permission)` table has a unique pair constraint and `permission ∈ {view, edit}`.
- Roles are derived, not stored: `owner` comes from `documents.owner_id`, and `editor` / `viewer` come from the share row.
- Only the owner can share, revoke or delete. Editors can change the title and content. Viewers get a read-only editor and a 403 from the API if they try to write.
- Users with no access get **404, not 403**, so document ids can't be probed.
- Sharing is by email of an existing account. No invite emails, which keeps scope reasonable.

**Auth.**
- Real but minimal: bcrypt-hashed passwords and a JWT in the `Authorization` header, attached by an axios request interceptor.
- A response interceptor logs the user out on a 401.
- Seeded demo accounts plus one-click login make the sharing flow quick to try.
- The token is kept in `localStorage`. That's fine for a demo. In production I'd use an httpOnly cookie.

**Autosave.**
- Saves are debounced (800 ms), with one request in flight at a time.
- Edits made during a save are queued and sent right after.
- A failed save keeps the pending content and retries on the next change or ⌘S.
- Unsaved changes are flushed on in-app navigation, and `beforeunload` warns before a hard close.

**Deployment shape.**
- The Express app is exported from `api/index.js`, so it runs unchanged on Vercel serverless or as a normal Node server (`src/server.js`).
- The Knex pool is kept small (`max: 5`) because of serverless concurrency.

## Known limitations and what I'd do next

- **Concurrent edits are last-write-wins.**
  - Next step: optimistic concurrency, where the client sends the `updated_at` it loaded and gets a 409 if the server's version is newer.
  - Full collaboration would need a CRDT (Yjs) over WebSockets.
- **On-screen pages are guides, not hard breaks.** A block can straddle a page guide on screen, and the screen header/footer appear once (first and last page). Printed output is truly paginated.
- **Page margin boxes for the printed header/footer need Chromium 131+.** Other browsers still print the right size and margins, just without the header/footer.
- **Import creates a new document only.** "Import into the current document" would reuse the same parser.
- **No pagination** on the document list. Fine for this scope, and the list query is indexed (`owner_id, updated_at`).
- **Tests are backend-focused** (API integration plus parser/sanitizer units). Next I'd add an end-to-end Playwright test for login → share → open as viewer.
