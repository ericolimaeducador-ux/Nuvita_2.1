import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityModule } from '../../common/security/security.module';
import { FeridasModule } from '../feridas/feridas.module';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PlanoCuidadosAiService } from './application/plano-cuidados-ai.service';
import { PlanoCuidadosService } from './application/plano-cuidados.service';
import {
  CatalogoAcaoMongo,
  CatalogoAcaoSchema,
  CatalogoFenomenoMongo,
  CatalogoFenomenoSchema,
  CatalogoResultadoMongo,
  CatalogoResultadoSchema,
} from './infrastructure/mongo/catalogo.schema';
import { CatalogoMongoRepository } from './infrastructure/mongo/catalogo-mongo.repository';
import { PlanoCuidadosMongoRepository } from './infrastructure/mongo/plano-cuidados-mongo.repository';
import { PlanoCuidadosMongo, PlanoCuidadosSchema } from './infrastructure/mongo/plano-cuidados.schema';
import { CATALOGO_CLINICO_REPOSITORY, PLANO_CUIDADOS_REPOSITORY } from './plano-cuidados.constants';
import { PlanoCuidadosController } from './presentation/plano-cuidados.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlanoCuidadosMongo.name, schema: PlanoCuidadosSchema },
      { name: CatalogoFenomenoMongo.name, schema: CatalogoFenomenoSchema },
      { name: CatalogoAcaoMongo.name, schema: CatalogoAcaoSchema },
      { name: CatalogoResultadoMongo.name, schema: CatalogoResultadoSchema },
    ]),
    // AppConfigService — origem do PRONTUARIO_SIGNATURE_SECRET usado no HMAC.
    SecurityModule,
    // Leitura da avaliação de ferida para enriquecer o contexto clínico.
    // Dependência de mão única: plano lê de feridas, feridas não conhece plano.
    FeridasModule,
  ],
  controllers: [PlanoCuidadosController],
  providers: [
    PlanoCuidadosService,
    PlanoCuidadosAiService,
    JwtAuthGuard,
    RolesGuard,
    { provide: PLANO_CUIDADOS_REPOSITORY, useClass: PlanoCuidadosMongoRepository },
    { provide: CATALOGO_CLINICO_REPOSITORY, useClass: CatalogoMongoRepository },
  ],
  exports: [PlanoCuidadosService],
})
export class PlanoCuidadosModule {}
