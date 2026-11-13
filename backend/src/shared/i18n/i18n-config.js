const path = require('path');
const fs = require('fs');
const i18n = require('i18n');

const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish', nativeName: 'Español (Costa Rica)', flag: '🇨🇷', isDefault: true },
  { code: 'en', name: 'English', nativeName: 'English (US/Global)', flag: '🇺🇸', isDefault: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', isDefault: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', isDefault: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', isDefault: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', isDefault: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文 (Mandarin)', flag: '🇨🇳', isDefault: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', isDefault: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', isDefault: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', isDefault: false }
];

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map(l => l.code);
const localesDir = path.resolve(__dirname, 'locales');

i18n.configure({
  locales: SUPPORTED_CODES,
  defaultLocale: 'es',
  directory: localesDir,
  autoReload: false,
  updateFiles: false,
  syncFiles: false,
  queryParameter: 'lang',
  header: 'accept-language',
  objectNotation: true,
  register: global
});

/**
 * Detecta el idioma a partir de la cabecera o query param
 */
function detectLocale(req) {
  if (!req) return 'es';

  // 1. Query parameter ?lang= o ?locale=
  const queryLang = req.query?.lang || req.query?.locale;
  if (queryLang && SUPPORTED_CODES.includes(queryLang.toLowerCase())) {
    return queryLang.toLowerCase();
  }

  // 2. Cabecera personalizada x-language
  const headerLang = req.headers?.['x-language'];
  if (headerLang && SUPPORTED_CODES.includes(headerLang.toLowerCase())) {
    return headerLang.toLowerCase();
  }

  // 3. Cabecera estándar Accept-Language (ej. 'fr-FR,fr;q=0.9,en;q=0.8')
  const acceptLang = req.headers?.['accept-language'];
  if (acceptLang) {
    const preferred = acceptLang
      .split(',')
      .map(part => {
        const [lang, qVal] = part.trim().split(';q=');
        return {
          code: lang.trim().slice(0, 2).toLowerCase(),
          q: qVal ? parseFloat(qVal) : 1.0
        };
      })
      .sort((a, b) => b.q - a.q);

    for (const item of preferred) {
      if (SUPPORTED_CODES.includes(item.code)) {
        return item.code;
      }
    }
  }

  return 'es';
}

/**
 * Middleware para Express: inyecta req.locale y req.t()
 */
function i18nMiddleware(req, res, next) {
  const locale = detectLocale(req);
  req.locale = locale;
  req.language = locale;
  i18n.setLocale(req, locale);

  // Inyectar helper de traducción directa
  req.t = (key, params) => {
    return i18n.__({ phrase: key, locale }, params);
  };

  res.setHeader('Content-Language', locale);
  next();
}

/**
 * Traduce una clave en un idioma específico
 */
function translate(locale, key, params = {}) {
  const safeLocale = SUPPORTED_CODES.includes(locale) ? locale : 'es';
  return i18n.__({ phrase: key, locale: safeLocale }, params);
}

/**
 * Obtiene el diccionario completo en formato JSON de un idioma
 */
function getTranslations(locale = 'es') {
  const safeLocale = SUPPORTED_CODES.includes(locale) ? locale : 'es';
  const filePath = path.join(localesDir, `${safeLocale}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return {};
}

function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

module.exports = {
  i18n,
  i18nMiddleware,
  detectLocale,
  translate,
  t: translate,
  getTranslations,
  getSupportedLanguages,
  SUPPORTED_CODES
};
