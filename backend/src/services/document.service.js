const db = require('../db/knex');
const ApiError = require('../utils/ApiError');
const { sanitizeContent, emptyContent } = require('./content.service');
const { fileToDocument } = require('./import.service');
const { normalizeSettings } = require('./settings.service');

// Role a user has on a document: 'owner' | 'editor' | 'viewer'
const PERMISSION_TO_ROLE = { edit: 'editor', view: 'viewer' };

const toSummary = (row) => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Loads a document and the caller's role on it.
 * Users without access get 404 (not 403) so document ids don't leak.
 */
const getAccess = async (documentId, userId) => {
  const document = await db('documents').where({ id: documentId }).first();
  if (!document) throw ApiError.notFound('Document not found');

  if (document.owner_id === userId) return { document, role: 'owner' };

  const share = await db('document_shares').where({ document_id: documentId, user_id: userId }).first();
  if (!share) throw ApiError.notFound('Document not found');

  return { document, role: PERMISSION_TO_ROLE[share.permission] };
};

const listForUser = async (userId) => {
  const owned = await db('documents as d')
    .leftJoin('document_shares as s', 's.document_id', 'd.id')
    .where('d.owner_id', userId)
    .groupBy('d.id')
    .orderBy('d.updated_at', 'desc')
    .select('d.id', 'd.title', 'd.created_at', 'd.updated_at')
    .count('s.id as share_count');

  const shared = await db('document_shares as s')
    .join('documents as d', 'd.id', 's.document_id')
    .join('users as u', 'u.id', 'd.owner_id')
    .where('s.user_id', userId)
    .orderBy('d.updated_at', 'desc')
    .select('d.id', 'd.title', 'd.created_at', 'd.updated_at', 's.permission', 'u.name as owner_name', 'u.email as owner_email');

  return {
    owned: owned.map((r) => ({ ...toSummary(r), role: 'owner', shareCount: Number(r.share_count) })),
    shared: shared.map((r) => ({
      ...toSummary(r),
      role: PERMISSION_TO_ROLE[r.permission],
      owner: { name: r.owner_name, email: r.owner_email },
    })),
  };
};

const toFull = (document, role) => ({
  ...toSummary(document),
  content: document.content,
  settings: normalizeSettings(document.settings),
  role,
});

const getById = async (documentId, userId) => {
  const { document, role } = await getAccess(documentId, userId);
  const owner = await db('users').where({ id: document.owner_id }).first('id', 'name', 'email');
  return { ...toFull(document, role), owner };
};

const create = async (userId, { title, content, settings } = {}) => {
  const [document] = await db('documents')
    .insert({
      owner_id: userId,
      title: title || 'Untitled document',
      content: JSON.stringify(content ? sanitizeContent(content) : emptyContent()),
      settings: JSON.stringify(normalizeSettings(settings)),
    })
    .returning('*');
  return toFull(document, 'owner');
};

const update = async (documentId, userId, { title, content, settings }) => {
  const { role } = await getAccess(documentId, userId);
  if (role === 'viewer') throw ApiError.forbidden('You have view-only access to this document');

  const changes = { updated_at: db.fn.now() };
  if (title !== undefined) changes.title = title;
  if (content !== undefined) changes.content = JSON.stringify(sanitizeContent(content));
  if (settings !== undefined) changes.settings = JSON.stringify(normalizeSettings(settings));

  const [document] = await db('documents').where({ id: documentId }).update(changes).returning('*');
  return toFull(document, role);
};

const remove = async (documentId, userId) => {
  const { role } = await getAccess(documentId, userId);
  if (role !== 'owner') throw ApiError.forbidden('Only the owner can delete this document');
  await db('documents').where({ id: documentId }).del();
};

const importFromFile = async (userId, file) => create(userId, fileToDocument(file));

module.exports = { getAccess, listForUser, getById, create, update, remove, importFromFile };
