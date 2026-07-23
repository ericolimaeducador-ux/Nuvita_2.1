# Diagnóstico — Gaps e Plano de Excelência (Plano de Cuidados / CIPE®)

> Verificação direta do código em 2026-07-23, branch `main`, commit base `17bc3a1`.
> Build de referência (`npm run build -w @nuvita/api`) passando **antes** de
> qualquer alteração.
>
> Este documento é a Fase 0 do prompt mestre "Plano de Cuidados CIPE". Ele existe
> porque a especificação recebida assume uma estrutura de repositório que **não é
> a deste repositório** em pelo menos seis pontos. Registrar isso antes de
> escrever código é mais barato que descobrir no meio da Fase 1.

---

## 1. O que o Nuvita 2.1 JÁ tem (não recriar)

Verificado lendo o código, não o README.

| Capacidade | Onde vive | Observação |
|---|---|---|
| Módulo de feridas completo | `apps/api/src/modules/feridas/` | `FeridasService` + `AvaliacaoFeridaService`, com repositórios Mongo |
| Avaliação de ferida imutável | `feridas/domain/avaliacao-ferida.entity.ts` | Só `POST`/`GET` no controller — sem `PATCH`/`DELETE`, por desenho |
| Motor de risco puro | `feridas/domain/risk-engine.ts` | Função pura, sem import de produto/SKU. **Fronteira clínica × comercial de pé** |
| Escalas versionadas | `feridas/domain/escalas.ts` | `escalas.versao` persistido por avaliação |
| Prova de integridade (HMAC) | `prontuarios.service.ts:311`, `termos-consentimento.service.ts:119` | `createHmac('sha256', …)` sobre `stableStringify`. **Não é assinatura digital** |
| Criptografia de dados de paciente | `pacientes/infrastructure/crypto/paciente-crypto.service.ts` | `createCipheriv`/`createDecipheriv` + HMAC de índice cego |
| Multi-tenancy | `common/tenancy/` | `TenantMiddleware`, `TenantRequiredGuard`, `resolve-clinica-id.ts` |
| RBAC por módulo | `packages/shared/src/auth/permissao.ts` | Enum `Modulo` + `resolvePermissoes` |
| Rate limiting | `app.module.ts:41` | `ThrottlerModule` global, 300 req/min |
| Contratos de IA (só as formas) | `feridas/domain/ia-contracts.entity.ts` | **Stubs sem implementação.** `WoundSegmentationResult`, `ClinicalNoteDraftResult` já têm formato definido |

### Consequência importante

`ia-contracts.entity.ts` já define o formato de segmentação de ferida e de nota
clínica SOAP, portado do protótipo `woundcare-ai`. **A Fase 4.1 do prompt
(análise de foto) e a nota SOAP da Skill 05 devem honrar esses contratos
existentes em vez de inventar formatos paralelos.**

---

## 2. Divergências entre a especificação recebida e o repositório real

Estes são os pontos onde seguir o prompt ao pé da letra produziria código que
não compila ou que quebra convenção do projeto.

### 2.1 — `permissao.ts` não tem permissões em string ❗

O prompt manda adicionar `'plano_cuidados:criar'`, `'plano_cuidados:ler'`, etc.
**Não existe esse conceito neste repositório.** O arquivo expõe um enum `Modulo`
de granularidade *por módulo*, consumido por `resolvePermissoes()`, pelo
`PermissoesGuard` e pelo gate de rotas do frontend.

**Adaptação adotada:** adicionar `PLANO_CUIDADOS = 'PLANO_CUIDADOS'` ao enum
`Modulo`, com label e inclusão em `PERMISSOES_PADRAO_POR_PAPEL` para
`ADMIN` e `ENFERMEIRO`. A distinção criar/ler/evoluir fica no `@Roles(...)` do
controller, exatamente como `LEITURA_FERIDAS` / `MUTACAO_FERIDAS` já fazem em
`avaliacao-ferida.controller.ts:16-17`.

### 2.2 — Decorators e guards do prompt não existem com esses nomes ❗

| Prompt | Real neste repositório |
|---|---|
| `@RequirePermissao('...')` | `@RequerModulo(Modulo.X)` + `@Roles(...)` |
| `@CurrentClinica()` | `@Query('clinicaId')` repassado ao service, ou `current-clinica-id.decorator.ts` |
| `@UseGuards(JwtAuthGuard, TenantRequiredGuard)` | `@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, PermissoesGuard)` |
| `@ApiTags` / `@ApiOperation` | `@nestjs/swagger` está instalado, mas **os controllers existentes não usam** esses decorators |

