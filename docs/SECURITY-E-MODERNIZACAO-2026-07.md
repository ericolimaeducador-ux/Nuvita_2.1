# Nuvita 2.1 — Varredura de Segurança e Roadmap de Modernização

> Data: 2026-07-17 · Escopo: codebase completo pós-migração IU→feridas +
> testes de runtime contra o serviço de produção (`nuvita2-api`, Cloud Run).
> Método: inspeção direta de código (não checklist genérico — cada achado
> cita arquivo/linha) + probes HTTP no serviço live.

---

## 1. O que já está forte (verificado no código e em runtime)

| Controle | Evidência |
|---|---|
| Criptografia LGPD em repouso | `paciente-mongo.repository.ts` — cpf, telefone, email, endereço, convênio e observações criptografados (AES-GCM autenticado); busca por CPF via hash cego (`cpfHash`), sem descriptografar |
| Imutabilidade clínica em 3 camadas | Prontuário assinado não se edita (addendum); `AvaliacaoFerida` sem update/delete no port do repositório, sem PATCH/DELETE no controller, sem método de edição na service |
| Isolamento de tenant | `resolveTenantClinicaId` — clinicaId do token é a fonte de verdade, query/body divergente → 403; testado em `feridas.service.spec.ts`; SUPER_ADMIN só opera via header `x-clinica-id` validado como ObjectId |
| Postura HTTP de produção | Verificado live: CSP completo, HSTS `max-age=15552000; includeSubDomains`, X-Frame SAMEORIGIN, `/docs` 404, `/feridas` sem token → 401 |
| Validação global | `ValidationPipe` com `whitelist` + `forbidNonWhitelisted` + `transform` — campo desconhecido derruba a request |
| Autenticação | JWT curto + refresh httpOnly com revogação (Redis), 2FA TOTP obrigatório p/ papéis privilegiados, bcrypt 12 rounds, rate limit de login (Redis, fail-open consciente) |
| Deploy sem chave | Workload Identity Federation/OIDC; segredos fora do git; rotação completa executada em 2026-07-17 |
| Trilha de auditoria | `AuditEvent` amplo (login/falha, CRUD de paciente/prontuário/documento/ferida) com IP + user-agent |
| Presigned URLs | Upload e leitura com TTL de 15 min; hash e Content-Type assinados na URL |

---

## 2. Achados de segurança

### ALTO

**A1 — `confirmUpload` não verifica o objeto no storage**
`documentos.service.ts:99` — o confirm apenas gera thumbnail e audita. Não
há verificação de que o PUT aconteceu, nem de que o conteúdo bate com o
sha256 declarado: o hash vai como metadata assinada (`x-amz-meta-sha256`),
que o R2 **não valida contra o corpo**. Consequências: documento
"confirmado" pode não existir, ou conter bytes diferentes do declarado
(inclusive MIME spoofing — um executável com Content-Type `image/png`).
*Correção:* no confirm, fazer `HeadObject` (existência + tamanho) e trocar a
metadata por checksum nativo (`ChecksumSHA256` no presign do S3/R2, que o
storage valida no PUT); validar magic bytes ao gerar o thumbnail (o
protótipo woundcare-ai já fazia isso — portar a ideia).

**A2 — Permissões por módulo não são aplicadas no backend**
`resolvePermissoes()` (concessões/revogações por usuário do painel
super-admin) só gateia menu e rotas do **frontend**. A API usa apenas
`RolesGuard` por papel: um MEDICO com módulo FERIDAS revogado continua
acessando `/feridas` por chamada direta. Pendência conhecida ("etapa b")
herdada do Nuvita original. *Correção:* `PermissoesGuard` que injete o user
atualizado (repositório) e cheque `Modulo` exigido por controller, espelhando
o `<ProtectedRoute modulo=...>` do front.

### MÉDIO

**M1 — EXIF/GPS em fotos de ferida (privacidade LGPD)**
Fotos de celular carregam EXIF com GPS, data e serial do aparelho — na
prática, o endereço do paciente embutido na imagem de uma lesão. Nenhum
strip de metadata hoje. *Correção:* remover EXIF no cliente antes do upload
(canvas re-encode resolve de graça) ou no backend na geração do thumbnail.

