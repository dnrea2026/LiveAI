"""
MT5 WebSocket Bridge - Multi Pair Forex
========================================
Jalankan script ini di PC Windows yang sudah install MT5.

Requirements:
    pip install MetaTrader5 websockets asyncio

Cara pakai:
    1. Buka MT5 terminal dan login ke akun
    2. Jalankan: python mt5_bridge.py
    3. Buka web dashboard di browser
    4. Klik "Connect" dan masukkan: ws://localhost:8765
"""

import asyncio
import json
import websockets
import MetaTrader5 as mt5
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# ============================================================
# KONFIGURASI
# ============================================================
HOST = "localhost"
PORT = 8765

PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCHF"]

TIMEFRAME_MAP = {
    "M1":  mt5.TIMEFRAME_M1,
    "M5":  mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "H1":  mt5.TIMEFRAME_H1,
    "H4":  mt5.TIMEFRAME_H4,
    "D1":  mt5.TIMEFRAME_D1,
}

connected_clients = set()

# ============================================================
# MT5 FUNCTIONS
# ============================================================
def init_mt5():
    if not mt5.initialize():
        logger.error(f"MT5 initialize failed: {mt5.last_error()}")
        return False
    info = mt5.terminal_info()
    logger.info(f"MT5 Connected: {info.name} | Build {info.build}")
    return True


def get_tick(symbol):
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        return None
    info = mt5.symbol_info(symbol)
    return {
        "symbol": symbol,
        "bid": round(tick.bid, info.digits),
        "ask": round(tick.ask, info.digits),
        "spread": round((tick.ask - tick.bid) / mt5.symbol_info(symbol).point, 1),
        "time": datetime.fromtimestamp(tick.time).isoformat(),
        "digits": info.digits,
    }


def get_candles(symbol, timeframe_str="M5", count=100):
    tf = TIMEFRAME_MAP.get(timeframe_str, mt5.TIMEFRAME_M5)
    rates = mt5.copy_rates_from_pos(symbol, tf, 0, count)
    if rates is None:
        return []
    candles = []
    for r in rates:
        candles.append({
            "time": datetime.fromtimestamp(r['time']).isoformat(),
            "open":  round(float(r['open']), 5),
            "high":  round(float(r['high']), 5),
            "low":   round(float(r['low']), 5),
            "close": round(float(r['close']), 5),
            "volume": int(r['tick_volume']),
        })
    return candles


def get_account_info():
    acc = mt5.account_info()
    if acc is None:
        return {}
    return {
        "balance":  round(acc.balance, 2),
        "equity":   round(acc.equity, 2),
        "margin":   round(acc.margin, 2),
        "free_margin": round(acc.margin_free, 2),
        "profit":   round(acc.profit, 2),
        "leverage": acc.leverage,
        "currency": acc.currency,
        "server":   acc.server,
        "name":     acc.name,
    }


def get_open_positions():
    positions = mt5.positions_get()
    if positions is None:
        return []
    result = []
    for p in positions:
        result.append({
            "ticket":  p.ticket,
            "symbol":  p.symbol,
            "type":    "BUY" if p.type == 0 else "SELL",
            "volume":  p.volume,
            "price_open": round(p.price_open, 5),
            "price_current": round(p.price_current, 5),
            "sl": round(p.sl, 5),
            "tp": round(p.tp, 5),
            "profit": round(p.profit, 2),
            "swap":   round(p.swap, 2),
            "time":   datetime.fromtimestamp(p.time).isoformat(),
            "comment": p.comment,
        })
    return result


