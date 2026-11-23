const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { loginRules, registerRules, changePasswordRules } = require('../validators/auth.validator');
const validate = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/auth');

const router = Router();

router.post('/register', registerRules, validate, authController.register);
router.post('/login', loginRules, validate, authController.login);
router.get('/me', requireAuth, authController.me);
router.patch('/password', requireAuth, changePasswordRules, validate, authController.changePassword);

module.exports = router;
