const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const { createApp } = require('./app');
const PORT = process.env.PORT || 3000;

if (
  !process.env.AUTH_TOKEN_SECRET
  || Buffer.byteLength(process.env.AUTH_TOKEN_SECRET, 'utf8') < 32
) {
  throw new Error('Configure AUTH_TOKEN_SECRET com pelo menos 32 bytes.');
}

const app = createApp();

app.listen(PORT, () => {
  console.log(`Servidor em execução em http://localhost:${PORT}`);
});
