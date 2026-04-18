import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// ===================== PAIR CATEGORIES (Exness Full List) =====================
const PAIR_CATEGORIES = {
  "Majors":   ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCHF","USDCAD","NZDUSD"],
  "Minors":   ["EURGBP","EURJPY","EURCHF","EURAUD","EURCAD","EURNZD","GBPJPY","GBPCHF","GBPAUD","GBPCAD","GBPNZD","AUDJPY","AUDCHF","AUDCAD","AUDNZD","CADJPY","CADCHF","CHFJPY","NZDJPY","NZDCHF","NZDCAD"],
  "Exotics":  ["USDZAR","USDMXN","USDNOK","USDSEK","USDSGD","USDCNH","USDTRY","USDHUF","USDPLN","EURNOK","EURSEK","EURTRY","EURHUF","EURPLN","GBPTRY","GBPNOK","GBPSEK"],
  "Metals":   ["XAUUSD","XAGUSD","XPTUSD","XPDUSD","XAUEUR","XAUGBP"],
  "Energy":   ["USOIL","UKOIL","NATGAS"],
  "Indices":  ["US500","US30","US100","UK100","GER40","FRA40","JPN225","AUS200","HK50","STOXX50"],
  "Crypto":   ["BTCUSD","ETHUSD","LTCUSD","XRPUSD","BNBUSD","SOLUSD","DOGEUSD","ADAUSD","DOTUSD","AVAXUSD","LINKUSD"],
};
const PAIRS = Object.values(PAIR_CATEGORIES).flat();

const PAIR_FLAGS = {
  // Majors
  EURUSD:"🇪🇺🇺🇸", GBPUSD:"🇬🇧🇺🇸", USDJPY:"🇺🇸🇯🇵", AUDUSD:"🇦🇺🇺🇸", USDCHF:"🇺🇸🇨🇭", USDCAD:"🇺🇸🇨🇦", NZDUSD:"🇳🇿🇺🇸",
  // Minors
  EURGBP:"🇪🇺🇬🇧", EURJPY:"🇪🇺🇯🇵", EURCHF:"🇪🇺🇨🇭", EURAUD:"🇪🇺🇦🇺", EURCAD:"🇪🇺🇨🇦", EURNZD:"🇪🇺🇳🇿",
  GBPJPY:"🇬🇧🇯🇵", GBPCHF:"🇬🇧🇨🇭", GBPAUD:"🇬🇧🇦🇺", GBPCAD:"🇬🇧🇨🇦", GBPNZD:"🇬🇧🇳🇿",
  AUDJPY:"🇦🇺🇯🇵", AUDCHF:"🇦🇺🇨🇭", AUDCAD:"🇦🇺🇨🇦", AUDNZD:"🇦🇺🇳🇿",
  CADJPY:"🇨🇦🇯🇵", CADCHF:"🇨🇦🇨🇭", CHFJPY:"🇨🇭🇯🇵",
  NZDJPY:"🇳🇿🇯🇵", NZDCHF:"🇳🇿🇨🇭", NZDCAD:"🇳🇿🇨🇦",
  // Exotics
  USDZAR:"🇺🇸🇿🇦", USDMXN:"🇺🇸🇲🇽", USDNOK:"🇺🇸🇳🇴", USDSEK:"🇺🇸🇸🇪", USDSGD:"🇺🇸🇸🇬", USDCNH:"🇺🇸🇨🇳",
  USDTRY:"🇺🇸🇹🇷", USDHUF:"🇺🇸🇭🇺", USDPLN:"🇺🇸🇵🇱",
  EURNOK:"🇪🇺🇳🇴", EURSEK:"🇪🇺🇸🇪", EURTRY:"🇪🇺🇹🇷", EURHUF:"🇪🇺🇭🇺", EURPLN:"🇪🇺🇵🇱",
  GBPTRY:"🇬🇧🇹🇷", GBPNOK:"🇬🇧🇳🇴", GBPSEK:"🇬🇧🇸🇪",
  // Metals
  XAUUSD:"🥇🇺🇸", XAGUSD:"🥈🇺🇸", XPTUSD:"⬜🇺🇸", XPDUSD:"🔘🇺🇸", XAUEUR:"🥇🇪🇺", XAUGBP:"🥇🇬🇧",
  // Energy
  USOIL:"🛢️🇺🇸", UKOIL:"🛢️🇬🇧", NATGAS:"🔥🇺🇸",
  // Indices
  US500:"📊🇺🇸", US30:"📈🇺🇸", US100:"💻🇺🇸", UK100:"📊🇬🇧", GER40:"📊🇩🇪", FRA40:"📊🇫🇷", JPN225:"📊🇯🇵", AUS200:"📊🇦🇺", HK50:"📊🇭🇰", STOXX50:"📊🇪🇺",
  // Crypto
  BTCUSD:"₿🇺🇸", ETHUSD:"Ξ🇺🇸", LTCUSD:"Ł🇺🇸", XRPUSD:"✕🇺🇸", BNBUSD:"🔶🇺🇸", SOLUSD:"◎🇺🇸", DOGEUSD:"🐕🇺🇸", ADAUSD:"🔵🇺🇸", DOTUSD:"⚫🇺🇸", AVAXUSD:"🔺🇺🇸", LINKUSD:"🔗🇺🇸",
};

const PAIR_NAMES = {
  // Majors
  EURUSD:"Euro / Dollar", GBPUSD:"Pound / Dollar", USDJPY:"Dollar / Yen", AUDUSD:"Aussie / Dollar", USDCHF:"Dollar / Franc", USDCAD:"Dollar / Canadian", NZDUSD:"Kiwi / Dollar",
  // Minors
  EURGBP:"Euro / Pound", EURJPY:"Euro / Yen", EURCHF:"Euro / Franc", EURAUD:"Euro / Aussie", EURCAD:"Euro / Canadian", EURNZD:"Euro / Kiwi",
  GBPJPY:"Pound / Yen", GBPCHF:"Pound / Franc", GBPAUD:"Pound / Aussie", GBPCAD:"Pound / Canadian", GBPNZD:"Pound / Kiwi",
  AUDJPY:"Aussie / Yen", AUDCHF:"Aussie / Franc", AUDCAD:"Aussie / Canadian", AUDNZD:"Aussie / Kiwi",
  CADJPY:"Canadian / Yen", CADCHF:"Canadian / Franc", CHFJPY:"Franc / Yen",
  NZDJPY:"Kiwi / Yen", NZDCHF:"Kiwi / Franc", NZDCAD:"Kiwi / Canadian",
  // Exotics
  USDZAR:"Dollar / Rand", USDMXN:"Dollar / Peso", USDNOK:"Dollar / Krone", USDSEK:"Dollar / Krona", USDSGD:"Dollar / Singapore", USDCNH:"Dollar / Yuan",
  USDTRY:"Dollar / Lira", USDHUF:"Dollar / Forint", USDPLN:"Dollar / Zloty",
  EURNOK:"Euro / Krone", EURSEK:"Euro / Krona", EURTRY:"Euro / Lira", EURHUF:"Euro / Forint", EURPLN:"Euro / Zloty",
  GBPTRY:"Pound / Lira", GBPNOK:"Pound / Krone", GBPSEK:"Pound / Krona",
  // Metals
  XAUUSD:"Gold / Dollar", XAGUSD:"Silver / Dollar", XPTUSD:"Platinum / Dollar", XPDUSD:"Palladium / Dollar", XAUEUR:"Gold / Euro", XAUGBP:"Gold / Pound",
  // Energy
  USOIL:"WTI Crude Oil", UKOIL:"Brent Crude Oil", NATGAS:"Natural Gas",
  // Indices
  US500:"S&P 500", US30:"Dow Jones", US100:"NASDAQ 100", UK100:"FTSE 100", GER40:"DAX 40", FRA40:"CAC 40", JPN225:"Nikkei 225", AUS200:"ASX 200", HK50:"Hang Seng 50", STOXX50:"Euro Stoxx 50",
  // Crypto
  BTCUSD:"Bitcoin / Dollar", ETHUSD:"Ethereum / Dollar", LTCUSD:"Litecoin / Dollar", XRPUSD:"Ripple / Dollar", BNBUSD:"BNB / Dollar", SOLUSD:"Solana / Dollar", DOGEUSD:"Dogecoin / Dollar", ADAUSD:"Cardano / Dollar", DOTUSD:"Polkadot / Dollar", AVAXUSD:"Avalanche / Dollar", LINKUSD:"Chainlink / Dollar",
};

const TIMEFRAMES = ["M1","M5","M15","H1","H4","D1"];

const BASE_PRICES = {
  // Majors
  EURUSD:1.0845, GBPUSD:1.2734, USDJPY:154.21, AUDUSD:0.6412, USDCHF:0.9023, USDCAD:1.3582, NZDUSD:0.5882,
  // Minors
  EURGBP:0.8516, EURJPY:167.15, EURCHF:0.9778, EURAUD:1.6912, EURCAD:1.4723, EURNZD:1.8435,
  GBPJPY:196.38, GBPCHF:1.1484, GBPAUD:1.9858, GBPCAD:1.7282, GBPNZD:2.1645,
  AUDJPY:98.84, AUDCHF:0.5782, AUDCAD:0.8717, AUDNZD:1.0894,
  CADJPY:113.56, CADCHF:0.6640, CHFJPY:171.05,
  NZDJPY:90.68, NZDCHF:0.5313, NZDCAD:0.8054,
  // Exotics
  USDZAR:18.24, USDMXN:17.32, USDNOK:10.58, USDSEK:10.32, USDSGD:1.342, USDCNH:7.240,
  USDTRY:35.80, USDHUF:368.50, USDPLN:3.985,
  EURNOK:11.47, EURSEK:11.20, EURTRY:38.82, EURHUF:399.50, EURPLN:4.320,
  GBPTRY:45.62, GBPNOK:13.48, GBPSEK:13.16,
  // Metals
  XAUUSD:2320.50, XAGUSD:27.45, XPTUSD:982.00, XPDUSD:1048.00, XAUEUR:2139.20, XAUGBP:1824.80,
  // Energy
  USOIL:82.50, UKOIL:87.20, NATGAS:2.145,
  // Indices
  US500:5248.50, US30:38850.00, US100:18245.00, UK100:8215.00, GER40:17820.00, FRA40:7985.00, JPN225:38250.00, AUS200:7845.00, HK50:17520.00, STOXX50:4985.00,
  // Crypto
  BTCUSD:77071.22, ETHUSD:2419.93, LTCUSD:84.50, XRPUSD:0.5215, BNBUSD:382.50, SOLUSD:155.40, DOGEUSD:0.18420, ADAUSD:0.45120, DOTUSD:6.850, AVAXUSD:28.45, LINKUSD:13.25,
};

const DIGITS = {
  // Majors
  EURUSD:5, GBPUSD:5, USDJPY:3, AUDUSD:5, USDCHF:5, USDCAD:5, NZDUSD:5,
  // Minors
  EURGBP:5, EURJPY:3, EURCHF:5, EURAUD:5, EURCAD:5, EURNZD:5,
  GBPJPY:3, GBPCHF:5, GBPAUD:5, GBPCAD:5, GBPNZD:5,
  AUDJPY:3, AUDCHF:5, AUDCAD:5, AUDNZD:5,
  CADJPY:3, CADCHF:5, CHFJPY:3,
  NZDJPY:3, NZDCHF:5, NZDCAD:5,
  // Exotics
  USDZAR:5, USDMXN:5, USDNOK:5, USDSEK:5, USDSGD:5, USDCNH:5,
  USDTRY:3, USDHUF:3, USDPLN:5,
  EURNOK:5, EURSEK:5, EURTRY:3, EURHUF:3, EURPLN:5,
  GBPTRY:3, GBPNOK:5, GBPSEK:5,
  // Metals
  XAUUSD:2, XAGUSD:3, XPTUSD:2, XPDUSD:2, XAUEUR:2, XAUGBP:2,
  // Energy
  USOIL:2, UKOIL:2, NATGAS:3,
  // Indices
  US500:2, US30:2, US100:2, UK100:2, GER40:2, FRA40:2, JPN225:2, AUS200:2, HK50:2, STOXX50:2,
  // Crypto
  BTCUSD:2, ETHUSD:2, LTCUSD:2, XRPUSD:5, BNBUSD:2, SOLUSD:2, DOGEUSD:5, ADAUSD:5, DOTUSD:3, AVAXUSD:2, LINKUSD:3,
};

// Smart SL/TP defaults per instrument (in pips, Exness convention)
const PAIR_SLTP = {
  // Forex Majors  (1 pip = 0.0001)
  EURUSD:{sl:80,tp:200},  GBPUSD:{sl:100,tp:250}, USDJPY:{sl:80,tp:200},
  AUDUSD:{sl:80,tp:200},  USDCHF:{sl:80,tp:200},  USDCAD:{sl:80,tp:200}, NZDUSD:{sl:80,tp:200},
  // Forex Minors
  EURGBP:{sl:80,tp:200},  EURJPY:{sl:100,tp:250}, EURCHF:{sl:80,tp:200},
  EURAUD:{sl:100,tp:250}, EURCAD:{sl:100,tp:250}, EURNZD:{sl:100,tp:250},
  GBPJPY:{sl:150,tp:400}, GBPCHF:{sl:120,tp:300}, GBPAUD:{sl:150,tp:380},
  GBPCAD:{sl:130,tp:330}, GBPNZD:{sl:150,tp:380},
  AUDJPY:{sl:100,tp:250}, AUDCHF:{sl:80,tp:200},  AUDCAD:{sl:80,tp:200},  AUDNZD:{sl:80,tp:200},
  CADJPY:{sl:100,tp:250}, CADCHF:{sl:80,tp:200},  CHFJPY:{sl:100,tp:250},
  NZDJPY:{sl:100,tp:250}, NZDCHF:{sl:80,tp:200},  NZDCAD:{sl:80,tp:200},
  // Exotics
  USDZAR:{sl:300,tp:750}, USDMXN:{sl:300,tp:750}, USDNOK:{sl:200,tp:500},
  USDSEK:{sl:200,tp:500}, USDSGD:{sl:150,tp:380}, USDCNH:{sl:200,tp:500},
  USDTRY:{sl:400,tp:1000},USDHUF:{sl:300,tp:750}, USDPLN:{sl:200,tp:500},
  EURNOK:{sl:200,tp:500}, EURSEK:{sl:200,tp:500}, EURTRY:{sl:400,tp:1000},
  EURHUF:{sl:300,tp:750}, EURPLN:{sl:200,tp:500},
  GBPTRY:{sl:500,tp:1200},GBPNOK:{sl:200,tp:500}, GBPSEK:{sl:200,tp:500},
  // Metals  (XAUUSD: 1 pip=$0.01, SL 500 pip = $50/0.01lot)
  XAUUSD:{sl:800,tp:2000}, XAGUSD:{sl:300,tp:750},
  XPTUSD:{sl:500,tp:1250}, XPDUSD:{sl:600,tp:1500},
  XAUEUR:{sl:800,tp:2000}, XAUGBP:{sl:800,tp:2000},
  // Energy
  USOIL:{sl:150,tp:380},  UKOIL:{sl:150,tp:380},  NATGAS:{sl:100,tp:250},
  // Indices  (point-based)
  US500:{sl:50,tp:125},   US30:{sl:300,tp:750},   US100:{sl:150,tp:375},
  UK100:{sl:150,tp:375},  GER40:{sl:200,tp:500},  FRA40:{sl:150,tp:375},
  JPN225:{sl:300,tp:750}, AUS200:{sl:100,tp:250},  HK50:{sl:200,tp:500},  STOXX50:{sl:100,tp:250},
  // Crypto
  BTCUSD:{sl:1500,tp:4000}, ETHUSD:{sl:200,tp:500},
  LTCUSD:{sl:100,tp:250},   XRPUSD:{sl:150,tp:380},
  BNBUSD:{sl:200,tp:500},   SOLUSD:{sl:200,tp:500},
  DOGEUSD:{sl:150,tp:380},  ADAUSD:{sl:150,tp:380},
  DOTUSD:{sl:150,tp:380},   AVAXUSD:{sl:200,tp:500}, LINKUSD:{sl:150,tp:380},
};
function getDefaultSLTP(symbol) {
  return PAIR_SLTP[symbol] || { sl:200, tp:500 };
}

