const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {    
    throw new Error(data.message || 'Erro na requisição');
  }
  return data;
}
