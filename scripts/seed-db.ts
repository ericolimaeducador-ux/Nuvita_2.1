import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const MONGODB_URI = 'mongodb://localhost:27018/nuvita2';

// Interfaces
interface Clinica {
  nome: string;
  cnpj: string;
  telefone?: string;
  plano: string;
  configuracoes: Record<string, unknown>;
  ativo: boolean;
  criadoEm: Date;
}

interface User {
  nome: string;
  email: string;
  passwordHash: string;
  papel: string;
  clinicaId: string;
  registroProfissional?: string;
  ativo: boolean;
  criadoEm: Date;
}

interface Paciente {
  clinicaId: string;
  nome: string;
  cpf?: string;
  dataNascimento?: Date;
  sexo?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  convenio?: string;
  consentimentoLGPD?: {
    aceito: boolean;
    dataAceite: Date;
    versao: string;
  };
  observacoes?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

interface Agendamento {
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  modalidade: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  tipo: string;
  status: string;
  observacoes?: string;
  criadoPor: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

interface Prontuario {
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  agendamentoId?: string;
  dataAtendimento: Date;
  tipo: string;
  subjetivo: Record<string, unknown>;
  objetivo: Record<string, unknown>;
  avaliacao: Record<string, unknown>;
  plano: Record<string, unknown>;
  registroEnfermagem?: Record<string, unknown>;
  arquivos: Record<string, unknown>[];
  assinado?: {
    medicoId: string;
    dataAssinatura: Date;
    hash: string;
  };
  criadoEm: Date;
  atualizadoEm: Date;
}

interface Ferida {
  clinicaId: string;
  pacienteId: string;
  rotulo: string;
  etiologia: string;
  localizacao: string;
  status: string;
  dataInicio?: Date;
  observacoes?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

interface AvaliacaoFerida {
  feridaId: string;
  clinicaId: string;
  profissionalId: string;
  medicao: {
    comprimentoCm: number;
    larguraCm: number;
    profundidadeCm: number;
    areaCm2?: number;
  };
  tecido: {
    granulacaoPct: number;
    epitelizacaoPct: number;
    esfaceloPct: number;
    necrosePct: number;
  };
  exsudato: string;
  escalaDor: number;
  odor: boolean;
  achadosPerilesionais: string[];
  sinaisSistemicos: boolean;
  perfusaoRuim: boolean;
  ossoOuTendaoExposto: boolean;
  pioraAreaPct30Dias?: number;
  diasCicatrizacaoEstagnada?: number;
  recomendacoes: Array<{
    risco: string;
    titulo: string;
    justificativa: string;
    acao: string;
    regraId: string;
    exigeRevisaoHumana: boolean;
  }>;
  motorClinico: string;
  escalas?: {
    push: {
      area: number;
      exsudato: number;
      tipoTecido: number;
      total: number;
    };
    resvech?: {
      dimensao: number;
      profundidade: number;
      bordas: number;
      tecidoLeito: number;
      exsudato: number;
      infeccaoInflamacao: number;
      total: number;
    };
    versao: string;
  };
  criadoEm: Date;
}

// Dados fictícios realistas
const nomes = [
  'Maria Silva Santos',
  'João Pedro Oliveira',
  'Ana Carolina Costa',
  'Roberto Alves Dias',
  'Fernanda Mendes Rocha',
  'Paulo Gomes Ferreira',
  'Lucia Barbosa Martins',
  'Carlos Eduardo Lima',
  'Vanessa Souza Pereira',
  'Antonio Rodrigues Silva',
];

const sobrenomesProfissionais = [
  'Enfermeira',
  'Enfermeiro',
  'Técnico de Enfermagem',
];

const localizacoes = [
  'Perna esquerda, região tibial',
  'Perna direita, região plantar',
  'Região sacral',
  'Calcâneo',
  'Antebraço',
  'Tornozelo',
  'Nádega',
];

const etiologias = [
  'PRESSAO',
  'DIABETICA',
  'ARTERIOSCLEROSE',
  'VENOSA',
  'TRAUMATICA',
];

function generateCPF(): string {
  let cpf = '';
  for (let i = 0; i < 9; i++) {
    cpf += Math.floor(Math.random() * 10);
  }
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  cpf += remainder;
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 11) remainder = 0;
  cpf += remainder;
  return cpf;
}

function formatCPF(cpf: string): string {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function seedDatabase() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection failed');

    // Limpar coleções existentes (com cautela)
    console.log('🧹 Limpando coleções existentes...');
    try {
      await db.collection('clinicas').deleteMany({});
      await db.collection('users').deleteMany({});
      await db.collection('pacientes').deleteMany({});
      await db.collection('agendamentos').deleteMany({});
      await db.collection('prontuarios').deleteMany({});
      await db.collection('feridas').deleteMany({});
      await db.collection('avaliacoes_ferida').deleteMany({});
      console.log('✅ Coleções limpas');
    } catch (error) {
      console.warn('⚠️  Aviso ao limpar coleções:', error);
    }

    // 1. Criar Clínica
    console.log('\n📋 Criando clínica...');
    const clinicaData: Clinica = {
      nome: 'WoundCare Brasil - Demonstração',
      cnpj: '30.567.890/0001-12',
      telefone: '(11) 94739-1805',
      plano: 'PREMIUM',
      configuracoes: {
        nomeFantasia: 'WoundCare',
        endereco: 'Avenida Savassi, 1100 - Funcionários, Belo Horizonte, MG 30140-171',
        responsavelTecnico: 'Dr. João Silva',
        registroConselho: 'CRM/MG 123456',
      },
      ativo: true,
      criadoEm: new Date(),
    };

    const clinicaResult = await db.collection('clinicas').insertOne(clinicaData);
    const clinicaId = clinicaResult.insertedId.toString();
    console.log(`✅ Clínica criada: ${clinicaId}`);

    // 2. Criar SUPER_ADMIN
    console.log('\n👤 Criando SUPER_ADMIN...');
    const adminPassword = 'Admin@123456!';
    const adminPasswordHash = await hashPassword(adminPassword);

    const adminData: User = {
      nome: 'Administrador Sistema',
      email: 'admin@nuvita.local',
      passwordHash: adminPasswordHash,
      papel: 'SUPER_ADMIN',
      clinicaId: clinicaId,
      registroProfissional: 'ADM-001',
      ativo: true,
      criadoEm: new Date(),
    };

    await db.collection('users').insertOne(adminData);
    console.log(`✅ SUPER_ADMIN criado`);
    console.log(`   📧 Email: ${adminData.email}`);
    console.log(`   🔑 Senha: ${adminPassword}`);
    console.log(`   ⚠️  MUDE A SENHA NA PRIMEIRA ENTRADA!`);

    // 3. Criar Enfermeiros
    console.log('\n👨‍⚕️  Criando enfermeiros...');
    const enfermeiros: string[] = [];
    const enfermeiroData = [
      { nome: 'Carla Mendes Enfermeira', email: 'carla@nuvita.local', coren: 'COREN/MG 541234' },
      { nome: 'Marco Silva Técnico', email: 'marco@nuvita.local', coren: 'COREN/MG 541235' },
      { nome: 'Beatriz Costa Enfermeira', email: 'beatriz@nuvita.local', coren: 'COREN/MG 541236' },
    ];

    for (const enf of enfermeiroData) {
      const senhaEnfermeiro = 'Enf@123456!';
      const hashEnfermeiro = await hashPassword(senhaEnfermeiro);

      const userData: User = {
        nome: enf.nome,
        email: enf.email,
        passwordHash: hashEnfermeiro,
        papel: 'ENFERMEIRO',
        clinicaId: clinicaId,
        registroProfissional: enf.coren,
        ativo: true,
        criadoEm: new Date(),
      };

      const userResult = await db.collection('users').insertOne(userData);
      const userId = userResult.insertedId.toString();
      enfermeiros.push(userId);
      console.log(`✅ Enfermeiro: ${enf.nome} (${enf.email})`);
    }

    // 4. Criar Pacientes
    console.log('\n👥 Criando 10 pacientes fictícios...');
    const pacientes: string[] = [];

    for (let i = 0; i < 10; i++) {
      const dataNasc = new Date(1960 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28));
      const sexo = Math.random() > 0.5 ? 'MASCULINO' : 'FEMININO';
      const cpfValue = generateCPF();

      const pacienteData: Paciente = {
        clinicaId: clinicaId,
        nome: nomes[i],
        cpf: formatCPF(cpfValue),
        dataNascimento: dataNasc,
        sexo,
        telefone: `(11) 9${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        email: `paciente${i + 1}@email.com`,
        endereco: `Rua das Flores, ${100 + i * 10} - Belo Horizonte, MG`,
        convenio: ['Unimed', 'Bradesco', 'Sul América', 'Sem convênio'][Math.floor(Math.random() * 4)],
        consentimentoLGPD: {
          aceito: true,
          dataAceite: new Date(),
          versao: '1.0',
        },
        observacoes: `Paciente fictício para demonstração. Criado em ${new Date().toLocaleDateString('pt-BR')}`,
        ativo: true,
        criadoEm: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        atualizadoEm: new Date(),
      };

      const pacienteResult = await db.collection('pacientes').insertOne(pacienteData);
      const pacienteId = pacienteResult.insertedId.toString();
      pacientes.push(pacienteId);
      console.log(`  ${i + 1}. ${pacienteData.nome} - ${pacienteData.sexo} - ${new Date(dataNasc).toLocaleDateString('pt-BR')}`);
    }

    // 5. Criar Agendamentos
    console.log('\n📅 Criando agendamentos...');
    const agendamentos: string[] = [];

    for (let i = 0; i < 8; i++) {
      const pacienteIndex = Math.floor(Math.random() * pacientes.length);
      const enfermeiro = enfermeiros[Math.floor(Math.random() * enfermeiros.length)];
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() + Math.floor(Math.random() * 30) + 1);
      dataInicio.setHours(9 + Math.floor(Math.random() * 8));
      dataInicio.setMinutes(0);

      const dataFim = new Date(dataInicio);
      dataFim.setHours(dataFim.getHours() + 1);

      const agendamentoData: Agendamento = {
        clinicaId: clinicaId,
        pacienteId: pacientes[pacienteIndex],
        medicoId: enfermeiro,
        modalidade: 'ENFERMAGEM',
        dataHoraInicio: dataInicio,
        dataHoraFim: dataFim,
        tipo: 'ATENDIMENTO',
        status: i < 3 ? 'CONCLUIDO' : 'AGENDADO',
        observacoes: 'Avaliação e curativo de ferida',
        criadoPor: enfermeiro,
        criadoEm: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        atualizadoEm: new Date(),
      };

      const agendamentoResult = await db.collection('agendamentos').insertOne(agendamentoData);
      const agendamentoId = agendamentoResult.insertedId.toString();
      agendamentos.push(agendamentoId);
    }
    console.log(`✅ ${agendamentos.length} agendamentos criados`);

    // 6. Criar Feridas
    console.log('\n🩹 Criando feridas...');
    const feridas: Array<{ id: string; pacienteId: string; enfermeirosIds: string[] }> = [];

    for (let i = 0; i < 12; i++) {
      const pacienteIndex = Math.floor(Math.random() * pacientes.length);
      const feridaData: Ferida = {
        clinicaId: clinicaId,
        pacienteId: pacientes[pacienteIndex],
        rotulo: `Ferida ${i + 1}`,
        etiologia: etiologias[Math.floor(Math.random() * etiologias.length)],
        localizacao: localizacoes[Math.floor(Math.random() * localizacoes.length)],
        status: ['ABERTA', 'CICATRIZANDO', 'EPITELIZADA'][Math.floor(Math.random() * 3)],
        dataInicio: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        observacoes: 'Ferida em acompanhamento clínico',
        criadoEm: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        atualizadoEm: new Date(),
      };

      const feridaResult = await db.collection('feridas').insertOne(feridaData);
      const feridaId = feridaResult.insertedId.toString();
      feridas.push({ id: feridaId, pacienteId: pacientes[pacienteIndex], enfermeirosIds: enfermeiros });
    }
    console.log(`✅ ${feridas.length} feridas criadas`);

    // 7. Criar Prontuários
    console.log('\n📄 Criando prontuários...');

    for (let i = 0; i < 6; i++) {
      if (i >= agendamentos.length) break;

      const agendamentoRef = agendamentos[i];
      const agendamento = await db.collection('agendamentos').findOne({ _id: new mongoose.Types.ObjectId(agendamentoRef) });

      if (!agendamento) continue;

      const prontuarioData: Prontuario = {
        clinicaId: clinicaId,
        pacienteId: agendamento.pacienteId,
        medicoId: agendamento.medicoId,
        agendamentoId: agendamentoRef,
        dataAtendimento: agendamento.dataHoraInicio,
        tipo: 'ENFERMAGEM',
        subjetivo: {
          queixa: 'Paciente relata incômodo na ferida e dor moderada',
          duracaoSintomas: '3 dias',
          medicamentosInUso: 'Dipirona 500mg',
        },
        objetivo: {
          estadoGeral: 'Paciente apresenta bom estado geral',
          sinaisVitais: {
            pa: '120/80',
            fc: 78,
            temperatura: 36.5,
          },
          ferida: {
            aspecto: 'Limpa, sem sinais de infecção',
            exsudato: 'Seroso escasso',
            bordas: 'Bem definidas',
          },
        },
        avaliacao: {
          diagnostico: 'Ferida em processo de cicatrização',
          risco: 'BAIXO',
          prognóstico: 'Bom - paciente aderente ao tratamento',
        },
        plano: {
          intervencoes: [
            'Limpeza com soro fisiológico',
            'Aplicação de cobertura semioclusiva',
            'Educação sobre higiene',
            'Retorno em 7 dias',
          ],
          prescricoes: 'Manutenção de curativo, higiene diária com água morna',
          proximoAgendamento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        registroEnfermagem: {
          procedimentos: ['Limpeza', 'Curativo', 'Educação'],
          materialUtilizado: ['Gaze estéril', 'Soro fisiológico', 'Cobertura foam'],
          duracaoAtendimento: 45,
        },
        arquivos: [],
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      await db.collection('prontuarios').insertOne(prontuarioData);
    }
    console.log(`✅ 6 prontuários criados`);

    // 8. Criar Avaliações de Ferida
    console.log('\n📊 Criando avaliações de feridas...');

    for (const ferida of feridas.slice(0, 8)) {
      const enfermeiro = ferida.enfermeirosIds[Math.floor(Math.random() * ferida.enfermeirosIds.length)];

      const avaliacaoData: AvaliacaoFerida = {
        feridaId: ferida.id,
        clinicaId: clinicaId,
        profissionalId: enfermeiro,
        medicao: {
          comprimentoCm: 2 + Math.random() * 8,
          larguraCm: 1.5 + Math.random() * 6,
          profundidadeCm: 0.5 + Math.random() * 3,
        },
        tecido: {
          granulacaoPct: 40 + Math.random() * 40,
          epitelizacaoPct: 20 + Math.random() * 40,
          esfaceloPct: Math.random() * 20,
          necrosePct: Math.random() * 10,
        },
        exsudato: ['ESCASSO', 'MODERADO', 'ABUNDANTE'][Math.floor(Math.random() * 3)],
        escalaDor: Math.floor(Math.random() * 10),
        odor: Math.random() > 0.7,
        achadosPerilesionais: Math.random() > 0.5 ? ['ERITEMA', 'EDEMA'] : [],
        sinaisSistemicos: Math.random() > 0.8,
        perfusaoRuim: Math.random() > 0.8,
        ossoOuTendaoExposto: Math.random() > 0.9,
        recomendacoes: [
          {
            risco: 'MODERADO',
            titulo: 'Monitorar sinais de infecção',
            justificativa: 'Ferida apresenta características que requerem vigilância',
            acao: 'Inspeção diária, manutenção de higiene rigorosa',
            regraId: 'regra-001',
            exigeRevisaoHumana: true,
          },
          {
            risco: 'BAIXO',
            titulo: 'Otimizar cicatrização',
            justificativa: 'Paciente com bom prognóstico',
            acao: 'Nutrição adequada, redução de pressão, curativos apropriados',
            regraId: 'regra-002',
            exigeRevisaoHumana: false,
          },
        ],
        motorClinico: 'claude-3-5-haiku-20241022',
        escalas: {
          push: {
            area: 6 + Math.random() * 8,
            exsudato: 1 + Math.floor(Math.random() * 3),
            tipoTecido: 2 + Math.floor(Math.random() * 3),
            total: 15 + Math.floor(Math.random() * 20),
          },
          versao: '1.0',
        },
        criadoEm: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      };

      await db.collection('avaliacoes_ferida').insertOne(avaliacaoData);
    }
    console.log('✅ Avaliações de ferida criadas');

    // Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('✅ BANCO DE DADOS POPULADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📊 RESUMO DOS DADOS CRIADOS:');
    console.log(`   ✓ 1 Clínica Demo`);
    console.log(`   ✓ 1 SUPER_ADMIN + 3 Enfermeiros`);
    console.log(`   ✓ 10 Pacientes fictícios`);
    console.log(`   ✓ ${agendamentos.length} Agendamentos`);
    console.log(`   ✓ 6 Prontuários com registro clínico`);
    console.log(`   ✓ ${feridas.length} Feridas em acompanhamento`);
    console.log(`   ✓ 8 Avaliações clínicas com PUSH e recomendações\n`);
    console.log('🔐 CREDENCIAIS DE ACESSO:');
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Senha: ${adminPassword}`);
    console.log(`   Perfil: SUPER_ADMIN\n`);
    console.log('💡 PRÓXIMAS AÇÕES:');
    console.log('   1. Inicie a API (npm run dev:api)');
    console.log('   2. Inicie o Web (npm run dev:web)');
    console.log('   3. Acesse http://localhost:5174');
    console.log('   4. Faça login com as credenciais acima');
    console.log('   5. Explore os pacientes, feridas e prontuários\n');

    await mongoose.disconnect();
    console.log('✅ Conexão fechada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao popular banco de dados:', error);
    process.exit(1);
  }
}

seedDatabase();
