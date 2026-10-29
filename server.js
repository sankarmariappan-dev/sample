const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT) || 3000;
const formPath = path.join(__dirname, 'index.html');

function sendHTML(response, statusCode, html) {
  response.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

const server = http.createServer((request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost');

  if (request.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    fs.readFile(formPath, (error, html) => {
      if (error) {
        console.error('Unable to read index.html:', error);
        sendHTML(response, 500, '<h1>Unable to load the form.</h1>');
        return;
      }

      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(html);
    });
    return;
  }

  if (request.method === 'POST' && pathname === '/submit') {
    const chunks = [];
    let bodySize = 0;
    let tooLarge = false;

    request.on('data', (chunk) => {
      if (tooLarge) return;

      bodySize += chunk.length;
      if (bodySize > 1024 * 1024) {
        tooLarge = true;
        sendHTML(response, 413, '<h1>Form submission is too large.</h1>');
        request.resume();
        return;
      }
      chunks.push(chunk);
    });

    request.on('end', () => {
      if (tooLarge) return;

      const formData = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
      const firstValue = escapeHTML(formData.get('firstValue') || '');
      const secondValue = escapeHTML(formData.get('secondValue') || '');

      sendHTML(
        response,
        200,
        `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><title>Submitted Values</title></head>
  <body>
    <h1>Submitted values</h1>
    <p>First value: ${firstValue}</p>
    <p>Second value: ${secondValue}</p>
    <a href="/">Back to form</a>
  </body>
</html>`,
      );
    });
    return;
  }

  sendHTML(response, 404, '<h1>Page not found.</h1>');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Form server running at http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('Unable to start the form server:', error);
  process.exitCode = 1;
});
