/**
 * Gestión de consentimiento de cookies y almacenamiento local de GoToX Pet OS.
 *
 * Categorías (reflejan lo que la app guarda realmente en el navegador):
 *  - necessary:   sesión y seguridad (siempre activa).
 *  - functional:  preferencias y contenido que el propio usuario crea (tema, idioma,
 *                 favoritos, planes). Se guarda a petición del usuario; puede borrarse.
 *  - geolocation: uso de la ubicación del dispositivo (opcional y aplicado en código).
 */
const COOKIE_NAME = 'gotox_cookie_consent';
const STORAGE_KEY = 'gotox_cookie_consent_v1';
const CONSENT_VERSION = 2;
const SIX_MONTHS_SECONDS = 180 * 24 * 60 * 60;

export const DEFAULT_PREFERENCES = {
  necessary: true,
  functional: true,
  geolocation: true,
};

/** Claves reales de localStorage que usa la aplicación, por categoría. */
export const CLAVES_ALMACENAMIENTO = {
  necessary: ['sn_auth_token', 'sn_refresh_token', 'sn_guest_token', 'gotox_sesion_activa'],
  functional: ['gotox_tema', 'gotox_sidebar_compacta', 'sn_language', 'gotox_favoritos_v1', 'gotox_planes_v1'],
  consent: [STORAGE_KEY, 'gotox_terminos_aceptados_v1'],
};

function writeBrowserCookie(name, value, maxAgeSeconds = SIX_MONTHS_SECONDS) {
  if (typeof document === 'undefined') return;
  const encoded = encodeURIComponent(typeof value === 'string' ? value : JSON.stringify(value));
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encoded}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function deleteBrowserCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readBrowserCookie(name) {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const prefix = `${name}=`;
  for (const raw of document.cookie.split(';')) {
    const item = raw.trim();
    if (item.startsWith(prefix)) {
      try {
        return JSON.parse(decodeURIComponent(item.slice(prefix.length)));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Normaliza consentimientos guardados con versiones anteriores del banner. */
function normalizar(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    necessary: true,
    functional: raw.functional !== undefined ? Boolean(raw.functional) : true,
    geolocation: Boolean(raw.geolocation),
    mode: raw.mode || 'custom',
    version: raw.version || 1,
    updated_at: raw.updated_at || null,
  };
}

export function obtenerConsentimientoCookies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizar(JSON.parse(raw));
  } catch {
    // Fallback a document.cookie
  }
  return normalizar(readBrowserCookie(COOKIE_NAME));
}

export function guardarConsentimientoCookies(prefs = {}) {
  const geolocation = Boolean(prefs.geolocation);
  const payload = {
    necessary: true,
    functional: true,
    geolocation,
    mode: geolocation ? 'all' : 'essential_only',
    version: CONSENT_VERSION,
    updated_at: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignorar errores de cuota
  }

  writeBrowserCookie(COOKIE_NAME, payload);
  // Se elimina la cookie auxiliar de versiones anteriores
  deleteBrowserCookie('gotox_geo_enabled');
  deleteBrowserCookie('gotox_pet_vault_enabled');
  deleteBrowserCookie('gotox_ai_history_enabled');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gotox:cookie-consent-updated', { detail: payload }));
  }
  return payload;
}

/**
 * ¿Se puede usar la ubicación del dispositivo?
 * - Con decisión guardada: se respeta la categoría de geolocalización.
 * - Sin decisión: solo si el usuario la pidió con una acción explícita (clic en «Mi ubicación»);
 *   el uso automático al cargar la página queda bloqueado hasta que exista consentimiento.
 */
export function geolocalizacionPermitida({ accionExplicita = false } = {}) {
  const consentimiento = obtenerConsentimientoCookies();
  if (consentimiento) return Boolean(consentimiento.geolocation);
  return Boolean(accionExplicita);
}

export function abrirConfiguracionCookies() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gotox:open-cookie-settings'));
  }
}

/**
 * Ejercicio local del derecho de cancelación: borra todos los datos de GoToX en este navegador
 * (sesión, preferencias, favoritos, planes y consentimiento) y recarga la aplicación.
 */
export function borrarDatosLocales() {
  const todas = [
    ...CLAVES_ALMACENAMIENTO.necessary,
    ...CLAVES_ALMACENAMIENTO.functional,
    ...CLAVES_ALMACENAMIENTO.consent,
  ];
  for (const clave of todas) {
    try {
      localStorage.removeItem(clave);
    } catch {
      // Ignorar
    }
  }
  deleteBrowserCookie(COOKIE_NAME);
  if (typeof window !== 'undefined') window.location.reload();
}
