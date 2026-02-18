const https = require('https');

// Configuración
const precioUmbral = 40000;
// API de CryptoCompare (estable y rápida)
const url = 'https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD';

const options = {
    headers: {
        'User-Agent': 'Nodejs-App'
    }
};

function consultarPrecio() {
    console.log('Intentando conectar con CryptoCompare...');

    const req = https.get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const json = JSON.parse(data);

                // Verificación de datos estructura CryptoCompare
                // Devuelve { USD: 67000.50 }
                if (!json || !json.USD) {
                    console.error('Error: La API no devolvió el precio esperado.', json);
                    reintentar();
                    return;
                }

                const precio = parseFloat(json.USD);
                const precioFormateado = precio.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

                console.log(`El precio actual de Bitcoin es: ${precioFormateado}`);

                if (precio > precioUmbral) {
                    console.log('\n\x1b[31m%s\x1b[0m', '¡ALERTA! EL PRECIO ES MAYOR AL UMBRAL ESTABLECIDO');
                    console.log(`El precio supera los $${precioUmbral} USD`);
                } else {
                    console.log(`El precio está por debajo o igual al umbral de $${precioUmbral} USD`);
                }

            } catch (error) {
                console.error('Error al analizar la respuesta JSON:', error.message);
                reintentar();
            }
        });

    });

    req.on('error', (err) => {
        console.error('Error en la petición HTTPS:', err.message);
        // Si hay error de red, reintentamos en 10s
        reintentar();
    });

    req.end();
}

function reintentar() {
    console.log('Reintentando en 10 segundos...');
    setTimeout(consultarPrecio, 10000);
}

// Iniciar la primera consulta
consultarPrecio();
