import { api } from './client';
import type {
  AchadoPerilesional,
  Agendamento,
  AvaliacaoFerida,
  BordasFerida,
  ChecklistDocumentoItem,
  DashboardFinanceiro,
  Documento,
  Etiologia,
  Ferida,
  IndicadoresAgendamentos,
  IndicadoresNotificacoes,
  IndicadoresPacientes,
  Instituicao,
  Lancamento,
  ListUsuariosResult,
  LoginResponse,
  Medicao,
  ModalidadeAtendimento,
  Modulo,
  NivelExsudato,
  ObservacaoPaciente,
  Paciente,
  ProjetoPaciente,
  PageResult,
  Papel,
  PerfilTecidual,
  PresignUploadResponse,
  Produto,
  Prontuario,
  Recorrencia,
  RelatorioFinanceiro,
  SalaAcessoInfo,
  SalaEvento,
  SalaTelemedicina,
  Servico,
  SinalInfeccaoResvech,
  SinalSala,
  StatusFerida,
  StatusSala,
  TecidosAfetados,
  TimelineFerida,
  TipoEventoSala,
  TipoSinal,
  StatusAgendamento,
  TipoAgendamento,
  TipoAtendimento,
  TipoDocumento,
  UsuarioAdmin,
} from '@/types';

// ---------- Auth ----------
export const authApi = {
  login: (email: string, password: string, totpCode?: string) =>
    api
      .post<LoginResponse>('/auth/login', { email, password, totpCode })
      .then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
};

// ---------- Clínicas ----------
export interface CriarUsuarioPayload {
  nome: string;
  email: string;
  password: string;
  papel: Papel;
}
export const clinicasApi = {
  // Cria um usuário (profissional ou secretaria) dentro da clínica do ADMIN.
  criarUsuario: (clinicaId: string, payload: CriarUsuarioPayload) =>
    api.post(`/clinicas/${clinicaId}/usuarios`, payload).then((r) => r.data),
};

// ---------- Pacientes ----------
export type PacienteSort = 'recentes' | 'nome_asc' | 'nome_desc' | 'nascimento_asc' | 'nascimento_desc';

export interface ListPacientesParams {
  nome?: string;
  cpf?: string;
  /** Dia exato de nascimento, YYYY-MM-DD. */
  dataNascimento?: string;
  sort?: PacienteSort;
  cursor?: string;
  limit?: number;
  incluirInativos?: boolean;
  clinicaId?: string;
  programaIU?: boolean;
  projeto?: ProjetoPaciente;
}
export const pacientesApi = {
  list: (params: ListPacientesParams = {}) =>
    api.get<PageResult<Paciente>>('/pacientes', { params }).then((r) => r.data),
  get: (id: string) => api.get<Paciente>(`/pacientes/${id}`).then((r) => r.data),
  create: (payload: Record<string, unknown>) =>
    api.post<Paciente>('/pacientes', payload).then((r) => r.data),
  update: (id: string, payload: Record<string, unknown>) =>
    api.patch<Paciente>(`/pacientes/${id}`, payload).then((r) => r.data),
  deactivate: (id: string) =>
    api.patch(`/pacientes/${id}/desativar`).then((r) => r.data),
  export: (id: string) =>
    api.get(`/pacientes/${id}/export`).then((r) => r.data),
  updateObservacoes: (id: string, observacoes: string) =>
    api.patch<Paciente>(`/pacientes/${id}/observacoes`, { observacoes }).then((r) => r.data),
};

// ---------- Agenda ----------
export interface ListAgendamentosParams {
  medicoId?: string;
  pacienteId?: string;
  modalidade?: ModalidadeAtendimento;
  status?: StatusAgendamento;
  dataInicio?: string;
  dataFim?: string;
}
export interface CreateAgendamentoPayload {
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  modalidade?: ModalidadeAtendimento;
  dataHoraInicio: string;
  dataHoraFim: string;
  tipo: TipoAgendamento;
  observacoes?: string;
}
export const agendaApi = {
  list: (params: ListAgendamentosParams = {}) =>
    api
      .get<PageResult<Agendamento> | Agendamento[]>('/agendamentos', { params })
      .then((r) => r.data),
  create: (payload: CreateAgendamentoPayload) =>
    api.post<Agendamento>('/agendamentos', payload).then((r) => r.data),
  // Reagendar = atualizar data/hora (PATCH /:id).
  reagendar: (id: string, dataHoraInicio: string, dataHoraFim: string) =>
    api
      .patch(`/agendamentos/${id}`, { dataHoraInicio, dataHoraFim })
      .then((r) => r.data),
  cancelar: (id: string, motivoCancelamento?: string) =>
    api
      .patch(`/agendamentos/${id}/cancelar`, { motivoCancelamento })
      .then((r) => r.data),
  concluir: (id: string) =>
    api.patch(`/agendamentos/${id}/concluir`).then((r) => r.data),
};

