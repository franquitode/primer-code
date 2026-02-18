const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos (HTML, CSS, JS del frontend)
// Esto hace que index.html se sirva automáticamente en la ruta raíz '/'
app.use(express.static(__dirname));

// Ruta principal explícita (como pidió el usuario)
// Aunque express.static ya lo hace, esto asegura que '/' devuelva index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint API: Proxy a CryptoCompare
app.get('/api/precio', (req, res) => {
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

                // Comprobar si tenemos el precio
                if (json.USD) {
                    const price = parseFloat(json.USD);
                    // Devolvemos el JSON
                    res.json({ price: price });
                } else {
                    console.error('Respuesta inesperada:', json);
                    res.status(500).json({ error: 'Formato de API inesperado' });
                }
            } catch (e) {
                console.error('Error procesando respuesta:', e.message);
                res.status(500).json({ error: 'Error al procesar datos' });
            }
        });

    }).on('error', (err) => {
        console.error('Error de conexión:', err.message);
        res.status(500).json({ error: 'Error al conectar con API externa' });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});
