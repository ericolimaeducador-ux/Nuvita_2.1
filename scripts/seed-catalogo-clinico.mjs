/**
 * Semeia o catálogo clínico do módulo de planos de cuidados: fenômenos, ações
 * e resultados de enfermagem em estomaterapia.
 *
 * POR QUE OS CÓDIGOS SÃO "local-*" E NÃO "cipe-*"
 *
 * A CIPE®/ICNP® é taxonomia licenciada do ICN, com códigos próprios. Enquanto a
 * licença não estiver adquirida e o conteúdo não for cruzado com o material do
 * curso do projeto (Anatomia, Fundamentos, Cuidados com Estomas), rotular estes
 * termos como CIPE® seria fixar identificador de instrumento sem confirmação —
 * o que a trava do CLAUDE.md proíbe. Agrava-se pelo destino do dado: o
 * diagnóstico vai para registro clínico imutável, e código errado gravado hoje
 * não tem correção depois.
 *
 * Por isso todo termo entra com taxonomia LOCAL_PROVISORIO e
 * codigoCipeOficial: null. Quando a licença chegar, o cruzamento preenche
 * codigoCipeOficial e vira CIPE_VALIDADO — sem reescrever plano já gravado,
 * porque cada plano persiste a versão do catálogo que usou.
 *
 * O CONTEÚDO CLÍNICO É PROVISÓRIO. Manifestações, fatores relacionados e
 * atividades aqui refletem prática corrente de estomaterapia e servem para o
 * módulo funcionar de ponta a ponta. Devem ser revistos pela enfermeira
 * responsável antes de uso assistencial.
 *
 * Coleções globais: o vocabulário é o mesmo para toda clínica (é taxonomia, não
 * dado de paciente), então não há clinicaId aqui.
 *
 * Idempotente: roda de novo sem duplicar (upsert por código).
 *
 * Uso: MONGODB_URI="<uri>" node scripts/seed-catalogo-clinico.mjs
 */
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Defina MONGODB_URI.');
  process.exit(1);
}

const TAXONOMIA = 'LOCAL_PROVISORIO';
const base = { taxonomia: TAXONOMIA, codigoCipeOficial: null };