// ---------- Prontuários ----------
export const prontuariosApi = {
  list: (params: { pacienteId?: string } = {}) =>
    api
      .get<PageResult<Prontuario> | Prontuario[]>('/prontuarios', { params })
      .then((r) => r.data),
  get: (id: string) =>
    api.get<Prontuario>(`/prontuarios/${id}`).then((r) => r.data),
  create: (payload: Record<string, unknown>) =>
    api.post<Prontuario>('/prontuarios', payload).then((r) => r.data),
  assinar: (id: string) =>
    api.post(`/prontuarios/${id}/assinar`).then((r) => r.data),
  cid10: (q: string) =>
    api
      .get<Array<{ codigo: string; descricao: string }>>(
        '/prontuarios/cid10/autocomplete',
        { params: { q, termo: q } },
      )
      .then((r) => r.data),
};

export type { TipoAtendimento };

// ---------- Documentos ----------
export const documentosApi = {
  list: (params: { pacienteId?: string; prontuarioId?: string; feridaId?: string; avaliacaoFeridaId?: string } = {}) =>
    api
      .get<PageResult<Documento> | Documento[]>('/documentos', { params })
      .then((r) => r.data),
  presignUpload: (payload: {
    clinicaId: string; pacienteId: string; prontuarioId?: string; feridaId?: string; avaliacaoFeridaId?: string;
    nome: string; nomePaciente?: string; tipo: TipoDocumento; mimeType: string; tamanho: number; hash: string;
  }) =>
    api.post<PresignUploadResponse>('/documentos/presign-upload', payload).then((r) => r.data),
  confirmarUpload: (id: string) =>
    api.post<Documento>(`/documentos/${id}/confirmar-upload`).then((r) => r.data),
  accessUrl: (id: string) =>
    api.get<{ accessUrl: string; expiresInSeconds: number }>(`/documentos/${id}/access-url`).then((r) => r.data),
  excluir: (id: string) =>
    api.patch(`/documentos/${id}/excluir`).then((r) => r.data),
};

// ---------- Notificações ----------
export const notificacoesApi = {
  dashboard: () => api.get('/notificacoes/dashboard').then((r) => r.data),
  enviar: (payload: Record<string, unknown>) =>
    api.post('/notificacoes', payload).then((r) => r.data),
};

// ---------- Financeiro ----------
export interface ListLancamentosParams {
  tipo?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  cursor?: string;
  limit?: number;
}

export interface CreateLancamentoPayload {
  clinicaId: string;
  tipo: string;
  descricao: string;
  valor: number;
  formaPagamento?: string;
  vencimento?: string;
  pacienteId?: string;
  agendamentoId?: string;
  observacoes?: string;
  categoria?: string;
  servicoId?: string;
  produtoId?: string;
  quantidade?: number;
  instituicaoId?: string;
}

export interface RelatorioParams {
  dataInicio?: string;
  dataFim?: string;
  categoria?: string;
  instituicaoId?: string;
}

export interface ServicoPayload {
  nome: string;
  tipo: string;
  preco: number;
  descricao?: string;
}

export interface InstituicaoPayload {
  nome: string;
  tipo: string;
  cnpj?: string;
  contatoNome?: string;
  contatoEmail?: string;
  contatoTelefone?: string;
  observacoes?: string;
}

export interface RecorrenciaPayload {
  descricao: string;
  tipo: string;
  categoria: string;
  instituicaoId?: string;
  valorMensal: number;
  diaVencimento: number;
  inicio: string;
  fim?: string;
}

