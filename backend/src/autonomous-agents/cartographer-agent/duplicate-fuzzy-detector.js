const { stringSimilarityFuzzy } = require('../../shared/utils/geo-math');

class DuplicateFuzzyDetector {
  findDuplicates(placesList = [], threshold = 0.75) {
    const duplicates = [];
    for (let i = 0; i < placesList.length; i++) {
      for (let j = i + 1; j < placesList.length; j++) {
        const p1 = placesList[i];
        const p2 = placesList[j];
        const score = stringSimilarityFuzzy(p1.name, p2.name);
        if (score >= threshold) {
          duplicates.push({ score, placeA: p1, placeB: p2 });
        }
      }
    }
    return duplicates;
  }
}

module.exports = new DuplicateFuzzyDetector();

