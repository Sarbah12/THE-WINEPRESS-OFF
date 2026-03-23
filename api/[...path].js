const { handleApi, JSON_HEADERS } = require('../backend/app');

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, JSON_HEADERS);
      res.end();
      return;
    }

    const handled = await handleApi(req, res);
    if (!handled) {
      res.writeHead(404, JSON_HEADERS);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error(error);
    res.writeHead(500, JSON_HEADERS);
    res.end(JSON.stringify({ error: 'Something went wrong on the server.' }));
  }
};
