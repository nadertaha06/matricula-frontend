export function createApi(getToken, fetcher = fetch) {
  return async (service, path, { method = 'GET', body, signal } = {}) => {
    const token = await getToken();
    const response = await fetcher(`/api/${service}${path}`, {
      method, signal,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.detail;
      const message = Array.isArray(detail)
        ? detail.map(item => `${item.loc?.slice(1).join('.') || 'Campo'}: ${item.msg}`).join('; ')
        : typeof detail === 'string' ? detail : 'Não foi possível concluir. Tente novamente.';
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return data;
  };
}
