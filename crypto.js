const https = require('https');

// Configuración
const precioUmbral = 40000;
// Volvemos a la API de Binance
const url = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';

const options = {
    headers: {
        'User-Agent': 'Node.js Crypto Client'
    }
};

function consultarPrecio() {
    console.log('Intentando conectar con Binance...');

    const req = https.get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const json = JSON.parse(data);

                // Verificación de datos estructura Binance
                // Si hay error en la respuesta de la API (ej: rate limit)
                if (json.code && json.msg) {
                    console.error('Error de API Binance:', json.msg);
                    reintentar();
                    return;
                }

                if (!json || !json.price) {
                    console.error('Error: La API no devolvió el precio esperado.', json);
                    reintentar();
                    return;
                }

                // El precio viene como string en Binance
                const precio = parseFloat(json.price);
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
        // Si hay error de red (como ENOTFOUND), reintentamos en 10s
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
