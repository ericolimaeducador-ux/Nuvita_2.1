import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PacientesModule } from '../pacientes/pacientes.module';
import { AvaliacaoFeridaService } from './application/avaliacao-ferida.service';
import { FeridasService } from './application/feridas.service';
import { AvaliacaoFeridaMongoRepository } from './infrastructure/mongo/avaliacao-ferida-mongo.repository';
import { AvaliacaoFeridaMongo, AvaliacaoFeridaSchema } from './infrastructure/mongo/avaliacao-ferida.schema';
import { FeridaMongoRepository } from './infrastructure/mongo/ferida-mongo.repository';
import { FeridaMongo, FeridaSchema } from './infrastructure/mongo/ferida.schema';
import { AVALIACAO_FERIDA_REPOSITORY, FERIDA_REPOSITORY } from './feridas.constants';
import { AvaliacaoFeridaController } from './presentation/avaliacao-ferida.controller';
import { FeridasController } from './presentation/feridas.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeridaMongo.name, schema: FeridaSchema },
      { name: AvaliacaoFeridaMongo.name, schema: AvaliacaoFeridaSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
    NotificacoesModule,
    PacientesModule,
  ],
  controllers: [FeridasController, AvaliacaoFeridaController],
  providers: [
    FeridasService,
    AvaliacaoFeridaService,
    JwtAuthGuard,
    RolesGuard,
    { provide: FERIDA_REPOSITORY, useClass: FeridaMongoRepository },
    { provide: AVALIACAO_FERIDA_REPOSITORY, useClass: AvaliacaoFeridaMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [FeridasService, AvaliacaoFeridaService],
})
export class FeridasModule {}
