const { query } = require('../config/database');

class SocialShareCardService {
  /**
   * Genera metadatos dinámicos Open Graph (og:) y Twitter Card para compartir en redes
   */
  async generateShareMetadata(type, id) {
    let title = 'Sinergia Urbana Costa Rica';
    let description = 'Coordinación comunitaria, comercio local y rescate urbano en Costa Rica.';
    let imageUrl = 'https://sinergia.cr/assets/og-default-cr.jpg';
    let canonicalUrl = `https://sinergia.cr/${type}/${id}`;

    if (type === 'plan') {
      const plans = await query('SELECT * FROM plans WHERE code = ? OR id = ?', [id, id]);
      if (plans && plans.length > 0) {
        const plan = plans[0];
        title = `Itinerario: ${plan.title} — Sinergia Urbana`;
        description = `Únete a esta salida grupal en Costa Rica. Código de invitación: ${plan.code}`;
        imageUrl = 'https://sinergia.cr/assets/og-plan-group.jpg';
        canonicalUrl = `https://sinergia.cr/p/${plan.code}`;
      }
    } else if (type === 'place') {
      const places = await query('SELECT * FROM places WHERE id = ?', [id]);
      if (places && places.length > 0) {
        const place = places[0];
        title = `${place.name} | ${place.category.toUpperCase()} en Costa Rica`;
        description = `${place.description || 'Conoce este local verificado en Sinergia Urbana.'} Dirección: ${place.address || 'Costa Rica'}`;
        imageUrl = place.cover_image || 'https://sinergia.cr/assets/og-place-cr.jpg';
        canonicalUrl = `https://sinergia.cr/lugares/${place.id}`;
      }
    } else if (type === 'pet' || type === 'rescue') {
      title = '🚨 ALERTA: Mascota Extraviada en Costa Rica';
      description = `Ayúdanos a encontrar a este peludo extraviado. Reporte comunitario en Sinergia Urbana.`;
      imageUrl = 'https://sinergia.cr/assets/og-lost-pet.jpg';
      canonicalUrl = `https://sinergia.cr/sos/pet/${id}`;
    }

    const openGraphTags = {
      'og:title': title,
      'og:description': description,
      'og:image': imageUrl,
      'og:url': canonicalUrl,
      'og:type': 'website',
      'og:locale': 'es_CR',
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': imageUrl
    };

    const htmlMetaTags = Object.entries(openGraphTags)
      .map(([k, v]) => `<meta property="${k}" content="${v.replace(/"/g, '&quot;')}" />`)
      .join('\n');

    return {
      type,
      id,
      title,
      description,
      image_url: imageUrl,
      canonical_url: canonicalUrl,
      open_graph: openGraphTags,
      html_meta_tags: htmlMetaTags
    };
  }
}

module.exports = new SocialShareCardService();

