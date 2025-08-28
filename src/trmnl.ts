import type * as http from 'node:http';
import { getHeader, log, type RotateOption, type RenderArg } from './helper.ts';

export type TrmnlArg = {
  method: string;
  body: any;
  req: string;
  headers: http.IncomingHttpHeaders;
  self: string;
};

export function matchUrl(url: string | undefined): string | undefined {
  if (!url?.startsWith('/api/')) {
    return;
  }
  const parts = url.split('/');
  return parts[2] || undefined;
}

export type BuildArg = {
  render: (arg: RenderArg) => Promise<string>;
  imageUrl: (self: string, id: string) => string;
  url: string;
  refreshRate: number;
  rotate: RotateOption;
};

export function buildTrmnlApi(buildArg: BuildArg): (arg: TrmnlArg) => Promise<any> {
  const render = async (arg: TrmnlArg) => {
    const pageUrl = new URL(buildArg.url);
    const toCopy = ['id', 'rssi', 'battery-voltage', 'fw-version', 'model'];
    for (const header of toCopy) {
      pageUrl.searchParams.set(header, getHeader(arg.headers, header, ''));
    }

    const width = +getHeader(arg.headers, 'width', '800');
    const height = +getHeader(arg.headers, 'height', '480');

    const id = await buildArg.render({ url: pageUrl, width, height, rotate: buildArg.rotate });
    return id;
  };

  return async (arg: TrmnlArg) => {
    switch (arg.req) {
      case 'setup': {
        const id = await render(arg);
        return {
          api_key: 'lolsecret',
          friendly_id: 'ABC123',
          image_url: buildArg.imageUrl(arg.self, id),
          message: 'Welcome to TRMNL snapper!',
        };
      }

      case 'log':
        log('TRMNL log', JSON.stringify(arg.body, null, 2));
        return;

      case 'display': {
        const id = await render(arg);
        const out = {
          filename: `demo${id}.png`,
          // firmware_url: 'http://localhost:2443/assets/firmware/1.4.8.bin',
          image_url: buildArg.imageUrl(arg.self, id),
          image_url_timeout: 1000,
          refresh_rate: buildArg.refreshRate,
          reset_firmware: false,
          special_function: '', // possibly controls refresh_rate
          update_firmware: false,
        };
        console.info('display returning', out);

        return out;
      }

      default:
        throw new Error(`unknown TRMNL API call: ${arg.req}`);
    }
  };
}
