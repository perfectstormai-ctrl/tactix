export type ShiftInput = {
  userUpn: string;
  role: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
};

export type ShiftRow = {
  shiftId: string;
  operationId: string;
  userUpn: string;
  role: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};
