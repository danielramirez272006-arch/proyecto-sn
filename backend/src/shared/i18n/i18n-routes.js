const express = require('express');
const router = express.Router();
const { 
  getSupportedLanguages, 
  getTranslations, 
  translate, 
  detectLocale,
  SUPPORTED_CODES 
} = require('./i18n-config');
const { success, badRequest } = require('../utils/http-response');

// 1. Lista de 10 idiomas soportados con banderas y códigos nativos
router.get('/languages', (req, res) => {
  return success(res, {
    total: SUPPORTED_CODES.length,
    default_language: 'es',
    detected_for_you: req.locale || 'es',
    languages: getSupportedLanguages()
  });
});

// 2. Diccionario completo de traducciones para un idioma (para consumir en Frontend)
router.get('/translations/:lang', (req, res) => {
  const lang = req.params.lang.toLowerCase();
  if (!SUPPORTED_CODES.includes(lang)) {
    return badRequest(res, `Idioma no soportado. Idiomas disponibles: ${SUPPORTED_CODES.join(', ')}`);
  }

  const dictionary = getTranslations(lang);
  return success(res, {
    language: lang,
    dictionary
  });
});

// 3. Detección automática del idioma del cliente
router.get('/detect', (req, res) => {
  const detected = detectLocale(req);
  return success(res, {
    detected_locale: detected,
    headers_received: {
      'accept-language': req.headers['accept-language'] || null,
      'x-language': req.headers['x-language'] || null
    }
  });
});

// 4. Traducción puntual de claves
router.post('/translate', (req, res) => {
  const { key, target_lang = 'es', params = {} } = req.body;
  if (!key) {
    return badRequest(res, 'El campo "key" es obligatorio para traducir');
  }

  const translatedText = translate(target_lang, key, params);
  return success(res, {
    key,
    target_lang,
    translated: translatedText
  });
});

module.exports = router;