### 2.3 — Layout de diretórios do módulo ❗

O prompt manda criar `domain/entities/`, `domain/value-objects/`,
`application/use-cases/`, `application/dtos/`, `infrastructure/schemas/`,
`infrastructure/repositories/`.

O padrão real do repositório (`feridas/`, tomado como referência) é mais raso:

```
modules/<nome>/
  <nome>.constants.ts
  <nome>.module.ts
  domain/          <nome>.entity.ts, regras puras + .spec.ts colado
  application/     <nome>.service.ts, dto/, ports/
  infrastructure/  mongo/  (<nome>.schema.ts + <nome>-mongo.repository.ts)
  presentation/    <nome>.controller.ts
```

**Adaptação adotada:** seguir o layout do repositório. Criar sete diretórios
vazios de arquitetura hexagonal "de manual" num projeto que não usa esse
formato produz inconsistência sem benefício.

### 2.4 — Frontend não tem `features/` ❗

O prompt assume `apps/web/src/features/plano-cuidados/pages/`. O repositório usa
`apps/web/src/pages/` **plano** (25 arquivos, `PascalCasePage.tsx`) com rotas
centralizadas em `apps/web/src/routes.tsx` — que não é um array de objetos, e sim
JSX `<Route>` aninhado sob `<ProtectedRoute modulo={...}>`.

**Adaptação adotada:** `apps/web/src/pages/PlanoCuidadosPage.tsx` etc., e as
rotas entram como bloco `<Route element={<ProtectedRoute modulo={Modulo.PLANO_CUIDADOS} />}>`.

### 2.5 — Arquivo HTML de referência não está no repositório ⛔ BLOQUEIO PARCIAL

`nuvita-planos - Copia.html`, citado na Fase 0.2 como fonte da UI de referência,
**não existe em nenhum lugar do repositório** (busca por `*plano*` em profundidade
3, fora de `node_modules`, retorna apenas este plano de gaps).

**Impacto:** a Fase 0.2 (análise da UI concorrente) não pode ser executada. A
Fase 3 (frontend) foi construída a partir da descrição textual em 3.1 do próprio
prompt — abas progressivas, cards de diagnóstico com badge de prioridade,
accordions por urgência. Se o HTML for fornecido depois, a tela deve ser revista
contra ele.

### 2.6 — Nenhuma integração com LLM existe hoje ⚠️

`@anthropic-ai/sdk` **não está em nenhum `package.json`** do monorepo. Não há
chamada a nenhum provedor de LLM em `apps/api/src`. Este módulo seria a
**primeira** saída de dados para um serviço de IA de terceiro.

Duas consequências que não são detalhe de implementação:

1. **LGPD / dados de saúde.** O texto livre de histórico e exame físico é dado
   pessoal sensível (art. 5º, II). Enviá-lo à API da Anthropic é transferência
   internacional de dado de saúde. Isso precisa de base legal explícita, registro
   no ROPA e — provavelmente — menção no TCLE. Não é bloqueio técnico, é decisão
   da usuária, e está sinalizado aqui porque o prompt não o menciona.
2. **Modelo especificado é válido — mantido.** `claude-sonnet-4-6` é um id ativo
   e foi escolhido explicitamente na especificação; fica como padrão,
   configurável por `CIPE_AI_MODEL`. Duas notas de implementação que o prompt
   não cobre: (a) o Sonnet 4.6 **não** suporta *structured outputs*
   (`output_config.format`), então a obtenção de JSON continua sendo por
   instrução no system prompt, como o prompt já faz — correto; (b) com
   *adaptive thinking* ligado, `response.content[0]` pode ser um bloco
   `thinking`, e não o texto. O cast `(response.content[0] as { text: string })`
   do prompt quebraria nesse caso. A implementação localiza o bloco `text`.

### 2.7 — Os códigos CIPE® do seed são inventados ⛔ TRAVA DO CLAUDE.md

Os códigos `cipe-f-001`, `cipe-a-001`, `cipe-r-001` do seed **não são códigos
CIPE®/ICNP® reais**. A CIPE® é taxonomia licenciada do ICN, com códigos próprios
de formato diferente.

Isso colide de frente com a trava do `CLAUDE.md`:

> **Não fixar número regulatório sem confirmação** — classe de risco ANVISA,
> resolução COFEN/CFM, versão de instrumento. Deixar marcado como pendente é
> melhor que inventar.

E agrava-se pelo fato de o diagnóstico ir para registro clínico **imutável**: um
código falso gravado hoje não pode ser corrigido depois (trava da imutabilidade).

**Adaptação adotada — não negociável:**

