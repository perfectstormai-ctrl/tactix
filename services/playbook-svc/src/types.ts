export type Severity = 'info' | 'warning' | 'critical';
export interface PlaybookDef {
  id: string;
  name: string;
  summary?: string;
  defaultMessage?: string;
  defaultSeverity?: Severity;
}
