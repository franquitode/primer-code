const http = require('http');

function checkEndpoint(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`[${path}] Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    // Si es JSON, intentar parsear
                    if (res.headers['content-type'].includes('application/json')) {
                        try {
                            const json = JSON.parse(data);
                            console.log(`[${path}] JSON Valid: Yes`);
                            if (json.price) console.log(`[${path}] Price found: ${json.price}`);
                        } catch (e) {
                            console.log(`[${path}] JSON Valid: No`);
                        }
                    } else {
                        console.log(`[${path}] Body length: ${data.length} chars`);
                    }
                }
                resolve();
            });
        }).on('error', (err) => {
            console.error(`[${path}] Error: ${err.message}`);
            resolve(); // Resolve anyway to continue
        });
    });
}

async function runChecks() {
    console.log('Vericiando servidor...');
    await checkEndpoint('/');
    await checkEndpoint('/index.html');
    await checkEndpoint('/api/precio');
    console.log('Verificación completada.');
}

runChecks();
