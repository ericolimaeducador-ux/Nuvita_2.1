/**
 * Gera cloudrun.env.yaml (gitignored) a partir de apps/api/.env, para uso com
 *   gcloud run deploy ... --env-vars-file cloudrun.env.yaml
 *
 * Ajustes automáticos:
 *  - NODE_ENV=production   (postura segura: Swagger fechado, CSP ligado, logs sane)
 *  - CONFIG_SOURCE=env     (lê segredos das env vars, NÃO do GCP Secret Manager)
 *  - LOG_LEVEL=info        (evita logs debug verbosos com possível PII em produção)
 *  - CORS_ORIGIN inclui a URL do GitHub Pages
 *  - remove PORT (o Cloud Run injeta a porta automaticamente)
 *
 * Uso: node scripts/gen-cloudrun-env.cjs
 */
const fs = require('fs');
const path = require('path');

// Origens permitidas no CORS em produção (frontend do Nuvita 2.1). Nunca
// incluir localhost aqui: origem de dev na allowlist de produção deixa
// qualquer página local conversar com a API de produção com credenciais.
// Para testar contra produção, use um deploy de preview ou o próprio domínio.
const PROD_ORIGINS = ['https://estomoterapia.nuvita.app.br'];
const PROD_ROOT_DOMAIN = 'nuvita.app.br';
const envFile = path.join(__dirname, '..', 'apps', 'api', '.env');
const outFile = path.join(__dirname, '..', 'cloudrun.env.yaml');

const vars = {};
for (const raw of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i === -1) continue;
  vars[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

// Overrides para o ambiente Cloud Run
vars.NODE_ENV = 'production';
vars.CONFIG_SOURCE = 'env';
vars.LOG_LEVEL = 'info';
vars.CORS_ORIGIN = PROD_ORIGINS.join(',');
vars.APP_ROOT_DOMAIN = PROD_ROOT_DOMAIN;
delete vars.PORT; // Cloud Run define a porta
delete vars.EXPOSE_DOCS; // Swagger fechado em produção

// YAML com valores como strings JSON (seguro p/ caracteres especiais da URI/secrets)
const yaml = Object.entries(vars)
  .map(([k, v]) => `${k}: ${JSON.stringify(String(v))}`)
  .join('\n') + '\n';

fs.writeFileSync(outFile, yaml);
console.log(`✓ Gerado ${outFile} com ${Object.keys(vars).length} variáveis.`);
console.log('  (arquivo está no .gitignore — contém segredos, NÃO commitar)');
console.log('\nPróximo passo: aplicar como secret do GitHub e disparar o deploy —');
console.log('  gh secret set CLOUDRUN_ENV_YAML < cloudrun.env.yaml');
console.log('  gh workflow run deploy-api.yml');
