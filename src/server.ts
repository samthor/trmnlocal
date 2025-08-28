import { internalRender, log, type RotateOption, write, type RenderArg } from './helper.ts';
import * as http from 'node:http';
import { buildTrmnlApi, matchUrl } from './trmnl.ts';
import { readableToJson } from 'thorish';
import { hash } from 'node:crypto';
import { TimeoutCache } from './cache.ts';
import { IMAGE_CACHE_SECONDS } from './const.ts';

export type ServerArg = {
  url: string;
  refreshRate: number;
  rotate: RotateOption;
  bits: 1 | 2;
};

export function createServer(serverArg: ServerArg) {
  const imageCache = new TimeoutCache<string, Uint8Array>();

  const render = async (arg: RenderArg) => {
    log(`rendering`, arg.url.toString(), 'at', {
      width: arg.width,
      height: arg.height,
      rotate: arg.rotate,
      bits: arg.bits,
    });
    const start = performance.now();

    const bytes = await internalRender(arg);
    const duration = performance.now() - start;
    log(`done`, arg.url.toString(), `- ${bytes.length}b, ${duration.toFixed(2)}ms`);

    const h = hash('md5', bytes, 'base64url');
    imageCache.set(h, bytes, IMAGE_CACHE_SECONDS * 1000);
    return h;
  };

  const trmnlApi = buildTrmnlApi({
    render,
    imageUrl(self, id) {
      return `${self}/image/${id}`;
    },
    ...serverArg,
  });

  const serverHandler = async (u: URL, req: http.IncomingMessage, res: http.ServerResponse) => {
    // TRMNL API

    const trmnlReq = matchUrl(u.pathname);
    if (trmnlReq) {
      let body: any;
      if (req.method === 'POST') {
        body = await readableToJson(req);
      }

      const out = await trmnlApi({
        method: req.method || 'GET',
        body,
        req: trmnlReq,
        headers: req.headers,
        self: u.origin,
      });

      if (out === undefined) {
        res.writeHead(204);
        return;
      }
      const json = JSON.stringify(out);
      await write(res, json, 'application/json');
      return;
    }

    // serve prior rendered images

    if (req.method === 'GET' && u.pathname.startsWith('/image/')) {
      const id = u.pathname.split('/')[2];

      const bytes = imageCache.get(id);
      if (bytes === undefined) {
        log(`got bad cached image`, { id });
        res.writeHead(404);
        return;
      }

      log(`serving cached image`, { id });
      await write(res, bytes, 'image/png');
      return;
    }

    // render 2bit image just for testing

    if (req.method === 'GET' && u.pathname === '/render') {
      const params = u.searchParams;
      const width = +(params.get('w') || 800);
      const height = +(params.get('h') || 480);
      const rotate = +(params.get('r') || serverArg.rotate || 0) as RotateOption;
      const bits = +(params.get('b') || 2) as 1 | 2;

      const id = await render({ url: serverArg.url, width, height, rotate, bits });
      const bytes = imageCache.get(id)!;

      // don't cache for testing
      res.setHeader('Cache-Control', 'no-store');

      await write(res, bytes, 'image/png');
      return;
    }

    // 404

    log('bad req', { method: req.method, url: u.toString() }); // hooray spam
    res.writeHead(404);
  };

  return http.createServer(async (req, res) => {
    try {
      let self = req.headers['x-forwarded-host'] || req.headers['host'];
      if (req.headers['forwarded']?.includes('proto=https')) {
        self = `https://${self}`;
      } else {
        self = `http://${self}`;
      }

      const u = new URL(self + req.url);
      log('req', { method: req.method, url: u.toString() }); // hooray spam
      await serverHandler(u, req, res);
    } catch (e) {
      console.warn('err', e);
      res.writeHead(500);
    } finally {
      res.end();
    }
  });
}
