import { randomUUID } from 'crypto';
import { IncidentEvent } from '../domain/events.js';

export interface EventStore {
  append(incidentId: string, event: IncidentEvent): Promise<void>;
  load(incidentId: string): Promise<IncidentEvent[]>;
}

export class InMemoryEventStore implements EventStore {
  private events = new Map<string, IncidentEvent[]>();

  async append(incidentId: string, event: IncidentEvent): Promise<void> {
    const arr = this.events.get(incidentId) || [];
    arr.push(event);
    this.events.set(incidentId, arr);
  }

  async load(incidentId: string): Promise<IncidentEvent[]> {
    return this.events.get(incidentId) ?? [];
  }
}

export class PgEventStore implements EventStore {
  constructor(private pool: any) {}

  async append(incidentId: string, event: IncidentEvent): Promise<void> {
    await this.pool.query(
      'INSERT INTO incidents_events (id, incident_id, type, payload, timestamp) VALUES ($1,$2,$3,$4,$5)',
      [randomUUID(), incidentId, event.type, event.data, new Date()]
    );
  }

  async load(incidentId: string): Promise<IncidentEvent[]> {
    const res = await this.pool.query(
      'SELECT type, payload FROM incidents_events WHERE incident_id=$1 ORDER BY timestamp ASC',
      [incidentId]
    );
    return res.rows.map((r: any) => ({ type: r.type, data: r.payload }));
  }
}
