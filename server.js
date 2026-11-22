const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'rsvp-responses.json');

function readResponses() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeResponses(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/rsvp') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let data;
      try {
        data = JSON.parse(body || '{}');
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'invalid JSON' }));
        return;
      }

      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'missing name' }));
        return;
      }

      const entry = {
        name,
        attending: data.attending === 'yes' ? 'yes' : (data.attending === 'no' ? 'no' : String(data.attending || '')),
        guestCount: Number.isFinite(data.guestCount) ? data.guestCount : 1,
        submittedAt: new Date().toISOString(),
      };

      const responses = readResponses();
      responses.push(entry);
      writeResponses(responses);

      console.log(`[RSVP] ${entry.name} - ${entry.attending} (${entry.guestCount} khách) @ ${entry.submittedAt}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/rsvp') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(readResponses(), null, 2));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'not found' }));
});

if (!fs.existsSync(DATA_FILE)) writeResponses([]);

server.listen(PORT, () => {
  console.log(`RSVP API server running at http://127.0.0.1:${PORT}`);
  console.log(`Responses saved to: ${DATA_FILE}`);
});
