import { parsePayload } from "./session";
import type { L10Session, L10Status } from "./types";

export interface L10SessionRow {
  id: string;
  title: string;
  scheduledAt: Date;
  location: string;
  status: string;
  rating: number | null;
  payload: string;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeSession(row: L10SessionRow): L10Session {
  const payload = parsePayload(row.payload);
  return {
    id: row.id,
    title: row.title,
    scheduledAt: row.scheduledAt.toISOString(),
    location: row.location,
    status: row.status as L10Status,
    rating: row.rating,
    ...payload,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
