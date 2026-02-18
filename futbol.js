const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

// HTML del Frontend (Embebido)
const HTML_PAGE = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Futbol Scraper</title>
    <style>
        body { font-family: sans-serif; background: #222; color: #fff; text-align: center; padding: 20px; }
        input { padding: 10px; font-size: 1.2rem; border-radius: 5px; border: none; }
        button { padding: 10px 20px; font-size: 1.2rem; background: #4caf50; color: white; border: none; cursor: pointer; border-radius: 5px; }
        button:hover { background: #45a049; }
        #resultado { margin-top: 20px; padding: 20px; background: #333; border-radius: 10px; max-width: 600px; margin-left: auto; margin-right: auto; }
        .match { font-size: 1.5rem; margin-bottom: 10px; }
        .status { color: #aaa; font-size: 0.9rem; }
        .live { color: #ff5555; font-weight: bold; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    </style>
</head>
<body>
    <h1>Buscador de Partidos (Promiedos)</h1>
    <input type="text" id="club" placeholder="Nombre del club (ej: River)">
    <button onclick="buscar()">Buscar</button>
    <div id="resultado"></div>

    <script>
        async function buscar() {
            const club = document.getElementById('club').value;
            const resDiv = document.getElementById('resultado');
            resDiv.innerHTML = 'Buscando...';
            
            try {
                const response = await fetch('/api/buscar?club=' + encodeURIComponent(club));
                const data = await response.json();
                
                if (data.encontrado) {
                    const vivoClass = data.estado === 'En Vivo' ? 'live' : '';
                    resDiv.innerHTML = \`
                        <div class="match">\${data.local} <strong>\${data.resultado}</strong> \${data.visitante}</div>
                        <div class="status \${vivoClass}">\${data.estado} \${data.tiempo ? '(' + data.tiempo + ')' : ''}</div>
                    \`;
                } else {
                    resDiv.innerHTML = 'No se encontró partido actual para ese club.';
                }
            } catch (e) {
                resDiv.innerHTML = 'Error al buscar.';
            }
        }
    </script>
</body>
</html>
`;

// Ruta Home
app.get('/', (req, res) => {
    res.send(HTML_PAGE);
});

// API de Búsqueda
app.get('/api/buscar', async (req, res) => {
    const clubUser = req.query.club ? req.query.club.toLowerCase() : '';
    if (!clubUser) return res.json({ encontrado: false });

    try {
        const { data: html } = await axios.get('https://www.promiedos.com.ar');
        const $ = cheerio.load(html);
        let encontrado = null;

        // Buscar en todas las filas de partidos
        $('tr[id^="partido"]').each((i, el) => {
            if (encontrado) return;

            const local = $(el).find('.game-t1').text().trim();
            const visitante = $(el).find('.game-t2').text().trim();

            if (local.toLowerCase().includes(clubUser) || visitante.toLowerCase().includes(clubUser)) {
                // Datos del partido
                const estadoRaw = $(el).find('.game-s').text().trim();
                const r1 = $(el).find('.game-r1').text().trim();
                const r2 = $(el).find('.game-r2').text().trim();
                const tiempo = $(el).find('.game-m').text().trim();

                let estado = estadoRaw || 'Programado';
                if ($(el).hasClass('g-vivo')) estado = 'En Vivo';
                else if (estado === 'Fin') estado = 'Finalizado';

                encontrado = {
                    encontrado: true,
                    local,
                    visitante,
                    resultado: r1 && r2 ? `${r1}-${r2}` : 'VS',
                    estado,
                    tiempo
                };
            }
        });

        if (encontrado) {
            res.json(encontrado);
        } else {
            res.json({ encontrado: false });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al scrapear' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
