import { log } from './helper.ts';
import { createServer } from './server.ts';

const URL_TO_USE = 'https://samthor.au';
const REFRESH_EVERY_SECONDS = 15;

const server = createServer({ url: URL_TO_USE, refreshRate: REFRESH_EVERY_SECONDS });

const port = +(process.env.PORT || 8080);
log(`listening on :${port}...`);
server.listen(port);
