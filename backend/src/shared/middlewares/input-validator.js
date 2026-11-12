const { badRequest } = require('../utils/http-response');

function validateBody(rules = {}) {
  return (req, res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const [field, rule] of Object.entries(rules)) {
      const val = body[field];

      if (rule.required && (val === undefined || val === null || val === '')) {
        errors.push(`El campo "${field}" es obligatorio.`);
        continue;
      }

      if (val !== undefined && val !== null && val !== '') {
        if (rule.type === 'string' && typeof val !== 'string') {
          errors.push(`El campo "${field}" debe ser una cadena de texto.`);
        }
        if (rule.type === 'number' && typeof val !== 'number') {
          errors.push(`El campo "${field}" debe ser un número.`);
        }
        if (rule.type === 'boolean' && typeof val !== 'boolean') {
          errors.push(`El campo "${field}" debe ser un booleano.`);
        }
        if (rule.type === 'array' && !Array.isArray(val)) {
          errors.push(`El campo "${field}" debe ser un array.`);
        }
        if (rule.enum && !rule.enum.includes(val)) {
          errors.push(`El campo "${field}" debe ser uno de los siguientes valores: [${rule.enum.join(', ')}].`);
        }
        if (rule.min && typeof val === 'string' && val.length < rule.min) {
          errors.push(`El campo "${field}" debe tener al menos ${rule.min} caracteres.`);
        }
      }
    }

    if (errors.length > 0) {
      return badRequest(res, 'Error de validación en la solicitud.', { validation_errors: errors });
    }

    next();
  };
}

module.exports = {
  validateBody
};
