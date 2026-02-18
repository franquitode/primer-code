const http = require('http');
const fs = require('fs');
const https = require('https');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Tipos MIME para servir archivos correctamente
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
};

const server = http.createServer((req, res) => {
    // 1. Servir el frontend (index.html)
    if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'index.html');
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error al cargar el sitio');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(content);
            }
        });
    }
    // 2. Endpoint API: Proxy a Binance
    else if (req.url === '/api/precio') {
        const binanceUrl = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';

        https.get(binanceUrl, (apiRes) => {
            let data = '';

            apiRes.on('data', (chunk) => {
                data += chunk;
            });

            apiRes.on('end', () => {
                // Configurar headers para respuesta JSON
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            });

        }).on('error', (err) => {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Error al conectar con Binance' }));
        });
    }
    // 3. Manejo de 404
    else {
        res.writeHead(404);
        res.end('No encontrado');
    }
});

server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log('Abre esa URL en tu navegador (Chrome, Edge, etc.)');
});
