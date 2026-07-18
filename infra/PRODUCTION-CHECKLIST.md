# Nuvita 2.1 (estomoterapia) — Checklist de Produção

> Este documento foi copiado do Nuvita original e ainda referenciava o
> projeto/domínio errados (`nuvita-499800` / `nuvita.app.br`). Corrigido em
> 2026-07-17 para refletir a infra real do **nuvita2-estomoterapia**.

Estado após o hardening de configuração. O código está **pronto para produção segura**.
As pendências restantes são ações de nuvem/credenciais que exigem suas chaves.

## ✅ Já feito (código)

- **Postura de segurança desacoplada da fonte de segredos.** Rodar `NODE_ENV=production`
  liga CSP, HSTS e fecha o Swagger, **sem** exigir o GCP Secret Manager —
  basta `CONFIG_SOURCE=env`.
- **Swagger `/docs` fechado em produção** (reabre só com `EXPOSE_DOCS=true`).
- **CSP do Helmet ligado** fora de `development`.
- **LOG_LEVEL=info** em produção (sem logs `debug` verbosos com possível PII).
- **`gen-cloudrun-env.cjs`** gera `NODE_ENV=production` + `CONFIG_SOURCE=env` + `LOG_LEVEL=info`
  + `CORS_ORIGIN=https://estomoterapia.nuvita.app.br,http://localhost:5174`.
- **CI** (`ci.yml`) roda em `main` e `integracao`: API (lint/type-check/build/test) e web
  (lint/test/build) — Fase 1 do go-live concluída em 2026-07-17.
- **CD da API** (`deploy-api.yml`) — deploy automatizado no Cloud Run em push para `main`.
- **`LIMITES_POR_PLANO`** (max. pacientes/usuários por plano) agora é de fato aplicado em
  `PacientesService.create()`/`ClinicasService.createUsuario()` — antes só existia no papel.

## 🌐 Infra real (verificado em 2026-07-17)

| Item | Valor |
|---|---|
| Projeto GCP | `nuvita2-estomoterapia` |
| Serviço Cloud Run | `nuvita2-api` (região `southamerica-east1`) — **já está no ar** |
| URL do Cloud Run | `https://nuvita2-api-vem4w433aa-rj.a.run.app` |
| Domínio do frontend | `estomoterapia.nuvita.app.br` (`apps/web/public/CNAME`) |
| GCP Secret Manager | **não usado** (`gcloud secrets list` → 0 itens) — segredos vão só via `CLOUDRUN_ENV_YAML` |
| GitHub Secrets já criados | `GCP_PROJECT_ID`, `GCP_SA_EMAIL`, `GCP_WIF_PROVIDER`, `CLOUDRUN_ENV_YAML`, `VITE_API_URL` |
| Deploy | Workload Identity Federation/OIDC (sem chave de longa duração) |

## 🔧 Pendências de nuvem (você precisa executar ou autorizar)

### 1. Rotacionar os segredos antes de tráfego real com dados de paciente  🔴
`apps/api/.env.cloud` tem a connection string real do MongoDB Atlas em texto puro
(usuário `zimlima_db_user`) — foi vista em sessão de dev, rotacionar antes de dados reais:
- Senha do usuário do MongoDB Atlas
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `PATIENT_DATA_ENCRYPTION_KEY` / `PATIENT_DATA_HASH_KEY` ⚠️ **trocar invalida dados de
  paciente já criptografados — só fazer antes de haver dados reais**
- `PRONTUARIO_SIGNATURE_SECRET`, `BOOTSTRAP_SECRET`
- Tokens Resend, Cloudflare R2, Z-API, Upstash Redis (os que já estiverem em uso)
- Depois: `node scripts/gen-cloudrun-env.cjs` e re-setar o secret `CLOUDRUN_ENV_YAML`

### 2. MongoDB Atlas — acesso de rede
Cloud Run usa IPs dinâmicos. Em Atlas → Network Access, liberar `0.0.0.0/0`
(protegido por usuário/senha forte) **ou** configurar VPC peering / Private Endpoint.
Não verificável por CLI local (sem `atlas` CLI instalado) — checar direto no console Atlas.

### 3. Domínio próprio `estomoterapia.nuvita.app.br` (registro.br) — em andamento 2026-07-18
- Frontend (GitHub Pages): CNAME `estomoterapia` → `ericolimaeducador-ux.github.io.`
  ✅ criado e propagado; falta o cert HTTPS do Pages emitir → habilitar `Enforce HTTPS`.
- API: **domain mapping nativo do Cloud Run NÃO existe em `southamerica-east1`**
  (erro 501 — não usar `gcloud run domain-mappings` nesta região). O caminho é o
  mesmo do Nuvita original: **Firebase Hosting como proxy** (`firebase.json` na raiz
  já tem o rewrite `**` → serviço `nuvita2-api`): `firebase deploy --only hosting`
  ✅ feito (proxy validado em `https://nuvita2-estomoterapia.web.app/health`), DNS A
  `api.estomoterapia` → `199.36.158.100` ✅ criado; falta adicionar o domínio
  customizado no console Firebase (Hosting → Add custom domain) e aguardar o cert.
- `CORS_ORIGIN` já cobre `https://estomoterapia.nuvita.app.br` ✅.

### 4. Primeiro bootstrap de admin em produção
- Rodar o bootstrap do admin no banco de produção (ver `scripts/`), usando o
  `BOOTSTRAP_SECRET` de produção (rotacionado, item 1).
- Confirmar `CORS_ORIGIN` cobre o domínio final do frontend.

## 📌 Recomendado (não bloqueia, mas importante)
- ✅ Cobertura de testes ampliada em 2026-07-17 (53 testes, incl. fluxo de autenticação,
  isolamento de tenant do módulo feridas, limites de plano).
- Definir limites de recursos do Cloud Run (`--memory`, `--cpu`, `--max-instances`).
- Monitoramento/alertas (Cloud Run métricas + uptime check no `/health`).
