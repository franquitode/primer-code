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
        #resultado { margin-top: 20px; padding: 20px; background: #333; border-radius: 10px; max-width: 600px; margin-left: auto; margin-right: auto; text-align: left; }
        .match-card { margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px; }
        .match-card:last-child { border-bottom: none; }
        .league-name { color: #888; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 5px; }
        .teams { font-size: 1.4rem; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .score { background: #222; padding: 5px 10px; border-radius: 5px; }
        .status { margin-top: 5px; font-size: 0.9rem; color: #aaa; }
        .live-badge { color: #ff5555; font-weight: bold; animation: pulse 1s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    </style>
</head>
<body>
    <h1>Buscador de Partidos (Promiedos Next.js)</h1>
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
                
                if (data.encontrados && data.encontrados.length > 0) {
                    let html = '';
                    data.encontrados.forEach(match => {
                        const vivoClass = match.estado.includes('Vivo') || match.estado.includes('PT') || match.estado.includes('ST') ? 'live-badge' : '';
                        html += \`
                            <div class="match-card">
                                <div class="league-name">\${match.liga}</div>
                                <div class="teams">
                                    <span>\${match.local}</span>
                                    <span class="score">\${match.resultado}</span>
                                    <span>\${match.visitante}</span>
                                </div>
                                <div class="status \${vivoClass}">\${match.estado} \${match.tiempo}</div>
                            </div>
                        \`;
                    });
                    resDiv.innerHTML = html;
                } else {
                    resDiv.innerHTML = 'No se encontró partido para ese club en la lista de hoy.';
                }
            } catch (e) {
                console.error(e);
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
    if (!clubUser) return res.json({ encontrados: [] });

    try {
        const { data: html } = await axios.get('https://www.promiedos.com.ar', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(html);

        // La magia: Extraer el JSON de Next.js
        const nextDataScript = $('#__NEXT_DATA__').html();

        if (!nextDataScript) {
            throw new Error('No se encontró __NEXT_DATA__');
        }

        const jsonData = JSON.parse(nextDataScript);
        const leagues = jsonData.props.pageProps.data.leagues;

        let encontrados = [];

        // Navegar la estructura de datos
        leagues.forEach(league => {
            if (league.games) {
                league.games.forEach(game => {
                    const team1 = game.teams[0];
                    const team2 = game.teams[1];

                    const name1 = team1.name.toLowerCase();
                    const name2 = team2.name.toLowerCase();
                    const short1 = team1.short_name.toLowerCase();
                    const short2 = team2.short_name.toLowerCase();

                    // Búsqueda flexible
                    if (name1.includes(clubUser) || name2.includes(clubUser) ||
                        short1.includes(clubUser) || short2.includes(clubUser)) {

                        // Parsear estado y resultado
                        // Si el juego no empezó, status.name es "Prog." o fecha
                        // Si está en juego, status tiene info

                        let resultadoStr = 'VS';
                        // A veces el resultado viene en scores
                        if (game.scores) {
                            resultadoStr = `${game.scores[0]} - ${game.scores[1]}`;
                        }

                        let estado = game.status.name; // "Final", "Prog.", "PT", "ST"
                        let tiempo = game.game_time_to_display || '';

                        // Si está programado, mostrar hora
                        if (game.start_time && !game.scores) {
                            // start_time viene como "18-02-2026 14:45"
                            tiempo = game.start_time.split(' ')[1];
                        }

                        encontrados.push({
                            liga: league.name,
                            local: team1.short_name,
                            visitante: team2.short_name,
                            resultado: resultadoStr,
                            estado: estado,
                            tiempo: tiempo
                        });
                    }
                });
            }
        });

        res.json({ encontrados });

    } catch (error) {
        console.error('Error scraper:', error.message);
        res.status(500).json({ error: 'Error al scrapear Promiedos' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
