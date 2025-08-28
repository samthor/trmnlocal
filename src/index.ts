import { REFRESH_SAFE_SECONDS } from './const.ts';
import { log, type RotateOption } from './helper.ts';
import { createServer } from './server.ts';
import { parseArgs } from 'node:util';

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
      default: 'https://samthor.au/trmnlocal',
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
    port: {
      type: 'string',
      short: 'p',
      default: process.env.PORT || '8080',
    },
  },
});

if (values.help) {
  process.stderr.write(
    `usage: ${process.argv[1]} -u <url> -r <refresh seconds> -d <rotate, 0/90/180/270> -p <port>\n`,
  );
  process.exit(1);
}

const arg = {
  url: values.url,
  refreshRate: Math.max(REFRESH_SAFE_SECONDS, +values.refreshRate),
  rotate: +values.rotate as RotateOption,
};
log('setup with', arg);

const server = createServer(arg);

const port = +values.port;
log(`listening on :${port}...`);
server.listen(port);
