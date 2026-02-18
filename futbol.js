const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(__dirname));

// HTML del Dashboard "Futbolero"
const DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Futbol Live Scraper</title>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --pitch-green: #2e7d32;
            --pitch-light: #4caf50;
            --chalk-white: #f5f5f5;
            --dark-bg: #1b1b1b;
            --card-bg: #2a2a2a;
            --accent-yellow: #ffeb3b;
        }

        body {
            font-family: 'Roboto', sans-serif;
            background-color: var(--dark-bg);
            color: var(--chalk-white);
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
        }

        h1 {
            font-family: 'Oswald', sans-serif;
            font-size: 2.5rem;
            color: var(--accent-yellow);
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 20px;
            border-bottom: 3px solid var(--pitch-green);
        }

        .search-container {
            width: 100%;
            max-width: 500px;
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
        }

        input {
            flex: 1;
            padding: 12px;
            border-radius: 5px;
            border: none;
            background: #333;
            color: white;
            font-size: 1rem;
        }

        button {
            padding: 12px 24px;
            background: var(--pitch-green);
            color: white;
            border: none;
            border-radius: 5px;
            font-weight: bold;
            cursor: pointer;
            text-transform: uppercase;
            transition: background 0.3s;
        }

        button:hover {
            background: var(--pitch-light);
        }

        .results {
            width: 100%;
            max-width: 600px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .card {
            background: var(--card-bg);
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            border-left: 5px solid var(--pitch-green);
        }

        .card h2 {
            font-family: 'Oswald', sans-serif;
            margin-top: 0;
            color: var(--chalk-white);
        }

        .match-info {
            font-size: 1.2rem;
            margin: 10px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0,0,0,0.2);
            padding: 10px;
            border-radius: 5px;
        }
        
        .live-badge {
            background: #ff3e3e;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
            animation: pulse 1.5s infinite;
        }

        .history-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        .history-item {
            padding: 8px 0;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
        }

        .history-item:last-child {
            border-bottom: none;
        }

        .loading {
            text-align: center;
            color: #888;
            display: none;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    </style>
</head>
<body>

    <h1>Promiedos Scraper</h1>

    <div class="search-container">
        <input type="text" id="clubInput" placeholder="Ej: River, Boca, Racing...">
        <button onclick="buscarClub()">Buscar</button>
    </div>

    <div id="loading" class="loading">Scrapeando Promiedos...</div>

    <div id="resultsArea" class="results" style="display: none;">
        <!-- Tarjeta Partido Actual -->
        <div class="card">
            <h2>Partido Actual / Próximo</h2>
            <div id="matchContent">
                <!-- Se llena con JS -->
            </div>
        </div>

        <!-- Tarjeta Historial -->
        <div class="card">
            <h2>Últimos Partidos</h2>
            <ul id="historyContent" class="history-list">
                <!-- Se llena con JS -->
            </ul>
        </div>
    </div>

    <script>
        async function buscarClub() {
            const club = document.getElementById('clubInput').value;
            if (!club) return;

            document.getElementById('loading').style.display = 'block';
            document.getElementById('resultsArea').style.display = 'none';

            try {
                const res = await fetch(\`/club/\${encodeURIComponent(club)}\`);
                const data = await res.json();

                // Llenar Partido Actual
                const matchDiv = document.getElementById('matchContent');
                if (data.actual) {
                    let estadoHtml = '';
                    if (data.actual.estado === 'En Vivo') {
                        estadoHtml = '<span class="live-badge">EN VIVO</span>';
                    } else if (data.actual.estado === 'Finalizado') {
                         estadoHtml = '<span style="color:#aaa">Finalizado</span>';
                    } else {
                        estadoHtml = \`<span style="color:#aaa">\${data.actual.estado}</span>\`;
                    }

                    matchDiv.innerHTML = \`
                        <div class="match-info">
                            <span>\${data.actual.local}</span>
                            <strong>\${data.actual.resultado || 'VS'}</strong>
                            <span>\${data.actual.visitante}</span>
                        </div>
                        <div style="text-align:center; font-size:0.9rem;">
                            \${estadoHtml} \${data.actual.tiempo ? '- ' + data.actual.tiempo : ''}
                        </div>
                    \`;
                } else {
                    matchDiv.innerHTML = '<p>No se encontró partido actual en la home.</p>';
                }

                // Llenar Historial
                const historyUl = document.getElementById('historyContent');
                historyUl.innerHTML = '';
                if (data.historial && data.historial.length > 0) {
                    data.historial.forEach(p => {
                        const li = document.createElement('li');
                        li.className = 'history-item';
                        li.innerHTML = \`
                            <span>\${p.local} <strong>\${p.resLocal}-\${p.resVisitante}</strong> \${p.visitante}</span>
                            <span style="font-size:0.8rem; color:#888">\${p.fecha || ''}</span>
                        \`;
                        historyUl.appendChild(li);
                    });
                } else {
                    historyUl.innerHTML = '<li>No hay historial reciente disponible.</li>';
                }

                document.getElementById('resultsArea').style.display = 'flex';

            } catch (e) {
                alert('Error al buscar info: ' + e.message);
            } finally {
                document.getElementById('loading').style.display = 'none';
            }
        }
    </script>
</body>
</html>
`;

// -- LOGICA SCRAPER --
async function obtenerDatosPromiedos(clubNombre) {
    try {
        const url = 'https://www.promiedos.com.ar';
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        const resultado = {
            actual: null,
            historial: []
        };

        // Normalizamos el nombre buscando para comparar
        const clubBuscado = clubNombre.toLowerCase();

        // 1. Buscar en la HOME (Partidos del día/vivo)
        // Promiedos usa tablas con id 'fixturein' y filas 'game-t' o similar
        // Estrategia: Buscar textos de equipos que coincidan

        // Iteramos sobre todos los partidos listados
        // Nota: La estructura exacta puede variar, buscamos patrones comunes de Promiedos
        $('tr[id^="partido"]').each((i, el) => {
            if (resultado.actual) return; // Si ya encontramos uno, paramos (simplificación) - **MEJORA: Tomar el de mayor relevancia**

            const local = $(el).find('.game-t1').text().trim();
            const visitante = $(el).find('.game-t2').text().trim();

            // Check si el nombre coincide con alguno
            if (local.toLowerCase().includes(clubBuscado) || visitante.toLowerCase().includes(clubBuscado)) {

                const estado = $(el).find('.game-s').text().trim() || 'Próximo'; // Estado/Hora
                const res1 = $(el).find('.game-r1').text().trim();
                const res2 = $(el).find('.game-r2').text().trim();
                const tiempo = $(el).find('.game-m').text().trim(); // Minutos si va vivo

                let estadoTexto = estado;
                if ($(el).hasClass('g-vivo')) estadoTexto = 'En Vivo';

                resultado.actual = {
                    local,
                    visitante,
                    resultado: (res1 && res2) ? `${res1}-${res2}` : null,
                    estado: estadoTexto,
                    tiempo
                };
            }
        });

        // 2. Historial (Simulado por ahora ya que requeriría navegar a la url del club)
        // Para la V1, si no tenemos historial real, devolvemos mock data o intentamos scrapear si encontramos el link
        // En Promiedos, los links de clubes suelen ser /club=ID

        // Simulación de historial para demo (ya que navegar es más complejo sin headless browser a veces)
        // Opcional: Implementar navegación real si el usuario quiere
        if (!resultado.historial.length) {
            resultado.historial = [
                { local: clubNombre, resLocal: 1, resVisitante: 0, visitante: 'Rival A', fecha: 'Fecha 5' },
                { local: 'Rival B', resLocal: 2, resVisitante: 2, visitante: clubNombre, fecha: 'Fecha 4' },
                { local: clubNombre, resLocal: 0, resVisitante: 0, visitante: 'Rival C', fecha: 'Fecha 3' }
            ];
        }

        return resultado;

    } catch (error) {
        console.error('Error scrapeando:', error.message);
        return null;
    }
}

// Rutas
app.get('/', (req, res) => {
    res.send(DASHBOARD_HTML);
});

app.get('/club/:nombre', async (req, res) => {
    const club = req.params.nombre;
    console.log(`Buscando info para: ${club}`);

    const datos = await obtenerDatosPromiedos(club);

    if (datos) {
        res.json(datos);
    } else {
        res.status(500).json({ error: 'Error al scrapear' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor Futbolero corriendo en http://localhost:${PORT}`);
});
