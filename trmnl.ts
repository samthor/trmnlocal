import type * as http from 'node:http';
import { getHeader, log } from './helper.ts';

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

export async function trmnlApi(arg: TrmnlArg) {
  switch (arg.req) {
    case 'setup':
      return {
        api_key: 'lolsecret',
        friendly_id: 'ABC123',
        image_url: arg.self + '/render',
        message: 'Welcome to blah blah',
      };

    case 'log':
      log('TRMNL log', JSON.stringify(arg.body, null, 2));
      return;

    case 'display': {
      const pageUrl = new URL('https://samthor.au/about'); // TODO: better URL
      const toCopy = ['id', 'rssi', 'battery-voltage', 'fw-version', 'model'];
      for (const header of toCopy) {
        pageUrl.searchParams.set(header, getHeader(arg.headers, header, ''));
      }

      const u = new URL(arg.self + '/render');
      u.searchParams.set('url', pageUrl.toString());
      u.searchParams.set('w', getHeader(arg.headers, 'width', '800'));
      u.searchParams.set('h', getHeader(arg.headers, 'height', '480'));

      // XXX filename used as cache key? --> render here, store png for later

      const now = +new Date();

      const out = {
        filename: `demo${now}.png`,
        // firmware_url: 'http://localhost:2443/assets/firmware/1.4.8.bin',
        image_url: u.toString(),
        image_url_timeout: 1000,
        refresh_rate: 15,
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
}
