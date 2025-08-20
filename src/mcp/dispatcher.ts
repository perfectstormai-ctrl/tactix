import { handleSitrepTask } from '../handlers/sitrep';

export async function dispatchTask(task: any): Promise<{ output_path?: string }> {
  switch (task.type) {
    case 'generate_sitrep':
      return await handleSitrepTask(task);
    default:
      throw new Error(`Unsupported task type: ${task.type}`);
  }
}