const FENOMENOS = [
  {
    ...base,
    codigo: 'local-f-001',
    titulo: 'Integridade da pele comprometida',
    definicao: 'Epiderme e/ou derme com solução de continuidade ou alteração',
    eixo: 'foco',
    manifestacoesClinicas: ['ferida', 'lesão', 'úlcera', 'eritema', 'maceração', 'escara', 'fissura'],
    fatoresRelacionados: ['imobilidade', 'umidade excessiva', 'fricção', 'cisalhamento', 'desnutrição', 'diabetes mellitus', 'circulação prejudicada'],
    contextoEstomaterapia: ['ferida_cronica', 'ferida_aguda', 'lesao_pressao'],
    acoesVinculadas: ['local-a-001', 'local-a-002', 'local-a-003'],
    resultadosVinculados: ['local-r-001'],
    palavrasChave: ['ferida', 'lesão', 'úlcera', 'pele', 'curativo', 'cicatrização', 'tecido', 'granulação', 'fibrina', 'necrose', 'exsudato'],
  },
  {
    ...base,
    codigo: 'local-f-002',
    titulo: 'Dor',
    definicao: 'Experiência sensorial e emocional desagradável associada a dano tecidual real ou potencial',
    eixo: 'foco',
    manifestacoesClinicas: ['relato de dor', 'EVA maior ou igual a 4', 'mímica dolorosa', 'proteção da área', 'posição antálgica', 'ardor', 'queimação'],
    fatoresRelacionados: ['ferida exposta', 'troca de curativo', 'infecção', 'isquemia', 'edema'],
    contextoEstomaterapia: ['ferida_cronica', 'ferida_aguda', 'estoma_colostomia'],
    acoesVinculadas: ['local-a-004', 'local-a-005'],
    resultadosVinculados: ['local-r-002'],
    palavrasChave: ['dor', 'ardor', 'queimação', 'desconforto', 'EVA', 'escala de dor', 'álgico', 'analgesia'],
  },
  {
    ...base,
    codigo: 'local-f-003',
    titulo: 'Risco de infecção',
    definicao: 'Vulnerabilidade para invasão e multiplicação de organismos patogênicos',
    eixo: 'foco',
    manifestacoesClinicas: ['ferida aberta', 'tecido desvitalizado', 'exsudato purulento', 'odor fétido', 'calor local', 'biofilme', 'eritema perilesional'],
    fatoresRelacionados: ['imunossupressão', 'diabetes mellitus', 'desnutrição', 'tecido necrótico', 'curativo inadequado', 'contaminação'],
    contextoEstomaterapia: ['ferida_cronica', 'ferida_aguda', 'estoma_colostomia', 'estoma_ileostomia'],
    acoesVinculadas: ['local-a-006', 'local-a-007'],
    resultadosVinculados: ['local-r-003'],
    palavrasChave: ['infecção', 'exsudato', 'purulento', 'odor', 'calor', 'rubor', 'biofilme', 'contaminação', 'febre'],
  },
  {
    ...base,
    codigo: 'local-f-004',
    titulo: 'Déficit de autocuidado com estoma',
    definicao: 'Incapacidade para realizar atividades de cuidado do estoma de forma independente',
    eixo: 'foco',
    manifestacoesClinicas: ['dificuldade de troca de bolsa', 'pele periestomal comprometida', 'vazamento frequente', 'recusa de cuidado'],
    fatoresRelacionados: ['limitação visual', 'destreza manual prejudicada', 'déficit cognitivo', 'ansiedade', 'depressão'],
    contextoEstomaterapia: ['estoma_colostomia', 'estoma_ileostomia', 'estoma_urostomia'],
    acoesVinculadas: ['local-a-008', 'local-a-009'],
    resultadosVinculados: ['local-r-004'],
    palavrasChave: ['estoma', 'ostomia', 'colostomia', 'ileostomia', 'urostomia', 'bolsa', 'pele periestomal', 'autocuidado', 'vazamento'],
  },
  {
    ...base,
    codigo: 'local-f-005',
    titulo: 'Ansiedade',
    definicao: 'Sentimento vago de desconforto, apreensão ou temor em resposta a ameaça inespecífica',
    eixo: 'foco',
    manifestacoesClinicas: ['relato de preocupação', 'inquietação', 'medo', 'tensão', 'insônia', 'choro'],
    fatoresRelacionados: ['mudança na imagem corporal', 'diagnóstico novo', 'cronicidade', 'dor não controlada', 'limitação funcional'],
    contextoEstomaterapia: ['ferida_cronica', 'estoma_colostomia', 'estoma_ileostomia'],
    acoesVinculadas: ['local-a-010'],
    resultadosVinculados: ['local-r-005'],
    palavrasChave: ['ansiedade', 'medo', 'preocupação', 'estresse', 'insônia', 'angústia', 'imagem corporal'],
  },
  {
    ...base,
    codigo: 'local-f-006',
    titulo: 'Mobilidade prejudicada',
    definicao: 'Limitação do movimento físico independente e intencional do corpo ou de um ou mais membros',
    eixo: 'foco',
    manifestacoesClinicas: ['dificuldade de deambulação', 'restrição ao leito', 'dependência para transferência', 'marcha alterada'],
    fatoresRelacionados: ['dor', 'fraqueza muscular', 'edema em membros inferiores', 'amputação', 'sequela neurológica'],
    contextoEstomaterapia: ['ferida_cronica', 'lesao_pressao'],
    acoesVinculadas: ['local-a-011', 'local-a-012'],
    resultadosVinculados: ['local-r-006'],
    palavrasChave: ['mobilidade', 'deambulação', 'acamado', 'transferência', 'marcha', 'cadeira de rodas', 'dependente', 'imobilidade'],
  },
  {
    ...base,
    codigo: 'local-f-007',
    titulo: 'Nutrição desequilibrada: menor que as necessidades corporais',
    definicao: 'Ingestão de nutrientes insuficiente para atender às necessidades metabólicas',
    eixo: 'foco',
    manifestacoesClinicas: ['IMC abaixo de 18,5', 'albumina reduzida', 'perda de peso involuntária', 'anorexia', 'cicatrização lenta'],
    fatoresRelacionados: ['anorexia', 'disfagia', 'dor ao mastigar', 'renda insuficiente', 'dependência para alimentar-se'],
    contextoEstomaterapia: ['ferida_cronica', 'lesao_pressao'],
    acoesVinculadas: ['local-a-013'],
    resultadosVinculados: ['local-r-007'],
    palavrasChave: ['nutrição', 'desnutrição', 'albumina', 'IMC', 'peso', 'alimentação', 'dieta', 'emagrecimento'],
  },
];

