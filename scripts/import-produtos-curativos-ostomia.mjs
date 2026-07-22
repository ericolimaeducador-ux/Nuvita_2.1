/**
 * Importa o catalogo de referencia de curativos + ostomia (planilha
 * Base_Tecnologias_Curativos_Incontinencia_Ostomia.xlsx, abas "Curativos" e
 * "Ostomia") como produtos de UMA clinica.
 *
 * A planilha nao tem preco nem codigo — e uma base clinica, nao uma tabela
 * comercial. Por isso cada produto entra com precoVenda: 0 e ativo: false:
 * fica fora do receituario ate o admin abrir "Configuração financeira >
 * Produtos", conferir/editar o preco de venda e reativar. Isso evita que um
 * item sem preco definido apareca prescritivel por engano.
 *
 * A aba "Incontinência Urinária" foi deixada de fora de proposito: o catalogo
 * de sonda/cateter/fralda foi removido do codigo (ver
 * produtos.service.ts#removerCatalogoLegado) por decisao de produto, e essa
 * planilha reintroduziria a mesma categoria.
 *
 * Codigo interno gerado automaticamente por aba (CUR-001.., OST-001..),
 * sequencial na ordem da planilha — editavel depois na tela de produtos.
 *
 * Idempotente: roda de novo sem duplicar (upsert por clinicaId+nome).
 *
 * Uso: MONGODB_URI="<uri>" CLINICA_ID="<id>" node scripts/import-produtos-curativos-ostomia.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoClient } from 'mongodb';

const __dirname = dirname(fileURLToPath(import.meta.url));

const uri = process.env.MONGODB_URI;
const clinicaId = process.env.CLINICA_ID;
if (!uri) { console.error('Defina MONGODB_URI.'); process.exit(1); }
if (!clinicaId) { console.error('Defina CLINICA_ID (id da clinica que vai receber o catalogo).'); process.exit(1); }

const TIPO_POR_SUBCATEGORIA_CURATIVOS = {
  'Hidrocoloide': 'cobertura',
  'Espuma de Poliuretano (Foam)': 'cobertura',
  'Alginato de Cálcio / Hidrofibra': 'cobertura',
  'Hidrogel': 'cobertura',
  'Filme de Poliuretano Transparente': 'cobertura',
  'Curativo com Prata': 'cobertura',
  'Colágeno / Bioativos': 'cobertura',
  'Carvão Ativado': 'cobertura',
  'Telas / Coberturas Não Aderentes': 'cobertura',
  'Protetor Cutâneo / Barreira': 'adjuvante',
  'Terapias Tópicas Adjuvantes': 'adjuvante',
  'Terapia por Pressão Negativa (TPN)': 'outro',
  'Fitas e Fixadores': 'outro',
  'Equipamentos e Suportes': 'outro',
};

const TIPO_POR_SUBCATEGORIA_OSTOMIA = {
  'Bolsa Coletora de Ostomia - Sistema de Uma Peça': 'bolsa_estomia',
  'Bolsa Coletora de Ostomia - Sistema de Duas Peças': 'bolsa_estomia',
  'Bolsa Coletora - Tipo de Drenagem': 'bolsa_estomia',
  'Acessórios de Ostomia': 'outro',
};

function carregarProdutos(arquivo, prefixoCodigo, tipoPorSubcategoria) {
  const linhas = JSON.parse(readFileSync(join(__dirname, 'data', arquivo), 'utf8'));
  return linhas.map((l, i) => ({
    clinicaId,
    nome: l.nomeComercial,
    codigo: `${prefixoCodigo}-${String(i + 1).padStart(3, '0')}`,
    tipo: tipoPorSubcategoria[l.subcategoria] ?? 'outro',
    precoVenda: 0,
    fabricante: l.fabricante || undefined,
    observacoes: l.indicacao || undefined,
    ativo: false,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  }));
}

async function main() {
  const produtos = [
    ...carregarProdutos('produtos-curativos.json', 'CUR', TIPO_POR_SUBCATEGORIA_CURATIVOS),
    ...carregarProdutos('produtos-ostomia.json', 'OST', TIPO_POR_SUBCATEGORIA_OSTOMIA),
  ];

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection('produtos');

  let inseridos = 0;
  let existentes = 0;
  for (const p of produtos) {
    const resultado = await col.updateOne(
      { clinicaId: p.clinicaId, nome: p.nome },
      { $setOnInsert: p },
      { upsert: true },
    );
    if (resultado.upsertedCount > 0) inseridos++; else existentes++;
  }

  console.log(`Importação concluída: ${inseridos} produto(s) novo(s), ${existentes} já existiam (nome duplicado, ignorado).`);
  console.log('Todos entraram com precoVenda: 0 e ativo: false — revise em Configuração financeira > Produtos antes de reativar.');

  await client.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