export const financeiroApi = {
  dashboard: (params?: { dataInicio?: string; dataFim?: string }) =>
    api.get<DashboardFinanceiro>('/financeiro/dashboard', { params }).then((r) => r.data),
  list: (params: ListLancamentosParams = {}) =>
    api
      .get<PageResult<Lancamento> | Lancamento[]>('/financeiro/lancamentos', { params })
      .then((r) => r.data),
  create: (payload: CreateLancamentoPayload) =>
    api.post<Lancamento>('/financeiro/lancamentos', payload).then((r) => r.data),
  receber: (id: string, formaPagamento?: string) =>
    api
      .patch(`/financeiro/lancamentos/${id}/receber`, { formaPagamento })
      .then((r) => r.data),
  cancelar: (id: string) =>
    api.patch(`/financeiro/lancamentos/${id}/cancelar`).then((r) => r.data),

  relatorio: (params: RelatorioParams = {}) =>
    api.get<RelatorioFinanceiro>('/financeiro/relatorio', { params }).then((r) => r.data),
  /** Texto cru do CSV — a página monta o download via Blob. */
  relatorioCsv: (params: RelatorioParams = {}) =>
    api.get<string>('/financeiro/relatorio/csv', { params, responseType: 'text' }).then((r) => r.data),

  listServicos: (incluirInativos = false) =>
    api
      .get<Servico[]>('/financeiro/servicos', { params: incluirInativos ? { incluirInativos: 'true' } : {} })
      .then((r) => r.data),
  createServico: (payload: ServicoPayload) =>
    api.post<Servico>('/financeiro/servicos', payload).then((r) => r.data),
  updateServico: (id: string, payload: Partial<ServicoPayload> & { ativo?: boolean }) =>
    api.patch<Servico>(`/financeiro/servicos/${id}`, payload).then((r) => r.data),

  listInstituicoes: (incluirInativos = false) =>
    api
      .get<Instituicao[]>('/financeiro/instituicoes', {
        params: incluirInativos ? { incluirInativos: 'true' } : {},
      })
      .then((r) => r.data),
  createInstituicao: (payload: InstituicaoPayload) =>
    api.post<Instituicao>('/financeiro/instituicoes', payload).then((r) => r.data),
  updateInstituicao: (id: string, payload: Partial<InstituicaoPayload> & { ativo?: boolean }) =>
    api.patch<Instituicao>(`/financeiro/instituicoes/${id}`, payload).then((r) => r.data),

  listRecorrencias: () =>
    api.get<Recorrencia[]>('/financeiro/recorrencias').then((r) => r.data),
  createRecorrencia: (payload: RecorrenciaPayload) =>
    api.post<Recorrencia>('/financeiro/recorrencias', payload).then((r) => r.data),
  updateRecorrencia: (
    id: string,
    payload: Partial<Pick<RecorrenciaPayload, 'descricao' | 'valorMensal' | 'diaVencimento' | 'fim'>> & {
      ativo?: boolean;
    },
  ) => api.patch<Recorrencia>(`/financeiro/recorrencias/${id}`, payload).then((r) => r.data),
};

// ---------- Telemedicina ----------
export interface CreateSalaPayload {
  clinicaId: string;
  agendamentoId: string;
  pacienteId: string;
  modalidade: string;
}

export const telemedicinaApi = {
  createSala: (payload: CreateSalaPayload) =>
    api.post<SalaTelemedicina>('/telemedicina/salas', payload).then((r) => r.data),
  listar: (params?: { dataInicio?: string; dataFim?: string }) =>
    api.get<SalaTelemedicina[]>('/telemedicina/salas', { params }).then((r) => r.data),
  findByAgendamento: (agendamentoId: string) =>
    api
      .get<SalaTelemedicina>(`/telemedicina/salas/agendamento/${agendamentoId}`)
      .then((r) => r.data),
  findById: (id: string) =>
    api.get<SalaTelemedicina>(`/telemedicina/salas/${id}`).then((r) => r.data),
  encerrar: (id: string) =>
    api.patch(`/telemedicina/salas/${id}/encerrar`).then((r) => r.data),
  eventos: (salaId: string) =>
    api.get<SalaEvento[]>(`/telemedicina/salas/${salaId}/eventos`).then((r) => r.data),
};

// Acesso à sala pelo token do link (paciente entra sem login; o token é a credencial).
export interface EntrarSalaResponse {
  salaId: string;
  papel: string;
  iceServers: RTCIceServer[];
}

