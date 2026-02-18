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
    // 2. Endpoint API: Proxy a CryptoCompare
    else if (req.url === '/api/precio') {
        const cryptoCompareUrl = 'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD';
        const options = {
            headers: {
                'User-Agent': 'Nodejs-App'
            }
        };

        https.get(cryptoCompareUrl, options, (apiRes) => {
            let data = '';

            apiRes.on('data', (chunk) => {
                data += chunk;
            });

            apiRes.on('end', () => {
                try {
                    const json = JSON.parse(data);

                    // Comprobar si tenemos el precio en el formato de CryptoCompare { USD: ... }
                    if (json.USD) {
                        const price = parseFloat(json.USD);

                        // Devolvemos { price: number }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ price: price }));
                    } else {
                        console.error('Respuesta inesperada de CryptoCompare:', json);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Formato de API inesperado' }));
                    }
                } catch (e) {
                    console.error('Error procesando respuesta de CryptoCompare:', e.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Error al procesar datos de CryptoCompare' }));
                }
            });

        }).on('error', (err) => {
            console.error('Error de conexión con CryptoCompare:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Error al conectar con CryptoCompare' }));
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
