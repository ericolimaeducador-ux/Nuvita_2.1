# Plano de eliminação de gaps — Nuvita 2.1

> Origem: revisão multissetorial (lentes clínica, jurídica/regulatória, gestão,
> qualidade, controle de infecção e indústria), julho de 2026, cruzada com
> verificação direta do código e da stack local em 2026-07-22.
>
> **Este documento não reabre o `ULTRAPLAN.md`.** As decisões fechadas lá
> permanecem fechadas e nenhum código do pipeline de IU removido em `c48d9c3`
> é reaproveitado. O módulo de incontinência da Fase 4 é construção nova.

## Duas decisões que orientam tudo

1. **Escopo clínico**: o produto passa a cobrir os três pilares da
   estomaterapia, em fases — feridas (existe) → ostomias → incontinência.
2. **Gate comercial**: nenhuma peça de venda vai ao ar antes da assinatura
   ICP-Brasil. Isso coloca o ICP-Brasil no **caminho crítico da receita**, não
   como add-on. A ordem abaixo reflete isso.

## O que já existe — verificado, não refazer

A revisão pediu itens que o código já entrega. Confirmado em 2026-07-22
rodando a stack local:

| Item pedido | Situação real |
|---|---|
| Versionar escalas para o registro histórico refletir a versão da época | **Pronto.** Cada avaliação persiste `escalas.versao` (`escalas-clinicas-0.1.0`) e `motorClinico` (`clinical-rules-0.1.0`) |
| Rationale documentado por flag automático | **Pronto.** Cada recomendação grava `regraId`, `justificativa`, `acao` e `exigeRevisaoHumana: true` |
| Separar recomendação clínica de SKU vendável | **Ainda não violado.** `risk-engine.ts` é função pura, sem qualquer referência a produto, SKU, marca ou catálogo. A fronteira existe; falta protegê-la |
| Imutabilidade de registro clínico | **Pronto.** Prontuário assinado rejeita edição (409), TCLE assinado rejeita reassinatura (409), receituário e avaliação de ferida não têm update/delete |

Consequência prática: o item 6 da lista original é **metade** do que parecia —
falta a exibição na tela e o override, não o versionamento.

---

## Fase 0 — Correções de custo quase zero (dias)

Nada aqui depende de terceiro. Tudo é defensável sozinho.

### 0.1 Linguagem de assinatura

O termo "assinatura digital" descreve hoje um HMAC server-side
(`PRONTUARIO_SIGNATURE_SECRET`) — que é **prova de integridade**, não
assinatura com validade jurídica plena. A expressão aparece em três lugares,
em ordem de gravidade:

1. **No documento impresso entregue ao paciente** — o TCLE imprime
   "✓ Assinado digitalmente" com hash e timestamp. É o pior caso: peça que sai
   da clínica para a mão de terceiro.
2. `README.md` — "assinatura digital imutável".
3. Comentário em `TermoConsentimentoDialog.tsx`.

Substituir por **"registro íntegro com trilha de auditoria"** (ou
"registro assinado eletronicamente com verificação de integridade"), mantendo
hash e timestamp visíveis — eles são a prova real e continuam valendo.

Reavaliar a linguagem quando a Fase 1.1 concluir.

### 0.2 TCLE assinado precisa ser recuperável

Gap encontrado na verificação, não presente na revisão original, e que
**agrava a lente jurídica**: depois de assinado, o termo não é alcançável pela
interface. `TermoConsentimentoDialog` só procura rascunho (`!t.assinatura`) e
abre a impressão uma única vez, logo após assinar. Fechada a aba, só se chega
ao documento por URL decorada.

Um consentimento que não se consegue produzir depois não cumpre a função de
consentimento. O padrão a copiar já existe no mesmo arquivo: a seção de
receituário lista os emitidos com link "Ver".

Ação: seção "Termos de consentimento" na tela do paciente, listando assinados
e rascunhos, com link para impressão.

### 0.3 Trancar a fronteira clínica ↔ comercial

Enquanto a fronteira está de pé, protegê-la custa um teste. Depois de cruzada,
custa desmontar acoplamento.

- Regra escrita: a camada clínica recomenda **por categoria** com evidência
  ("cobertura com prata para carga bacteriana elevada"); a camada comercial
  (SKU, preço, estoque) é outro módulo, rotulado como loja.
