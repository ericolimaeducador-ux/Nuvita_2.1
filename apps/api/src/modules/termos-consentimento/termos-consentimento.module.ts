import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { TermosConsentimentoService } from './application/termos-consentimento.service';
import { TermoConsentimentoMongoRepository } from './infrastructure/mongo/termo-consentimento-mongo.repository';
import {
  TermoConsentimentoMongo,
  TermoConsentimentoSchema,
} from './infrastructure/mongo/termo-consentimento.schema';
import { TERMO_CONSENTIMENTO_REPOSITORY } from './termos-consentimento.constants';
import { TermosConsentimentoController } from './presentation/termos-consentimento.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TermoConsentimentoMongo.name, schema: TermoConsentimentoSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [TermosConsentimentoController],
  providers: [
    TermosConsentimentoService,
    JwtAuthGuard,
    RolesGuard,
    { provide: TERMO_CONSENTIMENTO_REPOSITORY, useClass: TermoConsentimentoMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [TermosConsentimentoService],
})
export class TermosConsentimentoModule {}
