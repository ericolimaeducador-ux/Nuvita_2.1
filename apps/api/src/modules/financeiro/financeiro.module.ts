import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
// O relatorio traduz produtoId em nome do produto — por isso o financeiro
// depende do catalogo (ProdutosModule exporta ProdutosService).
import { ProdutosModule } from '../produtos/produtos.module';
import { CadastrosFinanceirosService } from './application/cadastros.service';
import { FinanceiroService } from './application/financeiro.service';
import { RecorrenciasService } from './application/recorrencias.service';
import {
  INSTITUICAO_REPOSITORY,
  LANCAMENTO_REPOSITORY,
  RECORRENCIA_REPOSITORY,
  SERVICO_REPOSITORY,
} from './financeiro.constants';
import {
  InstituicaoMongoRepository,
  RecorrenciaMongoRepository,
  ServicoMongoRepository,
} from './infrastructure/mongo/cadastros-mongo.repository';
import { InstituicaoMongo, InstituicaoSchema } from './infrastructure/mongo/instituicao.schema';
import { LancamentoMongoRepository } from './infrastructure/mongo/lancamento-mongo.repository';
import { LancamentoMongo, LancamentoSchema } from './infrastructure/mongo/lancamento.schema';
import { RecorrenciaMongo, RecorrenciaSchema } from './infrastructure/mongo/recorrencia.schema';
import { ServicoMongo, ServicoSchema } from './infrastructure/mongo/servico.schema';
import { FinanceiroController } from './presentation/financeiro.controller';

@Module({
  imports: [
    ConfigModule,
    ProdutosModule,
    MongooseModule.forFeature([
      { name: LancamentoMongo.name, schema: LancamentoSchema },
      { name: ServicoMongo.name, schema: ServicoSchema },
      { name: InstituicaoMongo.name, schema: InstituicaoSchema },
      { name: RecorrenciaMongo.name, schema: RecorrenciaSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [FinanceiroController],
  providers: [
    FinanceiroService,
    CadastrosFinanceirosService,
    RecorrenciasService,
    JwtAuthGuard,
    RolesGuard,
    { provide: LANCAMENTO_REPOSITORY, useClass: LancamentoMongoRepository },
    { provide: SERVICO_REPOSITORY, useClass: ServicoMongoRepository },
    { provide: INSTITUICAO_REPOSITORY, useClass: InstituicaoMongoRepository },
    { provide: RECORRENCIA_REPOSITORY, useClass: RecorrenciaMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [FinanceiroService],
})
export class FinanceiroModule {}
