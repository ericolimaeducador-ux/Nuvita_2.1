## Rumo do produto e travas (decidido em 2026-07-22)

O plano vigente de eliminação de gaps é `docs/PLANO-GAPS-2026-07.md`. Ele
consolida uma revisão multissetorial (clínica, jurídica, regulatória,
indústria) cruzada com verificação direta do código.

Travas que valem para qualquer trabalho neste repositório:

- **Nunca chamar o HMAC de "assinatura digital".** O que existe
  (`PRONTUARIO_SIGNATURE_SECRET`) é prova de integridade, não assinatura com
  validade jurídica plena — isso exige ICP-Brasil. Usar "registro íntegro com
  trilha de auditoria". Vale para README, UI e principalmente para o texto
  impresso que vai à mão do paciente.
- **Nenhuma peça comercial vai ao ar antes do ICP-Brasil.** A venda está
  represada por decisão da usuária; o ICP-Brasil está no caminho crítico da
  receita, não é add-on.
- **Não reabrir `docs/ULTRAPLAN.md`.** As decisões fechadas lá continuam
  fechadas. O módulo de incontinência é código novo do zero — nada do pipeline
  de IU removido em `c48d9c3` é reaproveitado (aquilo era fluxo
  jurídico/pericial, não avaliação clínica).
- **Hierarquia de fontes clínicas**: o material do curso do projeto (Anatomia,
  Fundamentos, Cuidados com Estomas) tem prioridade sobre literatura
  internacional. Nenhuma escala, ponto de corte ou classificação vai para o
  código antes desse cruzamento.
- **Não fixar número regulatório sem confirmação** — classe de risco ANVISA,
  resolução COFEN/CFM, versão de instrumento. Deixar marcado como pendente é
  melhor que inventar.
- **Fronteira clínica × comercial**: a camada clínica recomenda por categoria
  com evidência; SKU, preço e estoque vivem no módulo comercial. O
  `risk-engine.ts` é função pura e não pode passar a importar `produtos`.
- **Não corrigir retroativamente registro clínico já gravado.** Avaliação,
  prontuário assinado, TCLE e receituário são imutáveis por desenho; a
  evolução se faz por versão do instrumento persistida no registro (padrão já
  em uso: `escalas.versao`, `versaoTexto`).

## Verificar antes de afirmar

Instruções de produto neste repositório já se perderam sem virar código.
Antes de dizer que algo existe ou não existe, confirmar no código ou no git —
não na memória nem no README. Para dirigir a aplicação localmente e conferir de
fato, usar o skill `verify`.

## graphify

This project has a graphify knowledge graph at .graphify/.

Rules:
- For codebase or architecture questions, when `.graphify/graph.json` exists, first run `graphify query "<question>"` (or `graphify path "<A>" "<B>"` / `graphify explain "<concept>"`); these return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output
- If .graphify/wiki/index.md exists, navigate it instead of reading raw files
- If .graphify/graph.json is missing but graphify-out/graph.json exists, run `graphify migrate-state --dry-run` first; if tracked legacy artifacts are reported, ask before using the recommended `git mv -f graphify-out .graphify` and commit message
- If .graphify/needs_update exists or .graphify/branch.json has stale=true, warn before relying on semantic results and run /graphify . --update when appropriate
- Before proposing or committing .graphify artifacts, run `graphify portable-check .graphify`; commit-safe graph artifacts must use repo-relative paths, and never commit .graphify/branch.json, .graphify/worktree.json, .graphify/needs_update, or .graphify/cache/. If a repo already tracks any of them, first add them to .gitignore, then propose `git rm --cached .graphify/branch.json .graphify/worktree.json .graphify/needs_update` and `git rm -r --cached .graphify/cache`; never mutate git state without asking
- Before deep graph traversal, prefer `graphify summary --graph .graphify/graph.json` for compact first-hop orientation
- For review impact on changed files, use `graphify review-delta --graph .graphify/graph.json` instead of generic traversal
- Read `.graphify/GRAPH_REPORT.md` only for broad architecture review or when `query` / `path` / `explain` do not surface enough context
- After modifying code files in this session, run `npx graphify hook-rebuild` to keep the graph current
