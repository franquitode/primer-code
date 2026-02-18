const https = require('https');

// Configuración
const precioUmbral = 40000;
// API pública de Binance para el par BTCUSDT
const url = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';

const options = {
    headers: {
        'User-Agent': 'Node.js Crypto Client'
    }
};

console.log('Consultando precio de Bitcoin en Binance...');

try {
    const req = https.get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const json = JSON.parse(data);

                // Verificación de error en la respuesta de Binance
                if (json.code && json.msg) {
                    console.error('Error de Binance:', json.msg);
                    return;
                }

                // Verificación de datos
                if (!json || !json.price) {
                    console.error('Error: La API no devolvió el precio esperado.', json);
                    return;
                }

                // El precio viene como string en Binance, convertir a float
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
            }
        });

    });

    req.on('error', (err) => {
        console.error('Error en la petición HTTPS:', err.message);
    });

    req.end();

} catch (error) {
    console.error('Ocurrió un error inesperado al iniciar la petición:', error.message);
}
