const { badRequest } = require('../shared/utils/http-response');

/**
 * Middleware reutilizable de validación de entrada para rutas que reciben datos.
 * Valida campos requeridos, tipos básicos y longitudes máximas para evitar errores 500 o inyecciones.
 */
function validateBody(schema = {}) {
  return (req, res, next) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest(res, 'El cuerpo de la solicitud debe ser un objeto JSON válido.');
    }

    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];
      const missing = value === undefined || value === null || value === '';

      if (rules.required && missing) {
        errors.push(`El campo '${field}' es obligatorio.`);
        continue;
      }
      if (missing) continue;

      if (rules.type === 'string') {
        if (typeof value !== 'string') {
          errors.push(`El campo '${field}' debe ser una cadena de texto.`);
        } else {
          if (rules.minLength && value.trim().length < rules.minLength) {
            errors.push(`El campo '${field}' debe tener al menos ${rules.minLength} caracteres.`);
          }
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`El campo '${field}' no puede exceder ${rules.maxLength} caracteres.`);
          }
          if (rules.pattern && !rules.pattern.test(value.trim())) {
            errors.push(rules.patternMessage || `El campo '${field}' tiene un formato inválido.`);
          }
        }
      } else if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`El campo '${field}' debe ser booleano (true/false).`);
      } else if (rules.type === 'number' && (typeof value !== 'number' || Number.isNaN(value))) {
        errors.push(`El campo '${field}' debe ser numérico.`);
      } else if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push(`El campo '${field}' debe ser un arreglo.`);
      }

      if (rules.equals !== undefined && value !== rules.equals) {
        errors.push(rules.equalsMessage || `El campo '${field}' debe ser igual a ${rules.equals}.`);
      }
    }

    if (errors.length > 0) {
      return badRequest(res, errors[0], { validation_errors: errors });
    }
    return next();
  };
}

module.exports = { validateBody };
