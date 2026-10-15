const test = require('node:test');
const assert = require('node:assert/strict');
const {GoogleAuth} = require('google-auth-library');
const {zoomBotRequest, ZoomBotError} = require('../lib/services/zoomBotService');

test('health reads use the IAM client, while other health routes/mutations are rejected', async () => {
  const original = GoogleAuth.prototype.getIdTokenClient;
  const paths = [];
  GoogleAuth.prototype.getIdTokenClient = async () => ({ request: async options => {
    paths.push(options.url);
    return { status: 200, data: { status: 'ok' } };
  } });
  try {
    await zoomBotRequest('GET', '/health/live');
    await zoomBotRequest('GET', '/health/ready');
    assert.deepEqual(paths, [
      'https://zoom-bot-api-722146628233.us-central1.run.app/health/live',
      'https://zoom-bot-api-722146628233.us-central1.run.app/health/ready',
    ]);
    for (const path of ['/health/private', '/health/live/extra', '/health/live?token=private']) {
      await assert.rejects(() => zoomBotRequest('GET', path),
        error => error instanceof ZoomBotError && error.code === 'INVALID_ROUTE');
    }
    await assert.rejects(() => zoomBotRequest('POST', '/health/live', {}, 'idempotency-key-123'),
      error => error.code === 'INVALID_ROUTE');
    assert.equal(paths.length, 2);
  } finally {
    GoogleAuth.prototype.getIdTokenClient = original;
  }
});
