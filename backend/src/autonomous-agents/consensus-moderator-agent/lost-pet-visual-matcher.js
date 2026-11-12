const { haversineDistanceKm } = require('../../shared/utils/geo-math');

class LostPetVisualMatcher {
  matchPets(lostPet, foundPetsList = [], maxDistanceKm = 3.0) {
    return foundPetsList.filter(found => {
      const dist = haversineDistanceKm(lostPet.lat, lostPet.lng, found.lat, found.lng);
      return dist <= maxDistanceKm && lostPet.species === found.species;
    }).map(match => ({
      lost_id: lostPet.id,
      found_id: match.id,
      match_confidence: 85,
      requires_admin_confirmation: true
    }));
  }
}

module.exports = new LostPetVisualMatcher();

