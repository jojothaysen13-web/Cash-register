import { app } from './app';
import { env } from './config/env';

app.listen(env.port, () => {
  console.log(`Cash register backend läuft auf http://localhost:${env.port}`);
});
