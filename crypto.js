const https = require('https');

// Configuración
const precioUmbral = 40000;
const url = 'https://api.coindesk.com/v1/bpi/currentprice.json';

const options = {
    headers: {
        'User-Agent': 'Node.js Crypto Client'
    }
};

function consultarPrecio() {
    console.log('Consultando precio de Bitcoin en CoinDesk...');

    const req = https.get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const json = JSON.parse(data);

                // Verificación de datos estructura CoinDesk
                if (!json || !json.bpi || !json.bpi.USD || typeof json.bpi.USD.rate_float === 'undefined') {
                    console.error('Error: La API no devolvió el precio esperado.', json);
                    reintentar();
                    return;
                }

                // El precio viene como float en rate_float
                const precio = json.bpi.USD.rate_float;
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
