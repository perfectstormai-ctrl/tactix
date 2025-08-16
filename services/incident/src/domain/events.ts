export type IncidentCreated = {
  type: 'IncidentCreated';
  data: { title: string; description: string; org: string };
};

export type IncidentUpdated = {
  type: 'IncidentUpdated';
  data: { title?: string; description?: string };
};

export type IncidentSubmitted = {
  type: 'IncidentSubmitted';
  data: {};
};

export type MessageAdded = {
  type: 'MessageAdded';
  data: { message: string };
};

export type IncidentEvent =
  | IncidentCreated
  | IncidentUpdated
  | IncidentSubmitted
  | MessageAdded;
