import fs from 'node:fs';
import path from 'node:path';

export interface OrderTemplate {
  id: string;
  sections: any[];
}

const templatesDir = process.env.TEMPLATES_DIR || path.resolve(__dirname, '../../../orders-templates');

export function loadTemplates(): OrderTemplate[] {
  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith('.json'));
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(templatesDir, f), 'utf8')));
}
