import { log, type RotateOption } from './helper.ts';
import { createServer } from './server.ts';
import { parseArgs } from 'node:util';

const REFRESH_SAFE_MIN = 10;

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: {
      type: 'boolean',
      short: 'h',
    },
    url: {
      type: 'string',
      short: 'u',
      default: 'https://samthor.au/trmnl-showy',
    },
    refreshRate: {
      type: 'string',
      short: 'r',
      default: '30',
    },
    rotate: {
      type: 'string',
      short: 'd',
      default: '0',
    },
  },
});

if (values.help) {
  process.stderr.write(
    `usage: ${process.argv[1]} -u <url> -r <refresh seconds> -d <rotate, 0/90/180/270>\n`,
  );
  process.exit(1);
}

const server = createServer({
  url: values.url,
  refreshRate: Math.max(REFRESH_SAFE_MIN, +values.refreshRate),
  rotate: +values.rotate as RotateOption,
});

const port = +(process.env.PORT || 8080);
log(`listening on :${port}...`);
server.listen(port);
