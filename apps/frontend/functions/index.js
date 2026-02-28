const { onRequest } = require('firebase-functions/v2/https');
const next = require('next');

const nextjsDistDir = './.next';

const nextjsApp = next({
  dev: false,
  conf: {
    distDir: nextjsDistDir,
  },
});

const nextjsHandle = nextjsApp.getRequestHandler();

exports.nextjsApp = onRequest(
  {
    region: 'us-central1',
    maxInstances: 10,
    memory: '1GiB',
  },
  async (req, res) => {
    await nextjsApp.prepare();
    return nextjsHandle(req, res);
  }
);
