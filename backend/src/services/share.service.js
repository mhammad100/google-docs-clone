const db = require('../db/knex');
const ApiError = require('../utils/ApiError');
const { getAccess } = require('./document.service');

const toShare = (row) => ({
  userId: row.user_id,
  name: row.name,
  email: row.email,
  permission: row.permission,
  sharedAt: row.created_at,
});

const listShares = (documentId) =>
  db('document_shares as s')
    .join('users as u', 'u.id', 's.user_id')
    .where('s.document_id', documentId)
    .orderBy('s.created_at', 'asc')
    .select('s.user_id', 's.permission', 's.created_at', 'u.name', 'u.email')
    .then((rows) => rows.map(toShare));

const requireOwner = async (documentId, userId) => {
  const { role } = await getAccess(documentId, userId);
  if (role !== 'owner') throw ApiError.forbidden('Only the owner can manage sharing');
};

// Anyone with access can see who else has access
const list = async (documentId, userId) => {
  await getAccess(documentId, userId);
  return listShares(documentId);
};

// Grants access, or changes the permission if the user already has access
const upsert = async (documentId, ownerId, { email, permission }) => {
  await requireOwner(documentId, ownerId);

  const target = await db('users').where({ email }).first();
  if (!target) throw ApiError.notFound(`No user found with email ${email}`);
  if (target.id === ownerId) throw ApiError.badRequest('You already own this document');

  await db('document_shares')
    .insert({ document_id: documentId, user_id: target.id, permission })
    .onConflict(['document_id', 'user_id'])
    .merge({ permission, updated_at: db.fn.now() });

  return listShares(documentId);
};

const remove = async (documentId, ownerId, userId) => {
  await requireOwner(documentId, ownerId);
  const deleted = await db('document_shares').where({ document_id: documentId, user_id: userId }).del();
  if (!deleted) throw ApiError.notFound('This user does not have access');
  return listShares(documentId);
};

module.exports = { list, upsert, remove };