const ACOES = [
  {
    ...base,
    codigo: 'local-a-001',
    titulo: 'Avaliação e monitoração de ferida',
    definicao: 'Observar e registrar características e evolução da ferida',
    atividades: [
      'Mensurar dimensões da ferida (comprimento x largura x profundidade)',
      'Avaliar tipo de tecido e percentual de cada um (granulação, fibrina, necrose, epitelização)',
      'Descrever tipo e volume de exsudato',
      'Avaliar bordas e pele perilesional',
      'Calcular escore PUSH',
      'Registrar achados com fotografia padronizada, mediante consentimento',
    ],
    tipo: 'autonoma',
    frequenciasRecomendadas: ['a cada troca de curativo', '1x/semana em ferida crônica estável'],
    fenomenosVinculados: ['local-f-001', 'local-f-003'],
    palavrasChave: ['avaliação', 'mensuração', 'ferida', 'PUSH', 'fotografia'],
  },
  {
    ...base,
    codigo: 'local-a-002',
    titulo: 'Realização de curativo',
    definicao: 'Aplicar cobertura adequada à ferida com técnica asséptica',
    atividades: [
      'Realizar limpeza da ferida com soro fisiológico 0,9% em pressão adequada',
      'Selecionar a categoria de cobertura conforme tipo de tecido e volume de exsudato',
      'Aplicar a cobertura com técnica asséptica',
      'Fixar sem gerar pressão adicional sobre o leito',
      'Registrar categoria de cobertura utilizada e data da próxima troca',
    ],
    tipo: 'autonoma',
    frequenciasRecomendadas: ['conforme saturação do curativo', 'a cada 2-3 dias em ferida limpa', 'diário em alta exsudação'],
    fenomenosVinculados: ['local-f-001', 'local-f-003'],
    palavrasChave: ['curativo', 'cobertura', 'limpeza', 'ferida', 'troca'],
  },
  {
    ...base,
    codigo: 'local-a-003',
    titulo: 'Prevenção de lesão por pressão',
    definicao: 'Reduzir exposição a pressão, fricção e cisalhamento',
    atividades: [
      'Reposicionar o paciente em intervalos definidos',
      'Aplicar superfície de redistribuição de pressão conforme risco',
      'Manter a pele limpa e seca, com hidratação nas áreas de risco',
      'Aplicar escala de Braden e registrar o escore',
      'Orientar cuidador sobre técnica de transferência sem arrasto',
    ],
    tipo: 'autonoma',
    frequenciasRecomendadas: ['reposicionamento a cada 2 horas', 'reavaliação de Braden a cada 48 horas'],
    fenomenosVinculados: ['local-f-001', 'local-f-006'],
    palavrasChave: ['prevenção', 'lesão por pressão', 'Braden', 'reposicionamento', 'pressão'],
  },
  {
    ...base,
    codigo: 'local-a-004',
    titulo: 'Controle da dor',
    definicao: 'Avaliar e gerenciar a dor relacionada à ferida ou ao estoma',
    atividades: [
      'Avaliar a dor com escala visual analógica antes e após procedimentos',
      'Programar a troca de curativo no horário de menor dor ou após analgesia prescrita',
      'Utilizar coberturas não aderentes para reduzir dor na remoção',
      'Orientar o paciente a comunicar dor durante o procedimento',
      'Registrar escore de EVA e as medidas adotadas',
    ],
    tipo: 'autonoma',
    frequenciasRecomendadas: ['antes e após cada curativo', 'a cada 6 horas em dor intensa'],
    fenomenosVinculados: ['local-f-002'],
    palavrasChave: ['dor', 'EVA', 'analgesia', 'conforto'],
  },
  {
    ...base,
    codigo: 'local-a-005',
    titulo: 'Articulação com prescrição analgésica',
    definicao: 'Acionar a equipe prescritora quando a dor não cede às medidas de enfermagem',
    atividades: [
      'Comunicar ao prescritor dor persistente com EVA maior ou igual a 7',
      'Administrar analgesia prescrita antes do procedimento e registrar o horário',
      'Reavaliar a resposta 30 a 60 minutos após a administração',
    ],
    tipo: 'interdependente',
    frequenciasRecomendadas: ['conforme prescrição', 'reavaliação a cada procedimento'],
    fenomenosVinculados: ['local-f-002'],
    palavrasChave: ['analgesia', 'prescrição', 'dor refratária'],
  },
  {
    ...base,
    codigo: 'local-a-006',
    titulo: 'Monitoração de sinais de infecção',
    definicao: 'Vigiar sinais locais e sistêmicos de infecção da ferida ou do estoma',
    atividades: [
      'Observar calor, rubor, edema, dor e exsudato purulento a cada troca',
      'Registrar presença e caracterizar odor',
      'Aferir temperatura e registrar sinais sistêmicos',
      'Comunicar ao prescritor diante de sinais de infecção instalada',
    ],
    tipo: 'autonoma',
    frequenciasRecomendadas: ['a cada troca de curativo', 'diário na vigência de sinais'],
    fenomenosVinculados: ['local-f-003'],
    palavrasChave: ['infecção', 'sinais flogísticos', 'temperatura', 'odor'],
  },
  {
    ...base,
    codigo: 'local-a-007',
    titulo: 'Manejo de carga bacteriana',
    definicao: 'Reduzir a carga microbiana do leito da ferida',
    atividades: [
      'Realizar limpeza com fricção controlada do leito a cada troca',
      'Indicar categoria de cobertura antimicrobiana quando houver carga bacteriana elevada',
      'Remover tecido desvitalizado conforme método indicado e competência legal',
      'Reavaliar a indicação da cobertura antimicrobiana a cada 14 dias',
    ],
    tipo: 'autonoma',
    frequenciasRecomendadas: ['a cada troca de curativo', 'reavaliação a cada 14 dias'],
    fenomenosVinculados: ['local-f-003', 'local-f-001'],
    palavrasChave: ['carga bacteriana', 'biofilme', 'desbridamento', 'antimicrobiano'],
  },
  {
    ...base,
    codigo: 'local-a-008',
    titulo: 'Educação para autocuidado com estoma',
    definicao: 'Ensinar e supervisionar o paciente ou cuidador no manejo do estoma',
    atividades: [
      'Demonstrar a técnica de troca de bolsa passo a passo',
      'Supervisionar a execução pelo paciente e corrigir a técnica',
      'Orientar cuidados com a pele periestomal',
      'Ensinar a identificar complicações precoces e quando procurar o serviço',
      'Fornecer material educativo ilustrado',
      'Avaliar e registrar o grau de independência alcançado',
    ],
    tipo: 'autonoma',
    frequenciasRecomendadas: ['diário até a independência', '1x/semana na manutenção'],
    fenomenosVinculados: ['local-f-004'],
    palavrasChave: ['educação', 'estoma', 'autocuidado', 'troca de bolsa', 'cuidador'],
  },
  {
    ...base,
    codigo: 'local-a-009',
    titulo: 'Proteção da pele periestomal',
    definicao: 'Prevenir e tratar dermatite associada ao efluente do estoma',
    atividades: [
      'Avaliar a pele periestomal a cada troca de bolsa',
      'Mensurar o estoma e ajustar o recorte da placa ao diâmetro atual',
      'Indicar categoria de adjuvante de barreira conforme o tipo de efluente',
      'Investigar e corrigir a causa de vazamentos recorrentes',
    ],
    tipo: 'autonoma',
    frequenciasRecomendadas: ['a cada troca de bolsa'],
    fenomenosVinculados: ['local-f-004', 'local-f-001'],
    palavrasChave: ['pele periestomal', 'dermatite', 'placa', 'barreira', 'vazamento'],
  },
  {
    ...base,
    codigo: 'local-a-010',
    titulo: 'Suporte emocional',
    definicao: 'Acolher a resposta emocional à condição e à mudança de imagem corporal',
    atividades: [
      'Reservar tempo de escuta ativa na consulta',
      'Nomear e validar a preocupação relatada',
      'Informar sobre a evolução esperada do tratamento, reduzindo incerteza',
      'Oferecer encaminhamento a grupo de apoio ou serviço de psicologia',
    ],
    tipo: 'autonoma',
    frequenciasRecomendadas: ['a cada consulta'],
    fenomenosVinculados: ['local-f-005'],
    palavrasChave: ['escuta', 'acolhimento', 'apoio', 'imagem corporal'],
  },
  {
    ...base,
    codigo: 'local-a-011',
    titulo: 'Estímulo à mobilidade',
    definicao: 'Preservar e ampliar a mobilidade dentro do limite tolerado',
    atividades: [
      'Estimular deambulação assistida conforme tolerância',
      'Orientar exercícios de amplitude de movimento',
      'Programar mudança de decúbito quando restrito ao leito',
      'Registrar a distância ou o tempo alcançado a cada avaliação',
    ],
    tipo: 'autonoma',
    frequenciasRecomendadas: ['diário'],
    fenomenosVinculados: ['local-f-006'],
    palavrasChave: ['mobilidade', 'deambulação', 'exercício', 'decúbito'],
  },
  {
    ...base,
    codigo: 'local-a-012',
    titulo: 'Manejo de edema em membros inferiores',
    definicao: 'Reduzir edema que compromete a cicatrização',
    atividades: [
      'Orientar elevação dos membros inferiores em repouso',
      'Avaliar perfusão periférica antes de qualquer indicação de compressão',
      'Indicar categoria de terapia compressiva conforme avaliação vascular',
      'Mensurar a circunferência do membro e registrar a evolução',
    ],
    tipo: 'interdependente',
    frequenciasRecomendadas: ['a cada consulta', 'mensuração semanal'],
    fenomenosVinculados: ['local-f-006', 'local-f-001'],
    palavrasChave: ['edema', 'compressão', 'úlcera venosa', 'perfusão'],
  },
  {
    ...base,
    codigo: 'local-a-013',
    titulo: 'Suporte nutricional para cicatrização',
    definicao: 'Favorecer aporte proteico-calórico compatível com a cicatrização',
    atividades: [
      'Aferir peso e calcular IMC',
      'Orientar aporte proteico nas refeições',
      'Registrar aceitação alimentar',
      'Encaminhar ao serviço de nutrição diante de perda ponderal ou IMC abaixo de 18,5',
    ],
    tipo: 'interdependente',
    frequenciasRecomendadas: ['avaliação a cada consulta', 'peso mensal'],
    fenomenosVinculados: ['local-f-007'],
    palavrasChave: ['nutrição', 'proteína', 'IMC', 'peso', 'encaminhamento'],
  },
];

