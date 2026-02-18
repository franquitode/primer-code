const http = require('http');
const fs = require('fs');
const https = require('https');
const path = require('path');

const PORT = process.env.PORT || 3000;

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
    // 2. Endpoint API: Proxy a CoinDesk
    else if (req.url === '/api/precio') {
        const coindeskUrl = 'https://api.coindesk.com/v1/bpi/currentprice.json';

        https.get(coindeskUrl, (apiRes) => {
            let data = '';

            apiRes.on('data', (chunk) => {
                data += chunk;
            });

            apiRes.on('end', () => {
                try {
                    const json = JSON.parse(data);

                    // Comprobar si tenemos el precio en el formato de CoinDesk
                    if (json.bpi && json.bpi.USD && json.bpi.USD.rate_float) {
                        const price = json.bpi.USD.rate_float;

                        // DEVOLVEMOS EL FORMATO QUE EL FRONTEND ESPERA: { price: number }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ price: price }));
                    } else {
                        throw new Error('Formato de API inesperado');
                    }
                } catch (e) {
                    console.error('Error procesando respuesta de CoinDesk:', e.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Error al procesar datos de CoinDesk' }));
                }
            });

        }).on('error', (err) => {
            console.error('Error de conexión con CoinDesk:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Error al conectar con CoinDesk' }));
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
