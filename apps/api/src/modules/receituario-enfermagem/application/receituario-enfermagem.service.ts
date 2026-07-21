import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { resolveTenantClinicaId } from '../../../common/tenancy/resolve-clinica-id';
import { RECEITUARIO_ENFERMAGEM_REPOSITORY } from '../receituario-enfermagem.constants';
import { ReceituarioEnfermagem } from '../domain/receituario-enfermagem.entity';
import { ReceituarioEnfermagemRepository } from './ports/receituario-enfermagem.repository';
import { CreateReceituarioEnfermagemDto } from './dto/create-receituario-enfermagem.dto';

@Injectable()
export class ReceituarioEnfermagemService {
  constructor(
    @Inject(RECEITUARIO_ENFERMAGEM_REPOSITORY) private readonly repo: ReceituarioEnfermagemRepository,
  ) {}

  create(dto: CreateReceituarioEnfermagemDto, user: AuthTokenPayload): Promise<ReceituarioEnfermagem> {
    const clinicaId = resolveTenantClinicaId(user, dto.clinicaId);
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      feridaId: dto.feridaId,
      enfermeiroId: user.sub,
      itens: dto.itens,
      observacoes: dto.observacoes,
    });
  }

  async findById(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<ReceituarioEnfermagem> {
    const receituario = await this.repo.findById(resolveTenantClinicaId(user, clinicaId), id);
    if (!receituario) throw new NotFoundException('Receituario nao encontrado.');
    return receituario;
  }

  listByPaciente(
    pacienteId: string,
    clinicaId: string | undefined,
    user: AuthTokenPayload,
  ): Promise<ReceituarioEnfermagem[]> {
    return this.repo.listByPaciente(resolveTenantClinicaId(user, clinicaId), pacienteId);
  }
}
