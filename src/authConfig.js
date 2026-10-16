// Per-app authorization requires explicit requested scopes. Auth0 RBAC still
// restricts the resulting permissions to those assigned to the signed-in user.
export function loginParameters(audience, origin) {
  return {
    audience,
    redirect_uri: origin,
    scope: 'openid profile email manage:oferta manage:historicos manage:matriculas manage:processamento',
  };
}
