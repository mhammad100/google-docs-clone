const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db/knex');

const login = async (email) => {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  return res.body.data.token;
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

let alice;
let bob;
let carol;

beforeEach(async () => {
  await db.seed.run();
  [alice, bob, carol] = await Promise.all(
    ['alice@example.com', 'bob@example.com', 'carol@example.com'].map(login),
  );
});

afterAll(() => db.destroy());

describe('response envelope and validation', () => {
  it('returns { data, status, message, error } on success', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toEqual({ data: { ok: true }, status: 200, message: 'API is healthy', error: null });
  });

  it('returns field-level validation errors', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.data).toBeNull();
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.details.map((d) => d.field)).toEqual(['email', 'password']);
  });

  it('rejects bad credentials and missing tokens', async () => {
    const bad = await request(app).post('/api/auth/login').send({ email: 'alice@example.com', password: 'wrong' });
    expect(bad.status).toBe(401);
    const noToken = await request(app).get('/api/documents');
    expect(noToken.status).toBe(401);
    expect(noToken.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects content with unsupported block types', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set(auth(alice))
      .send({ title: 'x', content: { blocks: [{ type: 'image', data: {} }] } });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unsupported type/);
  });
});

describe('documents', () => {
  it('creates, renames, saves and reopens a document with formatting preserved', async () => {
    const created = await request(app).post('/api/documents').set(auth(carol)).send({});
    expect(created.status).toBe(201);
    expect(created.body.data.title).toBe('Untitled document');
    const { id } = created.body.data;

    const content = {
      blocks: [
        { type: 'header', data: { text: 'Plan', level: 2 } },
        { type: 'paragraph', data: { text: '<b>bold</b> <i>italic</i> <u class="cdx-underline">under</u>' } },
      ],
    };
    const saved = await request(app).patch(`/api/documents/${id}`).set(auth(carol)).send({ title: 'Q1 plan', content });
    expect(saved.status).toBe(200);

    const reopened = await request(app).get(`/api/documents/${id}`).set(auth(carol));
    expect(reopened.body.data.title).toBe('Q1 plan');
    expect(reopened.body.data.content.blocks).toEqual(content.blocks);
    expect(reopened.body.data.role).toBe('owner');
  });

  it('imports a markdown file as a new owned document', async () => {
    const res = await request(app)
      .post('/api/documents/import')
      .set(auth(carol))
      .attach('file', Buffer.from('# Hello\n\n- a\n- b'), 'notes.md');
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('notes');
    expect(res.body.data.content.blocks.map((b) => b.type)).toEqual(['header', 'list']);
  });

  it('rejects unsupported upload types', async () => {
    const res = await request(app)
      .post('/api/documents/import')
      .set(auth(carol))
      .attach('file', Buffer.from('%PDF'), 'file.pdf');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Only .txt and .md files are supported');
  });
});

describe('sharing and access control', () => {
  const docIdFor = async (token, title) => {
    const res = await request(app).get('/api/documents').set(auth(token));
    return res.body.data.owned.find((d) => d.title === title).id;
  };

  it('separates owned and shared documents', async () => {
    const res = await request(app).get('/api/documents').set(auth(bob));
    expect(res.body.data.owned.map((d) => d.title)).toEqual(["Bob's private draft"]);
    expect(res.body.data.shared).toHaveLength(1);
    expect(res.body.data.shared[0]).toMatchObject({
      title: 'Project kickoff notes',
      role: 'editor',
      owner: { email: 'alice@example.com' },
    });
  });

  it('hides a document from users it is not shared with, then grants view-only access', async () => {
    const docId = await docIdFor(alice, 'Project kickoff notes');

    // Carol has no access: 404 so the id does not leak
    const before = await request(app).get(`/api/documents/${docId}`).set(auth(carol));
    expect(before.status).toBe(404);

    // Only the owner can share
    const bobShares = await request(app)
      .post(`/api/documents/${docId}/shares`)
      .set(auth(bob))
      .send({ email: 'carol@example.com', permission: 'edit' });
    expect(bobShares.status).toBe(403);

    const shared = await request(app)
      .post(`/api/documents/${docId}/shares`)
      .set(auth(alice))
      .send({ email: 'carol@example.com', permission: 'view' });
    expect(shared.status).toBe(200);
    expect(shared.body.data.map((s) => s.email)).toContain('carol@example.com');

    // Carol can read but not edit
    const read = await request(app).get(`/api/documents/${docId}`).set(auth(carol));
    expect(read.status).toBe(200);
    expect(read.body.data.role).toBe('viewer');

    const edit = await request(app).patch(`/api/documents/${docId}`).set(auth(carol)).send({ title: 'hacked' });
    expect(edit.status).toBe(403);

    // Bob (editor) can edit but not delete
    const bobEdit = await request(app).patch(`/api/documents/${docId}`).set(auth(bob)).send({ title: 'Kickoff v2' });
    expect(bobEdit.status).toBe(200);
    const bobDelete = await request(app).delete(`/api/documents/${docId}`).set(auth(bob));
    expect(bobDelete.status).toBe(403);
  });

  it('revokes access', async () => {
    const docId = await docIdFor(alice, 'Project kickoff notes');
    const { body } = await request(app).get(`/api/documents/${docId}/shares`).set(auth(alice));
    const bobShare = body.data.find((s) => s.email === 'bob@example.com');

    const removed = await request(app).delete(`/api/documents/${docId}/shares/${bobShare.userId}`).set(auth(alice));
    expect(removed.status).toBe(200);

    const after = await request(app).get(`/api/documents/${docId}`).set(auth(bob));
    expect(after.status).toBe(404);
  });

  it('validates share requests', async () => {
    const docId = await docIdFor(alice, 'Project kickoff notes');
    const unknown = await request(app)
      .post(`/api/documents/${docId}/shares`)
      .set(auth(alice))
      .send({ email: 'nobody@example.com' });
    expect(unknown.status).toBe(404);

    const self = await request(app)
      .post(`/api/documents/${docId}/shares`)
      .set(auth(alice))
      .send({ email: 'alice@example.com' });
    expect(self.status).toBe(400);

    const badPermission = await request(app)
      .post(`/api/documents/${docId}/shares`)
      .set(auth(alice))
      .send({ email: 'carol@example.com', permission: 'admin' });
    expect(badPermission.status).toBe(400);
  });
});

