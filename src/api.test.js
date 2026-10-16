import { describe, it, expect, vi } from 'vitest';
import { createApi } from './api';

describe('API autenticada', () => {
  it('envia access token e corpo sem identidade escolhida pelo aluno', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 202, json: async () => ({ id: 's' }) });
    const api = createApi(async () => 'access-token', fetcher);
    expect(await api('solicitacoes', '/matriculas', { method: 'POST', body: { turma_id: 't' } })).toEqual({ id: 's' });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('/api/solicitacoes/matriculas');
    expect(options.headers.Authorization).toBe('Bearer access-token');
    expect(JSON.parse(options.body)).toEqual({ turma_id: 't' });
  });
  it('mostra erro compreensível para autorização insuficiente', async () => {
    const api = createApi(async () => 'token', async () => ({ ok: false, status: 403, json: async () => ({ detail: 'Permissao insuficiente' }) }));
    await expect(api('disciplinas', '/turmas')).rejects.toThrow('Permissao insuficiente');
  });
  it('não transforma erro de validação em objeto exibido ao usuário', async () => {
    const api = createApi(async () => 'token', async () => ({ ok: false, status: 422, json: async () => ({ detail: [{ msg: 'Field required', loc: ['body', 'nome'] }] }) }));
    await expect(api('disciplinas', '/disciplinas')).rejects.toThrow('nome: Field required');
  });
  it('interrompe chamada quando a sessão expirou', async () => {
    const fetcher = vi.fn();
    const api = createApi(async () => { throw new Error('login_required'); }, fetcher);
    await expect(api('disciplinas', '/turmas')).rejects.toThrow('login_required');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
