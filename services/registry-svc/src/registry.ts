import { z } from 'zod';

const entrySchema = z.object({
  serverId: z.string(),
  url: z.string().url(),
  fingerprint: z.string(),
  signedRecord: z.string()
});

export type RegistryEntry = z.infer<typeof entrySchema>;

const store = new Map<string, RegistryEntry>();

export function register(entry: RegistryEntry) {
  const data = entrySchema.parse(entry);
  store.set(data.serverId, data);
}

export function lookup(serverId: string): RegistryEntry | undefined {
  return store.get(serverId);
}
