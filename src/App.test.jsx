import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, it, expect, beforeEach } from 'vitest';
import App from './App';
const { auth } = vi.hoisted(() => ({ auth: { isLoading: false, isAuthenticated: false, user: { name: 'Ana' }, loginWithRedirect: vi.fn(), logout: vi.fn(), getAccessTokenSilently: vi.fn(async () => 'token') } }));
vi.mock('@auth0/auth0-react', () => ({ useAuth0: () => auth }));
beforeEach(() => { auth.isAuthenticated = false; vi.clearAllMocks(); });
it('abre login sem mostrar administração para visitante', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Entrar no portal' }));
  expect(auth.loginWithRedirect).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Administração' })).not.toBeInTheDocument();
});
it('aluno vê catálogo vazio e não recebe área administrativa', async () => {
  auth.isAuthenticated = true;
  vi.stubGlobal('fetch', vi.fn(async url => ({ ok: true, status: 200, json: async () => url.endsWith('/session') ? { sub:'a', permissions:[] } : [] })));
  render(<App />);
  await waitFor(() => expect(screen.getByText('Nenhuma turma encontrada.')).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: 'Administração' })).not.toBeInTheDocument();
});
it('admin recebe navegação administrativa conforme permissões do backend', async () => {
  auth.isAuthenticated = true;
  vi.stubGlobal('fetch', vi.fn(async url => ({ ok: true, status: 200, json: async () => url.endsWith('/session') ? { sub:'a', permissions:['manage:oferta'] } : [] })));
  render(<App />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Administração' })).toBeInTheDocument());
});