const escalaComprometimento = {
  tipo: 'comprometimento',
  descricao1: 'Muito comprometido',
  descricao5: 'Não comprometido',
};
const escalaFrequencia = {
  tipo: 'frequencia',
  descricao1: 'Nunca demonstrado',
  descricao5: 'Consistentemente demonstrado',
};
const escalaGravidade = {
  tipo: 'gravidade',
  descricao1: 'Grave',
  descricao5: 'Ausente',
};

const RESULTADOS = [
  {
    ...base,
    codigo: 'local-r-001',
    titulo: 'Cicatrização de ferida',
    definicao: 'Extensão da regeneração tecidual da ferida',
    escala: escalaComprometimento,
    indicadores: [
      { codigo: 'local-r-001-i1', descricao: 'Redução da área da ferida em cm2' },
      { codigo: 'local-r-001-i2', descricao: 'Percentual de tecido de granulação no leito' },
      { codigo: 'local-r-001-i3', descricao: 'Escore PUSH' },
      { codigo: 'local-r-001-i4', descricao: 'Integridade da pele perilesional' },
    ],
    fenomenosVinculados: ['local-f-001'],
    palavrasChave: ['cicatrização', 'granulação', 'área', 'PUSH'],
  },
  {
    ...base,
    codigo: 'local-r-002',
    titulo: 'Controle da dor',
    definicao: 'Ações do paciente para controlar a dor',
    escala: escalaGravidade,
    indicadores: [
      { codigo: 'local-r-002-i1', descricao: 'Escore de dor referido em EVA' },
      { codigo: 'local-r-002-i2', descricao: 'Dor durante a troca de curativo' },
      { codigo: 'local-r-002-i3', descricao: 'Interferência da dor no sono' },
    ],
    fenomenosVinculados: ['local-f-002'],
    palavrasChave: ['dor', 'EVA', 'conforto'],
  },
  {
    ...base,
    codigo: 'local-r-003',
    titulo: 'Gravidade da infecção',
    definicao: 'Gravidade dos sinais e sintomas de infecção',
    escala: escalaGravidade,
    indicadores: [
      { codigo: 'local-r-003-i1', descricao: 'Presença de exsudato purulento' },
      { codigo: 'local-r-003-i2', descricao: 'Odor da ferida' },
      { codigo: 'local-r-003-i3', descricao: 'Eritema perilesional' },
      { codigo: 'local-r-003-i4', descricao: 'Temperatura axilar' },
    ],
    fenomenosVinculados: ['local-f-003'],
    palavrasChave: ['infecção', 'exsudato', 'odor', 'febre'],
  },
  {
    ...base,
    codigo: 'local-r-004',
    titulo: 'Autocuidado com o estoma',
    definicao: 'Ações do paciente para manejar o próprio estoma',
    escala: escalaFrequencia,
    indicadores: [
      { codigo: 'local-r-004-i1', descricao: 'Realiza a troca de bolsa sem auxílio' },
      { codigo: 'local-r-004-i2', descricao: 'Ajusta corretamente o recorte da placa' },
      { codigo: 'local-r-004-i3', descricao: 'Reconhece sinais de complicação' },
      { codigo: 'local-r-004-i4', descricao: 'Episódios de vazamento por semana' },
    ],
    fenomenosVinculados: ['local-f-004'],
    palavrasChave: ['autocuidado', 'estoma', 'bolsa', 'independência'],
  },
  {
    ...base,
    codigo: 'local-r-005',
    titulo: 'Nível de ansiedade',
    definicao: 'Gravidade da apreensão e tensão manifestadas',
    escala: escalaGravidade,
    indicadores: [
      { codigo: 'local-r-005-i1', descricao: 'Inquietação relatada ou observada' },
      { codigo: 'local-r-005-i2', descricao: 'Qualidade do sono' },
      { codigo: 'local-r-005-i3', descricao: 'Aceitação da mudança de imagem corporal' },
    ],
    fenomenosVinculados: ['local-f-005'],
    palavrasChave: ['ansiedade', 'sono', 'imagem corporal'],
  },
  {
    ...base,
    codigo: 'local-r-006',
    titulo: 'Mobilidade',
    definicao: 'Capacidade de movimentar-se de forma intencional',
    escala: escalaComprometimento,
    indicadores: [
      { codigo: 'local-r-006-i1', descricao: 'Distância percorrida na deambulação' },
      { codigo: 'local-r-006-i2', descricao: 'Independência para transferência' },
      { codigo: 'local-r-006-i3', descricao: 'Edema em membros inferiores' },
    ],
    fenomenosVinculados: ['local-f-006'],
    palavrasChave: ['mobilidade', 'deambulação', 'transferência', 'edema'],
  },
  {
    ...base,
    codigo: 'local-r-007',
    titulo: 'Estado nutricional',
    definicao: 'Adequação do aporte de nutrientes às necessidades metabólicas',
    escala: escalaComprometimento,
    indicadores: [
      { codigo: 'local-r-007-i1', descricao: 'Índice de massa corporal' },
      { codigo: 'local-r-007-i2', descricao: 'Aceitação alimentar nas refeições' },
      { codigo: 'local-r-007-i3', descricao: 'Variação de peso no período' },
    ],
    fenomenosVinculados: ['local-f-007'],
    palavrasChave: ['nutrição', 'IMC', 'peso', 'aceitação alimentar'],
  },
];

