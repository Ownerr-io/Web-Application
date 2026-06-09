export function handleSyncWorkerHttpRequest(input: {
  path: string;
  method: string;
  authorization?: string;
  body: string;
  origin?: string;
}): Promise<{
  status: number;
  headers: Record<string, string>;
  body: string;
}>;
