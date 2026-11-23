# Docs: a small collaborative document editor

A full-stack document editor: create, rename, format and autosave documents, import `.txt` / `.md` files, and share documents with other users as **editors** or **viewers**.

| Layer    | Stack |
| -------- | ----- |
| Frontend | React 19 (Vite), Redux Toolkit, React Router, Editor.js, Axios, SCSS |
| Backend  | Node.js, Express 5, Knex, PostgreSQL, express-validator, JWT, Multer |
| Tests    | Vitest + Supertest (against a real Postgres test database) |

- **Live app:** _add frontend URL after deploying_
- **Live API:** _add backend URL after deploying_ (health check: `/api/health`)
- **Architecture note:** [ARCHITECTURE.md](ARCHITECTURE.md)

## Features

- **Documents:** create, rename (click the title), edit, delete. Changes **autosave** about 0.8 s after you stop typing, and <kbd>⌘/Ctrl + S</kbd> saves immediately. A status shows *Unsaved / Saving… / All changes saved*, and the browser warns before you leave with unsaved changes.
- **Google Docs style editor:** a top bar with File / Edit / Insert / Format menus and a formatting toolbar. Everything works from the caret or selection; you don't have to highlight first and then hunt for a popup.
  - **Toolbar:** undo/redo, print, zoom (50–200%), text style (Normal, Heading 1–4), bold, italic, underline, strikethrough, highlight, inline code, link, checklist / bulleted / numbered lists, quote, horizontal line, clear formatting, page setup.
  - The active formatting at the caret is highlighted in the toolbar.
  - **Shortcuts:** ⌘B/I/U, ⌘⇧X (strike), ⌘⇧H (highlight), ⌘K (link), ⌘⌥0–4 (text styles), ⌘⇧7/8/9 (lists), ⌘\\ (clear), ⌘S (save now).
- **Page setup:** paper size (Letter, A4, Legal, A5), portrait/landscape, and margins (presets or custom inches). The page on screen uses the real paper width and margins, with dashed guides where each printed page ends.
- **Header & footer:** click the top or bottom margin of the page to type a header or footer, or set them in Page setup, with optional "Page X of Y" numbers. **Print / Save as PDF** produces real pages with the chosen size and margins, and repeats the header and footer on every page.
- **File import:** upload a **`.txt` or `.md` file (max 1 MB)** to create a new editable document.
  - Markdown headings, lists, bold, italic, links, quotes and horizontal rules are converted to editor blocks.
  - Plain text becomes paragraphs.
  - Other file types are rejected in the UI and by the API.
- **Sharing:** the owner shares by email with **Can edit** or **View only** access, can change permissions, and can remove access.
  - The dashboard separates **Owned by me** from **Shared with me**, with role badges.
  - Viewers get a read-only editor.
  - Users without access get a 404, so document ids don't leak.
- **Viewers** get the same layout with editing controls disabled; only print and zoom stay active.
- **Export to PDF:** File → *Download as PDF* in the editor, or ⋮ → *Download as PDF* on the dashboard. The PDF is generated on the server and follows the document's page setup: paper size, orientation, margins, header and footer on every page, and "Page X of Y" numbers. Text stays selectable and links stay clickable. Anyone with access, viewers included, can export. Any unsaved edits are saved first.
- **Account menu:** click your avatar (top right, on the dashboard and in the editor) to change your password or log out. Changing a password requires the current one.
- **Auth:** email + password with JWT. You can register a new account or use the seeded demo accounts.

### Demo accounts

All use the password `password123`. The login page has one-click buttons for each.

| User  | Email               | Seeded data |
| ----- | ------------------- | ----------- |
| Alice | `alice@example.com` | Owns "Project kickoff notes", shared with Bob (can edit) |
| Bob   | `bob@example.com`   | Owns a private draft; sees Alice's doc under *Shared with me* |
| Carol | `carol@example.com` | Nothing yet: use her to try sharing from Alice |

## Running locally

