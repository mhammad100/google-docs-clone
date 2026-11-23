# AI workflow note

I built this project with **Claude Code** (Anthropic's coding agent, in the Claude desktop app) as a pair programmer. This note covers how I split the work, how I checked the AI's output, and where it helped or needed correcting.

## How I used it

**1. I set the constraints first; the AI worked inside them.**
- Before any code, I gave it the stack: React, Redux Toolkit, SCSS, Editor.js, Node/Express, Knex, PostgreSQL and express-validator.
- I also gave it my code conventions:
  - Backend: routes → controllers → services, a central error handler, and one response envelope `{ data, status, message, error }`.
  - Frontend: axios interceptors for the auth token, and an `asyncCatcher` wrapper so every call is handled as `if (res.error) return`.
- I chose the deployment target (Cloudflare Pages for the frontend, Vercel for the API) and the upload scope (`.txt` / `.md`).
- The AI proposed the data model, API and file layout. I reviewed the plan before it wrote code.

**2. Small, reviewable steps.**
- I built it in increments: core CRUD and sharing → Google Docs-style editor and page setup → account menu → dashboard redesign → dialog and editor polish → PDF export → deployment fixes.
- After each step I looked at the running app and gave concrete feedback, usually a screenshot with what to change: "toolbar should work without highlighting text first", "add an avatar menu with change password", "modals aren't styled properly".

**3. "Done" meant verified, not just written.** For every change I had the agent prove it worked:
- **Automated tests:** Vitest and Supertest against a real PostgreSQL test database. There are 30 tests, covering access control (404 for strangers, viewers can't edit, editors can't share or delete), validation, import parsing, HTML sanitization, PDF generation, and a check that the API loads in Vercel's runtime.
- **Driving the real app:** the agent clicked and typed in a browser to check each feature, including mobile widths.
- **Inspecting outputs:** exported PDFs were rendered to images and checked page by page.
- **Smoke tests against the running server:** login, CRUD, formatting round-trips, sharing and error envelopes.

## Where verification caught real bugs

Most of these would have passed a quick read of the code. They only showed up because something was run and checked:

- **Blank editor:** React StrictMode mounts components twice, and Editor.js clears its container on destroy, wiping the second instance. Fix: give each editor instance its own container.
- **Lost formatting:** converting a paragraph into a heading or list through Editor.js's `convert()` silently dropped bold and italic. Fix: a custom conversion that keeps inline HTML.
- **Toolbar acting on the wrong line:** the browser didn't always fire `selectionchange`, so the toolbar sometimes acted on a stale block. Fix: also refresh the state on mouse-up and key-up.
- **Stale PDF exports:** exporting right after typing produced a PDF without the newest words, because Editor.js debounces its change event. Found by comparing the exported file with a fresh server export byte for byte. Fix: save the editor's current content before exporting.
- **Deployment crash:** the first Vercel deploy failed with `ERR_REQUIRE_ESM`. Some newer dependency versions are ES-module-only; Node 24 on my machine can load them, but Vercel's runtime can't. I passed the deploy log to the agent, which reproduced it locally by disabling that Node feature. It found a second instance in the PDF library before it reached production, pinned CommonJS-compatible versions, and added a test so a future upgrade can't bring the problem back.

## What I kept for myself

- **Product and scope decisions:** what to build, what to leave out (real-time collaboration, version history), and the trade-offs written up in `ARCHITECTURE.md`.
- **Accounts, credentials and deployment:** hosting, database provisioning, environment variables and secrets. The agent never handled production credentials.
- **Design direction and final review:** the AI implemented, and I judged whether the result looked and behaved right.

## What I learned

- **Test the code in the environment it will actually run in.** The deploy crash and the stale-PDF bug both passed unit tests; they only appeared under the real runtime or real timing.
- **A check only counts once you've seen it fail.** For the deployment check, I had the agent reinstall the broken package version and confirm the test caught it before I trusted it.
- **Constraints up front matter more than prompts later.** Giving the agent my architecture conventions at the start kept the codebase consistent across many iterations, with little rework.
