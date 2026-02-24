const express = require('express');
const axios = require('axios');
const YahooFinance = require('yahoo-finance2').default; // CJS Fix
const cors = require('cors');

/**
 * --- TERMINAL MERCADO FRAN ELITE ---
 * 100% HEADLESS ENGINE: Data is fetched via API endpoints (Axios/YahooFinance API).
 * NO BROWSER WINDOWS: The server operates strictly in the background.
 */

const yahooFinance = new YahooFinance();
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Cache System ---
const cache = {
    dolar: { data: null, timestamp: 0 },
    assets: new Map()
};
const CACHE_DURATION = 5 * 60 * 1000;

// --- Helper: Clean strings to pure numbers ---
function toNum(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    let cleaned = val.toString()
        .replace(/\$/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.');
    return parseFloat(cleaned) || 0;
}

// --- Fetch Real Dollar Data (Definitive CriptoYa Mapping) ---
async function fetchDolarData() {
    const now = Date.now();
    if (cache.dolar.data && (now - cache.dolar.timestamp < CACHE_DURATION)) {
        return cache.dolar.data;
    }

    try {
        console.log('--- Terminal MERCADO FRAN: Fetching Dolars (Headless) ---');
        const { data } = await axios.get('https://criptoya.com/api/dolar', { timeout: 10000 });

        // bond-based prices (AL30)
        const getVenta = (obj) => toNum(obj?.al30?.['24hs']?.price || obj?.gd30?.['24hs']?.price || obj?.['24hs']?.price || obj?.price || 0);
        const getCompra = (obj) => toNum(obj?.al30?.['ci']?.price || obj?.gd30?.['ci']?.price || obj?.['ci']?.price || obj?.price || 0);

        const result = {
            blue: { compra: toNum(data.blue?.bid), venta: toNum(data.blue?.ask) },
            mep: { compra: getCompra(data.mep), venta: getVenta(data.mep) },
            ccl: { compra: getCompra(data.ccl), venta: getVenta(data.ccl) },
            oficial: { compra: toNum(data.oficial?.bid), venta: toNum(data.oficial?.ask) },
            tarjeta: { compra: toNum(data.turista?.bid || data.tarjeta?.bid), venta: toNum(data.turista?.ask || data.tarjeta?.ask) }
        };

        if (result.mep.venta === 0 || result.blue.venta === 0) {
            const { data: dApi } = await axios.get('https://dolarapi.com/v1/dolares', { timeout: 5000 });
            const findC = (t) => dApi.find(d => d.casa === t) || {};
            if (result.blue.venta === 0) result.blue = { compra: toNum(findC('blue').compra), venta: toNum(findC('blue').venta) };
            if (result.mep.venta === 0) result.mep = { compra: toNum(findC('mep').compra), venta: toNum(findC('mep').venta) };
        }

        cache.dolar = { data: result, timestamp: now };
        return result;
    } catch (error) {
        console.error('✘ Error Dólares:', error.message);
        return cache.dolar.data || { blue: { compra: 0, venta: 0 }, mep: { compra: 0, venta: 0 }, ccl: { compra: 0, venta: 0 }, oficial: { compra: 0, venta: 0 }, tarjeta: { compra: 0, venta: 0 } };
    }
}

// --- Fetch Asset Data (100% Headless API) ---
async function fetchAssetData(ticker, months) {
    const key = `${ticker}-${months}`;
    const now = Date.now();
    if (cache.assets.has(key) && (now - cache.assets.get(key).timestamp < CACHE_DURATION)) {
        return cache.assets.get(key).data;
    }

    try {
        const quote = await yahooFinance.quote(ticker);
        const end = new Date();
        const start = new Date();
        start.setMonth(end.getMonth() - months);

        const history = await yahooFinance.historical(ticker, {
            period1: start.toISOString().split('T')[0],
            period2: end.toISOString().split('T')[0],
            interval: '1d'
        });

        if (!history || history.length === 0) throw new Error('History empty');

        const first = history[0].close;
        const last = history[history.length - 1].close;
        const variation = ((last - first) / first) * 100;

        const result = {
            ticker,
            price: quote.regularMarketPrice || last,
            change: quote.regularMarketChangePercent || 0,
            history: history.map(d => ({ date: d.date.toISOString().split('T')[0], close: d.close })),
            rangeVariation: variation
        };

        cache.assets.set(key, { data: result, timestamp: now });
        return result;
    } catch (error) {
        console.error(`✘ Error Yahoo (${ticker}):`, error.message);
        throw error;
    }
}

// --- API Router ---
app.get('/api/data', async (req, res) => {
    const ticker = req.query.t || '^GSPC';
    const months = parseInt(req.query.m) || 1;
    try {
        const [dolar, asset] = await Promise.all([
            fetchDolarData(),
            fetchAssetData(ticker, months)
        ]);
        res.json({ dolar, asset });
    } catch (e) {
        res.status(500).json({ error: 'Falla en terminal de datos.' });
    }
});

// --- ELITE FRONTEND ---
const html_content = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MERCADO FRAN | Elite Terminal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;900&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            darkMode: "class",
            theme: { extend: { fontFamily: { sans: ["Outfit", "sans-serif"] } } }
        }
    </script>
    <style>
        .glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .light .glass { background: rgba(255, 255, 255, 0.95); border: 1px solid rgba(0, 0, 0, 0.05); }
        body { transition: background-color 0.4s; overflow-x: hidden; }
        .active-range { background: #3b82f6 !important; color: white !important; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .white-shadow { text-shadow: 0 0 20px rgba(255,255,255,0.1); }
    </style>
</head>
<body class="dark bg-[#020617] text-slate-800 dark:text-slate-100 min-h-screen p-4 md:p-12">
    <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <header class="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
            <div>
                <h1 class="text-7xl font-black tracking-tighter bg-gradient-to-br from-blue-400 via-indigo-500 to-emerald-400 bg-clip-text text-transparent italic">MERCADO FRAN</h1>
                <p class="text-[10px] uppercase tracking-[0.5em] text-slate-500 font-bold ml-2 mt-2">Professional Grade Elite Terminal</p>
            </div>
            <button id="theme-btn" class="p-6 rounded-[2.5rem] glass hover:scale-105 active:scale-95 transition-all shadow-3xl">
                <span id="sun" class="text-3xl">☀️</span>
                <span id="moon" class="hidden text-3xl">🌙</span>
            </button>
        </header>

        <!-- Money Cards -->
        <div id="stats" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-16">
            <div class="glass p-12 rounded-[3.5rem] h-32 animate-pulse bg-white/5"></div>
            <div class="glass p-12 rounded-[3.5rem] h-32 animate-pulse bg-white/5"></div>
            <div class="glass p-12 rounded-[3.5rem] h-32 animate-pulse bg-white/5"></div>
            <div class="glass p-12 rounded-[3.5rem] h-32 animate-pulse bg-white/5"></div>
            <div class="glass p-12 rounded-[3.5rem] h-32 animate-pulse bg-white/5"></div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-14">
            <!-- Asset Terminal -->
            <div class="lg:col-span-7 glass p-12 rounded-[4.5rem] relative shadow-4xl overflow-hidden group">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-14">
                    <div class="flex-1">
                        <select id="asset-type" class="bg-black/40 dark:bg-black/40 border border-white/5 rounded-[2rem] px-8 py-5 text-3xl font-black outline-none focus:ring-4 focus:ring-blue-500/20 cursor-pointer w-full md:w-auto transition-all text-slate-900 dark:text-white">
                            <option value="^GSPC">S&P 500 INDEX</option>
                            <option value="SPYD">SPYD | DIVIDEND ETF</option>
                        </select>
                        <div class="mt-8 flex items-baseline gap-8">
                            <span id="price" class="text-6xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white">---</span>
                            <span id="trend" class="px-6 py-2.5 rounded-2xl text-sm font-black transition-all">--%</span>
                        </div>
                    </div>
                    <div class="flex p-2 bg-black/40 rounded-[1.8rem] border border-white/5 h-16 items-center">
                        <button onclick="rangeCall(1)" class="range-btn group/btn px-8 rounded-2xl text-xs font-black h-full transition-all active-range">1M</button>
                        <button onclick="rangeCall(6)" class="range-btn group/btn px-8 rounded-2xl text-xs font-black h-full transition-all hover:bg-white/5 text-slate-500">6M</button>
                        <button onclick="rangeCall(12)" class="range-btn group/btn px-8 rounded-2xl text-xs font-black h-full transition-all hover:bg-white/5 text-slate-500">1Y</button>
                    </div>
                </div>
                <!-- Chart Container -->
                <div class="h-[520px] w-full relative">
                    <canvas id="chart"></canvas>
                </div>
            </div>

            <!-- Enhanced Simulator - EXPANDED WIDTH -->
            <div class="lg:col-span-5 glass p-10 md:p-14 rounded-[4.5rem] flex flex-col justify-between border-t-2 border-t-blue-500/20 bg-gradient-to-b from-blue-500/[0.04] to-transparent shadow-4xl overflow-hidden min-h-[900px]">
                <div class="space-y-10">
                    <div>
                        <h2 class="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">PRO ANALYTICS</h2>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Elite Forecasting Engine</p>
                    </div>

                    <div class="space-y-6 md:space-y-8">
                        <label class="block group">
                            <span class="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase mb-2 block ml-3 tracking-widest transition-colors group-focus-within:text-blue-500">Capital Inicial (USD)</span>
                            <input type="number" id="s-cap" value="1000" class="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/5 rounded-[2.5rem] px-8 py-5 md:px-10 md:py-6 outline-none focus:border-blue-500/50 font-black text-2xl md:text-3xl transition-all shadow-inner text-slate-900 dark:text-white">
                        </label>
                        <label class="block group">
                            <span class="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase mb-2 block ml-3 tracking-widest transition-colors group-focus-within:text-blue-500">Aporte Mensual (USD)</span>
                            <input type="number" id="s-pmt" value="100" class="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/5 rounded-[2.5rem] px-8 py-5 md:px-10 md:py-6 outline-none focus:border-blue-500/50 font-black text-2xl md:text-3xl transition-all shadow-inner text-slate-900 dark:text-white">
                        </label>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                            <label class="block group">
                                <span class="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase mb-2 block ml-3 tracking-widest transition-colors group-focus-within:text-blue-500">Tasa (%)</span>
                                <input type="number" id="s-rate" value="1.5" step="0.1" class="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/5 rounded-[2.5rem] px-8 py-5 md:px-10 md:py-6 outline-none focus:border-blue-500/50 font-black text-2xl md:text-3xl transition-all shadow-inner text-slate-900 dark:text-white">
                            </label>
                            <label class="block group">
                                <span class="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase mb-2 block ml-3 tracking-widest transition-colors group-focus-within:text-blue-500">Meses</span>
                                <input type="number" id="s-time" value="12" class="w-full bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/5 rounded-[2.5rem] px-8 py-5 md:px-10 md:py-6 outline-none focus:border-blue-500/50 font-black text-2xl md:text-3xl transition-all shadow-inner text-slate-900 dark:text-white">
                            </label>
                        </div>
                        <button id="sync-btn" class="w-full py-6 rounded-[2.5rem] border border-blue-500/30 bg-blue-500/10 text-[12px] font-black text-blue-500 dark:text-blue-400 hover:bg-blue-500/20 active:scale-95 transition-all uppercase tracking-[0.3em] shadow-xl">
                            Sync Rendimiento Real
                        </button>
                    </div>
                </div>

                <!-- Result Card - RESPONSIVE TYPOGRAPHY & NO CLIPPING -->
                <div class="mt-12 p-10 md:p-12 bg-emerald-500/10 border border-emerald-500/20 rounded-[4rem] relative group/res transition-all shadow-inner flex flex-col gap-10">
                    <div class="space-y-4">
                        <p class="text-[10px] text-emerald-600 dark:text-emerald-500 font-black uppercase tracking-[0.4em]">Valor Futuro Estimado</p>
                        <h3 id="s-res" class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter leading-none whitespace-nowrap overflow-visible">$0.00</h3>
                    </div>
                    
                    <div class="border-t border-black/10 dark:border-white/10 pt-10 flex flex-col gap-8 text-[11px] font-black uppercase tracking-widest">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 sm:gap-12">
                            <div class="flex flex-col gap-2">
                                <span class="text-slate-500 text-[10px]">Capital Propio</span>
                                <span id="s-invested" class="text-slate-900 dark:text-slate-100 text-2xl font-black leading-none whitespace-nowrap">$0</span>
                            </div>
                            <div class="flex flex-col gap-2 sm:text-right">
                                <span class="text-emerald-600/70 dark:text-emerald-500/70 text-[10px]">Profit Neto</span>
                                <span id="s-profit" class="text-emerald-600 dark:text-emerald-400 text-2xl font-black leading-none whitespace-nowrap">+$0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let chart = null;
        let activeRange = 1;
        let marketData = null;
        const body = document.body;

        // Theme
        document.getElementById("theme-btn").addEventListener("click", () => {
            body.classList.toggle("dark");
            body.classList.toggle("light");
            const isDark = body.classList.contains("dark");
            body.style.backgroundColor = isDark ? "#020617" : "#f1f5f9";
            document.getElementById("sun").classList.toggle("hidden", isDark);
            document.getElementById("moon").classList.toggle("hidden", !isDark);
            if (chart) renderChartDisplay(marketData.asset);
        });

        async function rangeCall(m) {
            activeRange = m;
            document.querySelectorAll(".range-btn").forEach(btn => {
                btn.classList.remove("active-range");
                const label = m === 1 ? '1M' : (m === 6 ? '6M' : '1Y');
                if (btn.innerText === label) btn.classList.add("active-range");
            });
            await load();
        }

        async function load() {
            try {
                const ticker = document.getElementById("asset-type").value;
                const res = await fetch(\`/api/data?t=\${ticker}&m=\${activeRange}\`);
                const data = await res.json();
                marketData = data;
                render();
            } catch (e) { console.error(e); }
        }

        function render() {
            renderStats(marketData.dolar);
            renderChartDisplay(marketData.asset);
            calculateElite();
        }

        function renderStats(dolar) {
            const container = document.getElementById("stats");
            container.innerHTML = "";
            const labels = ["DÓLAR BLUE", "DÓLAR MEP", "DÓLAR CCL", "DÓLAR OFICIAL", "TRJ / CRIPTO"];
            const keys = ["blue", "mep", "ccl", "oficial", "tarjeta"];
            keys.forEach((k, i) => {
                const div = document.createElement("div");
                div.className = "glass p-10 rounded-[3.5rem] flex flex-col justify-center border-l-[10px] " + (k === 'blue' ? "border-l-indigo-500 font-bold" : (k === 'mep' || k === 'ccl' ? "border-l-emerald-500 font-bold" : "border-l-slate-400 dark:border-l-slate-800/40"));
                div.innerHTML = \`
                    <p class="text-[10px] font-black text-slate-500 tracking-[0.3em] mb-4 uppercase">\${labels[i]}</p>
                    <h4 class="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">$\${Math.floor(dolar[k].venta).toLocaleString()}</h4>
                    <p class="text-[10px] font-bold text-slate-500 uppercase mt-2">C: $\${Math.floor(dolar[k].compra).toLocaleString()}</p>
                \`;
                container.appendChild(div);
            });
        }

        function renderChartDisplay(asset) {
            document.getElementById("price").innerText = \`$\${asset.price.toLocaleString()}\`;
            const trend = document.getElementById("trend");
            const isUp = asset.change >= 0;
            trend.innerText = \`\${isUp ? "▲" : "▼"} \${Math.abs(asset.change).toFixed(2)}%\`;
            trend.className = \`px-6 py-2.5 rounded-2xl text-sm font-black \${isUp ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}\`;

            const isDark = body.classList.contains("dark");
            const ctx = document.getElementById("chart").getContext("2d");
            if (chart) chart.destroy();
            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: asset.history.map(h => h.date),
                    datasets: [{
                        data: asset.history.map(h => h.close),
                        borderColor: isDark ? '#3b82f6' : '#2563eb',
                        borderWidth: 8,
                        pointRadius: 0,
                        pointHoverRadius: 14,
                        pointHoverBackgroundColor: '#fff',
                        tension: 0.45,
                        fill: true,
                        backgroundColor: (c) => {
                            const {ctx, chartArea} = c.chart;
                            if (!chartArea) return;
                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.15)');
                            gradient.addColorStop(1, 'transparent');
                            return gradient;
                        }
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false, mode: 'index' },
                    plugins: { 
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                            titleColor: isDark ? '#fff' : '#000',
                            bodyColor: isDark ? '#94a3b8' : '#64748b',
                            padding: 24,
                            cornerRadius: 24,
                            callbacks: {
                                label: it => " PRECIO: $" + it.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2}),
                                title: it => " FECHA: " + it[0].label
                            }
                        }
                    },
                    scales: {
                        x: { ticks: { maxTicksLimit: 7, color: '#64748b', font: { family: 'Outfit', weight: 'bold' } }, grid: { display: false } },
                        y: { position: 'left', ticks: { color: '#64748b', font: { family: 'Outfit', weight: 'bold' }, callback: v => "$" + v.toLocaleString() }, grid: { color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' } }
                    }
                }
            });
        }

        function calculateElite() {
            const cap = parseFloat(document.getElementById("s-cap").value) || 0;
            const pmt = parseFloat(document.getElementById("s-pmt").value) || 0;
            const rate = parseFloat(document.getElementById("s-rate").value) || 0;
            const time = parseFloat(document.getElementById("s-time").value) || 0;
            const r = rate / 100;
            
            let fv = cap * Math.pow(1 + r, time);
            if (r > 0) { fv += pmt * ((Math.pow(1 + r, time) - 1) / r); } else { fv += pmt * time; }

            const totalIn = cap + (pmt * time);
            const profit = fv - totalIn;

            document.getElementById("s-res").innerText = "$" + fv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            document.getElementById("s-invested").innerText = "$" + totalIn.toLocaleString(undefined, { minimumFractionDigits: 0 });
            document.getElementById("s-profit").innerText = "+$" + profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        document.getElementById("sync-btn").addEventListener("click", () => {
            if (!marketData) return;
            const perf = (marketData.asset.rangeVariation / activeRange).toFixed(2);
            document.getElementById("s-rate").value = Math.max(0.1, perf);
            calculateElite();
        });

        document.getElementById("asset-type").addEventListener("change", load);
        ["s-cap", "s-pmt", "s-rate", "s-time"].forEach(id => {
            document.getElementById(id).addEventListener("input", calculateElite);
        });

        load();
    </script>
</body>
</html>`;

app.get('/', (req, res) => res.send(html_content));

app.listen(PORT, () => console.log('MERCADO FRAN ELITE operativo en http://localhost:' + PORT));
