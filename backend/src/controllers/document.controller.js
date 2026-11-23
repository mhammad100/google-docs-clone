const documentService = require('../services/document.service');
const { sendSuccess } = require('../utils/response');

const list = async (req, res) => {
  const data = await documentService.listForUser(req.user.id);
  sendSuccess(res, { data, message: 'Documents fetched' });
};

const getOne = async (req, res) => {
  const data = await documentService.getById(req.params.id, req.user.id);
  sendSuccess(res, { data, message: 'Document fetched' });
};

const create = async (req, res) => {
  const data = await documentService.create(req.user.id, req.body);
  sendSuccess(res, { data, status: 201, message: 'Document created' });
};

const update = async (req, res) => {
  const { title, content, settings } = req.body;
  const data = await documentService.update(req.params.id, req.user.id, { title, content, settings });
  sendSuccess(res, { data, message: 'Document saved' });
};

const remove = async (req, res) => {
  await documentService.remove(req.params.id, req.user.id);
  sendSuccess(res, { message: 'Document deleted' });
};

const importFile = async (req, res) => {
  const data = await documentService.importFromFile(req.user.id, req.file);
  sendSuccess(res, { data, status: 201, message: `Imported "${data.title}"` });
};

module.exports = { list, getOne, create, update, remove, importFile };
