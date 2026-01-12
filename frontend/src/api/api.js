const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function api(path, options = {}) {
  console.log(API_URL);
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Erro na API');
  }

  return res.json();
}
