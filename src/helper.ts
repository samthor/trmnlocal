import type * as http from 'node:http';
import puppeteer from 'puppeteer';
import * as png from 'fast-png';
import { timeout } from 'thorish';

export const log = (...rest: any[]) => console.info(new Date().toISOString(), ...rest);

/**
 * Writes bytes to the {@link http.ServerResponse}.
 */
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

/**
 * Retrieves the single header, or returns the default value (blank if unspecified).
 */
export const getHeader = (
  header: http.IncomingHttpHeaders,
  name: string,
  defaultValue: string = '',
): string => {
  const o = header[name.toLowerCase()];

  if (Array.isArray(o)) {
    return o?.[0] ?? defaultValue;
  }
  return o ?? defaultValue;
};

export type RotateOption = 0 | 90 | 180 | 270;

export type RenderArg = {
  url: string | URL;
  width: number;
  height: number;
  rotate?: RotateOption;
};

export async function internalRender(arg: RenderArg) {
  let mapPos = (pos: { x: number; y: number }): { x: number; y: number } => pos;
  const renderSize = { width: arg.width, height: arg.height };

  switch (arg.rotate) {
    case 90:
      renderSize.width = arg.height;
      renderSize.height = arg.width;
      mapPos = (pos) => ({ x: pos.y, y: arg.height - pos.x });
      break;

    case 180:
      mapPos = (pos) => ({ x: arg.width - pos.x, y: arg.height - pos.y });
      break;

    case 270:
      renderSize.width = arg.height;
      renderSize.height = arg.width;
      mapPos = (pos) => ({ x: arg.width - pos.y, y: pos.x });
      break;
  }

  // run, take screenshot, get png
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setViewport({ ...renderSize, deviceScaleFactor: 1 });
  await page.goto(arg.url.toString());
  await timeout(1000); // wait for page to settle

  const out = await page.screenshot();
  const raw = png.decode(out);

  // validate expectations
  if (raw.channels !== 3 || raw.depth !== 8) {
    throw new Error(`expected channels=3 (was ${raw.channels}), depth=8 (was ${raw.depth})`);
  }

  const grayscale = new Uint8Array(raw.data.length / 12); // 3 channels @ 8bit => 1 channel @ 2bit
  const pixels = raw.data.length / 3;
  for (let i = 0; i < pixels; ++i) {
    const source = raw.data.subarray(i * 3, i * 3 + 3); // 3 bytes

    // this formula is literally from Google's AI overview :melt:
    const gray = Math.floor(0.229 * source[0] + 0.587 * source[1] + 0.114 * source[2]);
    const average2 = Math.floor(gray / 64);
    if (average2 < 0 || average2 > 3) {
      throw new Error(`bad average=${average2} gray=${gray}`); // sanity check
    }

    const x = i % renderSize.width;
    const y = Math.floor(i / renderSize.width);
    const { x: destX, y: destY } = mapPos({ x, y });

    const destI = destY * arg.width + destX;
    const destIndex = destI >> 2;
    const destShift = (3 - (destI & 3)) * 2; // place on wrong side of byte

    grayscale[destIndex] |= average2 << destShift;
  }

  return png.encode({
    data: grayscale,
    width: arg.width,
    height: arg.height,
    channels: 1,
    depth: 2,
  });
}
