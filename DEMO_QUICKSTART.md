# ⚡ Quick Start - Demonstração Nuvita 2.1

Guia rápido para preparar o banco para a apresentação do investidor.

## 🚀 Setup Automático (Recomendado - 5 minutos)

### Windows (PowerShell)

```powershell
# Abra PowerShell como Administrador e execute:
cd C:\Users\erico\nuvita-2.1
scripts\setup-demo.ps1
```

### macOS/Linux (Bash)

```bash
cd ~/nuvita-2.1
chmod +x scripts/setup-demo.sh
scripts/setup-demo.sh
```

## 📋 Setup Manual Passo a Passo

Se o script automático não funcionar:

### 1. Iniciar containers
```bash
docker-compose up -d
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Popular banco de dados
```bash
npm run seed:db
```

## 🚀 Rodando a Aplicação

### Terminal 1 - API
```bash
npm run api:dev
```
Aguarde até ver: `✅ Application running on: http://localhost:3010`

### Terminal 2 - Web
```bash
cd apps/web
npm run dev
```
Aguarde até ver: `Local: http://localhost:5174`

### Terminal 3 - Abra no navegador
```
http://localhost:5174
```

## 🔐 Login para Demonstração

### Admin (acesso total - recomendado)
```
Email: admin@nuvita.local
Senha: Admin@123456!
Perfil: SUPER_ADMIN
```

### Enfermeiro (acesso limitado - demonstrar funcionalidades)
```
Email: carla@nuvita.local
Senha: Enf@123456!
Perfil: ENFERMEIRO
```

## 📊 Dados Disponíveis

- **10 Pacientes** com histórico completo
- **8 Agendamentos** (3 concluídos com prontuários)
- **12 Feridas** em acompanhamento
- **8 Avaliações Clínicas** com PUSH score
- **6 Prontuários** com registros completos

## ✨ Funcionalidades para Demonstrar

### Como Admin
1. **Dashboard** - Visão geral de todos os pacientes
2. **Pacientes** - Lista com dados completos
3. **Prontuários** - Histórico de atendimentos
4. **Feridas** - Avaliações e PUSH scores
5. **Agendamentos** - Calendário de atendimentos
6. **Administração** - Gestão de usuários e clínica

### Como Enfermeiro
1. **Minha Agenda** - Agendamentos do dia/semana
2. **Novo Atendimento** - Criar prontuário
3. **Avaliar Ferida** - PUSH score com IA
4. **Recomendações Clínicas** - Insights do Claude IA

## 🐛 Troubleshooting Rápido

### MongoDB não conecta
```bash
# Verificar se está rodando
docker ps

# Reiniciar
docker-compose restart mongo
sleep 5
npm run seed:db
```

### Porta já em uso
```bash
# Matar processo na porta
# Windows: Ctrl+C na terminal da API/Web

# Linux/macOS: 
lsof -i :3010   # Matar API
lsof -i :5174   # Matar Web
```

### Dados não aparecem
```bash
# Verificar se seed foi bem-sucedido
npm run seed:db

# Deve exibir:
# ✅ BANCO DE DADOS POPULADO COM SUCESSO!
```

## 💡 Dicas para a Apresentação

### Fluxo Recomendado
1. **Login** como admin
2. **Mostrar Dashboard** - dados carregando
3. **Listar Pacientes** - dados realistas
4. **Abrir um Paciente** - ferida com avaliação
5. **Mostrar Prontuário** - registro clínico completo
6. **Demonstrar PUSH Score** - cálculo automático
7. **Mostrar Recomendações IA** - insights do Claude

### Pontos Fortes para Destacar
- ✅ Dados realistas e completos
- ✅ Sistema totalmente funcional
- ✅ IA integranda (recomendações clínicas)
- ✅ PUSH score automatizado
- ✅ Prontuários assinados digitalmente
- ✅ Multi-tenant (isolado por clínica)
- ✅ RBAC (controle de acesso)

## 📞 Contatos de Teste

### Pacientes (10)
Todos têm dados completos:
- Nome, CPF, data nascimento
- Telefone, email, endereço
- Convênio, observações
- Consentimento LGPD

### Profissionais (3 Enfermeiros)
- Carla Mendes
- Marco Silva
- Beatriz Costa

## ⏱️ Duração Esperada

| Atividade | Tempo |
|-----------|-------|
| Setup automático | 2-3 min |
| Startup API+Web | 1-2 min |
| Carregamento inicial | 2-3 seg |
| **Total** | **5-8 min** |

## 🎯 Cenários de Demonstração

### Cenário 1: Avaliação de Ferida (5 min)
1. Login como enfermeiro
2. Abrir agendamento
3. Avaliar ferida
4. Gerar PUSH score
5. Ver recomendações IA

### Cenário 2: Gestão de Pacientes (5 min)
1. Login como admin
2. Buscar paciente
3. Ver histórico completo
4. Visualizar feridas
5. Acessar prontuários

### Cenário 3: Admistração (5 min)
1. Login como admin
2. Gestão de usuários
3. Configurações da clínica
4. Ver auditoria de ações
5. Relatórios

## 🔒 Segurança Demonstrada

- ✅ Autenticação JWT
- ✅ RBAC por papel
- ✅ 2FA obrigatório para admin/enfermeiro
- ✅ Criptografia de dados sensíveis
- ✅ Assinatura digital de prontuários
- ✅ Imutabilidade de registros
- ✅ Trilha de auditoria

## 📋 Checklist Pré-Apresentação

- [ ] Docker rodando (`docker ps`)
- [ ] MongoDB acessível (`npm run seed:db`)
- [ ] API iniciada (`http://localhost:3010`)
- [ ] Web iniciada (`http://localhost:5174`)
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Pacientes visíveis
- [ ] Feridas com dados completos
- [ ] Prontuários acessíveis
- [ ] IA recomendações funcionando

## 🆘 Suporte

Para problemas:
1. Consulte `scripts/SEED_README.md`
2. Verifique logs: `docker-compose logs mongo`
3. Reinicie tudo: `docker-compose down && npm run seed:db`

---

**Pronto para brilhar na apresentação! 🚀**

Qualquer dúvida, consulte a documentação completa em `scripts/SEED_README.md`