- Namespace do catálogo local é `local-f-###` / `local-a-###` / `local-r-###`,
  nunca `cipe-###`.
- Todo termo carrega `taxonomia: 'LOCAL_PROVISORIO'` e `codigo_cipe_oficial: null`.
- O campo `codigo_cipe_oficial` fica reservado para quando a licença CIPE® for
  adquirida e o cruzamento com o material do curso for feito.
- A UI e o texto impresso dizem **"catálogo clínico local (provisório)"**, não
  "CIPE®", enquanto `codigo_cipe_oficial` for nulo.
- O catálogo persiste `versao_catalogo`, seguindo o padrão já em uso em
  `escalas.versao`.

O conteúdo clínico dos termos do seed (manifestações, fatores relacionados,
atividades) permanece útil e é aproveitado — o que se recusa é **carimbá-lo como
CIPE® antes do cruzamento com a hierarquia de fontes** exigida pelo `CLAUDE.md`.

---

## 3. Gaps identificados vs. referências externas

Extraídas apenas as ideias dos repositórios citados — nenhum código copiado.

| Gap | Origem da ideia | Prioridade | Situação |
|---|---|---|---|
| Plano de cuidados estruturado (diagnóstico → resultado → prescrição → evolução) | — (núcleo do pedido) | **P0** | Não existe. É o módulo desta sessão |
| Nota SOAP gerada para prontuário | heal-track-ai | **P0** | Formato já previsto em `ia-contracts.entity.ts`, sem implementação |
| Análise de ferida por foto | heal-track-ai, wound-segmentation, AI-Powered-Wound-Image-Analysis | P1 | Contrato `WoundSegmentationResult` existe; sem implementação |
| Timeline de cicatrização | projeto-integrador-heal | P1 | Avaliações seriadas já são persistidas; falta o endpoint de série temporal e o gráfico |
| Escolha de modelo de segmentação | Comparacao_de_modelos_segmentacao | P2 | Referência para decisão futura; não implementar agora |
| Gestão de feridas — funcionalidades avulsas | redisus | P2 | Backlog |

---

## 4. O que foi implementado nesta sessão

Todas as fases entregues, com build de API e web e 140 testes verdes ao final.

**Fase 1 — backend.** `apps/api/src/modules/plano-cuidados/`, no layout do
repositório. Catálogo (fenômeno / ação / resultado) + `PlanoCuidados`,
`CatalogoMongoRepository` com `$text` em português, `PlanoCuidadosAiService`
com as 5 skills e auditoria de tokens por chamada, `PlanoCuidadosService`
orquestrando extração → busca → diagnóstico → resultado → prescrição, controller
com `@RequerModulo` + `@Roles` + `@Throttle` de 5/min.

**Trava que não estava na especificação e vale destacar:** o prompt manda o
modelo não inventar código, mas prompt é instrução, não garantia. Como o
diagnóstico vai para registro imutável, a verificação existe em código —
diagnóstico, resultado ou ação que cite código fora do catálogo é descartado
com log. Coberta por teste.

**Fase 2 — seed.** `scripts/seed-catalogo-clinico.mjs`, 7 fenômenos, 13 ações,
7 resultados, todos `LOCAL_PROVISORIO`. Valida os 27 vínculos cruzados antes de
conectar.

**Fase 3 — frontend.** `PlanosCuidadosPage` e `PlanoCuidadosDetailPage` em
`pages/`, rota gateada por `Modulo.PLANO_CUIDADOS`, item de menu, mensagem de
progresso cronometrada durante a geração.

**Fase 4 — diferenciais.**
- 4.1 análise auxiliar de foto: honra `WoundSegmentationResult` de
  `ia-contracts.entity.ts` em vez de criar formato paralelo; sempre devolve
  `exigeRevisaoHumana: true`; não persiste nada, pré-preenche o formulário.
- 4.2 **não implementado porque já existia** — `GET /feridas/:id/timeline` com
  tendência, consumido pelo `FeridaDetailPage`.
- 4.3 quando há `avaliacaoFeridaId`, o plano aproveita escalas versionadas e
  recomendações do motor de risco em vez de reestimar pelo texto. Dependência
  de mão única; o `risk-engine.ts` continua puro.

## 5. Como testar

```bash
# 1. Subir a stack local (Docker Desktop precisa estar rodando)
docker compose up -d

# 2. Semear o catálogo clínico
MONGODB_URI="mongodb://localhost:27017/nuvita2" node scripts/seed-catalogo-clinico.mjs

# 3. Configurar a chave (ver a trava de LGPD da seção 2.6 antes)
#    ANTHROPIC_API_KEY=sk-ant-... em .env.local

# 4. Subir API e web e acessar /planos-cuidados
npm run dev

# Testes do módulo
npm test -w @nuvita/api -- plano-cuidados
```

