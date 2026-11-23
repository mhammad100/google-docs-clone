const documentService = require('../services/document.service');
const exportService = require('../services/export.service');
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

// RFC 6266: plain ASCII name for old clients plus the UTF-8 name
const contentDisposition = (filename) => {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

// Binary download: success is the file itself; errors still use the JSON envelope
const exportPdf = async (req, res) => {
  const { buffer, filename } = await exportService.exportPdf(req.params.id, req.user.id);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': contentDisposition(filename),
    'Content-Length': buffer.length,
    'Cache-Control': 'no-store',
  });
  res.send(buffer);
};

module.exports = { list, getOne, create, update, remove, importFile, exportPdf };
