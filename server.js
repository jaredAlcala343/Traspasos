const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);

    // Redirigir la raíz ("/") a la página principal (page.js)
    if (parsedUrl.pathname === '/') {
      app.render(req, res, '/'); // Renderiza la página principal
    } else {
      handle(req, res, parsedUrl); // Maneja otras rutas
    }
  }).listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});