**Requirements:** Node.js 20+ and PostgreSQL 13+ (uses the built-in `gen_random_uuid()`).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env            # set DATABASE_URL and JWT_SECRET
createdb docs_dev               # or create the database any other way
npm run db:setup                # runs migrations + seeds demo users/documents
npm run dev                     # http://localhost:4000/api
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env            # VITE_API_URL=http://localhost:4000/api
npm run dev                     # http://localhost:5173
```

### 3. Tests

```bash
cd backend
cp .env.test.example .env.test  # points at a separate database, which the tests wipe
createdb docs_test
npm test                        # migrations run automatically; 29 tests
npm run test:unit               # import/sanitizer tests only, no database needed
```

The API tests cover:
- the response envelope and validation errors
- page settings: round-trip, plus rejection of margins too large for the paper
- PDF export: inline formatting → PDF text runs, page geometry, header/footer/page numbers, multi-page output, and who can download
- create → rename → save → reopen, with formatting preserved
- markdown upload and rejection of unsupported files
- owned vs shared lists
- access control: 404 for strangers, viewers can't edit, editors can't delete or share, only owners share or revoke

## API

All endpoints are under `/api`. Every response uses one envelope:

```json
{ "data": {}, "status": 200, "message": "Document saved", "error": null }
```

On failure, `data` is `null` and `error` is `{ "code": "BAD_REQUEST", "details": [{ "field": "email", "message": "Email is not valid" }] }`.

| Method | Path | Who | Description |
| ------ | ---- | --- | ----------- |
| POST | `/auth/register` | public | Create an account → `{ user, token }` |
| POST | `/auth/login` | public | Log in → `{ user, token }` |
| GET | `/auth/me` | user | Current user |
| PATCH | `/auth/password` | user | Change password: `{ currentPassword, newPassword }` |
| GET | `/documents` | user | `{ owned: [...], shared: [...] }` |
| POST | `/documents` | user | Create a document (`title?`, `content?`) |
| POST | `/documents/import` | user | Multipart `file` (`.txt`/`.md`, ≤ 1 MB) → new document |
| GET | `/documents/:id` | owner / editor / viewer | Document with `content`, `role` and `owner` |
| PATCH | `/documents/:id` | owner / editor | Update `title`, `content` and/or `settings` (page setup) |
| DELETE | `/documents/:id` | owner | Delete the document and its shares |
| GET | `/documents/:id/export/pdf` | owner / editor / viewer | Download the document as a PDF (binary response; errors still use the JSON envelope) |
| GET | `/documents/:id/shares` | owner / editor / viewer | People with access |
| POST | `/documents/:id/shares` | owner | Grant or update access: `{ email, permission: "view" \| "edit" }` |
| DELETE | `/documents/:id/shares/:userId` | owner | Revoke access |

## Project structure

```
backend/
  api/index.js              Vercel serverless entry (exports the Express app)
  knexfile.js
  src/
    app.js / server.js      Express app / local HTTP server
    config/env.js           Env loading + validation
    db/migrations, seeds    Schema (users, documents, document_shares) + demo data
    routes/                 URL → validators → controller
    controllers/            HTTP in/out only: read req, call service, send envelope
    services/               Business logic + DB access (access control lives here)
    validators/             express-validator rule chains
    middlewares/            auth (JWT), validate, upload (multer), errorHandler
    utils/                  ApiError, response helpers (envelope)
  tests/                    Vitest + Supertest
frontend/
  src/
    api/                    axios client (interceptors), asyncCatcher, endpoint functions
    store/                  Redux Toolkit: auth, documents, toasts
    pages/                  Login, Documents (dashboard), Editor
    editor/                 Editor.js tools, formatting commands, page geometry + print CSS, useEditorCommands hook
    components/             DocumentEditor, EditorToolbar, EditorMenuBar, PageView, PageSetupDialog, ShareDialog…
    styles/                 SCSS variables + global styles
```

Frontend API calls never throw. `asyncCatcher` always resolves to `{ data, message, error }`:

```js
const res = await getDocument(id);
if (res.error) {
  // show error if needed
  return;
}
// use res.data
```

## Deployment

Both apps deploy to Vercel as two projects from this repository. The database is any hosted Postgres, such as Neon, Supabase or Vercel Postgres.

1. **Database:** create a Postgres database and copy its connection string.
2. **Backend project:** import the repo in Vercel, set **Root Directory** to `backend`, and keep the framework preset as **Other**. No build command or output directory is needed.
   - **Environment variables:**
     - `DATABASE_URL`: use the **pooled** connection string if your provider has one (e.g. Neon's `-pooler` host)
     - `DATABASE_SSL=true`
     - `JWT_SECRET` (a long random string)
     - `CORS_ORIGIN=https://<your-frontend-domain>` (comma-separate several origins)
   - **How it runs:**
     - `vercel.json` sends every request to `api/index.js`, which exports the Express app as one serverless function.
     - Node is pinned to `22.x` in `package.json`.
   - **Database setup:** run migrations and seeds once from your machine against the production database. Re-run `npm run migrate` after pulling new migrations.
     ```bash
     cd backend && DATABASE_URL=... DATABASE_SSL=true JWT_SECRET=x npm run db:setup
     ```
   - **Smoke test after deploying:** `https://<your-backend-domain>/api/health` should return `{"data":{"ok":true},...}`.
   - **Keep the API loadable on Vercel:** Vercel's Node runtime can't `require()` ES-module-only packages, but local Node 22.12+/24 can. That gap hides crashes like `ERR_REQUIRE_ESM` until deploy.
     - `npm run verify:serverless` (also part of `npm test`) loads the whole API with that feature switched off.
     - `sanitize-html` (2.17.0), `pdfmake` (0.2.23) and `marked` (15) are pinned to exact versions on purpose: newer versions depend on ESM-only packages. Upgrade them only if this check still passes.
3. **Frontend project** (root directory: `frontend`, framework: Vite):
   - Set `VITE_API_URL=https://<your-backend-domain>/api`.
   - `vercel.json` rewrites all routes to `index.html` so deep links work.

**Cloudflare Pages** also works for the frontend: build command `npm run build`, output `dist`, same `VITE_API_URL`. `public/_redirects` handles SPA routing.
