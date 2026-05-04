const http = require('http');
const axios = require('axios');
const app = require('../src/app');

async function run() {
  const server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => resolve());
  });
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  console.log('Starting smoke test against', base);

  try {
    const health = await axios.get(`${base}/api/health`, { timeout: 5000 });
    console.log('Health:', health.data);
    // Additional lightweight check: GET /api/courses (may return [] or require auth)
    try {
      const courses = await axios.get(`${base}/api/courses`, { timeout: 5000 });
      console.log('GET /api/courses status:', courses.status, 'items:', Array.isArray(courses.data) ? courses.data.length : 'unknown');
    } catch (err) {
      console.log('GET /api/courses failed (may require DB or auth):', err.message);
    }

    console.log('Smoke test completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Smoke test failed:', err.message || err);
    process.exit(2);
  } finally {
    server.close();
  }
}

run();
