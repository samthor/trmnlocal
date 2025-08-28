import type * as http from 'node:http';

export const log = (...rest: any[]) => console.info(new Date().toISOString(), ...rest);

export const write = async (
  res: http.ServerResponse,
  bytes: Uint8Array | string,
  contentType: string,
) => {
  if (typeof bytes === 'string') {
    bytes = new TextEncoder().encode(bytes);
  }

  res.setHeader('Content-Length', bytes.length);
  res.setHeader('Content-Type', contentType);
  await new Promise<void>((r, reject) => {
    res.addListener('error', reject);
    res.write(bytes, () => r());
  });
};

export const getHeader = (
  header: http.IncomingHttpHeaders,
  name: string,
  defaultValue: string,
): string => {
  const o = header[name.toLowerCase()];

  if (Array.isArray(o)) {
    return o?.[0] ?? defaultValue;
  }
  return o ?? defaultValue;
};