Texto de exemplo para a anamnese:

> Paciente feminina, 72 anos, diabética tipo 2 há 20 anos, hipertensa. Úlcera
> venosa em membro inferior esquerdo há 6 meses com piora. Dor EVA 6. Exsudato
> serossanguinolento moderado. Tecido de granulação 40%, fibrina 60%. Edema
> +2/4 em membros inferiores. Mobilidade reduzida.

**Sem `ANTHROPIC_API_KEY` o módulo responde 503 com mensagem clara** e o resto
da API sobe normal — a ausência da chave não quebra nada além do próprio módulo.

## 6. O que fica para próximas sessões (backlog)

- Cruzamento do catálogo local com a CIPE® licenciada e com o material do curso;
  ao concluir, preencher `codigoCipeOficial` e virar `CIPE_VALIDADO`. Planos já
  gravados não são tocados — cada um guarda a versão do catálogo que usou.
- Exportação do plano em PDF (o botão não foi criado; não havia rota de
  impressão prevista e as telas de impressão do repo seguem um padrão próprio).
- Incluir o plano no prontuário como registro assinado.
- Teste de integração ponta a ponta com Mongo real — os testes atuais cobrem a
  camada de serviço com repositório e IA dublados. **Não foi possível rodar o
  seed nem a stack nesta sessão: o Docker Desktop não estava em execução.**
- Revisão clínica do conteúdo do seed pela enfermeira responsável antes de uso
  assistencial.

## 7. Arquivos modificados (edição cirúrgica)

```
apps/api/src/app.module.ts               + PlanoCuidadosModule no array de imports
apps/api/package.json                    + @anthropic-ai/sdk
packages/shared/src/auth/permissao.ts    + Modulo.PLANO_CUIDADOS, label, papéis padrão
apps/web/src/types.ts                    + espelho do enum Modulo e tipos do plano
apps/web/src/routes.tsx                  + bloco de rotas sob ProtectedRoute
apps/web/src/layout/AppLayout.tsx        + item de menu gateado pelo módulo
apps/web/src/api/resources.ts            + planosCuidadosApi e analiseFotoApi
apps/web/src/components/FeridaDialogs.tsx + botão "Analisar foto com IA" (Fase 4.1)
.env.example                             + variáveis de IA com a ressalva de LGPD
```

`FeridaDialogs.tsx` não estava na lista original da Fase 0 — entrou porque a
Fase 4.1 pede o botão de análise justamente na tela de avaliação de ferida. A
edição é aditiva: um botão ao lado do "Medir pela foto" que já existia, sem
alterar o fluxo de gravação.

## 8. Arquivos que NÃO foram tocados

```
apps/api/src/modules/feridas/          leitura apenas — o módulo importa
                                       FeridasModule e chama AvaliacaoFeridaService,
                                       sem alterar nada lá dentro
apps/api/src/modules/prontuarios/      intocado
apps/api/src/modules/auth/             intocado
apps/api/src/common/tenancy/           intocado (usa resolveTenantClinicaId como está)
apps/api/src/common/security/          intocado (só injeta AppConfigService)
apps/api/src/modules/feridas/domain/risk-engine.ts
                                       intocado e ainda puro
docs/ULTRAPLAN.md                      não reaberto
```

---

## 9. Pendências que exigem decisão da usuária

1. **Fornecer `nuvita-planos - Copia.html`** — o arquivo não está no
   repositório, então a Fase 0.2 não foi executada e a Fase 3 foi construída
   contra a descrição textual do próprio prompt (seção 2.5). Com o HTML em mãos,
   as duas telas devem ser revistas.
2. **Autorizar envio de dado de saúde à API da Anthropic**, com base legal,
   registro no ROPA e revisão do TCLE (seção 2.6). Vale para o texto clínico e,
   com agravante, para a foto da lesão da Fase 4.1. Enquanto a chave não for
   configurada, o módulo responde 503 e nada sai da infraestrutura.
3. **Licença CIPE®** — enquanto não houver, o catálogo permanece
   `LOCAL_PROVISORIO` e nem a UI nem o impresso podem chamá-lo de CIPE®
   (seção 2.7).
4. **Revisão clínica do conteúdo do seed** pela enfermeira responsável antes de
   qualquer uso assistencial. O conteúdo reflete prática corrente de
   estomaterapia e serve para o módulo rodar de ponta a ponta, mas não foi
   cruzado com o material do curso, que tem prioridade pela hierarquia de fontes.