export const teleAcessoApi = {
  info: (token: string) =>
    api.get<SalaAcessoInfo>(`/telemedicina/acesso/${token}`).then((r) => r.data),
  entrar: (token: string) =>
    api.post<EntrarSalaResponse>(`/telemedicina/acesso/${token}/entrar`).then((r) => r.data),
  enviarSinal: (token: string, tipo: TipoSinal, payload: unknown) =>
    api.post(`/telemedicina/acesso/${token}/sinais`, { tipo, payload }).then((r) => r.data),
  sinais: (token: string, after?: string) =>
    api
      .get<{ status: StatusSala; sinais: SinalSala[] }>(`/telemedicina/acesso/${token}/sinais`, {
        params: after ? { after } : {},
      })
      .then((r) => r.data),
  evento: (token: string, tipo: TipoEventoSala, detalhes?: string) =>
    api.post(`/telemedicina/acesso/${token}/eventos`, { tipo, detalhes }).then((r) => r.data),
  /** Envio confiável ao fechar a aba (sendBeacon sobrevive ao unload). */
  eventoBeacon: (token: string, tipo: TipoEventoSala) => {
    const url = `${api.defaults.baseURL ?? ''}/telemedicina/acesso/${token}/eventos`;
    const body = new Blob([JSON.stringify({ tipo })], { type: 'application/json' });
    navigator.sendBeacon(url, body);
  },
};

// ---------- Indicadores operacionais ----------
export interface IndicadoresParams {
  dataInicio?: string;
  dataFim?: string;
}

// Não há `analytics/financeiro`: foi removido de propósito porque o relatório
// do financeiro cobre o mesmo com mais detalhe e em regime de caixa.
export const indicadoresApi = {
  pacientes: (params: IndicadoresParams = {}) =>
    api.get<IndicadoresPacientes>('/analytics/pacientes', { params }).then((r) => r.data),
  agendamentos: (params: IndicadoresParams = {}) =>
    api.get<IndicadoresAgendamentos>('/analytics/agendamentos', { params }).then((r) => r.data),
  notificacoes: (params: IndicadoresParams = {}) =>
    api.get<IndicadoresNotificacoes>('/analytics/notificacoes', { params }).then((r) => r.data),
};

// ---------- Produtos ----------
export interface ProdutoPayload {
  nome: string;
  tipo: string;
  precoVenda: number;
  custo?: number;
  unidade?: string;
  apresentacao?: string;
  fabricante?: string;
  observacoes?: string;
}

export const produtosApi = {
  list: (tipo?: string) =>
    api.get<Produto[]>('/produtos', { params: tipo ? { tipo } : {} }).then((r) => r.data),
  get: (id: string) => api.get<Produto>(`/produtos/${id}`).then((r) => r.data),
  create: (payload: ProdutoPayload) => api.post<Produto>('/produtos', payload).then((r) => r.data),
  update: (id: string, payload: Partial<ProdutoPayload> & { ativo?: boolean }) =>
    api.patch<Produto>(`/produtos/${id}`, payload).then((r) => r.data),
  /** Baixa lógica: preserva o vínculo com lançamentos já emitidos. */
  desativar: (id: string) => api.delete<Produto>(`/produtos/${id}`).then((r) => r.data),
};

