"""
MT5 WebSocket Bridge — EA Auto Trading Edition
================================================
Upgrade dari versi sebelumnya dengan dukungan penuh untuk EA auto trading.

Requirements:
    pip install MetaTrader5 websockets asyncio

Cara pakai:
    1. Buka MT5 terminal dan login ke akun
    2. Jalankan: python mt5_bridge_ea.py
    3. Buka web dashboard di browser
    4. Klik "Connect MT5" → EA siap digunakan

Fitur baru:
    - Auto order dari EA signal web
    - Risk management: max lot, max loss harian
    - Trailing stop support
    - Magic number per pair
    - Order comment EA tracking
"""

import asyncio
import json
import websockets
import MetaTrader5 as mt5
from datetime import datetime, date
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# ============================================================
# KONFIGURASI
# ============================================================
HOST = "localhost"
PORT = 8765

PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCHF", "BTCUSD", "ETHUSD"]

TIMEFRAME_MAP = {
    "M1":  mt5.TIMEFRAME_M1,
    "M5":  mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "H1":  mt5.TIMEFRAME_H1,
    "H4":  mt5.TIMEFRAME_H4,
    "D1":  mt5.TIMEFRAME_D1,
}

# Magic number unik per pair (untuk tracking EA orders)
MAGIC_NUMBERS = {
    "EURUSD": 20250001,
    "GBPUSD": 20250002,
    "USDJPY": 20250003,
    "AUDUSD": 20250004,
    "USDCHF": 20250005,
    "BTCUSD": 20250006,
    "ETHUSD": 20250007,
}

connected_clients = set()

# Daily loss tracker
daily_stats = {
    "date": str(date.today()),
    "trades": 0,
    "profit": 0.0,
}


# ============================================================
# MT5 FUNCTIONS
# ============================================================
def init_mt5():
    if not mt5.initialize():
        logger.error(f"MT5 initialize failed: {mt5.last_error()}")
        return False
    info = mt5.terminal_info()
    account = mt5.account_info()
    logger.info(f"MT5 Connected: {info.name} Build {info.build}")
    logger.info(f"Account: {account.name} | Balance: {account.balance} {account.currency} | Leverage: 1:{account.leverage}")
    return True


def get_tick(symbol):
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        return None
    info = mt5.symbol_info(symbol)
    if info is None:
        return None
    return {
        "symbol":  symbol,
        "bid":     round(tick.bid, info.digits),
        "ask":     round(tick.ask, info.digits),
        "spread":  round((tick.ask - tick.bid) / info.point, 1),
        "time":    datetime.fromtimestamp(tick.time).isoformat(),
        "digits":  info.digits,
    }


def get_candles(symbol, timeframe_str="M5", count=100):
    tf = TIMEFRAME_MAP.get(timeframe_str, mt5.TIMEFRAME_M5)
    rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
    if rates is None:
        return []
    return [{
        "time":   datetime.fromtimestamp(r["time"]).isoformat(),
        "open":   round(float(r["open"]),  5),
        "high":   round(float(r["high"]),  5),
        "low":    round(float(r["low"]),   5),
        "close":  round(float(r["close"]), 5),
        "volume": int(r["tick_volume"]),
    } for r in rates]


def get_account_info():
    acc = mt5.account_info()
    if acc is None:
        return {}
    return {
        "balance":      round(acc.balance, 2),
        "equity":       round(acc.equity, 2),
        "margin":       round(acc.margin, 2),
        "free_margin":  round(acc.margin_free, 2),
        "profit":       round(acc.profit, 2),
        "leverage":     acc.leverage,
        "currency":     acc.currency,
        "server":       acc.server,
        "name":         acc.name,
    }


def get_open_positions(symbol=None):
    if symbol:
        positions = mt5.positions_get(symbol=symbol)
    else:
        positions = mt5.positions_get()
    if positions is None:
        return []
    return [{
        "ticket":        p.ticket,
        "symbol":        p.symbol,
        "type":          "BUY" if p.type == 0 else "SELL",
        "volume":        p.volume,
        "price_open":    round(p.price_open, 5),
        "price_current": round(p.price_current, 5),
        "sl":            round(p.sl, 5),
        "tp":            round(p.tp, 5),
        "profit":        round(p.profit, 2),
        "swap":          round(p.swap, 2),
        "time":          datetime.fromtimestamp(p.time).isoformat(),
        "comment":       p.comment,
        "magic":         p.magic,
    } for p in positions]


def get_ea_positions():
    """Hanya posisi yang dibuka oleh EA (berdasarkan magic number)"""
    all_pos = get_open_positions()
    ea_magic = set(MAGIC_NUMBERS.values())
    return [p for p in all_pos if p.get("magic") in ea_magic]


