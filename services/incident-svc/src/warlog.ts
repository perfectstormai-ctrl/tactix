declare const process: any;
declare function fetch(input: any, init?: any): Promise<any>;

export async function logWarlog(author: string, content: string) {
  const url = process.env.WARLOG_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ author, content })
    });
  } catch (_) {
    /* ignore */
  }
}
