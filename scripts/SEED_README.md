# 🌱 Script de Seed - Nuvita 2.1

Este script popula automaticamente o banco de dados MongoDB com dados fictícios realistas para demonstração e testes.

## 🚀 Pré-requisitos

1. **Docker e Docker Compose instalados**
2. **Node.js 18+** 
3. **Repositório nuvita-2.1 clonado**

## 📋 Passo a Passo

### 1️⃣ Inicie os containers MongoDB e Redis

```bash
cd /caminho/para/nuvita-2.1
docker-compose up -d
```

Isso inicia:
- **MongoDB** na porta `27018` (banco: `nuvita2`)
- **Redis** na porta `6380`

Verifique se está rodando:
```bash
docker-compose ps
```

Você deve ver os containers `nuvita2-mongo` e `nuvita2-redis` com status `Up`.

### 2️⃣ Instale as dependências do seed (se necessário)

```bash
npm install
```

### 3️⃣ Execute o script de seed

```bash
npm run seed:db
```

O script vai:
- ✅ Conectar ao MongoDB
- 🧹 Limpar as coleções existentes
- 📋 Criar 1 clínica de demonstração
- 👤 Criar 1 SUPER_ADMIN
- 👨‍⚕️ Criar 3 Enfermeiros
- 👥 Criar 10 pacientes fictícios com dados completos
- 📅 Criar 8 agendamentos (alguns concluídos, alguns agendados)
- 📄 Criar 6 prontuários com registros clínicos
- 🩹 Criar 12 feridas em acompanhamento
- 📊 Criar 8 avaliações clínicas com scores PUSH e recomendações

### 4️⃣ Inicie a aplicação

Em **outro terminal**:

```bash
npm run api:dev
```

Em **outro terminal**:

```bash
cd apps/web && npm run dev
```

### 5️⃣ Acesse a aplicação

Abra no navegador: **http://localhost:5174**

## 🔐 Credenciais de Acesso

```
Email: admin@nuvita.local
Senha: Admin@123456!
Perfil: SUPER_ADMIN
```

⚠️ **IMPORTANTE**: Mude a senha na primeira entrada!

## 👥 Usuários Criados

### Admin
- **Email**: admin@nuvita.local
- **Senha**: Admin@123456!
- **Perfil**: SUPER_ADMIN (acesso total)

### Enfermeiros (para atendimentos)
1. **Carla Mendes Enfermeira** - carla@nuvita.local / Enf@123456!
2. **Marco Silva Técnico** - marco@nuvita.local / Enf@123456!
3. **Beatriz Costa Enfermeira** - beatriz@nuvita.local / Enf@123456!

## 📊 Dados Criados

### Clínica
- **Nome**: WoundCare Brasil - Demonstração
- **CNPJ**: 30.567.890/0001-12
- **Endereço**: Avenida Savassi, 1100 - Belo Horizonte, MG
- **Plano**: PREMIUM

### Pacientes (10 total)
- Nomes brasileiros realistas
- Idades variadas (20-60 anos)
- Sexo variado
- CPF formatado (fictício)
- Telefone e email
- Convênios variados
- Consentimento LGPD aceito

### Feridas (12 total)
Distribuídas entre os pacientes:
- **Etiologias**: Pressão, Diabética, Arterioesclerose, Venosa, Traumática
- **Localizações**: Perna, região sacral, calcâneo, antebraço, tornozelo, nádega
- **Status**: Aberta, Cicatrizando, Epitelizada

### Avaliações Clínicas (8 total)
Cada avaliação inclui:
- **Medições**: Comprimento, largura, profundidade, área
- **Perfil Tecidual**: Granulação, epitelização, esfacelo, necrose
- **Escalas**: PUSH score com classificação completa
- **Recomendações**: Risco, ação e justificativa clínica
- **Motor Clínico**: Haiku (modelo IA utilizado)

### Prontuários (6 total)
Cada prontuário contém:
- Subjetivo (queixa do paciente)
- Objetivo (sinais vitais, características da ferida)
- Avaliação (diagnóstico, risco, prognóstico)
- Plano (intervenções, prescrições)
- Registro de Enfermagem (procedimentos, materiais)

### Agendamentos (8 total)
- 3 concluídos (com prontuários)
- 5 agendados (futuros)
- Associados a pacientes e enfermeiros
- Durações realistas (1 hora cada)

## 🧪 Testar a Aplicação

### Como Admin
1. Login com credenciais SUPER_ADMIN
2. Explore a lista de pacientes
3. Veja os agendamentos
4. Acesse os prontuários
5. Verifique as feridas e avaliações

### Como Enfermeiro
1. Login com credenciais de enfermeiro
2. Veja agendamentos designados
3. Registre novo atendimento
4. Avalie feridas
5. Crie prontuários

## 🔄 Resetar o Banco

Se precisar limpar e recriar os dados:

1. Parar os containers:
```bash
docker-compose down
```

2. Remover volumes (CUIDADO - deleta dados):
```bash
docker-compose down -v
```

3. Reiniciar:
```bash
docker-compose up -d
npm run seed:db
```

## 🐛 Troubleshooting

### "MongoDB connection failed"
- Verifique se os containers estão rodando: `docker-compose ps`
- Verifique se a porta 27018 está acessível
- Aguarde 10 segundos para o MongoDB inicializar

### "Cannot find module 'mongoose'"
- Execute: `npm install`
- Certifique-se de estar na raiz do projeto

### "ts-node not found"
- Execute: `npm install --save-dev ts-node`

### Dados incompletos
- Verifique se o script terminou com "✅ BANCO DE DADOS POPULADO COM SUCESSO!"
- Se parou no meio, limpe o banco e execute novamente

## 📋 Estrutura de Dados

```
Clínica
├── Usuários (Admin + Enfermeiros)
├── Pacientes (10)
│   ├── Agendamentos (8)
│   ├── Prontuários (6)
│   └── Feridas (12)
│       └── Avaliações (8)
```

## ✨ Próximos Passos

Após popular o banco:

1. **Teste o fluxo completo de atendimento**
   - Schedule new appointments
   - Complete medical records
   - Evaluate wounds with PUSH/RESVECH

2. **Verifique integrações**
   - Email notifications
   - Document storage (R2)
   - Clinical recommendations (Claude IA)

3. **Teste segurança**
   - 2FA enforcement
   - Record immutability
   - Audit logs

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs: `docker-compose logs mongo`
2. Consulte o CLAUDE.md do projeto
3. Verifique a status do banco: `npm run seed:db` (mostra conexão)

---

**Criado para demonstração de 2026-07-29**
Pronto para apresentação ao investidor! 🚀
