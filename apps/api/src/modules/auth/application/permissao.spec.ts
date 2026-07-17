import { Papel } from '../../../../../../packages/shared/src/auth';
import {
  Modulo,
  PERMISSOES_PADRAO_POR_PAPEL,
  TODOS_MODULOS,
  resolvePermissoes,
  temPermissao,
} from '../../../../../../packages/shared/src/auth/permissao';

describe('resolvePermissoes', () => {
  it('SUPER_ADMIN sempre recebe todos os módulos, mesmo com revogações', () => {
    const permissoes = resolvePermissoes(Papel.SUPER_ADMIN, [], [Modulo.PACIENTES, Modulo.FINANCEIRO]);
    expect(permissoes).toEqual(TODOS_MODULOS);
  });

  it('sem exceções, retorna exatamente o conjunto padrão do papel', () => {
    const permissoes = resolvePermissoes(Papel.ENFERMEIRO);
    expect(new Set(permissoes)).toEqual(new Set(PERMISSOES_PADRAO_POR_PAPEL[Papel.ENFERMEIRO]));
  });

  it('concessão individual adiciona um módulo fora do padrão do papel', () => {
    // SECRETARIA não tem FERIDAS por padrão (concessão individual é o caminho documentado para isso)
    expect(PERMISSOES_PADRAO_POR_PAPEL[Papel.SECRETARIA]).not.toContain(Modulo.FERIDAS);
    const permissoes = resolvePermissoes(Papel.SECRETARIA, [Modulo.FERIDAS]);
    expect(permissoes).toContain(Modulo.FERIDAS);
  });

  it('revogação individual remove um módulo do padrão do papel', () => {
    expect(PERMISSOES_PADRAO_POR_PAPEL[Papel.ENFERMEIRO]).toContain(Modulo.FERIDAS);
    const permissoes = resolvePermissoes(Papel.ENFERMEIRO, [], [Modulo.FERIDAS]);
    expect(permissoes).not.toContain(Modulo.FERIDAS);
  });

  it('quando o mesmo módulo está concedido e revogado, a revogação prevalece', () => {
    const permissoes = resolvePermissoes(Papel.SECRETARIA, [Modulo.FERIDAS], [Modulo.FERIDAS]);
    expect(permissoes).not.toContain(Modulo.FERIDAS);
  });

  it('a ordem do resultado segue sempre TODOS_MODULOS, não a ordem das exceções', () => {
    const permissoes = resolvePermissoes(Papel.SECRETARIA, [Modulo.FERIDAS]);
    const indices = permissoes.map((m) => TODOS_MODULOS.indexOf(m));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });
});

describe('temPermissao', () => {
  it('retorna true quando o módulo está na lista', () => {
    expect(temPermissao([Modulo.PACIENTES, Modulo.FERIDAS], Modulo.FERIDAS)).toBe(true);
  });

  it('retorna false quando o módulo não está na lista', () => {
    expect(temPermissao([Modulo.PACIENTES], Modulo.FERIDAS)).toBe(false);
  });

  it('retorna false com segurança quando a lista de permissões é undefined (sessão antiga)', () => {
    expect(temPermissao(undefined, Modulo.FERIDAS)).toBe(false);
  });
});
