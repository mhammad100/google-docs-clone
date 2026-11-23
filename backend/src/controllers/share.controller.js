const shareService = require('../services/share.service');
const { sendSuccess } = require('../utils/response');

const list = async (req, res) => {
  const data = await shareService.list(req.params.id, req.user.id);
  sendSuccess(res, { data, message: 'Shares fetched' });
};

const upsert = async (req, res) => {
  const { email, permission = 'view' } = req.body;
  const data = await shareService.upsert(req.params.id, req.user.id, { email, permission });
  sendSuccess(res, { data, message: `Shared with ${email}` });
};

const remove = async (req, res) => {
  const data = await shareService.remove(req.params.id, req.user.id, req.params.userId);
  sendSuccess(res, { data, message: 'Access removed' });
};

module.exports = { list, upsert, remove };
