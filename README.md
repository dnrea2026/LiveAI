# ⬡ FX Terminal — MT5 Web Dashboard

Dashboard forex berbasis web yang terhubung ke MetaTrader 5 via WebSocket.  
Deploy gratis di GitHub Pages, bridge MT5 jalan di PC lokal kamu.

![Demo Mode](https://img.shields.io/badge/mode-demo%20%7C%20live-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)

---

## 🏗️ Arsitektur

```
Browser (GitHub Pages)
    ↕ WebSocket (ws://localhost:8765)
MT5 Bridge (PC Windows kamu)
    ↕ MT5 API
MetaTrader 5 Terminal
```

> **Penting:** MT5 hanya bisa diinstall di Windows. Bridge `mt5_bridge.py`  
> harus jalan di PC yang sama dengan MT5 Terminal.

---

## ✨ Fitur

- 📈 Live tick streaming (EURUSD, GBPUSD, USDJPY, AUDUSD, USDCHF)
- 🕯️ Candlestick chart multi-timeframe (M1 → D1)
- 🤖 Analisis AI oleh Claude (trend, sinyal BUY/SELL/WAIT, SL/TP)
- 📋 Open positions monitor + close langsung dari dashboard
- ⚡ Quick order panel
- 🎮 Demo mode otomatis saat tidak terhubung ke MT5

---

## 🚀 Deploy ke GitHub Pages

### Langkah 1 — Fork / Clone repo ini

```bash
git clone https://github.com/USERNAME/fx-terminal.git
cd fx-terminal
```

### Langkah 2 — Sesuaikan `vite.config.js`

Buka `vite.config.js` dan ganti `base` sesuai nama repo kamu:

```js
// Kalau repo kamu: https://github.com/johndoe/fx-terminal
base: '/fx-terminal/',

// Kalau repo kamu: https://github.com/johndoe/my-forex-dashboard
base: '/my-forex-dashboard/',
```

### Langkah 3 — Push ke GitHub

```bash
git add .
git commit -m "init: fx terminal dashboard"
git push origin main
```

### Langkah 4 — Aktifkan GitHub Pages

1. Buka repo di GitHub → **Settings** → **Pages**
2. Di bagian **Source**, pilih: **GitHub Actions**
3. Tunggu 1-2 menit, lalu buka:  
   `https://USERNAME.github.io/fx-terminal/`

> GitHub Actions akan otomatis build & deploy setiap kamu push ke `main`.

---

## 🖥️ Setup MT5 Bridge (PC Windows)

### Langkah 1 — Install requirements

```bash
pip install MetaTrader5 websockets
```

### Langkah 2 — Jalankan MT5 Terminal

Buka MetaTrader 5 dan login ke akun (demo atau live).

### Langkah 3 — Jalankan bridge

```bash
python mt5_bridge.py
```

Output yang benar:
```
2025-04-17 10:00:00 - MT5 Connected: MetaTrader 5 | Build 4000
2025-04-17 10:00:00 - Starting WebSocket server on ws://localhost:8765
2025-04-17 10:00:00 - Monitoring pairs: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCHF
```

### Langkah 4 — Connect dari Dashboard

1. Buka dashboard di browser
2. Di kolom input atas, isi: `ws://localhost:8765`
3. Klik **⚡ CONNECT MT5**
4. Status berubah jadi **● CONNECTED** ✅

---

## ⚙️ Konfigurasi

### Ganti pairs yang dimonitor

Edit `mt5_bridge.py` baris 25:
```python
PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCHF"]
# Tambah pair lain misalnya:
PAIRS = ["EURUSD", "GBPUSD", "XAUUSD", "BTCUSD"]
```

Lalu update juga di `src/App.jsx` baris 4:
```js
const PAIRS = ["EURUSD","GBPUSD","XAUUSD","BTCUSD"];
```

### Ganti port WebSocket

Edit `mt5_bridge.py` baris 22:
```python
PORT = 8765  # ganti sesuai kebutuhan
```

---

## 🔧 Development Lokal

```bash
npm install
npm run dev
# Buka http://localhost:5173
```

---

## 📁 Struktur Project

```
fx-terminal/
├── .github/
│   └── workflows/
│       └── deploy.yml      # Auto-deploy ke GitHub Pages
├── src/
│   ├── main.jsx            # Entry point React
│   └── App.jsx             # Dashboard utama
├── index.html
├── vite.config.js          # ← Sesuaikan `base` dengan nama repo
├── package.json
├── mt5_bridge.py           # Jalankan di PC Windows
└── README.md
```

---

## ❓ FAQ

**Q: Apakah bisa connect dari HP / device lain?**  
A: Ya! Jalankan bridge dengan `HOST = "0.0.0.0"` di `mt5_bridge.py`, lalu di dashboard masukkan IP PC kamu, contoh: `ws://192.168.1.5:8765`

**Q: Kenapa "gagal connect" padahal bridge sudah jalan?**  
A: Pastikan firewall Windows mengizinkan port 8765. Tambahkan exception di Windows Defender Firewall.

**Q: Apakah aman deploy ke GitHub Pages?**  
A: Dashboard hanya bisa connect ke bridge lokal kamu. Tidak ada data akun yang dikirim ke server manapun.

---

## 📄 License

MIT — Bebas digunakan untuk keperluan pribadi dan komersial.
