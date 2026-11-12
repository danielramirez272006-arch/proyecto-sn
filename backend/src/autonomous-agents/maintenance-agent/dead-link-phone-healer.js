class DeadLinkPhoneHealer {
  auditPhoneNumbers(places = []) {
    // Valida formato telefónico de Costa Rica (+506 XXXX-XXXX)
    const invalidList = [];
    const crPhoneRegex = /^(\+506\s?)?[24678]\d{3}[-\s]?\d{4}$/;

    for (const p of places) {
      if (p.phone && !crPhoneRegex.test(p.phone.trim())) {
        invalidList.push({ id: p.id, name: p.name, phone: p.phone, reason: 'Formato telefónico no coincide con numeración CR' });
      }
    }
    return invalidList;
  }
}

module.exports = new DeadLinkPhoneHealer();

