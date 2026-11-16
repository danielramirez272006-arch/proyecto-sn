const placesRepository = require('../../modules/places/places-repository');

class HypeScoreCalculator {
  calculateWeeklyHype(places = [], interactions = []) {
    return places.map(p => {
      const hits = interactions.filter(i => i.place_id === p.id).length;
      return {
        place_id: p.id,
        name: p.name,
        hype_score: Math.min(100, hits * 10 + (p.verified_by_admin ? 20 : 0)),
        is_trending: hits >= 5,
      };
    }).sort((a, b) => b.hype_score - a.hype_score);
  }

  async recalculateAllScores() {
    try {
      const places = await placesRepository.findAll({ limit: 50 });
      const scores = this.calculateWeeklyHype(places || [], []);
      return {
        recalculated_at: new Date().toISOString(),
        places_scored: scores.length,
        top_trending: scores.slice(0, 5)
      };
    } catch (err) {
      return {
        recalculated_at: new Date().toISOString(),
        places_scored: 0,
        error: err.message
      };
    }
  }
}

module.exports = new HypeScoreCalculator();

