#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   🌱 Setup Nuvita 2.1 Demo Database${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Checar se Docker está instalado
echo -e "${YELLOW}1️⃣  Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não instalado. Instale em https://www.docker.com/products/docker-desktop${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker encontrado${NC}\n"

# Checar se docker-compose está instalado
echo -e "${YELLOW}2️⃣  Verificando docker-compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose não instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ docker-compose encontrado${NC}\n"

# Parar containers anteriores se existirem
echo -e "${YELLOW}3️⃣  Limpando containers anteriores...${NC}"
docker-compose down --remove-orphans 2>/dev/null
echo -e "${GREEN}✅ Pronto${NC}\n"

# Iniciar containers
echo -e "${YELLOW}4️⃣  Iniciando MongoDB e Redis...${NC}"
docker-compose up -d
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao iniciar containers${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Containers iniciados${NC}\n"

# Aguardar MongoDB inicializar
echo -e "${YELLOW}5️⃣  Aguardando MongoDB inicializar (10s)...${NC}"
sleep 10
echo -e "${GREEN}✅ MongoDB pronto${NC}\n"

# Instalar dependências
echo -e "${YELLOW}6️⃣  Instalando dependências npm...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao instalar dependências${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependências instaladas${NC}\n"

# Rodar seed
echo -e "${YELLOW}7️⃣  Populando banco de dados...${NC}"
npm run seed:db
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao popular banco de dados${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Banco de dados populado${NC}\n"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✅ Setup Completo!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}🚀 Próximos passos:${NC}\n"
echo -e "  1. Em um novo terminal, inicie a API:"
echo -e "     ${YELLOW}npm run api:dev${NC}\n"
echo -e "  2. Em outro terminal, inicie a web:"
echo -e "     ${YELLOW}cd apps/web && npm run dev${NC}\n"
echo -e "  3. Abra no navegador:"
echo -e "     ${YELLOW}http://localhost:5174${NC}\n"
echo -e "  4. Faça login com:"
echo -e "     ${YELLOW}Email: admin@nuvita.local${NC}"
echo -e "     ${YELLOW}Senha: Admin@123456!${NC}\n"
echo -e "${BLUE}📋 Para mais detalhes, leia: scripts/SEED_README.md${NC}\n"
