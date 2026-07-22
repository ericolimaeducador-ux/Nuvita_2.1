/**
 * Preenche `subcategoria` (categoria clinica) nos produtos ja importados.
 *
 * O import original (import-produtos-curativos-ostomia.mjs) descartava a coluna
 * "Subcategoria" da planilha. Sem ela, a busca do receituario so encontrava por
 * marca comercial — digitar "curativo", "espuma" ou "alginato" nao trazia nada,
 * porque os nomes sao Duoderm, Mepilex, Kaltostat etc.
 *
 * Casa pelo nome comercial (unico por clinica). Idempotente.
 *
 * Uso: MONGODB_URI="<uri>" CLINICA_ID="<id>" node scripts/backfill-subcategoria-produtos.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoClient } from 'mongodb';

const __dirname = dirname(fileURLToPath(import.meta.url));

const uri = process.env.MONGODB_URI;
const clinicaId = process.env.CLINICA_ID;
if (!uri) { console.error('Defina MONGODB_URI.'); process.exit(1); }
if (!clinicaId) { console.error('Defina CLINICA_ID.'); process.exit(1); }

function carregar(arquivo) {
  return JSON.parse(readFileSync(join(__dirname, 'data', arquivo), 'utf8'));
}

async function main() {
  const linhas = [...carregar('produtos-curativos.json'), ...carregar('produtos-ostomia.json')];

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection('produtos');

  let atualizados = 0;
  let semCorrespondencia = 0;
  for (const l of linhas) {
    if (!l.subcategoria) continue;
    const r = await col.updateOne(
      { clinicaId, nome: l.nomeComercial },
      { $set: { subcategoria: l.subcategoria, atualizadoEm: new Date() } },
    );
    if (r.matchedCount === 0) { semCorrespondencia++; console.warn('  sem correspondencia:', l.nomeComercial); }
    else if (r.modifiedCount > 0) atualizados++;
  }

  const comSubcategoria = await col.countDocuments({ clinicaId, subcategoria: { $exists: true, $ne: null } });
  const total = await col.countDocuments({ clinicaId });
  console.log(`\nAtualizados: ${atualizados} | sem correspondencia: ${semCorrespondencia}`);
  console.log(`Com subcategoria agora: ${comSubcategoria} de ${total} produtos da clinica.`);

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
