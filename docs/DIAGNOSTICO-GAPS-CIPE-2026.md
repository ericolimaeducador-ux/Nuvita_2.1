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

## 4. O que será adicionado nesta sessão

**Fase 1 — backend (núcleo):**
- `apps/api/src/modules/plano-cuidados/` completo, no layout do repositório
- Schemas: catálogo local (fenômeno / ação / resultado) + `PlanoCuidados`
- `CatalogoBuscaService` (busca `$text` no catálogo)
- `PlanoCuidadosAiService` — as 5 skills, com audit log de tokens por chamada
- `GerarPlanoUseCase` orquestrando extração → busca → diagnóstico → resultado → prescrição
- Controller com `@RequerModulo` + `@Roles` + `@Throttle` apertado

**Fase 2 — seed do catálogo local**, com o namespace provisório da seção 2.7.

**Fase 3 — frontend**, em `pages/`, com as abas progressivas.

## 5. O que fica para próximas sessões (backlog)

- Análise de foto de ferida (Fase 4.1) — depende da decisão de LGPD da seção 2.6
- Timeline de cicatrização (Fase 4.2)
- Ligação do `risk-engine.ts` ao plano (Fase 4.3) — **atenção:** deve ser feita
  passando o *score já calculado* para o use-case; o `risk-engine.ts` continua
  puro e não pode passar a importar nada do plano de cuidados
- Cruzamento do catálogo local com CIPE® licenciada + material do curso
- Exportação em PDF do plano

## 6. Arquivos que SERÃO modificados (edição cirúrgica)

```
apps/api/src/app.module.ts             + PlanoCuidadosModule no array de imports
packages/shared/src/auth/permissao.ts  + Modulo.PLANO_CUIDADOS, label, papéis padrão
apps/web/src/routes.tsx                + bloco de rotas sob ProtectedRoute
apps/web/src/types.ts                  + espelho do enum Modulo (se aplicável)
.env.example                           + variáveis de IA
apps/api/package.json                  + @anthropic-ai/sdk
```

## 7. Arquivos que NÃO serão tocados

```
apps/api/src/modules/feridas/          leitura apenas (integração por id)
apps/api/src/modules/prontuarios/      leitura apenas
apps/api/src/modules/auth/             intocado
apps/api/src/common/tenancy/           intocado
apps/api/src/common/security/          intocado
docs/ULTRAPLAN.md                      não reabrir
```

---

## 8. Pendências que exigem decisão da usuária

1. **Fornecer `nuvita-planos - Copia.html`** — sem ele a Fase 3 é feita "às
   cegas" contra a descrição textual (seção 2.5).
2. **Autorizar envio de dado de saúde à API da Anthropic**, com base legal e
   registro (seção 2.6).
3. **Licença CIPE®** — enquanto não houver, o catálogo permanece marcado como
   local/provisório (seção 2.7).
