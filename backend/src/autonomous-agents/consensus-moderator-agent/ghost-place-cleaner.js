class GhostPlaceCleaner {
  detectInactivePlaces(places = []) {
    // Lugares con reportes recurrentes de "cerrado permanentemente"
    return places.filter(p => p.closure_reports_count >= 3 && !p.verified_by_admin);
  }
}

module.exports = new GhostPlaceCleaner();