describe('page settings', () => {
  it('returns defaults, saves page setup and header/footer, and rejects bad margins', async () => {
    const created = await request(app).post('/api/documents').set(auth(carol)).send({ title: 'Report' });
    const { id } = created.body.data;
    expect(created.body.data.settings).toMatchObject({ pageSize: 'a4', orientation: 'portrait', header: '' });

    const settings = {
      pageSize: 'letter',
      orientation: 'landscape',
      margins: { top: 0.5, right: 0.75, bottom: 0.5, left: 0.75 },
      header: 'ACME Corp — Confidential',
      footer: 'Quarterly report',
      showPageNumbers: true,
    };
    const saved = await request(app).patch(`/api/documents/${id}`).set(auth(carol)).send({ settings });
    expect(saved.status).toBe(200);

    const reopened = await request(app).get(`/api/documents/${id}`).set(auth(carol));
    expect(reopened.body.data.settings).toEqual(settings);

    const tooWide = await request(app)
      .patch(`/api/documents/${id}`)
      .set(auth(carol))
      .send({ settings: { ...settings, pageSize: 'a5', orientation: 'portrait', margins: { top: 1, right: 2.5, bottom: 1, left: 2.5 } } });
    expect(tooWide.status).toBe(400);
    expect(tooWide.body.message).toBe('Margins are too large for this page size');

    const badSize = await request(app)
      .patch(`/api/documents/${id}`)
      .set(auth(carol))
      .send({ settings: { pageSize: 'tabloid' } });
    expect(badSize.status).toBe(400);
  });
});

describe('change password', () => {
  it('requires the current password, then lets the user log in with the new one', async () => {
    const wrong = await request(app)
      .patch('/api/auth/password')
      .set(auth(carol))
      .send({ currentPassword: 'nope', newPassword: 'brand-new-pass' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.details[0].field).toBe('currentPassword');

    const tooShort = await request(app)
      .patch('/api/auth/password')
      .set(auth(carol))
      .send({ currentPassword: 'password123', newPassword: 'short' });
    expect(tooShort.status).toBe(400);

    const same = await request(app)
      .patch('/api/auth/password')
      .set(auth(carol))
      .send({ currentPassword: 'password123', newPassword: 'password123' });
    expect(same.status).toBe(400);

    const ok = await request(app)
      .patch('/api/auth/password')
      .set(auth(carol))
      .send({ currentPassword: 'password123', newPassword: 'brand-new-pass' });
    expect(ok.status).toBe(200);

    const oldLogin = await request(app).post('/api/auth/login').send({ email: 'carol@example.com', password: 'password123' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/auth/login').send({ email: 'carol@example.com', password: 'brand-new-pass' });
    expect(newLogin.status).toBe(200);
  });

  it('requires authentication', async () => {
    const res = await request(app).patch('/api/auth/password').send({ currentPassword: 'a', newPassword: 'abcdefghij' });
    expect(res.status).toBe(401);
  });
});
