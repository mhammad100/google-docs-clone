# Docs: collaborative document editor (submission)

## What's included

| Item | Where |
| ---- | ----- |
| Source code | `backend/` (Express API) and `frontend/` (React app). Also on GitHub: https://github.com/mhammad100/google-docs-clone |
| Local setup and run instructions | [`README.md`](README.md); a short version is under **Running locally** below |
| Architecture note | [`ARCHITECTURE.md`](ARCHITECTURE.md): what I prioritized, key decisions, trade-offs, known limitations |
| AI workflow note | [`AI_WORKFLOW.md`](AI_WORKFLOW.md): how I used an AI coding agent, how its output was checked, and bugs it caught |
| This file | [`SUBMISSION.md`](SUBMISSION.md): contents, links, test accounts, review path, feature status, next steps |
| Walkthrough video URL | [`WALKTHROUGH_VIDEO.txt`](WALKTHROUGH_VIDEO.txt) |
| Live product | https://google-docs-clone-8vn.pages.dev/login (details below) |
| Automated tests | `backend/tests/`: 30 tests (API integration, access control, validation, import, sanitization, PDF export, serverless runtime check) |
| Environment templates | `backend/.env.example`, `backend/.env.test.example`, `frontend/.env.example`. No real secrets are included |
| Deployment config | `backend/vercel.json` (API on Vercel), `frontend/public/_redirects` (Cloudflare Pages routing), `frontend/vercel.json` |

**Screenshots / demo GIF:** not included. Local setup needs no extra steps beyond PostgreSQL and the commands below, and the live deployment can be used for review.

## Links

- **Google Drive folder (all materials):** PASTE_DRIVE_FOLDER_URL_HERE
- **Live app:** https://google-docs-clone-8vn.pages.dev/login
- **Live API:** https://google-docs-clone-gilt-iota.vercel.app/api/health (frontend on Cloudflare Pages, backend on Vercel, PostgreSQL database)
- **Source code:** https://github.com/mhammad100/google-docs-clone

## Test accounts

All demo accounts use the password **`password123`**. The login page also has one-click **Alice / Bob / Carol** buttons.

| User  | Email               | Seeded data |
| ----- | ------------------- | ----------- |
| Alice | `alice@example.com` | Owns **"Project kickoff notes"**, shared with Bob as an editor |
| Bob   | `bob@example.com`   | Owns **"Bob's private draft"**; sees Alice's doc under *Shared with me* |
| Carol | `carol@example.com` | No documents; use her to receive a share |

You can also create your own account with **"New here? Create an account"**.

> These accounts are shared by all reviewers. Please don't use **Change password** on them, or the next reviewer will be locked out. Register your own account to try that feature.

## Suggested 5-minute review path

1. **Sharing and permissions**
   - Log in as **Alice** and open *Project kickoff notes*.
   - Click **Share** and add `carol@example.com` as **Viewer**.
2. **Owned vs shared**
   - Log out (avatar menu, top right) and log in as **Carol**.
   - The doc appears under **Shared with me**, marked *View only*, and the editor is read-only.
3. **Editor access**
   - Log in as **Bob**, who has editor access, and open the same doc.
   - He can edit but cannot share or delete.
4. **Editing**
   - Click **Blank document**.
   - Try the toolbar without selecting text first: text styles (Heading 1–4), bold, italic, underline, strikethrough, highlight, links, bulleted / numbered / check lists, quote, divider.
   - Changes autosave (status next to the title). Refresh to confirm they persisted.
5. **Page setup:** use **Page setup** (toolbar or File menu) to change paper size, orientation and margins, and to add a header, footer and page numbers. You can also click into the top or bottom margin of the page to type a header or footer.
6. **Export:** **File → Download as PDF**. The PDF follows the page setup, repeats the header and footer on every page, and numbers the pages.
7. **Import:** on the dashboard, use **Import a file** with a `.md` or `.txt` file (max 1 MB). Markdown headings, lists, bold, italic, links and quotes become an editable document.

## Running locally

**Requirements:** Node.js 22+ and PostgreSQL 13+.

### Backend

```bash
cd backend
npm install
cp .env.example .env          # set DATABASE_URL and JWT_SECRET
createdb docs_dev
npm run db:setup              # migrations + demo users and documents
npm run dev                   # http://localhost:4000/api
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:4000/api
npm run dev                   # http://localhost:5173
```

### Tests

```bash
cd backend
cp .env.test.example .env.test   # separate database: the tests wipe it
createdb docs_test
npm test                         # 30 tests
```

The tests cover:
- API integration
- access control
- validation
- import parsing
- sanitization
- PDF generation
- a check that the API loads in Vercel's runtime

## Feature status

### Working

- **Documents:** create, rename, edit, delete, autosave with a save-status indicator, and reopen with formatting preserved (stored as Editor.js JSON in PostgreSQL).
- **Rich text:**
  - Google Docs-style menu bar (File / Edit / Insert / Format) and toolbar.
  - Bold, italic, underline, strikethrough, highlight, inline code and links.
  - Headings 1–4, bulleted / numbered / check lists (nested), quotes and dividers.
  - Clear formatting and keyboard shortcuts.
- **File upload:** `.txt` and `.md` import as new editable documents, validated on both client and server.
- **Sharing:**
  - An owner, plus share by email as **Editor** or **Viewer**; change or revoke access.
  - "Owned by me" and "Shared with me" views.
  - Permissions are enforced on the server. Users without access get a 404, so document IDs don't leak.
- **Page setup:** paper size (Letter / A4 / Legal / A5), orientation, margins, header, footer and page numbers, saved per document.
- **Export to PDF:** generated on the server, with selectable text and clickable links.
- **Accounts:** register, log in, change password, log out (JWT auth).
- **Engineering:**
  - Layered Express API (routes → validators → controllers → services) with one response envelope and a central error handler.
  - Inputs validated with express-validator; HTML sanitized on the server.
  - 30 automated tests.

### Partial / known limitations

- **No real-time collaboration.** Two people editing the same document at once means the last save wins.
- **On-screen pages are visual guides.** Text flows continuously, with dashed lines where printed pages end. The header and footer appear once on screen; printed and exported PDFs have true pages.
- **PDF font coverage:** the bundled Roboto font covers Latin, Greek and Cyrillic. Emoji, some symbols (✓) and CJK text show as empty boxes.
- **Import** creates a new document only; it can't import into an existing one. `.docx` isn't supported.
- **Sharing** works only with existing accounts. There are no email invitations or link sharing.
- **Auth:** no password reset or email verification. The session token is kept in `localStorage`; production would use an httpOnly cookie.
- **Tests** are backend-only. There is no browser end-to-end test yet.
- **Mobile:** usable, but the editor toolbar wraps onto several rows on phones.

## Next 2–4 hours

1. **Edit conflicts (~1 h):** the client sends the `updated_at` it loaded; the API returns 409 if the document changed meanwhile, and the editor shows "This document was updated by someone else: reload / keep mine". This stops silent overwrites between collaborators.
2. **End-to-end test (~1 h):** a Playwright test covering log in → share as viewer → read-only check as the other user → PDF download, run in CI on every push.
3. **Version history (~1–1.5 h):** keep a snapshot when a session ends or every N saves, with a "Version history" panel to preview and restore. This also covers accidental deletions of content.
4. **Smaller follow-ups:** import into the current document plus `.docx` import (mammoth); Noto fonts in PDF export for emoji and CJK; a compact "more" overflow for the toolbar on phones.
