import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthThrottlerGuard } from './modules/auth/presentation/guards/auth-throttler.guard';
import { SecurityModule } from './common/security/security.module';
import { TenancyModule } from './common/tenancy/tenancy.module';
import { AppConfigService } from './common/security/config.service';
import { AgendamentosModule } from './modules/agendamentos/agendamentos.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ClinicasModule } from './modules/clinicas/clinicas.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { PacientesModule } from './modules/pacientes/pacientes.module';
import { ProntuariosModule } from './modules/prontuarios/prontuarios.module';
import { TelemedicinaModule } from './modules/telemedicina/telemedicina.module';
import { ProdutosModule } from './modules/produtos/produtos.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { ObservacoesPacienteModule } from './modules/observacoes-paciente/observacoes-paciente.module';
import { FeridasModule } from './modules/feridas/feridas.module';
import { ReceituarioEnfermagemModule } from './modules/receituario-enfermagem/receituario-enfermagem.module';
import { TermosConsentimentoModule } from './modules/termos-consentimento/termos-consentimento.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SecurityModule,
    TenancyModule,
    // Throttle global moderado por IP (guard registrado em providers abaixo):
    // 300 req/min segura scraping/enumeração em endpoints caros (analytics,
    // export, presign) sem atrapalhar uso normal atrás de NAT. Rotas com
    // perfil próprio ajustam com @Throttle() (auth aperta, sinalização da
    // telemedicina folga) ou @SkipThrottle() (health checks).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    MongooseModule.forRootAsync({
      imports: [SecurityModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: config.getConfig().mongodbUri,
      }),
    }),
    AuthModule,
    ClinicasModule,
    PacientesModule,
    ProntuariosModule,
    DocumentosModule,
    NotificacoesModule,
    AgendamentosModule,
    FinanceiroModule,
    TelemedicinaModule,
    AnalyticsModule,
    HealthModule,
    ProdutosModule,
    SuperAdminModule,
    ObservacoesPacienteModule,
    FeridasModule,
    ReceituarioEnfermagemModule,
    TermosConsentimentoModule,
  ],
  providers: [
    // AuthThrottlerGuard = ThrottlerGuard rastreando pelo X-Forwarded-For do
    // proxy confiável (atrás do Cloud Run, req.ip seria igual pra todo mundo).
    { provide: APP_GUARD, useClass: AuthThrottlerGuard },
  ],
})
export class AppModule {}
