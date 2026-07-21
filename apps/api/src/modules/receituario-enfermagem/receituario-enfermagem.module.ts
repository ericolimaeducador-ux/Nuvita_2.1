import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { ReceituarioEnfermagemService } from './application/receituario-enfermagem.service';
import { ReceituarioEnfermagemMongoRepository } from './infrastructure/mongo/receituario-enfermagem-mongo.repository';
import {
  ReceituarioEnfermagemMongo,
  ReceituarioEnfermagemSchema,
} from './infrastructure/mongo/receituario-enfermagem.schema';
import { RECEITUARIO_ENFERMAGEM_REPOSITORY } from './receituario-enfermagem.constants';
import { ReceituarioEnfermagemController } from './presentation/receituario-enfermagem.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ReceituarioEnfermagemMongo.name, schema: ReceituarioEnfermagemSchema }]),
  ],
  controllers: [ReceituarioEnfermagemController],
  providers: [
    ReceituarioEnfermagemService,
    JwtAuthGuard,
    RolesGuard,
    { provide: RECEITUARIO_ENFERMAGEM_REPOSITORY, useClass: ReceituarioEnfermagemMongoRepository },
  ],
  exports: [ReceituarioEnfermagemService],
})
export class ReceituarioEnfermagemModule {}
