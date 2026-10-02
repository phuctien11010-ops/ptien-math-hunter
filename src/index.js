const http = require('http');
const { URL } = require('url');
const { ProblemStore } = require('./store');
const { MathProblemPipeline } = require('./pipeline');

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('INVALID_JSON'));
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload));
}

function createServer({ store = new ProblemStore(), pipeline = new MathProblemPipeline({ store }) } = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const { pathname } = url;

      if (req.method === 'GET' && pathname === '/health') {
        return sendJson(res, 200, { ok: true, service: 'ptien-math-hunter' });
      }

      if (req.method === 'GET' && pathname === '/problems') {
        const problems = await store.listProblems();
        return sendJson(res, 200, { problems });
      }

      if (req.method === 'POST' && pathname === '/problems') {
        const payload = await readJsonBody(req);
        const result = await pipeline.ingest(payload);
        return sendJson(res, 201, result);
      }

      if (req.method === 'POST' && pathname === '/review') {
        const payload = await readJsonBody(req);
        const review = await store.saveReview({
          problem_id: payload.problem_id,
          review_type: payload.review_type || 'GENERIC',
          reason: payload.reason || null,
          suggested_values_json: payload.suggested_values_json || {},
          status: 'PENDING',
        });
        return sendJson(res, 201, { review });
      }

      return sendJson(res, 404, { error: 'NOT_FOUND' });
    } catch (error) {
      const message = error?.message || 'INTERNAL_SERVER_ERROR';
      return sendJson(res, 400, { error: message });
    }
  });
}

const server = createServer();

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => {
    console.log(`ptien-math-hunter API listening on http://localhost:${port}`);
  });
}

module.exports = { createServer, server };