- Teste automatizado que falha se `risk-engine.ts` ou o módulo de recomendação
  passar a importar `produtos`.
- O receituário **não** viola isso: ali quem escolhe é o enfermeiro, no
  exercício da prescrição de insumo. A distinção a preservar é "o software
  sugeriu" × "o profissional prescreveu".

---

## Fase 1 — Gate regulatório (desbloqueia a receita)

Com a venda represada até o ICP-Brasil, esta fase é o caminho crítico. Correr
em paralelo à Fase 2.

### 1.1 Assinatura ICP-Brasil

Substituir/complementar o HMAC por assinatura ICP-Brasil no prontuário e no
TCLE. O HMAC atual **não é jogado fora**: continua como verificação de
integridade em repouso; a assinatura ICP passa a ser a camada de validade
jurídica.

Sequência: prontuário primeiro (é o documento com exigência mais clara), TCLE
depois. Concluído isso, revisitar a linguagem da Fase 0.1.

Depois, e só depois: certificação SBIS-CFM nível NGS2.

### 1.2 Enquadramento SaMD junto à ANVISA

**A confirmar com a ANVISA — não fixar classe em documento antes da resposta.**
O que define o enquadramento é a finalidade de uso, e ela é uma escolha nossa,
não um dado:

- Se o software **exibe escores publicados** para o profissional interpretar,
  tende ao menor risco ou fora do escopo.
- Se o motor de risco **estratifica ou dirige conduta**, empurra para SaMD com
  notificação.

Ação prévia obrigatória: escrever a finalidade de uso — recomendação é
declarar **"apoio à decisão; não substitui julgamento profissional"**, que é o
que o código já faz (toda recomendação carrega `exigeRevisaoHumana: true`).
Submeter o enquadramento para o escopo **atual** (feridas). Cada módulo novo
(ostomias, incontinência) é mudança de escopo e exige reavaliação — planejar
isso, não descobrir depois.

### 1.3 Postura LGPD

Dado de saúde é sensível (art. 11). A criptografia em repouso e o hash cego
cobrem a parte técnica; falta a documental:

- Base legal explícita (tutela da saúde pelo profissional).
- ROPA — registro das operações de tratamento.
- DPIA/RIPD, por dado sensível em escala.
- Política de retenção alinhada ao prazo de guarda do prontuário (~20 anos),
  com a exceção de guarda legal explicitada no fluxo de eliminação.
- **Verificar** o token de teleconsulta sem login: exige vida curta, uso único
  e consentimento de sessão registrado. Existe em `scripts/` uma migração que
  removeu TTL de sala de telemedicina — conferir o que ficou valendo antes de
  afirmar qualquer coisa.

### 1.4 Competência profissional no registro

O RBAC por papel é boa fundação, mas o registro deve deixar claro **qual
categoria profissional autorizou cada conduta**. Enfermeiro estomaterapeuta
conduz consulta de enfermagem, avalia ferida e seleciona/prescreve cobertura;
indicação cirúrgica e antibioticoterapia sistêmica são privativas de médico.

**A confirmar antes de codificar**: resolução COFEN vigente sobre teleconsulta
de enfermagem e atuação em feridas, e a resolução CFM de telemedicina. Não
fixar número de resolução neste documento sem checagem.

---

## Fase 2 — Corrigir a evidência clínica das feridas

Independe de terceiros e alimenta a finalidade de uso da Fase 1.2.

### 2.1 Escala certa por etiologia

Hoje `calcularPush(medicao, tecido, exsudato)` **não recebe etiologia** — todo
ferimento recebe PUSH, inclusive venoso, arterial e deiscência cirúrgica, fora
do escopo de validação da escala (construída e validada para lesão por
pressão, NPUAP/NPIAP).

Alvo: um seletor que decide os instrumentos aplicáveis a partir da etiologia.

| Etiologia | Instrumentos |
|---|---|
| Pressão | PUSH + estadiamento NPIAP + Braden (risco) |
| Venosa | RESVECH 2.0 + CEAP |
| Pé diabético | RESVECH 2.0 + Wagner ou Texas (alinhado ao IWGDF) |
| Demais crônicas | RESVECH 2.0 |

Confirmar a versão e os pontos de corte no material do curso antes de
codificar (ver "Hierarquia de fontes").

### 2.2 Não reescrever o passado

