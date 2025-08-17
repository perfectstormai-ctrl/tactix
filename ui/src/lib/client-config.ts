export async function savePinnedServer(server) {
  await fetch('/client-config', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ server }),
  });
}

export async function getPinnedServer() {
  try {
    const res = await fetch('/client-config');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
