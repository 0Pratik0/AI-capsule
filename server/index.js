import { loadConfig } from './config.js';
import { openDatabase } from './db.js';
import { createApp } from './app.js';

let config;
try {
  config = loadConfig();
} catch (err) {
  console.error(`Startup failed: ${err.message}`);
  process.exit(1);
}

const db = openDatabase(config.dbPath);
const app = createApp(config, db);

app.listen(config.port, () => {
  console.log(`AI Capsule listening on port ${config.port}`);
});
