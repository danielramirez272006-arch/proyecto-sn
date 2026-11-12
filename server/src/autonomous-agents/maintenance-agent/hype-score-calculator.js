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
}

module.exports = new HypeScoreCalculator();

