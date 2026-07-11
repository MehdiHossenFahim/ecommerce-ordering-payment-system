const { validationResult } = require('express-validator');

// Runs after an array of express-validator checks; returns 422 with field errors if any failed
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

module.exports = validate;
