// Public Codeforces API calls. No passwords, API keys, or third-party proxies.
let queue = Promise.resolve();
let lastRequest = 0;

export function requestCodeforces(method, handle, from = 1) {
  const run = queue.then(async () => {
    const delay = Math.max(0, 2200 - (Date.now() - lastRequest));
    await new Promise(resolve => setTimeout(resolve, delay));
    lastRequest = Date.now();

    const parameters = method === 'user.info'
      ? { handles: handle }
      : { handle, from: String(from), count: '5000' };

    try {
      return await fetch(`https://codeforces.com/api/${method}?${new URLSearchParams(parameters)}`, {
        signal: AbortSignal.timeout(30000)
      });
    } catch {
      throw new Error('Could not reach Codeforces. Check your internet connection and try syncing again. Your saved progress is safe.');
    }
  });
  queue = run.then(() => {}, () => {});
  return run;
}

// Codeforces may block cross-origin access or require a logged-in session.
// In those cases the UI offers a link to the original submission.
export async function requestSource(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Source unavailable');
    const document = new DOMParser().parseFromString(await response.text(), 'text/html');
    const source = document.querySelector('#program-source-text');
    if (!source) throw new Error('Source unavailable');
    return source.textContent;
  } catch {
    throw new Error('Codeforces restricts source access from this website. Open the original submission to view the code; you may need to sign in on Codeforces.');
  }
}