// ---------- Observações do paciente (timeline append-only) ----------
export const observacoesPacienteApi = {
  create: (payload: { pacienteId: string; texto: string }) =>
    api.post<ObservacaoPaciente>('/observacoes-paciente', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<ObservacaoPaciente[]>('/observacoes-paciente', { params: { pacienteId } }).then((r) => r.data),
};

// ---------- Feridas ----------
export const feridasApi = {
  create: (payload: {
    clinicaId?: string; pacienteId: string; rotulo: string; etiologia: Etiologia; localizacao: string;
    status?: StatusFerida; dataInicio?: string; observacoes?: string;
  }) => api.post<Ferida>('/feridas', payload).then((r) => r.data),
  update: (id: string, payload: { rotulo?: string; status?: StatusFerida; observacoes?: string }) =>
    api.patch<Ferida>(`/feridas/${id}`, payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<Ferida[]>('/feridas', { params: { pacienteId } }).then((r) => r.data),
  get: (id: string) =>
    api.get<Ferida>(`/feridas/${id}`).then((r) => r.data),
  excluir: (id: string) =>
    api.patch(`/feridas/${id}/excluir`).then((r) => r.data),
  timeline: (id: string) =>
    api.get<TimelineFerida>(`/feridas/${id}/timeline`).then((r) => r.data),
};

export const avaliacaoFeridaApi = {
  create: (
    feridaId: string,
    payload: {
      medicao: Medicao;
      tecido: PerfilTecidual;
      exsudato: NivelExsudato;
      escalaDor?: number;
      odor?: boolean;
      achadosPerilesionais?: AchadoPerilesional[];
      sinaisSistemicos?: boolean;
      perfusaoRuim?: boolean;
      ossoOuTendaoExposto?: boolean;
      pioraAreaPct30Dias?: number;
      diasCicatrizacaoEstagnada?: number;
      bordas?: BordasFerida;
      tecidosAfetados?: TecidosAfetados;
      sinaisInfeccao?: SinalInfeccaoResvech[];
    },
  ) => api.post<AvaliacaoFerida>(`/feridas/${feridaId}/avaliacoes`, payload).then((r) => r.data),
  listByFerida: (feridaId: string) =>
    api.get<AvaliacaoFerida[]>(`/feridas/${feridaId}/avaliacoes`).then((r) => r.data),
  get: (feridaId: string, avaliacaoId: string) =>
    api.get<AvaliacaoFerida>(`/feridas/${feridaId}/avaliacoes/${avaliacaoId}`).then((r) => r.data),
};

// ---------- Checklist de Documentos ----------
export const checklistDocumentosApi = {
  create: (payload: { pacienteId: string; nome: string; observacao?: string }) =>
    api.post<ChecklistDocumentoItem>('/checklist-documentos', payload).then((r) => r.data),
  listByPaciente: (pacienteId: string) =>
    api.get<ChecklistDocumentoItem[]>('/checklist-documentos', { params: { pacienteId } }).then((r) => r.data),
  update: (id: string, payload: { status?: string; observacao?: string; nome?: string }) =>
    api.patch<ChecklistDocumentoItem>(`/checklist-documentos/${id}`, payload).then((r) => r.data),
  remove: (id: string) =>
    api.delete<{ ok: true }>(`/checklist-documentos/${id}`).then((r) => r.data),
  criarPadrao: (pacienteId: string) =>
    api.post<ChecklistDocumentoItem[]>('/checklist-documentos/padrao', { pacienteId }).then((r) => r.data),
  resumoPendentes: () =>
    api.get<{ pendentes: number }>('/checklist-documentos/resumo-pendentes').then((r) => r.data),
};

// ---------- Super Admin ----------
export interface ListUsersParams {
  papel?: Papel;
  clinicaId?: string;
  ativo?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface UpdateUsuarioPayload {
  nome?: string;
  email?: string;
  papel?: Papel;
  clinicaId?: string | null;
  ativo?: boolean;
  registroProfissional?: string;
  modulosConcedidos?: Modulo[];
  modulosRevogados?: Modulo[];
}

export interface CreateAdminUserPayload {
  nome: string;
  email: string;
  password: string;
  papel: Papel;
  clinicaId?: string;
  registroProfissional?: string;
}

export interface TwoFactorSetup {
  otpauthUrl: string;
  base32: string;
}

export interface ClinicaAdmin {
  id: string;
  nome: string;
  cnpj: string;
  plano: 'basico' | 'profissional' | 'enterprise';
  ativo: boolean;
  criadoEm: string;
  totalUsuarios: number;
}

export interface UpdateClinicaPayload {
  nome?: string;
  plano?: ClinicaAdmin['plano'];
  ativo?: boolean;
}

export const superAdminApi = {
  listUsuarios: (params: ListUsersParams = {}) =>
    api.get<ListUsuariosResult>('/super-admin/usuarios', { params }).then((r) => r.data),
  getUsuario: (id: string) =>
    api.get<UsuarioAdmin>(`/super-admin/usuarios/${id}`).then((r) => r.data),
  createUsuario: (payload: CreateAdminUserPayload) =>
    api.post<UsuarioAdmin & { twoFactorSetup?: TwoFactorSetup }>('/super-admin/usuarios', payload).then((r) => r.data),
  updateUsuario: (id: string, payload: UpdateUsuarioPayload) =>
    api.patch<UsuarioAdmin & { twoFactorSetup?: TwoFactorSetup }>(`/super-admin/usuarios/${id}`, payload).then((r) => r.data),
  resetPassword: (id: string, novaSenha: string) =>
    api.post<{ ok: boolean }>(`/super-admin/usuarios/${id}/reset-password`, { novaSenha }).then((r) => r.data),
  reset2fa: (id: string) =>
    api.post<TwoFactorSetup>(`/super-admin/usuarios/${id}/reset-2fa`).then((r) => r.data),
  listClinicas: () =>
    api.get<{ items: ClinicaAdmin[]; total: number }>('/super-admin/clinicas').then((r) => r.data),
  updateClinica: (id: string, payload: UpdateClinicaPayload) =>
    api.patch<ClinicaAdmin>(`/super-admin/clinicas/${id}`, payload).then((r) => r.data),
};