def send_order(symbol, action, volume, sl=0.0, tp=0.0, comment="WebDash"):
    info = mt5.symbol_info(symbol)
    if info is None:
        return {"success": False, "error": f"Symbol {symbol} not found"}

    tick = mt5.symbol_info_tick(symbol)
    price = tick.ask if action == "BUY" else tick.bid
    order_type = mt5.ORDER_TYPE_BUY if action == "BUY" else mt5.ORDER_TYPE_SELL

    request = {
        "action":      mt5.TRADE_ACTION_DEAL,
        "symbol":      symbol,
        "volume":      float(volume),
        "type":        order_type,
        "price":       price,
        "sl":          float(sl) if sl else 0.0,
        "tp":          float(tp) if tp else 0.0,
        "deviation":   20,
        "magic":       20250417,
        "comment":     comment,
        "type_time":   mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"success": False, "error": f"Order failed: {result.comment} (code {result.retcode})"}
    return {"success": True, "ticket": result.order, "price": result.price}


def close_position(ticket):
    pos = mt5.positions_get(ticket=ticket)
    if not pos:
        return {"success": False, "error": "Position not found"}
    p = pos[0]
    tick = mt5.symbol_info_tick(p.symbol)
    close_price = tick.bid if p.type == 0 else tick.ask
    close_type = mt5.ORDER_TYPE_SELL if p.type == 0 else mt5.ORDER_TYPE_BUY

    request = {
        "action":      mt5.TRADE_ACTION_DEAL,
        "symbol":      p.symbol,
        "volume":      p.volume,
        "type":        close_type,
        "position":    ticket,
        "price":       close_price,
        "deviation":   20,
        "magic":       20250417,
        "comment":     "Close by WebDash",
        "type_time":   mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    result = mt5.order_send(request)
    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {"success": False, "error": result.comment}
    return {"success": True}


# ============================================================
# WEBSOCKET SERVER
# ============================================================
async def broadcast(message):
    if connected_clients:
        data = json.dumps(message)
        await asyncio.gather(*[c.send(data) for c in connected_clients], return_exceptions=True)


async def tick_streamer():
    """Stream live ticks for all pairs every 500ms"""
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
    """Stream open positions every 2s"""
    while True:
        try:
            if connected_clients:
                positions = get_open_positions()
                account = get_account_info()
                await broadcast({
                    "type": "account",
                    "positions": positions,
                    "account": account
                })
        except Exception as e:
            logger.error(f"Position error: {e}")
        await asyncio.sleep(2)


async def handle_client(websocket):
    connected_clients.add(websocket)
    client_ip = websocket.remote_address[0]
    logger.info(f"Client connected: {client_ip} | Total: {len(connected_clients)}")

    try:
        # Send initial data on connect
        await websocket.send(json.dumps({
            "type": "init",
            "pairs": PAIRS,
            "account": get_account_info(),
            "positions": get_open_positions(),
        }))

        async for message in websocket:
            try:
                req = json.loads(message)
                msg_type = req.get("type")

                if msg_type == "get_candles":
                    symbol = req.get("symbol", "EURUSD")
                    tf     = req.get("timeframe", "M5")
                    count  = req.get("count", 100)
                    candles = get_candles(symbol, tf, count)
                    await websocket.send(json.dumps({
                        "type": "candles",
                        "symbol": symbol,
                        "timeframe": tf,
                        "data": candles
                    }))

                elif msg_type == "send_order":
                    result = send_order(
                        req["symbol"], req["action"],
                        req["volume"],
                        req.get("sl", 0), req.get("tp", 0)
                    )
                    await websocket.send(json.dumps({
                        "type": "order_result", **result
                    }))

                elif msg_type == "close_position":
                    result = close_position(req["ticket"])
                    await websocket.send(json.dumps({
                        "type": "close_result", **result
                    }))

                elif msg_type == "ping":
                    await websocket.send(json.dumps({"type": "pong"}))

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
        logger.error("Cannot start — MT5 not connected!")
        return

    logger.info(f"Starting WebSocket server on ws://{HOST}:{PORT}")
    logger.info(f"Monitoring pairs: {', '.join(PAIRS)}")

    async with websockets.serve(handle_client, HOST, PORT):
        await asyncio.gather(
            tick_streamer(),
            position_streamer(),
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bridge stopped.")
        mt5.shutdown()
