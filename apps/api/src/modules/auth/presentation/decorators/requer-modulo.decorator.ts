import { SetMetadata } from '@nestjs/common';
import { Modulo } from '../../../../../../../packages/shared/src/auth';

export const REQUER_MODULO_KEY = 'requerModulo';

/** Módulo que o usuário precisa ter habilitado (permissões efetivas) para acessar o controller/rota. */
export const RequerModulo = (modulo: Modulo) => SetMetadata(REQUER_MODULO_KEY, modulo);
