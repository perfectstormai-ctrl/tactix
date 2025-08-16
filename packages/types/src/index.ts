export interface Incident {
  id: number;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  comments: string[];
  createdAt: Date;
}
