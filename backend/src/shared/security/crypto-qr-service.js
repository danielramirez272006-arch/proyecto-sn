const crypto = require('node:crypto');
const { query, execute } = require('../config/database');

const QR_SECRET = process.env.QR_SECRET_KEY || process.env.JWT_SECRET || 'sinergia_cr_secure_qr_secret_salt_2026';

class CryptoQrService {
  /**
   * Genera la firma criptográfica HMAC-SHA256 para el payload
   */
  signPayload(payload) {
    const raw = JSON.stringify(payload);
    return crypto.createHmac('sha256', QR_SECRET).update(raw).digest('base64url');
  }

  /**
   * Genera un token QR firmado con metadatos y tiempo de vida
   */
  async generateQr({ type = 'event_checkin', refId, ttlSeconds = 86400, metadata = {} }) {
    if (!refId) {
      throw new Error('refId es obligatorio para generar un código QR');
    }

    const qrId = `qr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = ttlSeconds ? now + ttlSeconds : null;

    const payload = {
      qr_id: qrId,
      type,
      ref_id: refId,
      issued_at: now,
      expires_at: expiresAt,
      metadata
    };

    const signature = this.signPayload(payload);
    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${payloadEncoded}.${signature}`;

    // Generar representación visual SVG para el frontend
    const svgPreview = this.generateSvgPlaceholder(qrId, type);

    return {
      qr_id: qrId,
      type,
      ref_id: refId,
      token,
      issued_at: new Date(now * 1000).toISOString(),
      expires_at: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
      verification_url: `https://sinergia.cr/qr/verify?token=${token}`,
      svg_preview: svgPreview
    };
  }

  /**
   * Inspecciona y valida la autenticidad y vigencia de un token QR sin canjearlo
   */
  inspectQr(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      return { valid: false, error: 'Formato de token QR inválido' };
    }

    const [payloadEncoded, signature] = token.split('.');

    try {
      const payloadJson = Buffer.from(payloadEncoded, 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson);

      const expectedSignature = this.signPayload(payload);
      if (signature !== expectedSignature) {
        return { valid: false, error: 'Firma criptográfica inválida o QR adulterado' };
      }

      const now = Math.floor(Date.now() / 1000);
      if (payload.expires_at && now > payload.expires_at) {
        return { valid: false, expired: true, error: 'El código QR ha expirado' };
      }

      return {
        valid: true,
        payload,
        expires_in_seconds: payload.expires_at ? Math.max(0, payload.expires_at - now) : null
      };
    } catch (err) {
      return { valid: false, error: `Error decodificando QR: ${err.message}` };
    }
  }

  /**
   * Canjea un código QR de un solo uso (idempotente)
   */
  async redeemQr(token, redeemedBy = 'system') {
    const inspection = this.inspectQr(token);
    if (!inspection.valid) {
      return inspection;
    }

    const { qr_id, type, ref_id, metadata } = inspection.payload;

    // Verificar si ya fue canjeado en la base de datos
    const existing = await query('SELECT * FROM qr_redemptions WHERE qr_id = ?', [qr_id]);
    if (existing && existing.length > 0) {
      const prev = existing[0];
      return {
        valid: false,
        already_redeemed: true,
        error: 'Este código QR ya fue canjeado previamente',
        redeemed_at: prev.redeemed_at,
        redeemed_by: prev.redeemed_by
      };
    }

    const id = `red_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    await execute(
      `INSERT INTO qr_redemptions (id, qr_id, qr_type, redeemed_by, redeemed_at, metadata_json)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [id, qr_id, type, redeemedBy, JSON.stringify(metadata || {})]
    );

    return {
      valid: true,
      redeemed: true,
      qr_id,
      type,
      ref_id,
      metadata,
      redeemed_at: new Date().toISOString(),
      redeemed_by: redeemedBy
    };
  }

  /**
   * Genera un SVG estructurado como marcador visual
   */
  generateSvgPlaceholder(qrId, type) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <rect width="200" height="200" fill="#ffffff" rx="12"/>
      <rect x="20" y="20" width="50" height="50" fill="#1b5e20"/>
      <rect x="130" y="20" width="50" height="50" fill="#1b5e20"/>
      <rect x="20" y="130" width="50" height="50" fill="#1b5e20"/>
      <circle cx="100" cy="100" r="18" fill="#2e7d32"/>
      <text x="100" y="185" font-family="sans-serif" font-size="9" text-anchor="middle" fill="#555555">${type}: ${qrId.slice(0, 14)}</text>
    </svg>`;
  }
}

module.exports = new CryptoQrService();

