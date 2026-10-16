import { expect, it } from 'vitest';
import { loginParameters } from './authConfig';

it('solicita os escopos administrativos definidos para autorização por aplicação', () => {
  const params = loginParameters('https://matricula-api', 'http://localhost:5173');
  expect(params.audience).toBe('https://matricula-api');
  expect(params.redirect_uri).toBe('http://localhost:5173');
  expect(new Set(params.scope.split(' '))).toEqual(new Set([
    'openid', 'profile', 'email', 'manage:oferta', 'manage:historicos',
    'manage:matriculas', 'manage:processamento',
  ]));
});