**M2 — Rate limiting restrito a `/auth`, por IP**
Endpoints caros (analytics, export de paciente, presign) sem limite; o
limite de login é por IP (ataque distribuído contorna; NAT corporativo pune
inocentes). *Correção:* throttle global moderado + contador de falhas por
conta (lockout progressivo) além do IP.

**M3 — Refresh token sem detecção de reuso**
Revogação individual existe, mas se um refresh token vazar e for usado pelo
atacante *antes* do usuário, a família não é invalidada. *Correção:* token
family/rotation detection — reuso de um jti já rotacionado revoga toda a
cadeia e força novo login.

**M4 — Usuário Atlas com `atlasAdmin@admin`**
`zimlima_db_user` tem admin do cluster inteiro; a aplicação precisa de
`readWrite` no banco `nuvita2` apenas. Vazamento da connection string daria
controle administrativo do Atlas. *Correção:* criar usuário com
`readWrite@nuvita2`, trocar a URI, remover o antigo.

**M5 — CORS de produção inclui `http://localhost:5174`**
`gen-cloudrun-env.cjs:18` — origem de dev na allowlist de produção permite
que qualquer página local converse com a API de produção com credenciais.
*Correção:* remover do array `PROD_ORIGINS`.

### BAIXO

- **B1** — `audit_logs` sem política formal de retenção/arquivamento (CFM
  pede guarda longa; definir arquivamento frio + índice `clinicaId+timestamp`).
- **B2** — `.env.cloud`/`.env` com credenciais em texto no disco do dev;
  mover para gerenciador de senhas e manter no disco só quando for gerar o
  env-file (foram rotacionados hoje, risco residual baixo).
- **B3** — `TenantMiddleware` engole erro de verify em silêncio (ok, o guard
  revalida — mas logar em nível debug ajudaria forense).

---

## 3. Conformidade (LGPD · CFM · SBIS · ANVISA)

| Tema | Situação | Ação recomendada |
|---|---|---|
| **Assinatura do prontuário** | HMAC de servidor — íntegro tecnicamente, mas **não é assinatura digital qualificada**. Pela CFM 1.821/2007 + SBIS NGS2, só assinatura ICP-Brasil elimina o papel com validade plena | Integrar assinatura ICP-Brasil (certificado A1/A3 do profissional) ou assinatura qualificada gov.br; manter o HMAC como camada interna |
| **Guarda de 20 anos** | Soft-delete correto (nada é apagado fisicamente) | Formalizar política de retenção/arquivamento por escrito (exigência de auditoria) |
| **LGPD — direitos do titular** | Export de paciente existe (portabilidade ✅); consentimento modelado ✅ | Faltam: registro de operações (ROPA), designação de DPO/encarregado, política de retenção publicada, strip de EXIF (M1) |
| **Telemedicina (CFM 2.314/2022)** | Sala tokenizada + eventos auditados ✅ | Adicionar consentimento específico de teleatendimento registrado por sessão |
| **Motor de risco como SaMD (ANVISA RDC 657/2022)** | `exigeRevisaoHumana: true` em toda recomendação + versão do motor persistida (`motorClinico`) — postura correta de *apoio à decisão* | Manter disclaimers visíveis na UI; se evoluir para diagnóstico automatizado (IA de segmentação), reavaliar enquadramento como dispositivo médico classe II |

---

## 4. Roadmap de modernização — estado da arte em wound care

O Nuvita 2.1 já tem uma base que a maioria dos concorrentes não tem
(multi-tenant LGPD, telemedicina própria, motor de regras auditável,
timeline com tendência). O que falta para ser referência:

### Fase A — rápido, sem hardware novo (2–4 semanas)

