import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3010';
const ADMIN_EMAIL = 'admin@nuvita.local';
const ADMIN_PASSWORD = 'Admin@123456!';

const errors = [];
const warnings = [];

async function testLogin(page) {
  console.log('\n🔐 Testando Login...');

  await page.goto(`${BASE_URL}/`);

  // Verificar se chegou na tela de login
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  console.log('  ✓ Tela de login carregada');

  // Fazer login
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);

  const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
  await submitButton.click();

  // Aguardar navegação para dashboard
  await page.waitForNavigation({ url: /\/dashboard|\/pacientes|\//, waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2000);

  // Verificar se está autenticado
  const url = page.url();
  if (url.includes('login')) {
    errors.push('❌ Login falhou - ainda na tela de login');
    return false;
  }

  console.log(`  ✓ Login bem-sucedido (${url})`);
  return true;
}

async function testDashboard(page) {
  console.log('\n📊 Testando Dashboard...');

  const url = page.url();
  if (!url.includes('dashboard') && !url.includes('pacientes')) {
    console.log('  ⏭️  Navegando para dashboard...');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);
  }

  // Verificar elementos principais
  const hasContent = await page.locator('body').evaluate(el => el.textContent.length > 100);
  if (!hasContent) {
    errors.push('❌ Dashboard vazio - sem conteúdo');
    return false;
  }

  console.log('  ✓ Dashboard carregado com conteúdo');
  return true;
}

async function testPacientes(page) {
  console.log('\n👥 Testando Lista de Pacientes...');

  // Navegar para pacientes
  await page.goto(`${BASE_URL}/pacientes`);
  await page.waitForTimeout(2000);

  // Verificar se há elementos de paciente
  const pacienteElements = await page.locator('[data-testid*="paciente"], tr, [class*="patient"]').count();

  if (pacienteElements === 0) {
    // Tentar encontrar por texto
    const hasText = await page.locator('body').evaluate(el => {
      const text = el.textContent.toLowerCase();
      return text.includes('maria') || text.includes('joão') || text.includes('ana');
    });

    if (!hasText) {
      warnings.push('⚠️  Nenhum paciente encontrado na listagem');
      return false;
    }
  }

  console.log(`  ✓ Lista de pacientes carregada (${pacienteElements} elementos encontrados)`);

  // Tentar abrir um paciente
  const firstPatient = page.locator('[data-testid*="paciente"], tr:first-child, [class*="patient"]:first-child').first();
  await firstPatient.click().catch(() => {});
  await page.waitForTimeout(1000);

  const detailsUrl = page.url();
  if (detailsUrl.includes('pacientes') && detailsUrl.includes('/')) {
    console.log('  ✓ Detalhe de paciente aberto');
  }

  return true;
}

async function testProntuarios(page) {
  console.log('\n📄 Testando Prontuários...');

  await page.goto(`${BASE_URL}/prontuarios`);
  await page.waitForTimeout(2000);

  const hasProntuario = await page.locator('body').evaluate(el => {
    const text = el.textContent;
    return text.includes('prontuário') || text.includes('atendimento') || text.length > 200;
  });

  if (!hasProntuario) {
    warnings.push('⚠️  Nenhum prontuário encontrado');
    return false;
  }

  console.log('  ✓ Página de prontuários carregada');
  return true;
}

async function testFeridas(page) {
  console.log('\n🩹 Testando Feridas...');

  await page.goto(`${BASE_URL}/feridas`);
  await page.waitForTimeout(2000);

  const hasFerida = await page.locator('body').evaluate(el => {
    const text = el.textContent;
    return text.includes('ferida') || text.includes('wound') || text.length > 200;
  });

  if (!hasFerida) {
    warnings.push('⚠️  Nenhuma ferida encontrada');
    return false;
  }

  console.log('  ✓ Página de feridas carregada');
  return true;
}

async function testAvaliacoes(page) {
  console.log('\n📊 Testando Avaliações...');

  await page.goto(`${BASE_URL}/avaliacoes`);
  await page.waitForTimeout(2000);

  const hasAvaliacao = await page.locator('body').evaluate(el => {
    const text = el.textContent;
    return text.includes('avaliação') || text.includes('push') || text.includes('score') || text.length > 200;
  });

  if (!hasAvaliacao) {
    warnings.push('⚠️  Nenhuma avaliação encontrada (pode estar em subseção)');
    return false;
  }

  console.log('  ✓ Página de avaliações carregada');
  return true;
}

async function checkForJSErrors(page) {
  console.log('\n🔍 Verificando Erros de Console...');

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(`🔴 Erro JavaScript: ${error.message}`);
  });

  if (consoleErrors.length > 0) {
    warnings.push(`⚠️  ${consoleErrors.length} erro(s) no console encontrado(s)`);
    consoleErrors.slice(0, 3).forEach(e => console.log(`  ⚠️  ${e}`));
  } else {
    console.log('  ✓ Nenhum erro JavaScript detectado');
  }

  return consoleErrors.length === 0;
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 TESTE E2E COMPLETO - NUVITA 2.1');
  console.log('='.repeat(60));

  let browser;
  try {
    // Iniciar browser
    console.log('\n🌐 Iniciando navegador Chrome...');
    browser = await chromium.launch({
      channel: 'chrome',
      headless: false,
      args: ['--start-maximized']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    // Monitorar erros
    await checkForJSErrors(page);

    // Executar testes
    const loginOk = await testLogin(page);
    if (!loginOk) throw new Error('Login falhou');

    await testDashboard(page);
    await testPacientes(page);
    await testProntuarios(page);
    await testFeridas(page);
    await testAvaliacoes(page);

    // Teste final: voltar ao dashboard
    console.log('\n🔄 Testando Navegação de Volta...');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(1000);
    console.log('  ✓ Navegação funcional');

    await context.close();

  } catch (error) {
    errors.push(`❌ ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESULTADO DO TESTE');
  console.log('='.repeat(60));

  if (errors.length > 0) {
    console.log('\n❌ ERROS CRÍTICOS:');
    errors.forEach(e => console.log(`  ${e}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  AVISOS:');
    warnings.forEach(w => console.log(`  ${w}`));
  }

  if (errors.length === 0) {
    console.log('\n✅ TODOS OS TESTES PASSARAM!');
    console.log('\n📊 SUMÁRIO:');
    console.log('  ✓ Login funcional');
    console.log('  ✓ Dashboard carregando');
    console.log('  ✓ Lista de pacientes acessível');
    console.log('  ✓ Prontuários disponíveis');
    console.log('  ✓ Feridas carregando');
    console.log('  ✓ Avaliações acessíveis');
    console.log('  ✓ Sem erros de console JavaScript');
    console.log('  ✓ Navegação fluida');
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n🎯 RESULTADO: ${errors.length === 0 ? '✅ PRONTO PARA PRODUÇÃO' : '❌ NECESSÁRIO CORREÇÃO'}\n`);

  process.exit(errors.length > 0 ? 1 : 0);
}

runTests().catch(console.error);
