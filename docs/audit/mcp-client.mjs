import fs from 'node:fs/promises';
import readline from 'node:readline/promises';

// Local audit driver for the actual Playwright MCP server. The shared browser
// context preserves the page across separate command invocations.
let session;
let nextId = 1;
async function request(method, params, notification = false) {
  const response = await fetch('http://localhost:8931/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(session ? { 'Mcp-Session-Id': session } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', ...(!notification ? { id: nextId++ } : {}), method, params }),
    signal: AbortSignal.timeout(60000),
  });
  session = response.headers.get('mcp-session-id') ?? session;
  const body = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${body}`);
  if (!body) return;
  const messages = response.headers.get('content-type')?.includes('text/event-stream')
    ? body.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)))
    : [JSON.parse(body)];
  const message = messages.find(item => item.id !== undefined);
  if (message?.error) throw new Error(JSON.stringify(message.error));
  return message?.result;
}

await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'rhythmmania-audit', version: '1.0.0' } });
await request('notifications/initialized', {}, true);
async function run(input, outputPath) {
  const result = await request(input.method ?? 'tools/call', input.params ?? input);
  if (outputPath) await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
  for (const item of result?.content ?? []) {
    if (item.type === 'text') console.log(item.text);
  }
  if (!result?.content) console.log(JSON.stringify(result, null, 2));
  if (result?.isError) console.error('MCP tool returned an error.');
}
if (process.argv[2] === '--interactive') {
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('MCP ready');
  for await (const line of input) {
    if (!line.trim()) continue;
    try { await run(JSON.parse(line)); } catch (error) { console.error(error); }
  }
} else {
  await run(JSON.parse(await fs.readFile(process.argv[2], 'utf8')), process.argv[3]);
}
