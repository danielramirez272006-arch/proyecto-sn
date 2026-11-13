const httpClient = require('../../shared/clients/http-client');

class HolidaysCrService {
  /**
   * Obtiene la lista oficial de feriados de Costa Rica para un año dado
   */
  async getHolidays(year = new Date().getFullYear()) {
    const fallbackHolidays = [
      { date: `${year}-01-01`, localName: 'Año Nuevo', name: 'New Year\'s Day', fixed: true, global: true },
      { date: `${year}-04-11`, localName: 'Día de Juan Santamaría', name: 'Juan Santamaría Day', fixed: true, global: true },
      { date: `${year}-05-01`, localName: 'Día del Trabajo', name: 'Labour Day', fixed: true, global: true },
      { date: `${year}-07-25`, localName: 'Anexión del Partido de Nicoya', name: 'Guanacaste Day', fixed: true, global: true },
      { date: `${year}-08-02`, localName: 'Día de la Virgen de los Ángeles', name: 'Our Lady of the Angels', fixed: true, global: true },
      { date: `${year}-08-15`, localName: 'Día de la Madre', name: 'Mother\'s Day', fixed: true, global: true },
      { date: `${year}-09-15`, localName: 'Día de la Independencia', name: 'Independence Day', fixed: true, global: true },
      { date: `${year}-12-01`, localName: 'Día de la Abolición del Ejército', name: 'Army Abolition Day', fixed: true, global: true },
      { date: `${year}-12-25`, localName: 'Navidad', name: 'Christmas Day', fixed: true, global: true }
    ];

    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/CR`;

    try {
      const data = await httpClient.getJson(url, fallbackHolidays, 3000);
      if (Array.isArray(data) && data.length > 0) {
        return data.map(h => ({
          date: h.date,
          local_name: h.localName,
          english_name: h.name,
          country_code: 'CR'
        }));
      }
      return fallbackHolidays.map(h => ({
        date: h.date,
        local_name: h.localName,
        english_name: h.name,
        country_code: 'CR'
      }));
    } catch {
      return fallbackHolidays.map(h => ({
        date: h.date,
        local_name: h.localName,
        english_name: h.name,
        country_code: 'CR'
      }));
    }
  }

  /**
   * Determina si hoy es feriado y si la restricción vehicular de San José está suspendida
   */
  async getTodayStatus() {
    // Fecha actual en hora oficial de Costa Rica (UTC-6)
    const nowUtc = new Date();
    const crDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(nowUtc);
    const crYear = parseInt(crDateStr.slice(0, 4), 10);

    const holidays = await this.getHolidays(crYear);
    const todayHoliday = holidays.find(h => h.date === crDateStr);

    const dayOfWeek = new Date(crDateStr + 'T12:00:00Z').getUTCDay(); // 0 = Domingo, 6 = Sábado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const isRestrictionSuspended = Boolean(todayHoliday || isWeekend);
    let restrictionReason = 'Restricción vehicular regular activa en el anillo de circunvalación de San José';

    if (todayHoliday) {
      restrictionReason = `Suspendida por ser día festivo oficial: ${todayHoliday.local_name}`;
    } else if (isWeekend) {
      restrictionReason = 'Suspendida por ser fin de semana (sábado/domingo)';
    }

    // Próximo feriado en Costa Rica
    const upcoming = holidays
      .filter(h => h.date >= crDateStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      current_date_cr: crDateStr,
      is_holiday: Boolean(todayHoliday),
      holiday_info: todayHoliday || null,
      is_weekend: isWeekend,
      vehicular_restriction_suspended: isRestrictionSuspended,
      restriction_status_note: restrictionReason,
      next_holiday: upcoming.length > 0 ? upcoming[0] : null,
      total_holidays_in_year: holidays.length
    };
  }
}

module.exports = new HolidaysCrService();

