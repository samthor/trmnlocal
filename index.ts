import * as http from 'node:http';
import puppeteer from 'puppeteer';
import * as png from 'fast-png';
import { matchUrl, trmnlApi } from './trmnl.ts';
import { log, write } from './helper.ts';
import * as thorish from 'thorish';

const server = http.createServer(async (req, res) => {
  try {
    let self = req.headers['x-forwarded-host'] || req.headers['host'];
    if (req.headers['forwarded']?.includes('proto=https')) {
      self = `https://${self}`;
    } else {
      self = `http://${self}`;
    }

    const u = new URL(self + req.url);
    log('req', { method: req.method, url: u.toString() }); // hooray spam

    // TRMNL API

    const trmnlReq = matchUrl(u.pathname);
    if (trmnlReq) {
      let body: any;
      if (req.method === 'POST') {
        body = await thorish.readableToJson(req);
      }

      const out = await trmnlApi({
        method: req.method || 'GET',
        body,
        req: trmnlReq,
        headers: req.headers,
        self,
      });

      if (out === undefined) {
        res.writeHead(204);
        return;
      }
      const json = JSON.stringify(out);
      await write(res, json, 'application/json');
      return;
    }

    // render 2bit image

    if (req.method === 'GET' && u.pathname === '/render') {
      const params = u.searchParams;
      const url = params.get('url') || 'https://samthor.au';

      const width = +(params.get('w') || 800);
      const height = +(params.get('h') || 480);

      log(`rendering ${u}`);
      const start = performance.now();
      const bytes = await render(url, { width, height });
      const duration = performance.now() - start;
      log(`done ${u}, ${bytes.length} bytes, ${duration.toFixed(2)}ms`);

      await write(res, bytes, 'image/png');
      return;
    }

    // 404

    log('bad req', { method: req.method, url: u.toString() }); // hooray spam
    res.writeHead(404);
  } catch (e) {
    console.warn('err', e);
    res.writeHead(500);
  } finally {
    res.end();
  }
});

async function render(u: string, args: { width: number; height: number }) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setViewport({ width: args.width, height: args.height, deviceScaleFactor: 1 });
  await page.goto(u);

  const out = await page.screenshot();
  const raw = png.decode(out);

  if (raw.channels !== 3 || raw.depth !== 8) {
    throw new Error(`expected channels=3 (was ${raw.channels}), depth=8 (was ${raw.depth})`);
  }

  const grayscale = new Uint8Array(raw.data.length / 12); // 3 channels @ 8bit => 1 channel @ 2bit
  const pixels = raw.data.length / 3;

  for (let i = 0; i < pixels; ++i) {
    const source = raw.data.subarray(i * 3, i * 3 + 3); // 3 bytes

    const gray = Math.floor(0.229 * source[0] + 0.587 * source[1] + 0.114 * source[2]);
    const average2 = Math.floor(gray / 64);
    if (average2 < 0 || average2 > 3) {
      throw new Error(`bad average=${average2} gray=${gray}`);
    }

    const destIndex = i >> 2;
    const destShift = (3 - (i & 3)) * 2; // place on wrong side of byte

    grayscale[destIndex] |= average2 << destShift;
  }

  return png.encode({
    data: grayscale,
    width: args.width,
    height: args.height,
    channels: 1,
    depth: 2,
  });
}

const port = +(process.env.PORT || 8080);
log(`listening on :${port}...`);
server.listen(port);
