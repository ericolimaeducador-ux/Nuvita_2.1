param(
    [switch]$SkipDocker = $false
)

# Função para imprimir com cores
function Write-Status {
    param(
        [string]$Message,
        [ValidateSet("Success", "Error", "Warning", "Info")]
        [string]$Status = "Info"
    )

    $colors = @{
        "Success" = "Green"
        "Error"   = "Red"
        "Warning" = "Yellow"
        "Info"    = "Cyan"
    }

    Write-Host $Message -ForegroundColor $colors[$Status]
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   🌱 Setup Nuvita 2.1 Demo Database" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Verificar Docker
if (-not $SkipDocker) {
    Write-Status "1️⃣  Verificando Docker..." "Warning"

    try {
        $dockerVersion = docker --version
        Write-Status "✅ Docker encontrado: $dockerVersion" "Success"
    }
    catch {
        Write-Status "❌ Docker não encontrado. Instale em https://www.docker.com/products/docker-desktop" "Error"
        exit 1
    }
}

# 2. Parar containers anteriores
Write-Status "`n2️⃣  Limpando containers anteriores..." "Warning"
try {
    docker-compose down --remove-orphans 2>$null
    Write-Status "✅ Containers limpos" "Success"
}
catch {
    Write-Status "⚠️  Nenhum container anterior encontrado" "Warning"
}

# 3. Iniciar containers
if (-not $SkipDocker) {
    Write-Status "`n3️⃣  Iniciando MongoDB e Redis..." "Warning"
    try {
        docker-compose up -d
        Write-Status "✅ Containers iniciados" "Success"
    }
    catch {
        Write-Status "❌ Erro ao iniciar containers" "Error"
        exit 1
    }

    # Aguardar MongoDB inicializar
    Write-Status "`n4️⃣  Aguardando MongoDB inicializar (10s)..." "Warning"
    Start-Sleep -Seconds 10
    Write-Status "✅ MongoDB pronto" "Success"
} else {
    Write-Status "`n4️⃣  ⏭️  Pulando inicialização do Docker (--SkipDocker)" "Warning"
}

# 5. Instalar dependências
Write-Status "`n5️⃣  Instalando dependências npm..." "Warning"
try {
    npm install
    Write-Status "✅ Dependências instaladas" "Success"
}
catch {
    Write-Status "❌ Erro ao instalar dependências" "Error"
    exit 1
}

# 6. Rodar seed
Write-Status "`n6️⃣  Populando banco de dados..." "Warning"
try {
    npm run seed:db
    Write-Status "✅ Banco de dados populado" "Success"
}
catch {
    Write-Status "❌ Erro ao popular banco de dados" "Error"
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   ✅ Setup Completo!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Status "🚀 Próximos passos:" "Info"
Write-Host "`n  1. Em um novo PowerShell/CMD, inicie a API:" -ForegroundColor White
Write-Host "     npm run api:dev`n" -ForegroundColor Yellow

Write-Host "  2. Em outro PowerShell/CMD, inicie a web:" -ForegroundColor White
Write-Host "     cd apps\web`n     npm run dev`n" -ForegroundColor Yellow

Write-Host "  3. Abra no navegador:" -ForegroundColor White
Write-Host "     http://localhost:5174`n" -ForegroundColor Yellow

Write-Host "  4. Faça login com:" -ForegroundColor White
Write-Host "     Email: admin@nuvita.local" -ForegroundColor Yellow
Write-Host "     Senha: Admin@123456!`n" -ForegroundColor Yellow

Write-Status "📋 Para mais detalhes, leia: scripts/SEED_README.md" "Info"
Write-Host ""

# Prompt para manter a janela aberta
Read-Host "`nPressione ENTER para fechar"
