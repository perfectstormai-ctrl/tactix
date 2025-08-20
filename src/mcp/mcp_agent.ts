import fs from 'fs/promises';
import path from 'path';
import { dispatchTask } from './dispatcher';

const TASK_QUEUE_DIR = './tasks/queue';
const ARCHIVE_DIR = './tasks/archive';
const TASK_LOG_PATH = './logs/mcp_tasks.json';

async function ensureDirectories() {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  await fs.mkdir(path.dirname(TASK_LOG_PATH), { recursive: true });
}

async function archiveTask(fileName: string) {
  await fs.rename(
    path.join(TASK_QUEUE_DIR, fileName),
    path.join(ARCHIVE_DIR, fileName)
  );
}

async function logTaskResult(log: any) {
  let logs: any[] = [];

  try {
    const raw = await fs.readFile(TASK_LOG_PATH, 'utf-8');
    logs = JSON.parse(raw);
  } catch {
    logs = [];
  }

  logs.push(log);
  await fs.writeFile(TASK_LOG_PATH, JSON.stringify(logs, null, 2));
}

async function processTask(fileName: string) {
  const fullPath = path.join(TASK_QUEUE_DIR, fileName);
  try {
    const raw = await fs.readFile(fullPath, 'utf-8');
    const task = JSON.parse(raw);

    if (!task.task_id || !task.type || !task.context) {
      throw new Error('Missing required task fields');
    }

    const result = await dispatchTask(task);

    await logTaskResult({
      task_id: task.task_id,
      type: task.type,
      status: 'success',
      timestamp: new Date().toISOString(),
      output: result.output_path || null
    });
  } catch (err: any) {
    console.error(`[MCP] Error processing task ${fileName}: ${err.message}`);
    await logTaskResult({
      task_id: fileName,
      type: 'unknown',
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  } finally {
    await archiveTask(fileName);
  }
}

async function main() {
  console.log('[MCP] Starting agent...');
  await ensureDirectories();

  const files = await fs.readdir(TASK_QUEUE_DIR);
  for (const file of files.filter(f => f.endsWith('.json'))) {
    await processTask(file);
  }

  console.log('[MCP] All tasks processed.');
}

main();