As avaliações já gravadas com PUSH em etiologia não-LPP **permanecem como
estão**. Corrigi-las retroativamente falsificaria o registro clínico. O
mecanismo para lidar com isso já existe e é o mesmo do TCLE: a avaliação
carrega a versão do instrumento usado à época. Bump para
`escalas-clinicas-0.2.0`; a UI renderiza conforme a versão gravada.

### 2.3 Auditabilidade na tela e override

Metade que falta do item 6 original:

- Cada escore exibe fonte, versão e fórmula na tela (o dado já está gravado).
- Override do nível de risco pelo profissional, **com justificativa
  obrigatória**, gravado de forma imutável e atribuído a quem fez — mitiga
  viés de automação sem apagar o que o motor concluiu.

### 2.4 Infecção e teleconsulta

- Estruturar sinais de infecção por referência validada (Wound Infection
  Continuum, IWII) em vez de campo livre.
- Profundidade, descolamento, palpação e odor não são avaliáveis remotamente —
  exatamente os sinais de infecção. Teleconsulta com suspeita de infecção não
  deve poder "fechar" o caso: o sistema conduz para **avaliação presencial**.

---

## Fase 3 — Módulo Ostomias

Primeiro pilar novo, escolhido por proximidade: avaliação de pele periestomal
reaproveita a anatomia do módulo de feridas (avaliação imutável, versionada,
com motor auditável).

- `Estoma`: tipo (colostomia/ileostomia/urostomia), construção (terminal/alça),
  localização, protrusão/budding, permanente ou temporário, data de confecção.
- `AvaliacaoPeristomal` (imutável, sem update/delete): escore **DET** do
  Ostomy Skin Tool — domínios Discoloration, Erosion, Tissue overgrowth —
  gravando a versão do instrumento (`ost-det-2.0`), no mesmo padrão das
  escalas de ferida.
- Complicações do estoma: retração, prolapso, hérnia paraestomal, necrose,
  estenose, separação mucocutânea.
- **Neutralidade de marca é requisito, não detalhe.** O DET nasceu de
  iniciativa de fabricante (Coloplast) e tem validação independente. Entra como
  ferramenta neutra; nunca atrelado a bolsa ou fabricante específico. Vale aqui
  a mesma fronteira da Fase 0.3.
- `Modulo.OSTOMIAS` no enum compartilhado, RBAC, whitelist do proxy (Vite e
  nginx) e navegação.

## Fase 4 — Módulo Incontinência

**Código novo, do zero.** Nada é recuperado do pipeline de IU removido em
`c48d9c3` — aquilo era um fluxo jurídico/pericial (laudo médico, processo,
entregas), não avaliação clínica, e não serve nem como base nem como template.

- Classificação de **DAI** pelo GLOBIAD (Ghent Global IAD Categorisation Tool),
  com a versão do instrumento persistida por avaliação.
- Incontinência urinária: instrumento de severidade/impacto da família ICIQ —
  **versão e ponto de corte a confirmar no material do curso** antes de
  codificar.
- Mesma anatomia de módulo, mesma imutabilidade, mesma auditabilidade.

## Fase 5 — Painéis institucionais (B2B)

Habilita a linha de consultoria a hospitais e ILPI, que é onde o produto cobra
mais. Depende das Fases 3 e 4 para ter o que medir.

Indicadores na língua que a instituição já reporta: incidência e prevalência de
lesão por pressão, taxa de DAI, taxa de complicação periestomal, tempo e taxa
de cicatrização.

Ponto de compliance: esses números são **resultado auditado do cliente**, não
alegação de eficácia do produto. A diferença é o que mantém o material de venda
defensável.

---

## Hierarquia de fontes

O material do curso deste projeto (Anatomia, Fundamentos, Cuidados com Estomas)
**tem prioridade** sobre a literatura internacional citada aqui. Nenhuma escala,
ponto de corte ou classificação vai para o código antes de ser cruzada com essas
unidades. Onde este plano cita um instrumento sem versão fixada, é porque a
confirmação ainda não foi feita — e isso está marcado, não omitido.

## O que este plano deliberadamente não faz

- Não reabre decisões do `ULTRAPLAN.md`.
- Não reaproveita código do pipeline de IU removido.
- Não fixa classe de risco ANVISA nem número de resolução COFEN/CFM antes de
  confirmação formal.
- Não corrige retroativamente avaliações clínicas já gravadas.
