import { IncidentEvent, IncidentCreated, MessageAdded, IncidentSubmitted, IncidentUpdated } from './events.js';

export type IncidentStatus = 'Draft' | 'Submitted' | 'Closed';

export interface IncidentState {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  org: string;
  messages: string[];
}

export class Incident {
  private state: IncidentState;

  private constructor(state: IncidentState) {
    this.state = state;
  }

  static create(params: { id: string; title: string; description: string; org: string }): [Incident, IncidentEvent] {
    const event: IncidentCreated = {
      type: 'IncidentCreated',
      data: { title: params.title, description: params.description, org: params.org }
    };
    const incident = new Incident({
      id: params.id,
      title: '',
      description: '',
      status: 'Draft',
      org: params.org,
      messages: []
    });
    incident.apply(event);
    return [incident, event];
  }

  static from(id: string, events: IncidentEvent[]): Incident {
    const incident = new Incident({ id, title: '', description: '', status: 'Draft', org: '', messages: [] });
    for (const e of events) {
      incident.apply(e);
    }
    return incident;
  }

  addMessage(message: string): IncidentEvent {
    const event: MessageAdded = { type: 'MessageAdded', data: { message } };
    this.apply(event);
    return event;
  }

  submit(): IncidentEvent {
    if (this.state.status !== 'Draft') {
      throw new Error('Only draft incidents can be submitted');
    }
    const event: IncidentSubmitted = { type: 'IncidentSubmitted', data: {} };
    this.apply(event);
    return event;
  }

  update(fields: { title?: string; description?: string }): IncidentEvent {
    const event: IncidentUpdated = { type: 'IncidentUpdated', data: fields };
    this.apply(event);
    return event;
  }

  apply(event: IncidentEvent): void {
    switch (event.type) {
      case 'IncidentCreated':
        this.state.title = event.data.title;
        this.state.description = event.data.description;
        this.state.org = event.data.org;
        this.state.status = 'Draft';
        break;
      case 'IncidentUpdated':
        if (event.data.title !== undefined) this.state.title = event.data.title;
        if (event.data.description !== undefined) this.state.description = event.data.description;
        break;
      case 'IncidentSubmitted':
        this.state.status = 'Submitted';
        break;
      case 'MessageAdded':
        this.state.messages.push(event.data.message);
        break;
    }
  }

  toJSON(): IncidentState {
    return { ...this.state };
  }
}
