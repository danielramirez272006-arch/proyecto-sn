class BioFoodSafetyApiClient {
  constructor() {
    this.knownToxins = [
      { name: 'Chocolate / Teobromina', severity: 'HIGH', symptoms: 'Vómito, taquicardia, convulsiones', action: 'Inducción de vómito solo bajo indicación médica inmediata.' },
      { name: 'Uvas y Pasas', severity: 'CRITICAL', symptoms: 'Fallo renal agudo', action: 'Atención hospitalaria de urgencia.' },
      { name: 'Xilitol (Edulcorante)', severity: 'CRITICAL', symptoms: 'Hipoglucemia severa, colapso hepático', action: 'Administrar miel en encías si está consciente y acudir a urgencias.' },
      { name: 'Cebolla y Ajo', severity: 'MODERATE', symptoms: 'Anemia hemolítica', action: 'Monitorear color de encías y orina.' },
      { name: 'Lirio (Flores / Gatos)', severity: 'DEADLY', symptoms: 'Insuficiencia renal irreversible', action: 'Lavado gástrico de extrema urgencia en clínica.' }
    ];
  }

  triageSubstance(substanceName = '') {
    const q = String(substanceName).toLowerCase().trim();
    const match = this.knownToxins.find(t => t.name.toLowerCase().includes(q) || q.includes(t.name.toLowerCase().split(' ')[0]));
    if (match) {
      return {
        is_toxic: true,
        ...match,
        disclaimer: 'Triaje preliminar automatizado. Consulte inmediatamente al veterinario 24/7.'
      };
    }
    return {
      is_toxic: false,
      name: substanceName,
      severity: 'UNKNOWN',
      symptoms: 'Sustancia no registrada como toxina crítica común. Monitorear salivación y letargia.',
      action: 'Consulte a su médico veterinario con la etiqueta o foto de la planta.'
    };
  }

  async checkPetFoodBarcode(barcode) {
    return {
      barcode,
      product_name: 'Alimento Canino Premium / Ficha Simulada',
      brand: 'NutriPet Costa Rica',
      nutrition_grade: 'A',
      cabys_code: '2331101000100',
      cabys_iva_rate: 0.13,
      is_safe: true,
    };
  }
}

module.exports = new BioFoodSafetyApiClient();