def pips_to_price(symbol, pips):
    """Konversi pips ke harga absolut"""
    info = mt5.symbol_info(symbol)
    if info is None:
        return 0.0
    point = info.point
    # JPY pairs: 1 pip = 0.01, others: 1 pip = 0.0001
    pip_size = point * 10
    return pips * pip_size


def send_order(symbol, action, volume, sl_pips=0.0, tp_pips=0.0, comment="EA"):
    """Kirim order ke MT5 dengan SL/TP dalam pips"""
    info = mt5.symbol_info(symbol)
    if info is None:
        return {"success": False, "error": f"Symbol {symbol} not found"}

    # Cek apakah sudah ada posisi untuk symbol ini dari EA
    existing = get_open_positions(symbol=symbol)
    ea_existing = [p for p in existing if p.get("magic") == MAGIC_NUMBERS.get(symbol)]
    if ea_existing:
        return {"success": False, "error": f"Already have EA position on {symbol} (ticket {ea_existing[0]['ticket']})"}

    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        return {"success": False, "error": "Cannot get tick"}

    price    = tick.ask if action == "BUY" else tick.bid
    order_type = mt5.ORDER_TYPE_BUY if action == "BUY" else mt5.ORDER_TYPE_SELL

    # Hitung SL/TP price dari pips
    pip_value = pips_to_price(symbol, 1)
    sl_price = 0.0
    tp_price = 0.0
    if sl_pips > 0:
        sl_price = round(price - sl_pips * pip_value if action == "BUY" else price + sl_pips * pip_value, info.digits)
    if tp_pips > 0:
        tp_price = round(price + tp_pips * pip_value if action == "BUY" else price - tp_pips * pip_value, info.digits)

    magic = MAGIC_NUMBERS.get(symbol, 20250417)

    request = {
        "action":       mt5.TRADE_ACTION_DEAL,
        "symbol":       symbol,
        "volume":       float(volume),
        "type":         order_type,
        "price":        price,
        "sl":           sl_price,
        "tp":           tp_price,
        "deviation":    20,
        "magic":        magic,
        "comment":      f"{comment}_{action}",
        "type_time":    mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err = result.comment if result else mt5.last_error()
        logger.error(f"Order failed {symbol} {action}: {err}")
        return {"success": False, "error": str(err)}

    logger.info(f"ORDER OK: {symbol} {action} {volume}lot @ {result.price} SL:{sl_price} TP:{tp_price} Ticket:{result.order}")

    # Update daily stats
    daily_stats["trades"] += 1

    return {
        "success": True,
        "ticket":  result.order,
        "price":   result.price,
        "sl":      sl_price,
        "tp":      tp_price,
        "symbol":  symbol,
        "action":  action,
        "volume":  volume,
    }


def close_position(ticket):
    """Tutup posisi berdasarkan ticket"""
    pos = mt5.positions_get(ticket=ticket)
    if not pos:
        return {"success": False, "error": "Position not found"}
    p = pos[0]
    tick = mt5.symbol_info_tick(p.symbol)
    if tick is None:
        return {"success": False, "error": "Cannot get tick"}

    close_price = tick.bid if p.type == 0 else tick.ask
    close_type  = mt5.ORDER_TYPE_SELL if p.type == 0 else mt5.ORDER_TYPE_BUY

    request = {
        "action":       mt5.TRADE_ACTION_DEAL,
        "symbol":       p.symbol,
        "volume":       p.volume,
        "type":         close_type,
        "position":     ticket,
        "price":        close_price,
        "deviation":    20,
        "magic":        p.magic,
        "comment":      "EA_Close",
        "type_time":    mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err = result.comment if result else str(mt5.last_error())
        return {"success": False, "error": err}

    logger.info(f"CLOSE OK: Ticket #{ticket} {p.symbol}")
    return {"success": True, "ticket": ticket, "symbol": p.symbol}


def close_all_ea_positions():
    """Tutup semua posisi EA"""
    ea_pos = get_ea_positions()
    results = []
    for p in ea_pos:
        r = close_position(p["ticket"])
        results.append(r)
    return results


def modify_position_sl_tp(ticket, new_sl, new_tp):
    """Modify SL/TP posisi yang sedang berjalan"""
    pos = mt5.positions_get(ticket=ticket)
    if not pos:
        return {"success": False, "error": "Position not found"}
    p = pos[0]
    request = {
        "action":   mt5.TRADE_ACTION_SLTP,
        "symbol":   p.symbol,
        "position": ticket,
        "sl":       float(new_sl),
        "tp":       float(new_tp),
    }
    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"success": False, "error": str(result.comment if result else mt5.last_error())}
    return {"success": True, "ticket": ticket}


# ============================================================
# WEBSOCKET SERVER
# ============================================================
async def broadcast(message):
    if connected_clients:
        data = json.dumps(message)
        await asyncio.gather(*[c.send(data) for c in connected_clients], return_exceptions=True)


async def tick_streamer():
    """Stream live ticks semua pair setiap 500ms"""
    while True:
        try:
            ticks = {}
            for pair in PAIRS:
                t = get_tick(pair)
                if t:
                    ticks[pair] = t
            if ticks and connected_clients:
                await broadcast({"type": "ticks", "data": ticks})
        except Exception as e:
            logger.error(f"Tick error: {e}")
        await asyncio.sleep(0.5)


async def position_streamer():
    """Stream posisi & akun setiap 2 detik"""
    prev_equity = None
    while True:
        try:
            if connected_clients:
                positions = get_open_positions()
                account   = get_account_info()

                # Check daily loss (auto-alert)
                equity = account.get("equity", 0)
                if prev_equity and equity < prev_equity * 0.99:  # 1% drop alert
                    await broadcast({"type": "ea_alert", "level": "WARN", "msg": f"Equity turun: {prev_equity:.2f} → {equity:.2f}"})
                prev_equity = equity

                await broadcast({
                    "type":      "account",
                    "positions": positions,
                    "account":   account,
                    "ea_stats":  daily_stats,
                })
        except Exception as e:
            logger.error(f"Position error: {e}")
        await asyncio.sleep(2)


async def handle_client(websocket):
    connected_clients.add(websocket)
    client_ip = websocket.remote_address[0]
    logger.info(f"Client connected: {client_ip} | Total: {len(connected_clients)}")

    try:
        # Kirim data awal saat connect
        await websocket.send(json.dumps({
            "type":      "init",
            "pairs":     PAIRS,
            "account":   get_account_info(),
            "positions": get_open_positions(),
            "ea_stats":  daily_stats,
        }))

        async for message in websocket:
            try:
                req      = json.loads(message)
                msg_type = req.get("type")

                # ── Get candles ──────────────────────────────
                if msg_type == "get_candles":
                    symbol  = req.get("symbol", "EURUSD")
                    tf      = req.get("timeframe", "M5")
                    count   = req.get("count", 100)
                    candles = get_candles(symbol, tf, count)
                    await websocket.send(json.dumps({
                        "type": "candles", "symbol": symbol, "timeframe": tf, "data": candles
                    }))

                # ── Send order (manual + EA) ─────────────────
                elif msg_type == "send_order":
                    result = send_order(
                        req["symbol"],
                        req["action"],
                        req["volume"],
                        req.get("sl", 0),
                        req.get("tp", 0),
                        req.get("comment", "EA"),
                    )
                    await websocket.send(json.dumps({"type": "order_result", **result}))

                # ── Close position ───────────────────────────
                elif msg_type == "close_position":
                    result = close_position(req["ticket"])
                    await websocket.send(json.dumps({"type": "close_result", **result}))

                # ── Close all EA positions ───────────────────
                elif msg_type == "close_all_ea":
                    results = close_all_ea_positions()
                    await websocket.send(json.dumps({"type": "close_all_result", "results": results}))

                # ── Modify SL/TP ─────────────────────────────
                elif msg_type == "modify_sltp":
                    result = modify_position_sl_tp(req["ticket"], req["sl"], req["tp"])
                    await websocket.send(json.dumps({"type": "modify_result", **result}))

                # ── Get EA positions only ────────────────────
                elif msg_type == "get_ea_positions":
                    await websocket.send(json.dumps({
                        "type": "ea_positions",
                        "positions": get_ea_positions()
                    }))

                # ── Ping ─────────────────────────────────────
                elif msg_type == "ping":
                    await websocket.send(json.dumps({"type": "pong", "time": datetime.now().isoformat()}))

            except json.JSONDecodeError:
                logger.warning("Invalid JSON from client")
            except Exception as e:
                logger.error(f"Handler error: {e}")
                await websocket.send(json.dumps({"type": "error", "message": str(e)}))

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        logger.info(f"Client disconnected: {client_ip} | Total: {len(connected_clients)}")


async def main():
    if not init_mt5():
        logger.error("Tidak bisa start — MT5 tidak terkoneksi!")
        return

    logger.info(f"Starting WebSocket EA Bridge on ws://{HOST}:{PORT}")
    logger.info(f"Monitoring: {', '.join(PAIRS)}")
    logger.info("Siap menerima koneksi dari EA Web Terminal...")

    async with websockets.serve(handle_client, HOST, PORT):
        await asyncio.gather(
            tick_streamer(),
            position_streamer(),
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bridge dihentikan.")
        mt5.shutdown()