// Get instrument category
function getPairCategory(symbol) {
  for (const [cat, pairs] of Object.entries(PAIR_CATEGORIES)) {
    if (pairs.includes(symbol)) return cat;
  }
  return "Forex";
}

// Pip size in price units per instrument (Exness convention)
function getPipSize(symbol) {
  const digits = DIGITS[symbol] || 5;
  // Crypto overrides
  if (symbol === "BTCUSD")   return 1.0;    // 1 pip = $1.00
  if (symbol === "ETHUSD")   return 0.5;    // 1 pip = $0.50
  if (["BNBUSD","SOLUSD","AVAXUSD","LTCUSD"].includes(symbol)) return 0.1;
  if (["DOTUSD","LINKUSD"].includes(symbol)) return 0.01;
  // Indices
  if (["US30","JPN225","GER40"].includes(symbol))    return 1.0;
  if (["US500","US100","UK100","FRA40","AUS200","HK50","STOXX50"].includes(symbol)) return 0.1;
  // Energy
  if (["USOIL","UKOIL"].includes(symbol)) return 0.01;
  if (symbol === "NATGAS")   return 0.001;
  // Default: 10^-(digits-1)
  return Math.pow(10, -(digits - 1));
}

// Convert pips to price distance
function pipsToPrice(symbol, pips) {
  return +(pips * getPipSize(symbol)).toFixed(DIGITS[symbol] || 5);
}

// Convert price distance to pips
function priceToPips(symbol, priceDiff) {
  return Math.round(Math.abs(priceDiff) / getPipSize(symbol));
}

// Calculate SL/TP price levels from entry + pips
function calcSLTP(symbol, action, entryPrice, slPips, tpPips) {
  const slDist = pipsToPrice(symbol, slPips);
  const tpDist = pipsToPrice(symbol, tpPips);
  const sl = action === "BUY" ? +(entryPrice - slDist).toFixed(DIGITS[symbol]||5)
                               : +(entryPrice + slDist).toFixed(DIGITS[symbol]||5);
  const tp = action === "BUY" ? +(entryPrice + tpDist).toFixed(DIGITS[symbol]||5)
                               : +(entryPrice - tpDist).toFixed(DIGITS[symbol]||5);
  return { sl, tp, slDist, tpDist };
}

// Helper: volatility per pair type
function getPairVolatility(symbol) {
  if (["BTCUSD"].includes(symbol)) return 80;
  if (["ETHUSD","BNBUSD","SOLUSD","AVAXUSD"].includes(symbol)) return 5;
  if (["LTCUSD","DOTUSD","LINKUSD"].includes(symbol)) return 1.5;
  if (["DOGEUSD","ADAUSD"].includes(symbol)) return 0.005;
  if (["XRPUSD"].includes(symbol)) return 0.008;
  if (["XAUUSD","XAUEUR","XAUGBP"].includes(symbol)) return 2.5;
  if (["XAGUSD"].includes(symbol)) return 0.15;
  if (["XPTUSD","XPDUSD"].includes(symbol)) return 3.0;
  if (["USOIL","UKOIL"].includes(symbol)) return 0.4;
  if (["NATGAS"].includes(symbol)) return 0.02;
  if (["US500","AUS200","STOXX50"].includes(symbol)) return 8;
  if (["US30","GER40","JPN225"].includes(symbol)) return 80;
  if (["US100","FRA40"].includes(symbol)) return 40;
  if (["UK100","HK50"].includes(symbol)) return 25;
  if (symbol.includes("JPY") || symbol.includes("HUF")) return 0.15;
  if (["USDZAR","USDMXN","USDTRY","EURTRY","GBPTRY"].includes(symbol)) return 0.05;
  if (["USDNOK","USDSEK","EURNOK","EURSEK","GBPNOK","GBPSEK"].includes(symbol)) return 0.02;
  return 0.0008;
}

function getPairSpread(symbol) {
  if (symbol === "BTCUSD") return 9.80;
  if (["ETHUSD","BNBUSD"].includes(symbol)) return 0.8;
  if (["SOLUSD","AVAXUSD","LTCUSD"].includes(symbol)) return 0.5;
  if (["DOGEUSD","ADAUSD","XRPUSD"].includes(symbol)) return 0.00050;
  if (["DOTUSD","LINKUSD"].includes(symbol)) return 0.02;
  if (["XAUUSD","XAUEUR","XAUGBP"].includes(symbol)) return 0.30;
  if (["XAGUSD"].includes(symbol)) return 0.03;
  if (["XPTUSD","XPDUSD"].includes(symbol)) return 1.50;
  if (["USOIL","UKOIL"].includes(symbol)) return 0.05;
  if (["NATGAS"].includes(symbol)) return 0.005;
  if (["US100","US500"].includes(symbol)) return 1.0;
  if (["US30","GER40","JPN225"].includes(symbol)) return 3.0;
  if (["UK100","FRA40","AUS200","HK50","STOXX50"].includes(symbol)) return 2.0;
  if (symbol.includes("JPY") || symbol.includes("HUF")) return 0.02;
  if (["USDTRY","EURTRY","GBPTRY"].includes(symbol)) return 0.05;
  if (["USDZAR","USDMXN"].includes(symbol)) return 0.008;
  return 0.00012;
}

// ===================== SYMBOL NORMALIZATION =====================
// Common broker suffixes/prefixes used by Exness and other brokers
const BROKER_VARIANTS = [
  // suffixes
  "m",".",".r",".e","pro","ecn","raw","_pro","_ecn","_raw",
  "_i","_c","_s","_n","_h","#","!","+"
];

