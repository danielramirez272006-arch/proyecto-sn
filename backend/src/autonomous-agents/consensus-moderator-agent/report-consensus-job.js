const { haversineDistanceKm } = require('../../shared/utils/geo-math');

class ReportConsensusJob {
  calculateConsensus(reports = [], minVotes = 2, maxDistanceKm = 0.5) {
    const verifiedAlerts = [];
    for (let i = 0; i < reports.length; i++) {
      let cluster = [reports[i]];
      for (let j = i + 1; j < reports.length; j++) {
        const d = haversineDistanceKm(reports[i].lat, reports[i].lng, reports[j].lat, reports[j].lng);
        if (d <= maxDistanceKm && reports[i].type === reports[j].type) {
          cluster.push(reports[j]);
        }
      }
      if (cluster.length >= minVotes) {
        verifiedAlerts.push({
          type: reports[i].type,
          lat: reports[i].lat,
          lng: reports[i].lng,
          confidence_score: Math.min(100, cluster.length * 35),
          confirmations: cluster.length,
        });
      }
    }
    return verifiedAlerts;
  }

  async evaluateConsensus(reports = []) {
    const verified = this.calculateConsensus(reports);
    return {
      evaluated_at: new Date().toISOString(),
      reports_analyzed: reports.length,
      verified_clusters: verified.length,
      alerts: verified
    };
  }
}

module.exports = new ReportConsensusJob();

