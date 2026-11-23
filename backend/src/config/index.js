const env = require('../shared/config/env-config');
const database = require('../shared/config/database');
const supabase = require('../shared/config/supabase-config');
const gemini = require('../shared/config/gemini-config');
const deepseek = require('../shared/config/deepseek-config');

module.exports = {
  env,
  database,
  supabase,
  gemini,
  deepseek,
};
