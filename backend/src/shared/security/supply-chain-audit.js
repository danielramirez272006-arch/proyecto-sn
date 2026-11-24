const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

/**
 * Verificador de integridad de cadena de suministro (OWASP A03:2025 - Software Supply Chain Failures).
 * Comprueba que package-lock.json exista, tenga hashes SHA-512 de integridad en dependencias
 * de producción y no contenga versiones inseguras ('*', 'latest', URLs git+http).
 */
function inspectSupplyChain(backendDir = path.resolve(__dirname, '../../..')) {
  const pkgPath = path.join(backendDir, 'package.json');
  const lockPath = path.join(backendDir, 'package-lock.json');

  const findings = [];
  if (!fs.existsSync(pkgPath)) {
    return { ok: false, findings: ['No se encontró backend/package.json'] };
  }
  if (!fs.existsSync(lockPath)) {
    return { ok: false, findings: ['No se encontró backend/package-lock.json para fijar versiones e integridad'] };
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const lockRaw = fs.readFileSync(lockPath, 'utf8');
  const lock = JSON.parse(lockRaw);
  const lockfileSha256 = crypto.createHash('sha256').update(lockRaw).digest('hex');

  const deps = pkg.dependencies || {};
  const lockPackages = lock.packages || {};
  let verifiedWithIntegrity = 0;

  for (const [depName, versionRange] of Object.entries(deps)) {
    const spec = String(versionRange || '').trim();
    if (spec === '*' || spec === 'latest' || spec.startsWith('http://') || spec.startsWith('git+http://')) {
      findings.push(`Dependencia con especificador inseguro: ${depName}@${spec}`);
    }
    const lockEntry = lockPackages[`node_modules/${depName}`];
    if (!lockEntry) {
      findings.push(`Dependencia ausente en package-lock.json: ${depName}`);
    } else if (!lockEntry.integrity || !String(lockEntry.integrity).startsWith('sha')) {
      findings.push(`Dependencia sin hash de integridad SRI en lockfile: ${depName}`);
    } else {
      verifiedWithIntegrity += 1;
    }
  }

  return {
    ok: findings.length === 0,
    owasp_control: 'A03:2025 - Software Supply Chain Failures',
    lockfile_version: lock.lockfileVersion || null,
    lockfile_sha256_prefix: lockfileSha256.slice(0, 16),
    production_dependencies_count: Object.keys(deps).length,
    verified_integrity_hashes: verifiedWithIntegrity,
    findings,
    checked_at: new Date().toISOString()
  };
}

if (require.main === module) {
  const report = inspectSupplyChain();
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

module.exports = { inspectSupplyChain };
