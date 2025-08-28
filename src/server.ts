import { internalRender, log, type RotateOption, write, type RenderArg } from './helper.ts';
import * as http from 'node:http';
import { buildTrmnlApi, matchUrl } from './trmnl.ts';
import { readableToJson } from 'thorish';
import { hash } from 'node:crypto';

export type ServerArg = {
  url: string;
  refreshRate: number;
  rotate: RotateOption;
};

export function createServer(serverArg: ServerArg) {
  const imageCache = new Map<string, Uint8Array>();

  const render = async (arg: RenderArg) => {
    log(`rendering`, arg.url.toString(), 'at', {
      width: arg.width,
      height: arg.height,
      rotate: arg.rotate,
    });
    const start = performance.now();

    const bytes = await internalRender(arg);
    const duration = performance.now() - start;
    log(`done`, arg.url.toString(), `- ${bytes.length}b, ${duration.toFixed(2)}ms`);

    const h = hash('sha256', bytes); // TODO: shorter hash?
    imageCache.set(h, bytes); // FIXME: expire cache!
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

      const id = await render({ url: serverArg.url, width, height, rotate });
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