// Strip broker suffix/prefix → get canonical symbol name
function normalizeSymbol(raw) {
  if (!raw) return "";
  let s = raw.toUpperCase().trim();
  // Remove trailing non-alpha chars and known suffixes
  s = s.replace(/[.#+!].*$/, "");        // strip after . # + !
  s = s.replace(/(M|PRO|ECN|RAW|_I|_C|_S|_N|_H)$/, ""); // strip trailing suffixes
  return s;
}

// Check if a raw broker symbol matches a canonical symbol
function symbolMatches(raw, canonical) {
  return normalizeSymbol(raw) === canonical.toUpperCase();
}

// Global broker symbol map: canonical → actual broker name
// Built at runtime from tick/position data received from MT5
const brokerSymbolMap = {}; // e.g. { "BTCUSD": "BTCUSDm", "XAUUSD": "XAUUSDm" }

// Register a broker symbol when we see it from MT5
function registerBrokerSymbol(rawSymbol) {
  const canonical = normalizeSymbol(rawSymbol);
  if (canonical && PAIRS.includes(canonical) && rawSymbol !== canonical) {
    if (brokerSymbolMap[canonical] !== rawSymbol) {
      brokerSymbolMap[canonical] = rawSymbol;
    }
  }
}

// Get the actual broker symbol to use when sending orders
function getBrokerSymbol(canonical) {
  return brokerSymbolMap[canonical] || canonical;
}

// ===================== MOCK DATA =====================
function generateMockCandles(symbol, count=80) {
  const base = BASE_PRICES[symbol] || 1;
  const volatility = getPairVolatility(symbol);
  const digits = DIGITS[symbol] || 5;
  const data = [];
  let price = base;
  const now = Date.now();
  for (let i = count; i >= 0; i--) {
    const change = (Math.random()-0.49)*volatility;
    const open = price;
    price = Math.max(price + change, base * 0.5); // prevent negative
    const high = Math.max(open, price) + Math.random()*volatility*0.5;
    const low  = Math.min(open, price) - Math.random()*volatility*0.5;
    data.push({ time: new Date(now - i*5*60000).toISOString(), open:+open.toFixed(digits), high:+high.toFixed(digits), low:+low.toFixed(digits), close:+price.toFixed(digits), volume:Math.floor(Math.random()*2000+500) });
  }
  return data;
}

function generateMockTick(symbol, prev) {
  const base = prev?.bid || BASE_PRICES[symbol] || 1;
  const vol = getPairVolatility(symbol) * 0.2;
  const spread = getPairSpread(symbol);
  const digits = DIGITS[symbol] || 5;
  const bid = +(Math.max(base + (Math.random()-0.49)*vol, 0.00001)).toFixed(digits);
  const ask = +(bid + spread).toFixed(digits);
  const spreadPips = +(spread * Math.pow(10, digits <= 3 ? digits : digits-1)).toFixed(1);
  return { symbol, bid, ask, spread: spreadPips, time: new Date().toISOString(), digits };
}

// ===================== AI ANALYSIS =====================
const GROQ_API_KEY = "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";
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function analyzeWithGroq(symbol, candles, tick, eaConfig) {
  const recent  = candles.slice(-20);
  const closes  = recent.map(c => c.close);
  const highs   = recent.map(c => c.high);
  const lows    = recent.map(c => c.low);
  const last    = closes[closes.length-1];
  const first   = closes[0];
  const trend   = last > first ? "bullish" : "bearish";
  const changePct = (((last - first)/first)*100).toFixed(3);
  const atrRaw  = +(Math.max(...highs) - Math.min(...lows)).toFixed(DIGITS[symbol]||5);

  // SMA
  const sma5  = closes.slice(-5).reduce((a,b)=>a+b,0)/5;
  const sma10 = closes.slice(-10).reduce((a,b)=>a+b,0)/10;
  const sma20 = closes.reduce((a,b)=>a+b,0)/closes.length;

  // RSI-14
  const gains = [], losses = [];
  for (let i=1; i<closes.length; i++) {
    const d = closes[i]-closes[i-1];
    gains.push(d>0?d:0); losses.push(d<0?-d:0);
  }
  const avgGain = gains.slice(-14).reduce((a,b)=>a+b,0)/14;
  const avgLoss = losses.slice(-14).reduce((a,b)=>a+b,0)/14;
  const rsi = avgLoss===0 ? 100 : +(100-(100/(1+avgGain/avgLoss))).toFixed(1);

  // Bollinger Band (20, 2σ)
  const mean = sma20;
  const variance = closes.reduce((a,c)=>a+(c-mean)**2,0)/closes.length;
  const stdDev   = Math.sqrt(variance);
  const bbUpper  = +(mean + 2*stdDev).toFixed(DIGITS[symbol]||5);
  const bbLower  = +(mean - 2*stdDev).toFixed(DIGITS[symbol]||5);

  // Swing structure — unique levels sorted, deduped by 0.1% tolerance
  const pipSz   = getPipSize(symbol);
  const digits  = DIGITS[symbol] || 5;
  const category = getPairCategory(symbol);
  const spread  = tick.spread || 0;
  const minSLpips = Math.max(Math.ceil(spread * 2.5 + 3), 5);

  // Unique swing highs above current price (nearest first)
  const allHighs = [...new Set(highs.map(h=>+h.toFixed(digits)))].sort((a,b)=>a-b);
  const allLows  = [...new Set(lows.map(l=>+l.toFixed(digits)))].sort((a,b)=>a-b);
  const resAbove = allHighs.filter(h=>h>last).slice(0,5);   // nearest resistances
  const supBelow = allLows.filter(l=>l<last).reverse().slice(0,5); // nearest supports
  // Fallback if price is at extremes
  const resLevels = resAbove.length >= 2 ? resAbove : allHighs.slice(-5);
  const supLevels = supBelow.length >= 2 ? supBelow : allLows.slice(0,5);

  const prompt = `You are a professional multi-instrument trading EA for Exness. Your job is to analyze raw market data and generate a signal with structured exits. All SL/TP values MUST be derived from the actual price levels provided — no hardcoded numbers, no guessing.

INSTRUMENT: ${symbol} (${category})
Pip size: ${pipSz} — meaning 1 pip = ${pipSz} in price units
Entry zone: Bid=${tick.bid} | Ask=${tick.ask} | Spread=${spread} pips

PRICE CONTEXT (20 candles M15):
  Current:   ${last}
  ATR range: ${atrRaw}
  BB Upper:  ${bbUpper} | BB Lower: ${bbLower}
  SMA5: ${sma5.toFixed(digits)} | SMA10: ${sma10.toFixed(digits)} | SMA20: ${sma20.toFixed(digits)}
  RSI(14): ${rsi}${rsi>70?" — OVERBOUGHT":rsi<30?" — OVERSOLD":""}
  Trend: ${trend} ${changePct}%

KEY PRICE LEVELS (from actual candle data, sorted nearest first):
  Resistance above price: ${resLevels.join(" | ")||"none detected"}
  Support below price:    ${supLevels.join(" | ")||"none detected"}

DECISION LOGIC:
  BUY  if: price above SMA10 & SMA20, RSI not overbought, bullish momentum from supports
  SELL if: price below SMA10 & SMA20, RSI not oversold, bearish momentum from resistances
  WAIT if: mixed signals or price in congestion zone

EXIT PLACEMENT RULES — STRICT: You MUST pick prices ONLY from the KEY PRICE LEVELS listed above.
  Do NOT invent prices. Do NOT use ATR multiples. Do NOT use hardcoded pip values.

  SL  → BUY:  sl_price = nearest Support level below entry (pick the closest one from the list)
        SELL: sl_price = nearest Resistance level above entry (pick the closest one from the list)
        Then add/subtract a small buffer of ${minSLpips} pips minimum from that level.
        sl_pips = round( abs(sl_price - entry) / ${pipSz} )

  TP1 → BUY:  tp1_price = first Resistance above entry (pick from the list)
        SELL: tp1_price = first Support below entry (pick from the list)
        Verify R:R = (tp1_price - entry) / (entry - sl_price) >= 1.5
        If R:R < 1.5, use next resistance/support level further away.
        tp1_pips = round( abs(tp1_price - entry) / ${pipSz} )

  TP2 → BUY:  tp2_price = second Resistance above entry (further than TP1, from the list)
        SELL: tp2_price = second Support below entry (further than TP1, from the list)
        Verify R:R = (tp2_price - entry) / (entry - sl_price) >= 2.5
        tp2_pips = round( abs(tp2_price - entry) / ${pipSz} )

  SL+ → BUY:  sl_plus_price = entry + round(sl_pips × 0.3) × ${pipSz}
        SELL: sl_plus_price = entry - round(sl_pips × 0.3) × ${pipSz}
        sl_plus_pips = round( abs(sl_plus_price - entry) / ${pipSz} )

PIP CONVERSION (mandatory — use this formula for every pips field):
  pips = round( abs(price_level - entry_price) / ${pipSz} )

VALIDATION before returning:
  - BUY:  sl_price < entry < tp1_price < tp2_price
  - SELL: sl_price > entry > tp1_price > tp2_price
  - sl_plus_price must be between entry and tp1_price
  - sl_price and tp1_price and tp2_price must come from the KEY PRICE LEVELS list above
  - All pips fields must match their price counterparts via the formula above
  - REJECT any sl_pips or tp_pips that seem unreasonably large for this instrument

Return ONLY valid JSON — no commentary:
{
  "signal": "BUY|SELL|WAIT",
  "confidence": "HIGH|MEDIUM|LOW",
  "entry_price": ${tick.bid},
  "sl_price": 0, "sl_pips": 0,
  "tp1_price": 0, "tp1_pips": 0, "tp1_lot_pct": 50,
  "tp2_price": 0, "tp2_pips": 0, "tp2_lot_pct": 50,
  "sl_plus_price": 0, "sl_plus_pips": 0,
  "rr1": 0, "rr2": 0,
  "trend": "", "sma_cross": "bullish|bearish|neutral",
  "momentum": "strong|moderate|weak", "rsi": ${rsi},
  "signal_reason": "", "summary": "",
  "support": ${supLevels[0]||0}, "resistance": ${resLevels[0]||0}
}`;

  // ─── Helpers ───────────────────────────────────────────────────────────
  // Bidirectional resolve: given price XOR pips, compute the other
  const resolveLevel = (price, pips, entry, action, isSL, pipSz, digs) => {
    let p = +price, k = +pips;
    if (p > 0 && (!k || k <= 0)) k = Math.round(Math.abs(entry - p) / pipSz);
    if (k > 0 && (!p || p <= 0))
      p = isSL
        ? (action==="BUY" ? +(entry - k*pipSz).toFixed(digs) : +(entry + k*pipSz).toFixed(digs))
        : (action==="BUY" ? +(entry + k*pipSz).toFixed(digs) : +(entry - k*pipSz).toFixed(digs));
    return { price: p||0, pips: Math.round(k)||0 };
  };

  // Structural validation: ensure SL/TP ordering is correct per direction
  const validateSide = (val, entry, action, isSL) => {
    if (!val || val <= 0) return false;
    return isSL
      ? (action==="BUY" ? val < entry : val > entry)
      : (action==="BUY" ? val > entry : val < entry);
  };

  // Post-process: validate AI output, fill gaps, guarantee correctness for ALL pairs
  const postProcessAnalysis = (analysis, symbol, tick) => {
    if (!analysis || !analysis.signal) return analysis;
    const action = analysis.signal === "WAIT" ? "BUY" : analysis.signal;
    const entry  = +(analysis.entry_price || tick.bid);
    const pipSz  = getPipSize(symbol);
    const digs   = DIGITS[symbol] || 5;

    // ── Resolve each level ──────────────────────────────────────────────
    let sl     = resolveLevel(analysis.sl_price,       analysis.sl_pips,       entry, action, true,  pipSz, digs);
    let tp1    = resolveLevel(analysis.tp1_price,      analysis.tp1_pips,      entry, action, false, pipSz, digs);
    let tp2    = resolveLevel(analysis.tp2_price,      analysis.tp2_pips,      entry, action, false, pipSz, digs);
    let slPlus = resolveLevel(analysis.sl_plus_price,  analysis.sl_plus_pips,  entry, action, false, pipSz, digs);

    // ── Validate structural correctness ─────────────────────────────────
    // SL must be on wrong side of entry
    if (!validateSide(sl.price, entry, action, true)) sl = { price:0, pips:0 };

    // TP1 must be past entry (correct side)
    if (!validateSide(tp1.price, entry, action, false)) tp1 = { price:0, pips:0 };

    // TP2 must be further than TP1
    const tp2Valid = validateSide(tp2.price, entry, action, false) &&
      (action==="BUY" ? tp2.price > tp1.price : tp2.price < tp1.price);
    if (!tp2Valid) tp2 = { price:0, pips:0 };

    // SL+ must be between entry and TP1
    const slPlusValid = slPlus.price > 0 &&
      (action==="BUY"
        ? slPlus.price > entry && slPlus.price < (tp1.price||Infinity)
        : slPlus.price < entry && slPlus.price > (tp1.price||0));
    if (!slPlusValid) slPlus = { price:0, pips:0 };

    // ── Auto-fill missing levels — ALWAYS from nearest swing levels ─────
    // SL fallback: nearest swing level on the wrong side of entry
    if (!sl.pips) {
      const nearestSwingSL = action === "BUY"
        ? supLevels[0]   // nearest support below
        : resLevels[0];  // nearest resistance above
      if (nearestSwingSL && nearestSwingSL > 0) {
        const bufferPips = Math.max(minSLpips, 3);
        const slPriceRaw = action === "BUY"
          ? +(nearestSwingSL - bufferPips * pipSz).toFixed(digs)
          : +(nearestSwingSL + bufferPips * pipSz).toFixed(digs);
        sl = resolveLevel(slPriceRaw, 0, entry, action, true, pipSz, digs);
      } else {
        // last resort: ATR * 0.3 (smaller than before)
        const atrPips = Math.round(atrRaw / pipSz);
        const slPips  = Math.max(Math.round(atrPips * 0.3), minSLpips);
        sl = resolveLevel(0, slPips, entry, action, true, pipSz, digs);
      }
    }

    // TP1 fallback: nearest swing level on the correct side (first resistance/support)
    if (!tp1.pips && sl.pips) {
      const nearestSwingTP1 = action === "BUY"
        ? resLevels[0]   // first resistance above
        : supLevels[0];  // first support below
      if (nearestSwingTP1 && nearestSwingTP1 > 0 && validateSide(nearestSwingTP1, entry, action, false)) {
        tp1 = resolveLevel(nearestSwingTP1, 0, entry, action, false, pipSz, digs);
        // Ensure R:R >= 1.5, else step to next level
        if (tp1.pips < sl.pips * 1.5) {
          const nextLevel = action === "BUY" ? resLevels[1] : supLevels[1];
          if (nextLevel && validateSide(nextLevel, entry, action, false))
            tp1 = resolveLevel(nextLevel, 0, entry, action, false, pipSz, digs);
          else
            tp1 = resolveLevel(0, Math.round(sl.pips * 1.5), entry, action, false, pipSz, digs);
        }
      } else {
        tp1 = resolveLevel(0, Math.round(sl.pips * 1.5), entry, action, false, pipSz, digs);
      }
    }

    // TP2 fallback: second swing level further than TP1
    if (!tp2.pips && sl.pips) {
      const nextSwingTP2 = action === "BUY" ? resLevels[1] : supLevels[1];
      if (nextSwingTP2 && validateSide(nextSwingTP2, entry, action, false) &&
          (action === "BUY" ? nextSwingTP2 > tp1.price : nextSwingTP2 < tp1.price)) {
        tp2 = resolveLevel(nextSwingTP2, 0, entry, action, false, pipSz, digs);
        if (tp2.pips < sl.pips * 2.5)
          tp2 = resolveLevel(0, Math.round(sl.pips * 2.5), entry, action, false, pipSz, digs);
      } else {
        tp2 = resolveLevel(0, Math.round(sl.pips * 2.5), entry, action, false, pipSz, digs);
      }
    }

    // SL+ fallback: entry + 30% of SL distance (lock partial profit)
    if (!slPlus.pips && sl.pips)
      slPlus = resolveLevel(0, Math.round(sl.pips * 0.3), entry, action, false, pipSz, digs);

    // ── Source tagging ──────────────────────────────────────────────────
    const source = (analysis.sl_price > 0 && validateSide(analysis.sl_price, entry, action, true))
      ? "AI" : "computed";

    return {
      ...analysis,
      _sltp_source: source,
      pip_size: pipSz,
      sl_price:       sl.price,     sl_pips:       sl.pips,
      tp1_price:      tp1.price,    tp1_pips:      tp1.pips,    tp1_lot_pct: 50,
      tp2_price:      tp2.price,    tp2_pips:      tp2.pips,    tp2_lot_pct: 50,
      sl_plus_price:  slPlus.price, sl_plus_pips:  slPlus.pips,
      rr1: tp1.pips && sl.pips ? +(tp1.pips/sl.pips).toFixed(2) : 0,
      rr2: tp2.pips && sl.pips ? +(tp2.pips/sl.pips).toFixed(2) : 0,
      tp_pips: tp2.pips, tp_price: tp2.price, // backward compat
    };
  };

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1500,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a professional trading EA analyst. Respond ONLY with valid JSON. No markdown, no commentary, no extra text. Every sl_price, tp1_price, tp2_price MUST be taken directly from the KEY PRICE LEVELS provided in the prompt — never invent prices or use ATR multiples. Pips are always computed as: round(abs(price - entry) / pip_size)." },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${res.status}`;
      console.error("[Groq Error]", errMsg, errData);
      return { signal:"WAIT", summary:`Error Groq: ${errMsg}`, confidence:"LOW", trend:"—", sl_pips:eaConfig.defaultSL, tp_pips:eaConfig.defaultTP, rr_ratio:0 };
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    console.log("[Groq Raw]", text);
    const clean = text.replace(/```json|```/g,"").trim();
    const parsed = JSON.parse(clean);
    return postProcessAnalysis(parsed, symbol, tick);
  } catch(e) {
    console.error("[Groq Fetch Error]", e);
    // Fallback: derive SL from nearest swing level, not hardcoded table
    const atrPips = Math.round(atrRaw / getPipSize(symbol));
    const slPips  = Math.max(Math.round(atrPips * 0.3), minSLpips);
    const tp1Pips = Math.round(slPips * 1.5);
    const tp2Pips = Math.round(slPips * 2.5);
    const { sl: slP, tp: tp1P } = calcSLTP(symbol, "BUY", tick.bid||0, slPips, tp1Pips);
    const { tp: tp2P } = calcSLTP(symbol, "BUY", tick.bid||0, slPips, tp2Pips);
    return { signal:"WAIT", summary:`Error: ${e.message}`, confidence:"LOW", trend:"—",
             sl_pips:slPips, tp1_pips:tp1Pips, tp2_pips:tp2Pips,
             sl_price:slP, tp1_price:tp1P, tp2_price:tp2P, tp_pips:tp2Pips, tp_price:tp2P,
             pip_size:getPipSize(symbol), rr_ratio:+(tp1Pips/slPips).toFixed(2) };
  }
}

// ===================== MTF ANALYSIS =====================
async function getMTFAnalysis(symbol, candles, tick) {
  const shortTrend = candles.slice(-5).map(c=>c.close);
  const midTrend = candles.slice(-10).map(c=>c.close);
  const m5Signal = shortTrend[shortTrend.length-1] > shortTrend[0] ? "BUY" : "SELL";
  const h1Signal = midTrend[midTrend.length-1] > midTrend[0] ? "BUY" : "SELL";
  const h4Signal = candles[candles.length-1].close > candles[0].close ? "BUY" : "SELL";
  return { M5: m5Signal, H1: h1Signal, H4: h4Signal };
}

// ===================== COMPONENTS =====================
function MiniChart({ data, color }) {
  if (!data || data.length < 2) return <div style={{height:48,display:"flex",alignItems:"center",justifyContent:"center",color:"#334155",fontSize:11}}>No data</div>;
  const chartData = data.slice(-30).map((c,i)=>({ i, v: c.close }));
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={chartData} margin={{top:2,right:0,bottom:0,left:0}}>
        <defs>
          <linearGradient id={`g${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#g${color.replace("#","")})`} dot={false} isAnimationActive={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MainChart({ data, symbol, positions }) {
  if (!data || data.length < 2) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:260,color:"#475569",fontFamily:"monospace"}}>No chart data</div>;
  const chartData = data.map(c => ({ t: c.time.slice(11,16), v: c.close, h: c.high, l: c.low }));
  const vals = data.map(c=>c.close);
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const pad = (mx-mn)*0.1;
  const color = vals[vals.length-1] >= vals[0] ? "#00ff88" : "#f43f5e";
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{top:10,right:8,bottom:0,left:8}}>
        <defs>
          <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="t" tick={{fill:"#475569",fontSize:10,fontFamily:"monospace"}} tickLine={false} axisLine={false} interval={Math.floor(chartData.length/6)}/>
        <YAxis domain={[mn-pad, mx+pad]} tick={{fill:"#475569",fontSize:10,fontFamily:"monospace"}} tickLine={false} axisLine={false} width={60} tickFormatter={v=>v.toFixed(DIGITS[symbol]||5)}/>
        <Tooltip contentStyle={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:6,fontFamily:"monospace",fontSize:11}} labelStyle={{color:"#94a3b8"}} itemStyle={{color}}/>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill="url(#mainGrad)" dot={false} isAnimationActive={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SignalBadge({ signal, confidence, size="normal" }) {
  const cfg = {
    BUY: { bg:"#052e16", border:"#16a34a", text:"#4ade80", label:"▲ BUY" },
    SELL: { bg:"#2d0b0b", border:"#dc2626", text:"#f87171", label:"▼ SELL" },
    WAIT: { bg:"#1c1917", border:"#78716c", text:"#a8a29e", label:"◼ WAIT" },
  };
  const c = cfg[signal] || cfg.WAIT;
  const fs = size === "large" ? 14 : 11;
  const px = size === "large" ? "6px 16px" : "2px 10px";
  return (
    <span style={{background:c.bg,border:`1px solid ${c.border}`,color:c.text,padding:px,borderRadius:4,fontSize:fs,fontFamily:"monospace",fontWeight:700,letterSpacing:1}}>
      {c.label}
    </span>
  );
}

function ConfidenceDot({ level }) {
  const colors = { HIGH:"#4ade80", MEDIUM:"#fb923c", LOW:"#f87171" };
  return <span style={{color:colors[level]||"#64748b",fontSize:11,fontFamily:"monospace"}}>● {level}</span>;
}

function MTFBadge({ signal }) {
  const isBuy = signal === "BUY";
  return (
    <span style={{
      background: isBuy ? "#052e16" : "#2d0b0b",
      border: `1px solid ${isBuy ? "#16a34a" : "#dc2626"}`,
      color: isBuy ? "#4ade80" : "#f87171",
      padding:"1px 8px",borderRadius:3,fontSize:10,fontFamily:"monospace",fontWeight:700
    }}>{isBuy ? "▲ BUY" : "▼ SELL"}</span>
  );
}

// SYMBOL MAP PANEL — shows auto-detected broker names
function SymbolMapPanel() {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n=>n+1), 3000);
    return () => clearInterval(t);
  }, []);

  const entries = Object.entries(brokerSymbolMap);
  if (entries.length === 0) return (
    <div style={{background:"#070e1d",border:"1px solid #1e293b",borderRadius:8,padding:"10px 14px",marginTop:8}}>
      <div style={{color:"#1e3a5f",fontSize:9,fontFamily:"monospace",letterSpacing:2}}>
        🔍 SYMBOL MAP — Belum ada deteksi. Hubungkan ke MT5 untuk auto-detect.
      </div>
    </div>
  );

  return (
    <div style={{background:"#070e1d",border:"1px solid #1e293b",borderRadius:8,padding:"10px 14px",marginTop:8}}>
      <div style={{color:"#475569",fontSize:9,fontFamily:"monospace",letterSpacing:2,marginBottom:8}}>
        🔍 AUTO-DETECTED SYMBOL MAP ({entries.length} pair)
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
        {entries.map(([canonical, broker]) => (
          <div key={canonical} style={{
            background:"#0a0f1e", border:"1px solid #1e3a5f",
            borderRadius:4, padding:"3px 8px", fontSize:9, fontFamily:"monospace",
            display:"flex", gap:4, alignItems:"center"
          }}>
            <span style={{color:"#475569"}}>{canonical}</span>
            <span style={{color:"#334155"}}>→</span>
            <span style={{color:"#06b6d4", fontWeight:700}}>{broker}</span>
          </div>
        ))}
      </div>
      <div style={{color:"#1e3a5f",fontSize:8,marginTop:6,fontFamily:"monospace"}}>
        Map dibangun otomatis dari data tick/posisi MT5 yang diterima
      </div>
    </div>
  );
}

