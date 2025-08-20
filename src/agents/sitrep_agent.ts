import { promises as fs } from 'fs';
import path from 'path';

const INCIDENT_DIR = path.resolve('data/incident');
const SOP_PATH = path.resolve('data/sop/refs/current_ops.md');
const PROMPT_PATH = path.resolve('prompts/sitrep_prompt.md');
const REPORT_DIR = path.resolve('data/reports/sitreps');
const TASK_LOG = path.resolve('public/mock/agent_tasks.json');

interface ContextBundle {
  incidents: any[];
  summary: string;
  sopText: string;
}

async function loadIncidents(): Promise<any[]> {
  const files = await fs.readdir(INCIDENT_DIR);
  const stats = await Promise.all(
    files.map(async (f) => {
      const full = path.join(INCIDENT_DIR, f);
      const stat = await fs.stat(full);
      return { file: f, mtime: stat.mtimeMs };
    })
  );
  stats.sort((a, b) => b.mtime - a.mtime);
  const selected = stats.slice(0, 5);
  const incidents = await Promise.all(
    selected.map(async ({ file }) => {
      const content = await fs.readFile(path.join(INCIDENT_DIR, file), 'utf8');
      return JSON.parse(content);
    })
  );
  return incidents;
}

async function loadSop(): Promise<string> {
  try {
    return await fs.readFile(SOP_PATH, 'utf8');
  } catch {
    return '';
  }
}

function buildContext(incidents: any[], sopText: string): ContextBundle {
  return {
    incidents,
    summary: `Loaded ${incidents.length} incidents`,
    sopText,
  };
}

async function buildPrompt(ctx: ContextBundle): Promise<string> {
  const template = await fs.readFile(PROMPT_PATH, 'utf8');
  return template
    .replace('{{incident_json_summary}}', JSON.stringify(ctx.incidents, null, 2))
    .replace('{{sop_guidance}}', ctx.sopText)
    .replace('{{datetime}}', new Date().toISOString());
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.warn('Claude API key not set. Returning placeholder text.');
    return '# SITREP\n\nNo API key provided.';
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-opus-20240229',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const content = Array.isArray(data.content)
    ? data.content.map((c: any) => c.text || '').join('\n')
    : data.completion || '';
  return content;
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function saveReport(markdown: string): Promise<string> {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const name = `SITREP_${formatTimestamp(new Date())}.md`;
  const full = path.join(REPORT_DIR, name);
  await fs.writeFile(full, markdown, 'utf8');
  return full;
}

async function logTask(outputFile: string): Promise<void> {
  await fs.mkdir(path.dirname(TASK_LOG), { recursive: true });
  let log: any[] = [];
  try {
    log = JSON.parse(await fs.readFile(TASK_LOG, 'utf8'));
  } catch {
    log = [];
  }
  log.push({
    agent: 'sitrep_agent',
    task: 'Generated SITREP from 5 incident logs',
    timestamp: new Date().toISOString(),
    output_file: outputFile.replace(/^.*data\//, ''),
  });
  await fs.writeFile(TASK_LOG, JSON.stringify(log, null, 2));
}

export async function main(): Promise<void> {
  try {
    const incidents = await loadIncidents();
    const sop = await loadSop();
    const ctx = buildContext(incidents, sop);
    const prompt = await buildPrompt(ctx);
    const report = await callClaude(prompt);
    const file = await saveReport(report);
    await logTask(file);
    console.log(`SITREP saved to ${file}`);
  } catch (err) {
    console.error('Failed to generate SITREP', err);
    await logTask('ERROR');
  }
}

if (require.main === module) {
  main();
}
