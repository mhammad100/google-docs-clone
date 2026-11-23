const { body } = require('express-validator');

const email = body('email')
  .trim()
  .notEmpty().withMessage('Email is required')
  .isEmail().withMessage('Email is not valid')
  .normalizeEmail({ gmail_remove_dots: false })
  .isLength({ max: 255 });

const loginRules = [email, body('password').notEmpty().withMessage('Password is required')];

const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name must be at most 100 characters'),
  email,
  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8, max: 128 }).withMessage('New password must be at least 8 characters')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) throw new Error('New password must be different from the current one');
      return true;
    }),
];

module.exports = { loginRules, registerRules, changePasswordRules };