/** Falha ruidosa: vínculo apontando para código inexistente vira busca vazia em produção. */
function validarVinculos() {
  const fen = new Set(FENOMENOS.map((f) => f.codigo));
  const aco = new Set(ACOES.map((a) => a.codigo));
  const res = new Set(RESULTADOS.map((r) => r.codigo));
  const erros = [];

  for (const f of FENOMENOS) {
    for (const c of f.acoesVinculadas) if (!aco.has(c)) erros.push(`${f.codigo} -> acao ${c} inexistente`);
    for (const c of f.resultadosVinculados) if (!res.has(c)) erros.push(`${f.codigo} -> resultado ${c} inexistente`);
  }
  for (const a of ACOES) {
    for (const c of a.fenomenosVinculados) if (!fen.has(c)) erros.push(`${a.codigo} -> fenomeno ${c} inexistente`);
  }
  for (const r of RESULTADOS) {
    for (const c of r.fenomenosVinculados) if (!fen.has(c)) erros.push(`${r.codigo} -> fenomeno ${c} inexistente`);
  }
  return erros;
}

async function upsertTodos(col, itens) {
  let criados = 0;
  let atualizados = 0;
  for (const item of itens) {
    const r = await col.updateOne(
      { codigo: item.codigo },
      { $set: { ...item, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    if (r.upsertedCount > 0) criados += 1;
    else atualizados += 1;
  }
  return { criados, atualizados };
}

async function main() {
  const erros = validarVinculos();
  if (erros.length > 0) {
    console.error('Vinculos quebrados no seed:');
    for (const e of erros) console.error('  -', e);
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db();

    const f = await upsertTodos(db.collection('catalogo_fenomenos'), FENOMENOS);
    const a = await upsertTodos(db.collection('catalogo_acoes'), ACOES);
    const r = await upsertTodos(db.collection('catalogo_resultados'), RESULTADOS);

    // Índices de texto em português. O Mongoose só os cria quando o app sobe;
    // criar aqui deixa o catálogo pesquisável logo após o seed.
    await db.collection('catalogo_fenomenos').createIndex(
      { titulo: 'text', palavrasChave: 'text', manifestacoesClinicas: 'text', sinonimos: 'text' },
      { name: 'idx_catalogo_fenomeno_text', default_language: 'portuguese' },
    );
    await db.collection('catalogo_acoes').createIndex(
      { titulo: 'text', palavrasChave: 'text', atividades: 'text' },
      { name: 'idx_catalogo_acao_text', default_language: 'portuguese' },
    );
    await db.collection('catalogo_resultados').createIndex(
      { titulo: 'text', palavrasChave: 'text' },
      { name: 'idx_catalogo_resultado_text', default_language: 'portuguese' },
    );

    console.log(`Fenomenos:  ${f.criados} criados, ${f.atualizados} atualizados`);
    console.log(`Acoes:      ${a.criados} criados, ${a.atualizados} atualizados`);
    console.log(`Resultados: ${r.criados} criados, ${r.atualizados} atualizados`);
    console.log('');
    console.log('Todos os termos entraram como LOCAL_PROVISORIO / codigoCipeOficial: null.');
    console.log('Nao chame este catalogo de CIPE ate a licenca e o cruzamento com o curso.');
  } finally {
    await client.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
