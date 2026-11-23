const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

const register = async (req, res) => {
  const data = await authService.register(req.body);
  sendSuccess(res, { data, status: 201, message: 'Account created' });
};

const login = async (req, res) => {
  const data = await authService.login(req.body);
  sendSuccess(res, { data, message: 'Logged in' });
};

const me = async (req, res) => {
  const data = await authService.getMe(req.user.id);
  sendSuccess(res, { data, message: 'Current user' });
};

const changePassword = async (req, res) => {
  await authService.changePassword(req.user.id, req.body);
  sendSuccess(res, { message: 'Password updated' });
};

module.exports = { register, login, me, changePassword };
