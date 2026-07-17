import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Modulo, Papel, type AuthUser } from '@/types';

const mockUseAuth = vi.fn();
vi.mock('./AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithRoute(opts: { roles?: Papel[]; modulo?: Modulo }) {
  return render(
    <MemoryRouter initialEntries={['/protegido']}>
      <Routes>
        <Route path="/login" element={<div>Tela de login</div>} />
        <Route path="/" element={<div>Home</div>} />
        <Route element={<ProtectedRoute {...opts} />}>
          <Route path="/protegido" element={<div>Conteúdo protegido</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const usuarioBase: AuthUser = { id: 'u1', email: 'a@a.com', papel: Papel.ENFERMEIRO, clinicaId: 'c1' };

describe('ProtectedRoute', () => {
  it('redireciona para /login quando não há sessão (sem token)', () => {
    mockUseAuth.mockReturnValue({ user: null, token: null, permissoes: [] });
    renderWithRoute({});
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('redireciona para / quando o papel do usuário não está na lista permitida', () => {
    mockUseAuth.mockReturnValue({ user: usuarioBase, token: 'tok', permissoes: [] });
    renderWithRoute({ roles: [Papel.MEDICO] });
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('redireciona para / quando falta o módulo exigido nas permissões efetivas', () => {
    mockUseAuth.mockReturnValue({ user: usuarioBase, token: 'tok', permissoes: [Modulo.DASHBOARD] });
    renderWithRoute({ modulo: Modulo.FERIDAS });
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renderiza a rota quando autenticado, com papel e módulo corretos', () => {
    mockUseAuth.mockReturnValue({
      user: usuarioBase,
      token: 'tok',
      permissoes: [Modulo.FERIDAS],
    });
    renderWithRoute({ roles: [Papel.ENFERMEIRO], modulo: Modulo.FERIDAS });
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
  });
});
