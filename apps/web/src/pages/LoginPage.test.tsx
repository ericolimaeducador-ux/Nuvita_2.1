import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '@/auth/AuthContext';

const loginMock = vi.fn();
vi.mock('@/api/resources', () => ({
  authApi: { login: (...args: unknown[]) => loginMock(...args), logout: vi.fn() },
}));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Área logada</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('mostra erros de validação ao submeter o formulário vazio', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText('Informe o e-mail.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('faz login com credenciais válidas e navega para a área logada', async () => {
    loginMock.mockResolvedValueOnce({
      accessToken: 'token-fake',
      user: { id: 'u1', email: 'medico@clinica.com', papel: 'MEDICO', clinicaId: 'c1' },
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('E-mail'), 'medico@clinica.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-super-secreta');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('medico@clinica.com', 'senha-super-secreta', undefined));
    expect(await screen.findByText('Área logada')).toBeInTheDocument();
  });
});