// EA CONFIG PANEL
function EAConfigPanel({ config, onChange, analyses }) {
  const field = (key, label, min, max, step=1, disabled=false) => (
    <div style={{flex:1,opacity:disabled?0.4:1}}>
      <div style={{color:"#475569",fontSize:10,fontFamily:"monospace",marginBottom:3}}>{label}</div>
      <input
        type="number" value={config[key]} min={min} max={max} step={step} disabled={disabled}
        onChange={e=>onChange({...config,[key]:parseFloat(e.target.value)||0})}
        style={{width:"100%",background:"#0a0f1e",border:`1px solid ${disabled?"#0f172a":"#1e293b"}`,borderRadius:4,padding:"6px 8px",color:"#e2e8f0",fontFamily:"monospace",fontSize:12,boxSizing:"border-box"}}
      />
    </div>
  );

  const aiOn = config.useAiSLTP !== false;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{background:"#070e1d",border:"1px solid #1e3a5f",borderRadius:10,padding:16}}>
        <div style={{color:"#06b6d4",fontSize:11,fontFamily:"monospace",letterSpacing:2,marginBottom:12}}>⚙ EA CONFIGURATION</div>

        {/* AI SL/TP Toggle */}
        <div style={{background:"#0a0f1e",border:`1px solid ${aiOn?"#1d4ed8":"#1e293b"}`,borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{color:aiOn?"#93c5fd":"#475569",fontSize:11,fontFamily:"monospace",fontWeight:700}}>🤖 AI AUTO SL/TP</div>
            <div style={{color:"#334155",fontSize:10,marginTop:2}}>{aiOn?"SL & TP dihitung otomatis oleh AI per instrumen":"Gunakan SL/TP manual dari config di bawah"}</div>
          </div>
          <button onClick={()=>onChange({...config,useAiSLTP:!aiOn})} style={{
            background:aiOn?"#1e3a5f":"#0f172a", border:`1px solid ${aiOn?"#1d4ed8":"#334155"}`,
            color:aiOn?"#93c5fd":"#475569", padding:"5px 16px", borderRadius:20, cursor:"pointer",
            fontFamily:"monospace", fontSize:11, fontWeight:700, letterSpacing:1
          }}>{aiOn?"ON ●":"● OFF"}</button>
        </div>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
          {field("defaultSL","Fallback SL (pips)",10,5000,1,aiOn)}
          {field("defaultTP","Fallback TP (pips)",10,10000,1,aiOn)}
          {field("maxLot","Max Lot Size",0.01,10,0.01)}
          {field("defaultLot","Default Lot",0.01,10,0.01)}
          {field("maxDailyLoss","Max Daily Loss ($)",10,10000)}
          {field("maxOpenTrades","Max Open Trades",1,20)}
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <div style={{flex:1}}>
            <div style={{color:"#475569",fontSize:10,fontFamily:"monospace",marginBottom:3}}>MIN CONFIDENCE</div>
            <select value={config.minConfidence} onChange={e=>onChange({...config,minConfidence:e.target.value})}
              style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:4,padding:"6px 8px",color:"#e2e8f0",fontFamily:"monospace",fontSize:12}}>
              <option>LOW</option><option>MEDIUM</option><option>HIGH</option>
            </select>
          </div>
          <div style={{flex:1}}>
            <div style={{color:"#475569",fontSize:10,fontFamily:"monospace",marginBottom:3}}>MTF FILTER</div>
            <select value={config.mtfFilter} onChange={e=>onChange({...config,mtfFilter:e.target.value})}
              style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:4,padding:"6px 8px",color:"#e2e8f0",fontFamily:"monospace",fontSize:12}}>
              <option value="OFF">OFF</option>
              <option value="2OF3">2 of 3 agree</option>
              <option value="3OF3">All 3 agree</option>
            </select>
          </div>
          <div style={{flex:1}}>
            <div style={{color:"#475569",fontSize:10,fontFamily:"monospace",marginBottom:3}}>AUTO INTERVAL</div>
            <select value={config.autoInterval} onChange={e=>onChange({...config,autoInterval:parseInt(e.target.value)})}
              style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:4,padding:"6px 8px",color:"#e2e8f0",fontFamily:"monospace",fontSize:12}}>
              <option value={15000}>15 detik</option>
              <option value={30000}>30 detik</option>
              <option value={60000}>1 menit</option>
              <option value={300000}>5 menit</option>
            </select>
          </div>
        </div>
      </div>

      {/* Per-Instrument SL/TP Reference Table */}
      <div style={{background:"#070e1d",border:"1px solid #1e293b",borderRadius:10,padding:14}}>
        <div style={{color:"#475569",fontSize:9,letterSpacing:2,marginBottom:10}}>📊 REFERENSI SL/TP PER INSTRUMEN (Smart Default + AI Hasil)</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"monospace",fontSize:10}}>
            <thead>
              <tr style={{color:"#334155",borderBottom:"1px solid #0f172a"}}>
                {["Instrumen","Kategori","Default SL","Default TP","AI SL","AI TP","R:R","Signal"].map(h=>(
                  <th key={h} style={{padding:"4px 8px",textAlign:"left",fontWeight:600,letterSpacing:0.5,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(PAIR_SLTP).map(([sym,def])=>{
                const ai = analyses?.[sym];
                const cat = getPairCategory(sym);
                const catColor = {Majors:"#06b6d4",Minors:"#94a3b8",Exotics:"#fb923c",Metals:"#fbbf24",Energy:"#f97316",Indices:"#a78bfa",Crypto:"#4ade80"}[cat]||"#475569";
                return (
                  <tr key={sym} style={{borderBottom:"1px solid #0a0f1e",color:"#475569"}}>
                    <td style={{padding:"3px 8px",color:"#94a3b8",fontWeight:700}}>{PAIR_FLAGS[sym]} {sym}</td>
                    <td style={{padding:"3px 8px"}}><span style={{color:catColor,fontSize:9}}>{cat}</span></td>
                    <td style={{padding:"3px 8px",color:"#f97316"}}>{def.sl}</td>
                    <td style={{padding:"3px 8px",color:"#a78bfa"}}>{def.tp}</td>
                    <td style={{padding:"3px 8px",color:ai?.sl_pips?"#4ade80":"#1e293b"}}>{ai?.sl_pips||"—"}</td>
                    <td style={{padding:"3px 8px",color:ai?.tp_pips?"#4ade80":"#1e293b"}}>{ai?.tp_pips||"—"}</td>
                    <td style={{padding:"3px 8px",color:"#a78bfa"}}>{ai?.rr_ratio?"1:"+ai.rr_ratio:"—"}</td>
                    <td style={{padding:"3px 8px"}}>
                      {ai?.signal ? <span style={{color:ai.signal==="BUY"?"#4ade80":ai.signal==="SELL"?"#f87171":"#475569",fontSize:9,fontWeight:700}}>{ai.signal}</span> : <span style={{color:"#1e293b"}}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ORDER PANEL
function OrderPanel({ symbol, tick, onOrder, analysis }) {
  const [vol, setVol] = useState("0.01");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");

  useEffect(() => {
    if (analysis) {
      setSl(String(analysis.sl_pips || ""));
      setTp(String(analysis.tp_pips || ""));
    }
  }, [analysis]);

  const pipSz = getPipSize(symbol);
  const slPriceCalc = tick?.bid && sl ? calcSLTP(symbol, "BUY", tick.bid, parseFloat(sl), parseFloat(tp)||1).sl : null;
  const tpPriceCalc = tick?.bid && tp ? calcSLTP(symbol, "BUY", tick.bid, parseFloat(sl)||1, parseFloat(tp)).tp : null;
  const slPrice = slPriceCalc ?? "—";
  const tpPrice = tpPriceCalc ?? "—";
  const rr = sl && tp ? (parseFloat(tp)/parseFloat(sl)).toFixed(1) : "—";

  const btnStyle = (type) => ({
    flex:1, padding:"12px 0", border:"none", borderRadius:6, fontFamily:"monospace",
    fontWeight:700, fontSize:13, cursor:"pointer", letterSpacing:1,
    ...(type==="BUY" ? {background:"#16a34a",color:"#fff"} : {background:"#dc2626",color:"#fff"}),
  });

  return (
    <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:14,marginTop:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{color:"#64748b",fontSize:11,fontFamily:"monospace",letterSpacing:1}}>ORDER — {symbol}</div>
        {rr !== "—" && <div style={{fontSize:11,fontFamily:"monospace",color:"#a78bfa"}}>R:R 1:{rr}</div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
        {[["BID",tick?.bid?.toFixed(DIGITS[symbol])||"—","#f87171"],["SPREAD",tick?.spread||"—","#94a3b8"],["ASK",tick?.ask?.toFixed(DIGITS[symbol])||"—","#4ade80"]].map(([k,v,c])=>(
          <div key={k} style={{textAlign:"center",background:"#0a0f1e",border:"1px solid #0f172a",borderRadius:6,padding:"8px 4px"}}>
            <div style={{color:"#475569",fontSize:9,fontFamily:"monospace",letterSpacing:1}}>{k}</div>
            <div style={{color:c,fontFamily:"monospace",fontWeight:700,fontSize:13}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        {[["Vol",vol,setVol],["SL (pips)",sl,setSl],["TP (pips)",tp,setTp]].map(([label,val,setter])=>(
          <div key={label} style={{flex:1}}>
            <div style={{color:"#475569",fontSize:10,fontFamily:"monospace",marginBottom:3}}>{label}</div>
            <input value={val} onChange={e=>setter(e.target.value)} style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:4,padding:"6px 8px",color:"#e2e8f0",fontFamily:"monospace",fontSize:12,boxSizing:"border-box"}}/>
          </div>
        ))}
      </div>
      {sl && tp && (
        <div style={{display:"flex",gap:16,fontSize:10,fontFamily:"monospace",marginBottom:8,padding:"6px 8px",background:"#0a0f1e",borderRadius:4}}>
          <span style={{color:"#334155"}}>1pip=<span style={{color:"#94a3b8",fontWeight:700}}>${pipSz}</span></span>
          <span style={{color:"#64748b"}}>SL→<span style={{color:"#f97316",fontWeight:700}}>{slPrice}</span></span>
          <span style={{color:"#64748b"}}>TP→<span style={{color:"#a78bfa",fontWeight:700}}>{tpPrice}</span></span>
          <span style={{color:"#64748b"}}>R:R <span style={{color:"#4ade80"}}>{rr}</span></span>
        </div>
      )}
      <div style={{display:"flex",gap:8}}>
        <button style={btnStyle("BUY")} onClick={()=>onOrder(symbol,"BUY",vol,sl,tp)}>▲ BUY {tick?.ask?.toFixed(DIGITS[symbol])}</button>
        <button style={btnStyle("SELL")} onClick={()=>onOrder(symbol,"SELL",vol,sl,tp)}>▼ SELL {tick?.bid?.toFixed(DIGITS[symbol])}</button>
      </div>
    </div>
  );
}

// PAIR CARD
function PairCard({ symbol, tick, candles, analysis, mtfData, selected, analyzing, onSelect, onAnalyze }) {
  const prev = candles?.slice(-2,-1)[0]?.close;
  const cur = tick?.bid;
  const isUp = cur && prev ? cur >= prev : true;
  const dayChange = candles?.length > 1 ? (((cur - candles[0].close)/candles[0].close)*100).toFixed(2) : "0.00";
  const isPos = parseFloat(dayChange) >= 0;
  return (
    <div onClick={()=>onSelect(symbol)} style={{
      background: selected ? "#0f1f3a" : "#0a0f1e",
      border: `1px solid ${selected ? "#1e40af" : "#1e293b"}`,
      borderRadius:10, padding:"12px 14px", cursor:"pointer", transition:"all 0.2s", position:"relative",
      boxShadow: selected ? "0 0 0 1px #1d4ed8 inset, 0 4px 20px #1d4ed820" : "none",
    }}>
      {selected && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#1d4ed8,#06b6d4)",borderRadius:"10px 10px 0 0"}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:14}}>{PAIR_FLAGS[symbol]}</span>
            <span style={{color:"#e2e8f0",fontFamily:"monospace",fontWeight:700,fontSize:13,letterSpacing:1}}>{symbol}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{color: isUp?"#22d3ee":"#f43f5e", fontFamily:"monospace", fontWeight:700, fontSize:16, letterSpacing:1}}>
            {tick ? tick.bid.toFixed(DIGITS[symbol]) : "—"}
          </div>
          <div style={{color: isPos?"#4ade80":"#f87171", fontSize:10, fontFamily:"monospace"}}>{isPos?"+":""}{dayChange}%</div>
        </div>
      </div>
      <MiniChart data={candles} color={isUp?"#22d3ee":"#f43f5e"}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
        {analysis ? <SignalBadge signal={analysis.signal} confidence={analysis.confidence}/> : <span style={{color:"#1e293b",fontSize:10}}>—</span>}
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {mtfData && <div style={{display:"flex",gap:3}}>
            {["M5","H1","H4"].map(tf=>(<MTFBadge key={tf} signal={mtfData[tf]}/>))}
          </div>}
          <button onClick={e=>{e.stopPropagation();onAnalyze(symbol);}} style={{
            background:"#1e293b",border:"1px solid #334155",color:analyzing?"#06b6d4":"#64748b",
            fontSize:10,fontFamily:"monospace",padding:"2px 8px",borderRadius:4,cursor:"pointer",
          }}>{analyzing?"◌":"⚡"}</button>
        </div>
      </div>
    </div>
  );
}

// EA LOG
const LOG_COLORS = { TRADE:"#4ade80", ERROR:"#f87171", WARN:"#fb923c", INFO:"#475569", AI:"#06b6d4", SYSTEM:"#a78bfa" };
const LOG_ICONS  = { TRADE:"💰", ERROR:"❌", WARN:"⚠️", INFO:"ℹ️", AI:"🤖", SYSTEM:"⚙️" };

function EALog({ logs }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  const counts = logs.reduce((a,l)=>{ a[l.type]=(a[l.type]||0)+1; return a; }, {});
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {/* Summary bar */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {Object.entries(LOG_COLORS).map(([type,color])=>(
          <div key={type} style={{background:"#0a0f1e",border:`1px solid #1e293b`,borderRadius:6,padding:"4px 10px",display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:11}}>{LOG_ICONS[type]}</span>
            <span style={{color:"#334155",fontSize:10,fontFamily:"monospace"}}>{type}</span>
            <span style={{color,fontFamily:"monospace",fontWeight:700,fontSize:12}}>{counts[type]||0}</span>
          </div>
        ))}
      </div>
      {/* Log entries */}
      <div ref={ref} style={{background:"#030712",border:"1px solid #0f172a",borderRadius:8,padding:"10px 12px",height:380,overflowY:"auto",fontFamily:"monospace",fontSize:11}}>
        {logs.length === 0 && (
          <div style={{color:"#1e3a5f",textAlign:"center",paddingTop:40}}>
            <div style={{fontSize:24,marginBottom:8}}>📋</div>
            <div>EA log kosong — tekan START EA untuk mulai</div>
          </div>
        )}
        {[...logs].reverse().map((log,i)=>{
          const color = LOG_COLORS[log.type]||"#475569";
          const icon  = LOG_ICONS[log.type]||"·";
          const isTrade = log.type==="TRADE";
          return (
            <div key={i} style={{
              marginBottom:4, padding:"5px 8px", borderRadius:4,
              background: isTrade ? "#052e1620" : i===0 ? "#0f172a" : "transparent",
              borderLeft: `2px solid ${isTrade?"#16a34a":color+"40"}`,
              display:"flex", gap:8, alignItems:"flex-start"
            }}>
              <span style={{fontSize:12,flexShrink:0}}>{icon}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:1}}>
                  <span style={{color:"#1e3a5f",fontSize:10}}>{log.time}</span>
                  <span style={{color,fontSize:9,fontWeight:700,letterSpacing:1,background:color+"15",padding:"0 5px",borderRadius:3}}>{log.type}</span>
                </div>
                <span style={{color: isTrade?"#86efac":color,fontSize:11}}>{log.msg}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// POSITIONS TABLE
function PositionsTable({ positions, onClose }) {
  if (!positions?.length) return <div style={{textAlign:"center",color:"#334155",fontFamily:"monospace",fontSize:12,padding:"20px 0"}}>Tidak ada posisi terbuka</div>;
  const totalPnL = positions.reduce((a,b)=>a+(b.profit||0),0);
  return (
    <div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"monospace",fontSize:11}}>
          <thead>
            <tr style={{color:"#475569",borderBottom:"1px solid #1e293b"}}>
              {["Ticket","Symbol","Type","Vol","Open","SL","TP1","TP2","SL+","P&L",""].map(h=>(
                <th key={h} style={{padding:"6px 8px",textAlign:"left",fontWeight:600,letterSpacing:0.5}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map(p=>(
              <tr key={p.ticket} style={{borderBottom:"1px solid #0f172a",color:"#94a3b8"}}>
                <td style={{padding:"6px 8px",color:"#475569"}}>{p.ticket}</td>
                <td style={{padding:"6px 8px",color:"#e2e8f0",fontWeight:700}}>
                  {p.symbol}
                  {p.tp_label && <span style={{color:"#334155",fontSize:8,marginLeft:4}}>({p.tp_label})</span>}
                </td>
                <td style={{padding:"6px 8px",color:p.type==="BUY"?"#4ade80":"#f87171",fontWeight:700}}>{p.type}</td>
                <td style={{padding:"6px 8px"}}>{p.volume}</td>
                <td style={{padding:"6px 8px"}}>{p.price_open}</td>
                <td style={{padding:"6px 8px",color:"#f97316"}}>{p.sl||"—"}</td>
                <td style={{padding:"6px 8px",color:p.tp1_hit?"#475569":"#34d399",fontSize:10}}>
                  {p.tp1>0 ? <>{p.tp1}{p.tp1_hit&&<span style={{color:"#4ade80",marginLeft:3}}>✓</span>}</> : "—"}
                </td>
                <td style={{padding:"6px 8px",color:"#a78bfa",fontSize:10}}>{p.tp||"—"}</td>
                <td style={{padding:"6px 8px",color:"#06b6d4",fontSize:10}}>{p.sl_plus>0?p.sl_plus:"—"}</td>
                <td style={{padding:"6px 8px",color:p.profit>=0?"#4ade80":"#f87171",fontWeight:700}}>{p.profit>=0?"+":""}{p.profit?.toFixed(2)}</td>
                <td style={{padding:"6px 8px"}}>
                  <button onClick={()=>onClose(p.ticket)} style={{background:"#2d0b0b",border:"1px solid #7f1d1d",color:"#f87171",padding:"2px 8px",borderRadius:3,cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:10,display:"flex",gap:16,fontSize:11,fontFamily:"monospace",borderTop:"1px solid #1e293b",paddingTop:10}}>
        <span style={{color:"#475569"}}>Total Posisi: <span style={{color:"#94a3b8",fontWeight:700}}>{positions.length}</span></span>
        <span style={{color:"#475569"}}>Total P&L: <span style={{color:totalPnL>=0?"#4ade80":"#f87171",fontWeight:700}}>{totalPnL>=0?"+":""}{totalPnL.toFixed(2)}</span></span>
      </div>
    </div>
  );
}

// EA LOG TAB (full featured)
function EALogTab({ logs, setLogs, eaRunning, eaConfig, positions, eaStats, account, onClearAll }) {
  const [countdown, setCountdown] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const timerRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!eaRunning) { setCountdown(0); clearInterval(timerRef.current); return; }
    startRef.current = Date.now();
    setScanCount(c=>c+1);
    setCountdown(eaConfig.autoInterval/1000);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now()-startRef.current)/1000;
      const remaining = Math.max(0, eaConfig.autoInterval/1000 - elapsed);
      setCountdown(Math.ceil(remaining));
      if (remaining <= 0) { startRef.current = Date.now(); setScanCount(c=>c+1); setCountdown(eaConfig.autoInterval/1000); }
    }, 500);
    return () => clearInterval(timerRef.current);
  }, [eaRunning, eaConfig.autoInterval]);

  const interval = eaConfig.autoInterval/1000;
  const progress = eaRunning ? ((interval - countdown)/interval)*100 : 0;
  const winRate = eaStats.totalTrades>0 ? ((eaStats.winTrades/eaStats.totalTrades)*100).toFixed(1) : "0.0";

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {/* Live Status Panel */}
      <div style={{background:"#070e1d",border:`1px solid ${eaRunning?"#15803d":"#1e293b"}`,borderRadius:10,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:eaRunning?"#4ade80":"#334155",boxShadow:eaRunning?"0 0 10px #4ade80":undefined}}/>
            <span style={{color:eaRunning?"#4ade80":"#475569",fontFamily:"monospace",fontWeight:700,fontSize:13,letterSpacing:2}}>
              EA {eaRunning?"RUNNING":"STOPPED"}
            </span>
            {eaRunning && <span style={{color:"#334155",fontSize:11,fontFamily:"monospace"}}>Scan #{scanCount}</span>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setLogs([])} style={{background:"#0f172a",border:"1px solid #1e293b",color:"#475569",padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>🗑 Clear Log</button>
            <button onClick={onClearAll} style={{background:"#2d0b0b",border:"1px solid #7f1d1d",color:"#f87171",padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>⚠ Reset Semua</button>
            <span style={{color:"#475569",fontSize:10,fontFamily:"monospace",alignSelf:"center"}}>{logs.length} entries</span>
          </div>
        </div>

        {/* Progress bar - countdown to next scan */}
        {eaRunning && (
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{color:"#334155",fontSize:10,fontFamily:"monospace"}}>NEXT SCAN IN</span>
              <span style={{color:"#06b6d4",fontSize:11,fontFamily:"monospace",fontWeight:700}}>{countdown}s / {interval}s</span>
            </div>
            <div style={{background:"#0a0f1e",borderRadius:4,height:6,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#1d4ed8,#06b6d4)",borderRadius:4,transition:"width 0.5s linear"}}/>
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
          {[
            ["Total Scan",scanCount,"#06b6d4"],
            ["Posisi",`${positions.length}/${eaConfig.maxOpenTrades}`,"#94a3b8"],
            ["Win Rate",`${winRate}%`,"#4ade80"],
            ["P&L",`${account?.profit>=0?"+":""}${account?.profit?.toFixed(2)||"0"}`,account?.profit>=0?"#4ade80":"#f87171"],
            ["Trades",eaStats.totalTrades,"#94a3b8"],
            ["Win",eaStats.winTrades,"#4ade80"],
            ["Loss",eaStats.lossTrades,"#f87171"],
            ["Interval",`${interval}s`,"#a78bfa"],
          ].map(([k,v,c])=>(
            <div key={k} style={{background:"#0a0f1e",border:"1px solid #0f172a",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
              <div style={{color:"#334155",fontSize:9,letterSpacing:1,marginBottom:2}}>{k}</div>
              <div style={{color:c,fontFamily:"monospace",fontWeight:700,fontSize:12}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Log entries */}
      <EALog logs={logs}/>
    </div>
  );
}

// ===================== AUTH =====================
const AUTH = { user: "SENOPATI", pass: "Hay_Dear1" };

function LoginPage({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!user || !pass) { setError("Username dan password wajib diisi."); return; }
    setLoading(true);
    setTimeout(() => {
      if (user === AUTH.user && pass === AUTH.pass) {
        saveLS("dnr_auth", { user, ts: Date.now() });
        onLogin();
      } else {
        setError("Username atau password salah.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div style={{
      minHeight:"100vh", background:"#050c18", display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"monospace", position:"relative", overflow:"hidden"
    }}>
      {/* Background grid */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(#0f172a 1px,transparent 1px),linear-gradient(90deg,#0f172a 1px,transparent 1px)",backgroundSize:"40px 40px",opacity:0.4}}/>
      {/* Glow */}
      <div style={{position:"absolute",top:"30%",left:"50%",transform:"translate(-50%,-50%)",width:400,height:400,background:"radial-gradient(circle,#1d4ed820 0%,transparent 70%)",pointerEvents:"none"}}/>

      <div style={{position:"relative",width:380,zIndex:1}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:36,marginBottom:8}}>⬡</div>
          <div style={{color:"#06b6d4",fontSize:22,fontWeight:700,letterSpacing:4}}>DnR EA TERMINAL</div>
          <div style={{color:"#1e3a5f",fontSize:11,marginTop:4,letterSpacing:2}}>PROFESSIONAL TRADING SYSTEM</div>
        </div>

        {/* Card */}
        <div style={{background:"#070e1d",border:"1px solid #1e293b",borderRadius:16,padding:32,boxShadow:"0 0 40px #1d4ed810"}}>
          <div style={{color:"#475569",fontSize:10,letterSpacing:3,marginBottom:24,textAlign:"center"}}>SECURE LOGIN</div>

          {/* Username */}
          <div style={{marginBottom:16}}>
            <div style={{color:"#334155",fontSize:10,letterSpacing:1,marginBottom:6}}>USERNAME</div>
            <input
              value={user} onChange={e=>{setUser(e.target.value);setError("");}}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              placeholder="Enter username"
              style={{width:"100%",background:"#0a0f1e",border:`1px solid ${error?"#dc2626":"#1e293b"}`,borderRadius:8,padding:"11px 14px",color:"#e2e8f0",fontFamily:"monospace",fontSize:13,boxSizing:"border-box",outline:"none"}}
            />
          </div>

          {/* Password */}
          <div style={{marginBottom:24}}>
            <div style={{color:"#334155",fontSize:10,letterSpacing:1,marginBottom:6}}>PASSWORD</div>
            <div style={{position:"relative"}}>
              <input
                type={showPass?"text":"password"} value={pass}
                onChange={e=>{setPass(e.target.value);setError("");}}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                placeholder="Enter password"
                style={{width:"100%",background:"#0a0f1e",border:`1px solid ${error?"#dc2626":"#1e293b"}`,borderRadius:8,padding:"11px 40px 11px 14px",color:"#e2e8f0",fontFamily:"monospace",fontSize:13,boxSizing:"border-box",outline:"none"}}
              />
              <button onClick={()=>setShowPass(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:14,padding:0}}>
                {showPass?"🙈":"👁"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && <div style={{color:"#f87171",fontSize:11,marginBottom:16,textAlign:"center",padding:"6px 0",borderRadius:6,background:"#2d0b0b",border:"1px solid #7f1d1d"}}>{error}</div>}

          {/* Login Button */}
          <button onClick={handleLogin} disabled={loading} style={{
            width:"100%",padding:"13px 0",background:loading?"#0f172a":"linear-gradient(135deg,#1d4ed8,#0891b2)",
            border:"none",borderRadius:8,color:loading?"#334155":"#fff",fontFamily:"monospace",fontSize:13,
            fontWeight:700,letterSpacing:2,cursor:loading?"not-allowed":"pointer",transition:"all 0.2s"
          }}>
            {loading?"⟳ VERIFYING...":"▶ LOGIN"}
          </button>

          <div style={{textAlign:"center",marginTop:20,color:"#1e3a5f",fontSize:9,letterSpacing:1}}>
            UNAUTHORIZED ACCESS IS PROHIBITED
          </div>
        </div>

        <div style={{textAlign:"center",marginTop:16,color:"#1e293b",fontSize:9,letterSpacing:1}}>
          DnR EA Terminal v3.0 — Powered by Groq AI
        </div>
      </div>
    </div>
  );
}

// ===================== PERSISTENCE HELPERS =====================
function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ===================== MAIN APP =====================
export default function App() {
  // ── Auth gate ─────────────────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const auth = loadLS("dnr_auth", null);
    if (!auth) return false;
    return (Date.now() - auth.ts) < 12 * 60 * 60 * 1000;
  });

  const [wsUrl, setWsUrl] = useState(() => loadLS("dnr_wsUrl", "ws://localhost:8765"));
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [demoMode, setDemoMode] = useState(true);
  const [ticks, setTicks] = useState({});
  const [candles, setCandles] = useState({});

  // ---- PERSISTED STATE ----
  const [positions, setPositions] = useState(() => loadLS("dnr_positions", []));
  const [account, setAccount] = useState(() => loadLS("dnr_account", null));
  const [selected, setSelected] = useState(() => loadLS("dnr_selected", "BTCUSD"));
  const [timeframe, setTimeframe] = useState(() => loadLS("dnr_timeframe", "M15"));
  const [eaLogs, setEaLogs] = useState(() => loadLS("dnr_eaLogs", []));
  const [eaStats, setEaStats] = useState(() => loadLS("dnr_eaStats", { totalTrades:0, winTrades:0, lossTrades:0, totalPnL:0, todayTrades:0 }));
  const [eaConfig, setEaConfig] = useState(() => loadLS("dnr_eaConfig", {
    defaultSL: 200, defaultTP: 500, maxLot: 0.5, defaultLot: 0.1,
    maxDailyLoss: 500, maxOpenTrades: 3, minConfidence: "MEDIUM",
    mtfFilter: "OFF", autoInterval: 60000, useAiSLTP: true, symbolSuffix: ""
  }));
  const [activeEAPairs, setActiveEAPairs] = useState(() => loadLS("dnr_activeEAPairs", ["BTCUSD","ETHUSD"]));
  const [analyses, setAnalyses] = useState(() => loadLS("dnr_analyses", {}));
  // ---- END PERSISTED STATE ----

  const [mtfData, setMtfData] = useState({});
  const [analyzing, setAnalyzing] = useState({});
  const [tab, setTab] = useState("chart");
  // eaRunning persisted — so button shows STOP EA after reload if it was running
  // Orders are still protected by 5 guards (Guard 3: existing positions check)
  const [eaRunning, setEaRunning] = useState(() => loadLS("dnr_eaRunning", false));
  const eaRestoredFromReload = useRef(loadLS("dnr_eaRunning", false)); // true if was running before reload
  const [pairCategory, setPairCategory] = useState("Majors");
  const [pairSearch, setPairSearch] = useState("");

  // Auto-save to localStorage whenever these states change
  useEffect(() => { saveLS("dnr_positions",    positions);    }, [positions]);
  useEffect(() => { saveLS("dnr_account",      account);      }, [account]);
  useEffect(() => { saveLS("dnr_selected",     selected);     }, [selected]);
  useEffect(() => { saveLS("dnr_timeframe",    timeframe);    }, [timeframe]);
  useEffect(() => { saveLS("dnr_eaLogs",       eaLogs.slice(-500)); }, [eaLogs]);
  useEffect(() => { saveLS("dnr_eaStats",      eaStats);      }, [eaStats]);
  useEffect(() => { saveLS("dnr_eaConfig",     eaConfig);     }, [eaConfig]);
  useEffect(() => { saveLS("dnr_activeEAPairs",activeEAPairs);}, [activeEAPairs]);
  useEffect(() => { saveLS("dnr_analyses",     analyses);     }, [analyses]);
  useEffect(() => { saveLS("dnr_eaRunning",    eaRunning);    }, [eaRunning]);
  useEffect(() => { saveLS("dnr_wsUrl",        wsUrl);        }, [wsUrl]);

  const wsRef = useRef(null);
  const demoInterval = useRef(null);
  const eaTimerRef = useRef(null);

  const addLog = useCallback((type, msg) => {
    const time = new Date().toTimeString().slice(0,8);
    setEaLogs(prev => [...prev.slice(-499), { type, msg, time }]);
  }, []);

  // On first mount: restore session + auto-reconnect if was connected
  useEffect(() => {
    const savedPos     = loadLS("dnr_positions", []);
    const savedLogs    = loadLS("dnr_eaLogs", []);
    const wasConnected = loadLS("dnr_wasConnected", false);
    const wasEaRunning = loadLS("dnr_eaRunning", false);
    const now = new Date().toLocaleString("id-ID");

    if (savedLogs.length > 0 || savedPos.length > 0) {
      addLog("SYSTEM", `🔄 SESSION DILANJUTKAN [${now}] — ${savedPos.length} posisi | ${savedLogs.length} log | EA: ${wasEaRunning?"AKTIF (lanjut)":"STOPPED"}`);
    } else {
      addLog("SYSTEM", `🚀 DnR EA Terminal dimulai [${now}]`);
    }

    if (wasEaRunning) {
      addLog("INFO", `🤖 EA dipulihkan — status RUNNING | Posisi existing dilindungi dari re-order`);
    }

    // Auto-reconnect to MT5 bridge if was previously connected
    if (wasConnected) {
      addLog("INFO", `🔌 Auto-reconnect ke ${loadLS("dnr_wsUrl","ws://localhost:8765")}...`);
      // Delay slightly so UI renders first, then reconnect
      setTimeout(() => connect(), 800);
    }
  // eslint-disable-next-line
  }, []);

  const clearAllData = () => {
    ["dnr_positions","dnr_account","dnr_eaLogs","dnr_eaStats","dnr_analyses","dnr_eaRunning","dnr_wasConnected"].forEach(k => localStorage.removeItem(k));
    setPositions([]); setEaLogs([]); setEaStats({ totalTrades:0, winTrades:0, lossTrades:0, totalPnL:0, todayTrades:0 }); setAnalyses({});
    setEaRunning(false);
    eaRestoredFromReload.current = false;
    orderedThisSession.current.clear();
    addLog("SYSTEM", "🗑 Semua data lokal dihapus — EA di-reset");
  };

  const startDemo = useCallback(() => {
    setDemoMode(true);
    const initCandles = {}, initTicks = {};
    PAIRS.forEach(p => { initCandles[p] = generateMockCandles(p, 80); initTicks[p] = generateMockTick(p, null); });
    setCandles(initCandles);
    setTicks(initTicks);
    // Hanya set account default jika belum ada account tersimpan
    if (!loadLS("dnr_account", null)) {
      setAccount({ balance:10000, equity:10050, free_margin:9500, profit:50, leverage:100, currency:"USD" });
    }
    if (demoInterval.current) clearInterval(demoInterval.current);
    demoInterval.current = setInterval(() => {
      setTicks(prev => { const next={}; PAIRS.forEach(p => { next[p]=generateMockTick(p, prev[p]); }); return next; });
      setCandles(prev => {
        const next={...prev};
        PAIRS.forEach(p => {
          if (!next[p]) return;
          const last = next[p][next[p].length-1];
          const newClose = generateMockTick(p, {bid:last.close}).bid;
          next[p] = [...next[p].slice(-79), { ...last, close:newClose, high:Math.max(last.high,newClose), low:Math.min(last.low,newClose), time:new Date().toISOString() }];
        });
        return next;
      });
    }, 1000);
  }, []);

  useEffect(() => { startDemo(); return ()=>clearInterval(demoInterval.current); }, [startDemo]);

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    setWsStatus("connecting");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      setWsStatus("connected"); setDemoMode(false); clearInterval(demoInterval.current);
      saveLS("dnr_wasConnected", true);
      addLog("SYSTEM", `✅ Terhubung ke MT5 Bridge: ${wsUrl}`);
      // Request data awal
      ws.send(JSON.stringify({type:"get_account"}));
      ws.send(JSON.stringify({type:"get_positions"}));
      PAIRS.forEach(p => ws.send(JSON.stringify({type:"get_candles",symbol:getBrokerSymbol(p),timeframe,count:100})));
      // Sync posisi berkala setiap 5 detik
      if (window._posSync) clearInterval(window._posSync);
      window._posSync = setInterval(() => {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({type:"get_positions"}));
          ws.send(JSON.stringify({type:"get_account"}));
        }
      }, 5000);
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        // Tick data
        if (msg.type==="ticks") {
          // Normalize tick keys: build canonical→broker map, store ticks by canonical name
          const normalized = {};
          Object.entries(msg.data||{}).forEach(([rawSym, tickData]) => {
            registerBrokerSymbol(rawSym);
            const canonical = normalizeSymbol(rawSym);
            const key = PAIRS.includes(canonical) ? canonical : rawSym.toUpperCase();
            normalized[key] = { ...tickData, _broker_symbol: rawSym };
          });
          setTicks(prev=>({...prev,...normalized}));

        // Candle data
        } else if (msg.type==="candles") {
          const rawSym = msg.symbol || "";
          registerBrokerSymbol(rawSym);
          const canonical = normalizeSymbol(rawSym);
          const key = PAIRS.includes(canonical) ? canonical : rawSym.toUpperCase();
          setCandles(prev=>({...prev,[key]:msg.data}));

        // Account / init / positions sync
        } else if (["account","init","positions_update","update"].includes(msg.type)) {
          if (msg.positions) setPositions(
            msg.positions.map(p => {
              const rawSym = p.symbol || "";
              registerBrokerSymbol(rawSym);
              const canonical = normalizeSymbol(rawSym);
              const sym = PAIRS.includes(canonical) ? canonical : rawSym.toUpperCase();
              return { ...p, symbol: sym, _broker_symbol: rawSym };
            })
          );
          if (msg.account) setAccount(msg.account);

        // Order success — handle SEMUA format bridge yang mungkin
        } else if (
          msg.type==="order_result" ||
          msg.type==="order_sent"   ||
          msg.type==="trade_result" ||
          msg.type==="order"        ||
          msg.type==="trade"
        ) {
          // Deteksi sukses: cek semua field yang mungkin dari berbagai versi bridge
          const isSuccess = msg.success === true
            || msg.retcode === 10009   // MT5 TRADE_RETCODE_DONE
            || msg.retcode === 0
            || (msg.ticket && msg.ticket > 0)
            || msg.status === "ok"
            || msg.status === "success"
            || msg.result === "ok";

          const ticket  = msg.ticket  || msg.order   || "—";
          const price   = msg.price   || msg.deal_price || msg.entry || "—";
          const errMsg  = msg.error   || msg.comment  || msg.retcode || "Unknown";

          if (isSuccess) {
            addLog("TRADE", `✅ ORDER SUKSES — Ticket #${ticket} @ ${price}`);
            setEaStats(p=>({...p, totalTrades:p.totalTrades+1, todayTrades:p.todayTrades+1}));
            // Minta sync posisi terbaru dari MT5
            if (ws.readyState === 1) ws.send(JSON.stringify({type:"get_positions"}));
          } else {
            addLog("ERROR", `❌ ORDER GAGAL — ${errMsg} (retcode: ${msg.retcode||"?"})`);
          }

        // Close position result
        } else if (msg.type==="close_result" || msg.type==="position_closed") {
          if (msg.success || msg.ticket) {
            addLog("TRADE", `✅ POSISI DITUTUP — Ticket #${msg.ticket||"?"} | P&L: ${msg.profit>=0?"+":""}${msg.profit?.toFixed(2)||"?"}`);
            if (msg.profit !== undefined) {
              const pnl = parseFloat(msg.profit)||0;
              setEaStats(p=>({...p, totalPnL:p.totalPnL+pnl, winTrades:pnl>0?p.winTrades+1:p.winTrades, lossTrades:pnl<0?p.lossTrades+1:p.lossTrades}));
            }
            if (ws.readyState === 1) ws.send(JSON.stringify({type:"get_positions"}));
          }

        // Debug: log pesan yang tidak dikenali agar mudah diagnosa
        } else {
          addLog("WARN", `MSG TIDAK DIKENAL: type="${msg.type}" — ${JSON.stringify(msg).slice(0,120)}`);
        }

      } catch(err) {
        addLog("ERROR", `Parse WebSocket error: ${err.message}`);
      }
    };
    ws.onerror = () => setWsStatus("error");
    ws.onclose = () => {
      setWsStatus("disconnected");
      saveLS("dnr_wasConnected", false);
      addLog("WARN", "WebSocket terputus dari MT5 Bridge");
      clearInterval(window._posSync);
      startDemo();
    };
  }, [wsUrl, timeframe, startDemo, addLog]);

  const disconnect = () => { wsRef.current?.close(); setWsStatus("disconnected"); startDemo(); };

  const handleAnalyze = useCallback(async (symbol) => {
    setAnalyzing(p=>({...p,[symbol]:true}));
    const [result, mtf] = await Promise.all([
      analyzeWithGroq(symbol, candles[symbol]||[], ticks[symbol]||{bid:0,ask:0,spread:0}, eaConfig),
      getMTFAnalysis(symbol, candles[symbol]||[], ticks[symbol]||{})
    ]);
    if (result?.summary?.startsWith("Error")) {
      addLog("ERROR", `[${symbol}] ${result.summary}`);
    } else {
      addLog("INFO", `[${symbol}] Groq AI: ${result?.signal||"?"} | ${result?.confidence||"?"} | ${result?.summary?.slice(0,60)||""}`);
    }
    setAnalyses(p=>({...p,[symbol]:result}));
    setMtfData(p=>({...p,[symbol]:mtf}));
    setAnalyzing(p=>({...p,[symbol]:false}));
    return result;
  }, [candles, ticks, eaConfig, addLog]);

  // EA AUTO EXECUTE
  // ─── ANTI-REORDER GUARD ────────────────────────────────────────────────
  // Tracks tickets sent THIS session (cleared on reload — prevents duplicate orders)
  const orderedThisSession = useRef(new Set());

  const executeEA = useCallback(async () => {
    // GUARD 1: EA must be explicitly running
    if (!eaRunning) return;

    // GUARD 2: eaRunning is never persisted — must be manually pressed after reload
    const scanStart = Date.now();
    addLog("SYSTEM", `━━━ SCAN MULAI — ${activeEAPairs.length} pair aktif [${activeEAPairs.join(", ")}] ━━━`);

    let executed = 0, skipped = 0, waited = 0;

    for (const symbol of activeEAPairs) {
      // GUARD 3: Skip pair if already has open position this session
      const alreadyOpen = positions.some(p => p.symbol === symbol || p.symbol === symbol.toLowerCase());
      if (alreadyOpen) {
        addLog("INFO", `${symbol} → SKIP — posisi sudah terbuka, tidak re-order`);
        skipped++; continue;
      }

      // GUARD 4: Skip if symbol was already ordered this session (in-memory, resets on reload)
      if (orderedThisSession.current.has(symbol)) {
        addLog("INFO", `${symbol} → SKIP — sudah diorder sesi ini, tunggu posisi selesai`);
        skipped++; continue;
      }

      addLog("AI", `Menganalisis ${symbol}... (Groq AI)`);
      const analysis = await handleAnalyze(symbol);

      if (!analysis || analysis.signal === "WAIT") {
        addLog("INFO", `${symbol} → WAIT | ${analysis?.summary?.slice(0,60)||""}...`);
        waited++; continue;
      }

      // Confidence filter
      const confLevel = { HIGH:3, MEDIUM:2, LOW:1 };
      const minConf = confLevel[eaConfig.minConfidence] || 2;
      if (confLevel[analysis.confidence] < minConf) {
        addLog("WARN", `${symbol} → ${analysis.signal} DITOLAK — Confidence ${analysis.confidence} < min ${eaConfig.minConfidence}`);
        skipped++; continue;
      }

      // MTF filter
      const mtf = mtfData[symbol];
      if (eaConfig.mtfFilter !== "OFF" && mtf) {
        const signals = [mtf.M5, mtf.H1, mtf.H4];
        const agree = signals.filter(s=>s===analysis.signal).length;
        const required = eaConfig.mtfFilter === "3OF3" ? 3 : 2;
        if (agree < required) {
          addLog("WARN", `${symbol} → ${analysis.signal} DITOLAK — MTF hanya ${agree}/3 setuju (butuh ${required})`);
          skipped++; continue;
        }
        addLog("INFO", `${symbol} → MTF konfirmasi ${agree}/3 ✓`);
      }

      // Max open trades
      if (positions.length >= eaConfig.maxOpenTrades) {
        addLog("WARN", `BERHENTI — Max posisi terbuka (${positions.length}/${eaConfig.maxOpenTrades})`);
        break;
      }

      // Max daily loss
      const currentLoss = account?.profit || 0;
      if (currentLoss < -eaConfig.maxDailyLoss) {
        addLog("ERROR", `MAX DAILY LOSS TERCAPAI ($${currentLoss.toFixed(2)}) — EA dihentikan!`);
        setEaRunning(false); return;
      }

      // Build SL/TP
      const lot = Math.min(eaConfig.defaultLot, eaConfig.maxLot);
      const useAi = eaConfig.useAiSLTP !== false;
      const smartDefault = getDefaultSLTP(symbol);
      const entry = analysis.entry_price || ticks[symbol]?.bid || 0;

      let slPips, tpPips, slPrice, tpPrice, slSource;
      if (useAi && analysis.sl_pips > 0) {
        slPips = analysis.sl_pips; tpPips = analysis.tp_pips;
        slPrice = analysis.sl_price; tpPrice = analysis.tp_price;
        slSource = "AI";
      } else if (useAi) {
        slPips = smartDefault.sl; tpPips = smartDefault.tp;
        const calc = calcSLTP(symbol, analysis.signal, entry, slPips, tpPips);
        slPrice = calc.sl; tpPrice = calc.tp;
        slSource = "SmartDefault";
      } else {
        slPips = eaConfig.defaultSL; tpPips = eaConfig.defaultTP;
        const calc = calcSLTP(symbol, analysis.signal, entry, slPips, tpPips);
        slPrice = calc.sl; tpPrice = calc.tp;
        slSource = "Manual";
      }

      const tp1P      = useAi ? (analysis.tp1_price||0) : tpPrice;
      const tp2P      = useAi ? (analysis.tp2_price||tpPrice) : tpPrice;
      const tp1Pips   = useAi ? (analysis.tp1_pips||0) : tpPips;
      const tp2Pips   = useAi ? (analysis.tp2_pips||tpPips) : tpPips;
      const slPlus    = useAi ? (analysis.sl_plus_price||slPrice) : slPrice;
      const partialLot = +(lot * 0.5).toFixed(2);

      addLog("TRADE", `ORDER → ${symbol} ${analysis.signal} ${lot}lot | SL:${slPrice} | TP1:${tp1P} | TP2:${tp2P} | SL+:${slPlus} | R:R ${analysis.rr1||"?"}/${analysis.rr2||"?"} | Src:${slSource}`);

      // GUARD 5: Register symbol as ordered BEFORE sending (prevent race condition)
      orderedThisSession.current.add(symbol);

      handleOrder(symbol, analysis.signal, String(lot), String(slPips), String(tp2Pips), slPrice, tp2P, tp1P, slPlus, partialLot);
      executed++;
    }

    const elapsed = ((Date.now()-scanStart)/1000).toFixed(1);
    addLog("SYSTEM", `━━━ SCAN SELESAI ${elapsed}s — Eksekusi:${executed} | Skip:${skipped} | Wait:${waited} | Posisi:${positions.length}/${eaConfig.maxOpenTrades} ━━━`);
  }, [eaRunning, activeEAPairs, handleAnalyze, eaConfig, mtfData, positions, account, ticks]);

  useEffect(() => {
    if (eaRunning) {
      const isReload = eaRestoredFromReload.current;

      if (isReload) {
        // ── RELOAD CASE: EA was running before reload ──────────────────
        // Do NOT clear orderedThisSession — keep it empty (new session)
        // Guards will protect existing positions from re-order
        addLog("INFO", `🔄 EA DILANJUTKAN setelah reload — interval ${eaConfig.autoInterval/1000}s`);
        addLog("INFO", `🛡 Guard aktif: posisi existing terlindungi dari re-order`);
        // Mark as no longer "restored" so next toggle is treated as fresh start
        eaRestoredFromReload.current = false;
        // Delay first scan — give time for MT5 to sync positions first
        const firstScanDelay = setTimeout(() => {
          addLog("INFO", `⏱ Delay 5s selesai — mulai scan pertama...`);
          executeEA();
        }, 5000);
        eaTimerRef.current = setInterval(executeEA, eaConfig.autoInterval);
        return () => { clearTimeout(firstScanDelay); clearInterval(eaTimerRef.current); };
      } else {
        // ── FRESH START: user pressed START EA manually ─────────────────
        addLog("INFO", `▶ EA DIMULAI — interval ${eaConfig.autoInterval/1000}s | Pairs: ${activeEAPairs.join(", ")}`);
        orderedThisSession.current.clear(); // fresh slate
        executeEA();
        eaTimerRef.current = setInterval(executeEA, eaConfig.autoInterval);
      }
    } else {
      clearInterval(eaTimerRef.current);
      if (eaTimerRef.current) addLog("INFO", "⏹ EA DIHENTIKAN");
    }
    return () => clearInterval(eaTimerRef.current);
  }, [eaRunning, eaConfig.autoInterval]);

  const handleOrder = (symbol, action, volume, slPips, tpPips, slPriceArg, tp2PriceArg, tp1PriceArg=0, slPlusPrice=0, partialLot=0) => {
    const tick = ticks[symbol];
    const entryAsk = tick?.ask || 0;
    const entryBid = tick?.bid || 0;
    const entryPrice = action === "BUY" ? entryAsk : entryBid;
    const slPipsNum = parseFloat(slPips) || getDefaultSLTP(symbol).sl;
    const tpPipsNum = parseFloat(tpPips) || getDefaultSLTP(symbol).tp;
    const { sl: slCalc, tp: tp2Calc } = calcSLTP(symbol, action, entryPrice, slPipsNum, tpPipsNum);
    const slPrice  = slPriceArg  && slPriceArg  > 0 ? slPriceArg  : slCalc;
    const tp2Price = tp2PriceArg && tp2PriceArg > 0 ? tp2PriceArg : tp2Calc;
    const tp1Price = tp1PriceArg && tp1PriceArg > 0 ? tp1PriceArg : 0;
    const pipSz    = getPipSize(symbol);
    const volNum   = parseFloat(volume);
    const partLot  = partialLot || +(volNum * 0.5).toFixed(2);

    if (!demoMode && wsRef.current?.readyState === 1) {
      // Use actual broker symbol name (e.g. BTCUSDm instead of BTCUSD)
      const brokerSym = getBrokerSymbol(symbol);
      if (brokerSym !== symbol)
        addLog("INFO", `🔄 Symbol mapping: ${symbol} → ${brokerSym} (broker name)`);
      // Send single order to MT5, TP = TP2 (final target)
      const payload = {
        type:"send_order", symbol: brokerSym, action,
        volume: volNum,
        sl: slPrice, tp: tp2Price,
        sl_pips: slPipsNum, tp_pips: tpPipsNum,
        pip_size: pipSz,
        tp1: tp1Price, sl_plus: slPlusPrice,
        partial_lot: partLot,
        comment: `DnR_EA_${symbol}`
      };
      addLog("AI", `📡 MT5 → ${symbol} ${action} ${volNum}lot | SL:${slPrice} | TP1:${tp1Price||"—"} | TP2:${tp2Price} | SL+:${slPlusPrice||"—"} | PartialClose:${partLot}lot@TP1`);
      wsRef.current.send(JSON.stringify(payload));
      setTimeout(() => {
        if (wsRef.current?.readyState===1) {
          wsRef.current.send(JSON.stringify({type:"get_positions"}));
          wsRef.current.send(JSON.stringify({type:"get_account"}));
        }
      }, 2000);
    } else {
      // DEMO MODE
      const ticket = Math.floor(Math.random()*90000+10000);
      addLog("TRADE", `[DEMO] #${ticket} ${action} ${volNum}lot ${symbol} | Entry:${entryPrice} | SL:${slPrice} | TP1:${tp1Price||"—"} | TP2:${tp2Price} | SL+:${slPlusPrice||"—"}`);
      setPositions(prev => [...prev, {
        ticket, symbol, type:action,
        volume: volNum, volume_initial: volNum,
        price_open: entryPrice, price_current: entryPrice,
        sl: slPrice, tp: tp2Price,
        tp1: tp1Price, sl_plus: slPlusPrice,
        partial_lot: partLot,
        tp1_hit: false,       // track if TP1 already triggered
        sl_pips: slPipsNum, tp_pips: tpPipsNum, pip_size: pipSz,
        profit: 0, swap:0, time:new Date().toISOString(),
        comment:`DnR_EA_${symbol}`
      }]);
      setEaStats(p=>({...p,totalTrades:p.totalTrades+1,todayTrades:p.todayTrades+1}));
    }
  };

  const handleClose = (ticket) => {
    const pos = positions.find(p=>p.ticket===ticket);
    if (pos) {
      // Allow EA to re-order this symbol after position is closed
      orderedThisSession.current.delete(pos.symbol);
      orderedThisSession.current.delete((pos.symbol||"").toLowerCase());
    }
    if (!demoMode && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({type:"close_position",ticket}));
    } else {
      const pnl = (Math.random()-0.45)*50;
      setEaStats(p=>({...p, totalPnL:p.totalPnL+pnl, winTrades:pnl>0?p.winTrades+1:p.winTrades, lossTrades:pnl<0?p.lossTrades+1:p.lossTrades}));
      setPositions(p=>p.filter(pos=>pos.ticket!==ticket));
      addLog("TRADE",`Posisi #${ticket} ditutup — ${pos?.symbol||""} siap di-scan ulang`);
    }
  };

  // Monitor tick prices → trigger partial close when TP1 is hit (demo + live)
  useEffect(() => {
    setPositions(prev => {
      let changed = false;
      const next = prev.map(pos => {
        if (!pos.tp1 || pos.tp1_hit || pos.tp1 <= 0) return pos;
        const curTick = ticks[pos.symbol];
        if (!curTick) return pos;
        const curPrice = pos.type === "BUY" ? curTick.bid : curTick.ask;
        const tp1Hit   = pos.type === "BUY" ? curPrice >= pos.tp1 : curPrice <= pos.tp1;
        if (!tp1Hit) return pos;

        changed = true;
        const partLot     = pos.partial_lot || +(pos.volume * 0.5).toFixed(2);
        const remainLot   = +(pos.volume - partLot).toFixed(2);
        const tp1Pips = Math.round(Math.abs(pos.tp1 - pos.price_open) / (pos.pip_size || getPipSize(pos.symbol) || 0.0001));
        addLog("TRADE", `✅ TP1 HIT #${pos.ticket} ${pos.symbol} @ ${pos.tp1} — Partial close ${partLot}lot (${tp1Pips}p) | Sisa ${remainLot}lot lanjut ke TP2 ${pos.tp}`);
        addLog("INFO",  `🔒 SL digeser ke SL+ ${pos.sl_plus} untuk posisi sisa #${pos.ticket}`);

        // In live mode: send partial_close + modify_sl to bridge
        if (!demoMode && wsRef.current?.readyState===1) {
          wsRef.current.send(JSON.stringify({type:"partial_close", ticket:pos.ticket, volume:partLot}));
          setTimeout(()=>{
            if (wsRef.current?.readyState===1)
              wsRef.current.send(JSON.stringify({type:"modify_sl", ticket:pos.ticket, sl:pos.sl_plus}));
          }, 500);
        }

        return {
          ...pos,
          volume: remainLot,
          sl: pos.sl_plus || pos.sl,   // move SL to SL+
          tp1_hit: true,                // prevent re-trigger
        };
      });
      if (changed) return next;
      return prev;
    });
  // eslint-disable-next-line
  }, [ticks]);

  const analyzeAll = async () => { for (const p of PAIRS) await handleAnalyze(p); };
  const statusColor = {connected:"#4ade80",connecting:"#fb923c",disconnected:"#475569",error:"#f87171"}[wsStatus];
  const winRate = eaStats.totalTrades > 0 ? ((eaStats.winTrades/eaStats.totalTrades)*100).toFixed(1) : "0.0";

  if (!isLoggedIn) return <LoginPage onLogin={()=>setIsLoggedIn(true)} />;

  return (
    <div style={{background:"#050c18",minHeight:"100vh",fontFamily:"monospace",color:"#e2e8f0",padding:0}}>

      {/* TOP BAR */}
      <div style={{background:"#070e1d",borderBottom:"1px solid #0f172a",padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{color:"#06b6d4",fontSize:16,fontWeight:700,letterSpacing:2}}>⬡ DnR EA TERMINAL</span>
          <span style={{color:"#1e3a5f",fontSize:12}}>|</span>
          <span style={{color:"#334155",fontSize:10,letterSpacing:1}}>👤 {loadLS("dnr_auth",{}).user||"USER"}</span>
          <button onClick={()=>{saveLS("dnr_auth",null);saveLS("dnr_wasConnected",false);window.location.reload();}} style={{background:"#0f172a",border:"1px solid #1e293b",color:"#475569",padding:"2px 8px",borderRadius:4,cursor:"pointer",fontSize:9,fontFamily:"monospace",letterSpacing:1}}>LOGOUT</button>
          <span style={{color:"#1e3a5f",fontSize:12}}>|</span>
          <span style={{color:demoMode?"#fb923c":"#4ade80",fontSize:10,letterSpacing:1}}>● {demoMode?"DEMO":"LIVE MT5"}</span>
          <span style={{color:"#1e3a5f",fontSize:12}}>|</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:eaRunning?"#4ade80":"#334155",boxShadow:eaRunning?"0 0 8px #4ade80":undefined}}/>
            <span style={{fontSize:10,color:eaRunning?"#4ade80":"#475569",letterSpacing:1}}>EA {eaRunning?"RUNNING":"STOPPED"}</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <input value={wsUrl} onChange={e=>setWsUrl(e.target.value)} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:4,padding:"4px 10px",color:"#94a3b8",fontSize:11,width:180}}/>
          {wsStatus==="connected"
            ? <button onClick={disconnect} style={{background:"#2d0b0b",border:"1px solid #7f1d1d",color:"#f87171",padding:"4px 12px",borderRadius:4,cursor:"pointer",fontSize:11}}>✕ DISCONNECT</button>
            : <button onClick={connect} style={{background:"#052e16",border:"1px solid #15803d",color:"#4ade80",padding:"4px 12px",borderRadius:4,cursor:"pointer",fontSize:11}}>⚡ CONNECT MT5</button>
          }
          <span style={{color:statusColor,fontSize:10,letterSpacing:1}}>● {wsStatus.toUpperCase()}</span>
        </div>
        {account && (
          <div style={{display:"flex",gap:16,fontSize:11}}>
            {[["BAL",`$${account.balance?.toLocaleString()}`,`#94a3b8`],["EQ",`$${account.equity?.toLocaleString()}`,`#22d3ee`],["P&L",`${account.profit>=0?"+":""}$${account.profit?.toFixed(2)}`,account.profit>=0?"#4ade80":"#f87171"]].map(([k,v,c])=>(
              <span key={k}><span style={{color:"#475569"}}>{k} </span><span style={{color:c,fontWeight:700}}>{v}</span></span>
            ))}
          </div>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:0,height:"calc(100vh - 49px)"}}>

        {/* LEFT SIDEBAR */}
        <div style={{borderRight:"1px solid #0f172a",overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:8}}>
          {/* EA CONTROL */}
          <div style={{background:"#070e1d",border:`1px solid ${eaRunning?"#15803d":"#1e293b"}`,borderRadius:10,padding:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{color:"#06b6d4",fontSize:10,letterSpacing:2}}>EA CONTROL</span>
              <button
                onClick={()=>{
                  if (eaRunning) {
                    addLog("INFO","⏹ EA dihentikan oleh user");
                    eaRestoredFromReload.current = false;
                  }
                  setEaRunning(r=>!r);
                }}
                style={{background:eaRunning?"#2d0b0b":"#052e16",border:`1px solid ${eaRunning?"#dc2626":"#16a34a"}`,color:eaRunning?"#f87171":"#4ade80",padding:"4px 14px",borderRadius:4,cursor:"pointer",fontSize:11,fontFamily:"monospace",fontWeight:700,letterSpacing:1}}
              >{eaRunning?"⏹ STOP EA":"▶ START EA"}</button>
              {eaRunning && eaRestoredFromReload.current && (
                <div style={{fontSize:9,color:"#06b6d4",fontFamily:"monospace",marginTop:4,textAlign:"center",letterSpacing:0.5,padding:"2px 4px",background:"#0a0f1e",borderRadius:4}}>
                  🔄 Dilanjutkan dari reload — scan mulai 5 detik
                </div>
              )}
              {!eaRunning && positions.length > 0 && (
                <div style={{fontSize:9,color:"#fb923c",fontFamily:"monospace",marginTop:4,textAlign:"center",letterSpacing:0.5}}>
                  ⚠ {positions.length} posisi aktif — tekan START EA untuk lanjutkan
                </div>
              )}
            </div>
            {/* EA Stats */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {[["Trades",eaStats.totalTrades,"#94a3b8"],["Win Rate",`${winRate}%`,"#4ade80"],["Today",eaStats.todayTrades,"#06b6d4"],["P&L",`${eaStats.totalPnL>=0?"+":""}${eaStats.totalPnL.toFixed(2)}`,eaStats.totalPnL>=0?"#4ade80":"#f87171"]].map(([k,v,c])=>(
                <div key={k} style={{background:"#0a0f1e",border:"1px solid #0f172a",borderRadius:6,padding:"6px 8px",textAlign:"center"}}>
                  <div style={{color:"#334155",fontSize:9,letterSpacing:1}}>{k}</div>
                  <div style={{color:c,fontFamily:"monospace",fontWeight:700,fontSize:13}}>{v}</div>
                </div>
              ))}
            </div>
            {/* Active Pairs — GLOBAL MULTI-CATEGORY */}
            <div style={{marginTop:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{color:"#334155",fontSize:9,letterSpacing:1}}>AKTIF PAIR <span style={{color:"#1d4ed8",fontWeight:700}}>({activeEAPairs.length})</span></span>
                <div style={{display:"flex",gap:3}}>
                  <button
                    title={`Tambah semua ${pairCategory} ke aktif`}
                    onClick={()=>setActiveEAPairs(prev=>[...new Set([...prev,...(PAIR_CATEGORIES[pairCategory]||[])])])}
                    style={{background:"#052e16",border:"1px solid #16a34a",color:"#4ade80",padding:"1px 7px",borderRadius:3,cursor:"pointer",fontSize:9,fontFamily:"monospace"}}>
                    +{pairCategory}
                  </button>
                  <button onClick={()=>setActiveEAPairs(PAIRS)} style={{background:"#0c1a2e",border:"1px solid #1d4ed8",color:"#93c5fd",padding:"1px 7px",borderRadius:3,cursor:"pointer",fontSize:9,fontFamily:"monospace"}}>+All</button>
                  <button onClick={()=>setActiveEAPairs([])} style={{background:"#2d0b0b",border:"1px solid #dc2626",color:"#f87171",padding:"1px 7px",borderRadius:3,cursor:"pointer",fontSize:9,fontFamily:"monospace"}}>✕ Clear</button>
                </div>
              </div>

              {/* Selected chips — tampil semua pair aktif dari semua kategori */}
              {activeEAPairs.length > 0 ? (
                <div style={{display:"flex",flexWrap:"wrap",gap:3,maxHeight:72,overflowY:"auto",marginBottom:6,padding:"4px",background:"#0a0f1e",borderRadius:6,border:"1px solid #1e3a5f"}}>
                  {activeEAPairs.map(p=>(
                    <span key={p} style={{display:"inline-flex",alignItems:"center",gap:3,background:"#0c1a2e",border:"1px solid #1d4ed8",color:"#93c5fd",padding:"1px 4px 1px 6px",borderRadius:3,fontSize:9,fontFamily:"monospace"}}>
                      {p}
                      <button onClick={()=>setActiveEAPairs(prev=>prev.filter(x=>x!==p))} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:9,padding:"0 1px",lineHeight:1}}>✕</button>
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{color:"#1e293b",fontSize:9,fontFamily:"monospace",marginBottom:6,padding:"6px",background:"#0a0f1e",borderRadius:6,textAlign:"center"}}>Belum ada pair dipilih</div>
              )}

              {/* Pair picker per kategori — additive toggle */}
              <div style={{fontSize:9,color:"#334155",marginBottom:3,fontFamily:"monospace"}}>PILIH DARI: <span style={{color:"#475569"}}>{pairCategory}</span></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:2}}>
                {(PAIR_CATEGORIES[pairCategory]||[]).map(p=>{
                  const isActive = activeEAPairs.includes(p);
                  return (
                    <button key={p}
                      onClick={()=>setActiveEAPairs(prev=>isActive?prev.filter(x=>x!==p):[...prev,p])}
                      style={{background:isActive?"#0c1a2e":"#070e1d",border:`1px solid ${isActive?"#1d4ed8":"#1e293b"}`,color:isActive?"#93c5fd":"#334155",padding:"2px 5px",borderRadius:3,cursor:"pointer",fontSize:9,fontFamily:"monospace",position:"relative"}}>
                      {isActive && <span style={{marginRight:2,color:"#4ade80"}}>✓</span>}{p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* PAIR LIST */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{color:"#334155",fontSize:9,letterSpacing:2}}>MARKET WATCH</span>
            <button onClick={analyzeAll} style={{background:"#0f172a",border:"1px solid #1e293b",color:"#06b6d4",padding:"2px 8px",borderRadius:4,cursor:"pointer",fontSize:10}}>⚡ ALL</button>
          </div>
          {/* Category Tabs */}
          <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:4}}>
            {Object.keys(PAIR_CATEGORIES).map(cat=>(
              <button key={cat} onClick={()=>setPairCategory(cat)} style={{
                background:pairCategory===cat?"#0c1a2e":"#0a0f1e",
                border:`1px solid ${pairCategory===cat?"#1d4ed8":"#1e293b"}`,
                color:pairCategory===cat?"#93c5fd":"#334155",
                padding:"2px 7px",borderRadius:3,cursor:"pointer",fontSize:9,fontFamily:"monospace"
              }}>{cat} <span style={{color:"#1e3a5f"}}>{PAIR_CATEGORIES[cat].length}</span></button>
            ))}
          </div>
          {/* Search */}
          <input
            value={pairSearch} onChange={e=>setPairSearch(e.target.value.toUpperCase())}
            placeholder="Cari pair..."
            style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:4,padding:"5px 8px",color:"#94a3b8",fontFamily:"monospace",fontSize:11,boxSizing:"border-box",marginBottom:4}}
          />
          {(pairSearch
            ? PAIRS.filter(p=>p.includes(pairSearch))
            : PAIR_CATEGORIES[pairCategory]||[]
          ).map(p=>(
            <PairCard key={p} symbol={p} tick={ticks[p]} candles={candles[p]} analysis={analyses[p]} mtfData={mtfData[p]} analyzing={analyzing[p]} selected={selected===p} onSelect={setSelected} onAnalyze={handleAnalyze}/>
          ))}
        </div>

        {/* MAIN PANEL */}
        <div style={{overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
          {/* HEADER */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:20}}>{PAIR_FLAGS[selected]}</span>
              <div>
                <div style={{color:"#e2e8f0",fontSize:20,fontWeight:700,letterSpacing:2}}>{selected}</div>
                <div style={{color:"#475569",fontSize:10}}>{PAIR_NAMES[selected]}</div>
              </div>
              <div style={{color:"#22d3ee",fontSize:26,fontWeight:700,letterSpacing:1}}>
                {ticks[selected]?.bid?.toFixed(DIGITS[selected])||"—"}
              </div>
              {analyses[selected] && <SignalBadge signal={analyses[selected].signal} confidence={analyses[selected].confidence} size="large"/>}
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {TIMEFRAMES.map(tf=>(
                <button key={tf} onClick={()=>{setTimeframe(tf); if(!demoMode&&wsRef.current?.readyState===1) wsRef.current.send(JSON.stringify({type:"get_candles",symbol:getBrokerSymbol(selected),timeframe:tf,count:100}));}} style={{
                  background:timeframe===tf?"#1e3a5f":"#0f172a", border:`1px solid ${timeframe===tf?"#1d4ed8":"#1e293b"}`,
                  color:timeframe===tf?"#93c5fd":"#475569", padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:11,fontFamily:"monospace"
                }}>{tf}</button>
              ))}
            </div>
          </div>

          {/* TABS */}
          <div style={{display:"flex",gap:0,borderBottom:"1px solid #1e293b"}}>
            {[["chart","📈 Chart"],["ea","🤖 EA Config"],["positions",`📋 Posisi (${positions.length})`],["log","📝 Log EA"]].map(([key,label])=>(
              <button key={key} onClick={()=>setTab(key)} style={{
                background:"transparent",border:"none",borderBottom:`2px solid ${tab===key?"#1d4ed8":"transparent"}`,
                color:tab===key?"#93c5fd":"#475569",padding:"7px 14px",cursor:"pointer",
                fontFamily:"monospace",fontSize:11,letterSpacing:0.5,transition:"all 0.15s",
              }}>{label}</button>
            ))}
          </div>

          {/* CHART TAB */}
          {tab==="chart" && (
            <>
              <div style={{background:"#070e1d",border:"1px solid #0f172a",borderRadius:10,padding:"10px 6px"}}>
                <MainChart data={candles[selected]} symbol={selected} positions={positions}/>
              </div>

              {/* MTF Panel */}
              {mtfData[selected] && (
                <div style={{background:"#070e1d",border:"1px solid #1e293b",borderRadius:10,padding:"10px 14px"}}>
                  <div style={{color:"#475569",fontSize:9,letterSpacing:2,marginBottom:8}}>MULTI TIMEFRAME ANALYSIS</div>
                  <div style={{display:"flex",gap:16,alignItems:"center"}}>
                    {["M5","H1","H4"].map(tf=>(
                      <div key={tf} style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{color:"#334155",fontSize:10}}>{tf}</span>
                        <MTFBadge signal={mtfData[selected][tf]}/>
                      </div>
                    ))}
                    {(() => {
                      const signals = Object.values(mtfData[selected]);
                      const buys = signals.filter(s=>s==="BUY").length;
                      const agree = buys >= 2 ? `${buys}/3 BUY` : `${3-buys}/3 SELL`;
                      const isAligned = buys === 0 || buys === 3;
                      return <span style={{marginLeft:"auto",color:isAligned?"#4ade80":"#fb923c",fontSize:10,fontFamily:"monospace"}}>{isAligned?"✓ ALIGNED":"⚠ MIXED"} — {agree}</span>;
                    })()}
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              {analyses[selected] && (
                <div style={{background:"#070e1d",border:"1px solid #1e293b",borderRadius:10,padding:14}}>
                  <div style={{color:"#475569",fontSize:9,letterSpacing:2,marginBottom:10}}>⚡ AI ANALYSIS — {selected}</div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <SignalBadge signal={analyses[selected].signal} confidence={analyses[selected].confidence}/>
                    <ConfidenceDot level={analyses[selected].confidence}/>
                    {analyses[selected].rr_ratio && <span style={{fontSize:10,fontFamily:"monospace",color:"#a78bfa"}}>R:R 1:{analyses[selected].rr_ratio}</span>}
                  </div>
                  <p style={{color:"#94a3b8",fontSize:12,lineHeight:1.6,margin:"0 0 10px 0"}}>{analyses[selected].summary||analyses[selected].trend}</p>
                  <div style={{display:"flex",gap:12,fontSize:10,flexWrap:"wrap",borderTop:"1px solid #0f172a",paddingTop:8}}>
                    {[
                      ["Trend",analyses[selected].trend,"#94a3b8"],
                      ["RSI",analyses[selected].rsi,"#06b6d4"],
                      ["SMA",analyses[selected].sma_cross,"#06b6d4"],
                      ["Momentum",analyses[selected].momentum,"#a78bfa"],
                      ["Support",analyses[selected].support,"#4ade80"],
                      ["Resistance",analyses[selected].resistance,"#f87171"],
                    ].map(([k,v,c])=>(
                      <span key={k} style={{color:"#334155"}}>{k}: <span style={{color:c,fontWeight:700}}>{v||"—"}</span></span>
                    ))}
                  </div>
                  {/* SL/TP Multi-Target Box */}
                  {analyses[selected].sl_price > 0 && (() => {
                    const a = analyses[selected];
                    const isAI = a._sltp_source === "AI";
                    return (
                      <div style={{marginTop:8,background:"#0a0f1e",borderRadius:8,border:"1px solid #1e293b",overflow:"hidden"}}>
                        {/* Header */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",borderBottom:"1px solid #0f172a"}}>
                          <span style={{fontSize:9,fontFamily:"monospace",background:isAI?"#052e16":"#1c1917",border:`1px solid ${isAI?"#16a34a":"#78716c"}`,color:isAI?"#4ade80":"#a8a29e",padding:"1px 7px",borderRadius:3,fontWeight:700}}>
                            {isAI?"🤖 AI CALCULATED":"⚠ FALLBACK"}
                          </span>
                          <span style={{color:"#334155",fontSize:9,fontFamily:"monospace"}}>1 pip = <span style={{color:"#94a3b8"}}>{a.pip_size}</span></span>
                        </div>
                        {/* Grid */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:0}}>
                          {[
                            ["🛡 SL", a.sl_pips+"p", a.sl_price, "#f97316", "Stop Loss — keluar jika loss"],
                            ["🎯 TP1", a.tp1_pips+"p", a.tp1_price, "#34d399", `Close ${a.tp1_lot_pct||50}% lot — ambil profit awal`],
                            ["🏆 TP2", a.tp2_pips+"p", a.tp2_price, "#a78bfa", `Close ${a.tp2_lot_pct||50}% lot — full target`],
                            ["🔒 SL+", a.sl_plus_pips+"p", a.sl_plus_price, "#06b6d4", "Geser SL ke sini setelah TP1 hit"],
                          ].map(([label, pips, price, color, tip])=>(
                            <div key={label} style={{padding:"8px 10px",borderRight:"1px solid #0f172a"}}>
                              <div style={{color:"#334155",fontSize:9,marginBottom:3}}>{label}</div>
                              <div style={{color,fontFamily:"monospace",fontWeight:700,fontSize:11}}>{pips||"—"}</div>
                              <div style={{color,fontFamily:"monospace",fontSize:10,opacity:0.8}}>{price||"—"}</div>
                              <div style={{color:"#1e3a5f",fontSize:8,marginTop:2,lineHeight:1.3}}>{tip}</div>
                            </div>
                          ))}
                        </div>
                        {/* R:R row */}
                        <div style={{display:"flex",gap:16,padding:"5px 10px",borderTop:"1px solid #0f172a"}}>
                          <span style={{color:"#334155",fontSize:9,fontFamily:"monospace"}}>R:R TP1: <span style={{color:"#34d399",fontWeight:700}}>1:{a.rr1||"?"}</span></span>
                          <span style={{color:"#334155",fontSize:9,fontFamily:"monospace"}}>R:R TP2: <span style={{color:"#a78bfa",fontWeight:700}}>1:{a.rr2||"?"}</span></span>
                        </div>
                      </div>
                    );
                  })()}
                  {analyses[selected].signal_reason && <p style={{color:"#475569",fontSize:11,marginTop:8,borderTop:"1px solid #0f172a",paddingTop:8}}>{analyses[selected].signal_reason}</p>}
                </div>
              )}
              {!analyses[selected] && (
                <div style={{textAlign:"center",padding:"16px 0"}}>
                  <button onClick={()=>handleAnalyze(selected)} style={{background:"#0c1a2e",border:"1px solid #1d4ed8",color:"#93c5fd",padding:"10px 24px",borderRadius:6,cursor:"pointer",fontFamily:"monospace",fontSize:13,letterSpacing:1}}>
                    {analyzing[selected]?"⟳ Menganalisis...":"⚡ Analisis AI — "+selected}
                  </button>
                </div>
              )}
              <OrderPanel symbol={selected} tick={ticks[selected]} onOrder={handleOrder} analysis={analyses[selected]}/>
            </>
          )}

          {/* EA CONFIG TAB */}
          {tab==="ea" && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <EAConfigPanel config={eaConfig} onChange={setEaConfig} analyses={analyses}/>
              <div style={{background:"#070e1d",border:"1px solid #1e293b",borderRadius:10,padding:14}}>
                <div style={{color:"#06b6d4",fontSize:10,letterSpacing:2,marginBottom:10}}>📖 PETUNJUK EA</div>
                <div style={{color:"#475569",fontSize:11,lineHeight:1.8}}>
                  <p style={{margin:"0 0 6px 0"}}>• <span style={{color:"#94a3b8"}}>START EA</span> — EA akan scan semua pair aktif secara otomatis sesuai interval yang dipilih</p>
                  <p style={{margin:"0 0 6px 0"}}>• <span style={{color:"#94a3b8"}}>Min Confidence</span> — EA hanya eksekusi signal dengan level kepercayaan minimum ini</p>
                  <p style={{margin:"0 0 6px 0"}}>• <span style={{color:"#94a3b8"}}>MTF Filter</span> — EA filter signal berdasarkan konfirmasi multi-timeframe (M5+H1+H4)</p>
                  <p style={{margin:"0 0 6px 0"}}>• <span style={{color:"#94a3b8"}}>Max Daily Loss</span> — EA otomatis berhenti jika floating loss melebihi batas ini</p>
                  <p style={{margin:"0 0 6px 0"}}>• <span style={{color:"#94a3b8"}}>Pair Aktif</span> — Pilih pair mana saja yang akan di-scan oleh EA</p>
                  <p style={{margin:"0 0 6px 0"}}>• <span style={{color:"#fb923c"}}>DEMO MODE</span> — Untuk live trading, connect ke MT5 via WebSocket bridge (mt5_bridge.py)</p>
                </div>
              </div>
            </div>
          )}

          {/* POSITIONS TAB */}
          {tab==="positions" && (
            <div style={{background:"#070e1d",border:"1px solid #1e293b",borderRadius:10,padding:14}}>
              <div style={{color:"#475569",fontSize:9,letterSpacing:2,marginBottom:12}}>OPEN POSITIONS ({positions.length})</div>
              <PositionsTable positions={positions} onClose={handleClose}/>
            </div>
          )}

          {/* LOG TAB */}
          {tab==="log" && (
            <EALogTab logs={eaLogs} setLogs={setEaLogs} eaRunning={eaRunning} eaConfig={eaConfig} positions={positions} eaStats={eaStats} account={account} onClearAll={clearAllData}/>
          )}
        </div>
      </div>
    </div>
  );
}
