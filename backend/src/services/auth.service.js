const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/knex');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const toPublicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

const signToken = (user) =>
  jwt.sign({ sub: user.id, email: user.email, name: user.name }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const register = async ({ name, email, password }) => {
  const existing = await db('users').where({ email }).first();
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await db('users').insert({ name, email, password_hash }).returning('*');
  return { user: toPublicUser(user), token: signToken(user) };
};

const login = async ({ email, password }) => {
  const user = await db('users').where({ email }).first();
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) throw ApiError.unauthorized('Incorrect email or password');

  return { user: toPublicUser(user), token: signToken(user) };
};

const getMe = async (userId) => {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  return toPublicUser(user);
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  // 400 (not 401) so the client doesn't treat a typo as an expired session
  if (!valid) throw ApiError.badRequest('Current password is incorrect', [{ field: 'currentPassword', message: 'Current password is incorrect' }]);

  const password_hash = await bcrypt.hash(newPassword, 10);
  await db('users').where({ id: userId }).update({ password_hash, updated_at: db.fn.now() });
};

module.exports = { register, login, getMe, changePassword };