1. **Escalas clínicas estruturadas e calculadas** — hoje o formulário é
   TIME-like livre. Adicionar escores padronizados com cálculo automático e
   tendência por escore: **PUSH 3.0** (úlcera por pressão — padrão-ouro de
   acompanhamento), **RESVECH 2.0** (feridas crônicas em geral),
   **Wagner/Texas** (pé diabético), **Braden** (risco de nova lesão).
   Encaixam como campos opcionais na `AvaliacaoFerida` + regras novas no
   risk-engine (versão `clinical-rules-0.2.0`).
2. **TIMERS completo** — o framework de 2019 acrescenta o **S (social
   factors)** ao TIME: adesão, suporte familiar, acesso a curativos.
   Nenhum concorrente nacional captura isso estruturado; é o tipo de dado
   que muda conduta em home care.
3. **Fotografia padronizada** — guia de captura no diálogo de foto
   (distância/enquadramento), *ghost overlay* da foto anterior para manter o
   mesmo ângulo entre visitas, strip de EXIF (fecha M1 junto).
4. **Gráfico de evolução + PDF comparativo** — a timeline já calcula
   tendência; falta o gráfico de área/escore no `FeridaDetailPage` e um
   relatório de evolução imprimível (padrão `ProntuarioImpressaoPage`).
5. **Alertas de protocolo** — lembrete de reavaliação vencida (ex.: 7 dias
   sem nova avaliação numa ferida ativa) via fila de notificações existente.

### Fase B — diferenciais de mercado (1–2 meses)

6. **Planimetria com marcador de referência** (backlog Fase 7) — medir área
   real em cm² a partir de foto com marcador de tamanho conhecido: correção
   de perspectiva + escala px→mm. É o recurso central de Swift Medical e
   imito; nenhum player nacional forte tem. Conceito próprio, do zero
   (restrição de PI já documentada).
7. **Segmentação de tecidos por IA** — % de granulação/esfacelo/necrose
   estimado da foto, preenchendo o formulário para o profissional *conferir*
   (`ia-contracts.entity.ts` já define os contratos; `exigeRevisaoHumana`
   mantém o enquadramento de apoio à decisão). Caminho: Vertex AI ou modelo
   on-device.
8. **Comparativo lado a lado** de fotos entre avaliações (backlog Fase 8).

### Fase C — ecossistema (contínuo)

9. **FHIR R4 + RNDS** — mapear Ferida→`Condition`, AvaliacaoFerida→
   `Observation`, foto→`Media`, conduta→`CarePlan`; terminologia SNOMED
   CT/LOINC. Abre integração com a Rede Nacional de Dados em Saúde e com
   hospitais — pré-requisito de licitação pública cada vez mais comum.
10. **PWA offline-first** — feridas é atenção domiciliar por natureza;
    capturar avaliação+foto sem sinal e sincronizar depois é o recurso mais
    pedido em home care.
11. **Passagem de plantão SBAR** estruturada entre enfermeiros (backlog
    Fase 8).
12. **Dashboard de qualidade assistencial** — tempo médio até cicatrização,
    taxa de cicatrização em 12 semanas, prevalência por etiologia (módulo
    `analytics` já existe como base). É o número que o gestor da clínica
    mostra para operadora/contratante.

---

## 5. Priorização sugerida

| # | Item | Esforço | Impacto |
|---|---|---|---|
| 1 | A1 — verificação real no confirmUpload | Baixo | Alto (integridade documental) |
| 2 | A2 — PermissoesGuard no backend | Médio | Alto (RBAC efetivo) |
| 3 | M1+A3 — strip EXIF + guia de foto | Baixo | Alto (LGPD + qualidade clínica) |
| 4 | M4/M5 — usuário Atlas mínimo + CORS prod | Baixo | Médio |
| 5 | Escalas PUSH/RESVECH/Wagner + TIMERS | Médio | Alto (credibilidade clínica) |
| 6 | Gráfico de evolução + PDF | Médio | Alto (valor percebido) |
| 7 | M2/M3 — throttle global + token family | Médio | Médio |
| 8 | Assinatura ICP-Brasil | Alto | Alto (conformidade plena) |
| 9 | Planimetria com marcador | Alto | Muito alto (diferencial) |
| 10 | FHIR/RNDS | Alto | Alto (mercado institucional) |
