const { Router } = require('express');
const documentController = require('../controllers/document.controller');
const shareController = require('../controllers/share.controller');
const v = require('../validators/document.validator');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');
const { uploadTextFile } = require('../middlewares/upload');

const router = Router();

router.use(requireAuth);

// Documents
router.get('/', documentController.list);
router.post('/', v.createRules, validate, documentController.create);
router.post('/import', uploadTextFile, documentController.importFile);
router.get('/:id', v.idRules, validate, documentController.getOne);
router.patch('/:id', v.updateRules, validate, documentController.update);
router.delete('/:id', v.idRules, validate, documentController.remove);

// Sharing
router.get('/:id/shares', v.idRules, validate, shareController.list);
router.post('/:id/shares', v.shareRules, validate, shareController.upsert);
router.delete('/:id/shares/:userId', v.unshareRules, validate, shareController.remove);

module.exports = router;
