import { body, validationResult } from 'express-validator';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// User registration validation
export const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage('Password must contain at least one letter, one number, and one special character'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s\-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  handleValidationErrors
];

// Login validation
export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Election creation validation
export const validateElectionCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('startDate')
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  
  body('endDate')
    .isISO8601()
    .withMessage('Please provide a valid end date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('department')
    .isMongoId()
    .withMessage('Please provide a valid department ID'),
  
  handleValidationErrors
];

// Notice creation validation
export const validateNoticeCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  
  body('body')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Body must be between 10 and 1000 characters'),
  
  body('audience')
    .isIn(['all', 'department_students', 'department_teachers', 'class_students'])
    .withMessage('Invalid audience type'),
  
  handleValidationErrors
];

// Password change validation
export const validatePasswordChange = [
  body('oldPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage('New password must contain at least one letter, one number, and one special character'),
  
  handleValidationErrors
];

// OTP validation
export const validateOTP = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
  
  handleValidationErrors
];
