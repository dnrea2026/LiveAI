import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PAIRS = ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCHF","BTCUSD","ETHUSD"];
const PAIR_FLAGS = { EURUSD:"🇪🇺🇺🇸", GBPUSD:"🇬🇧🇺🇸", USDJPY:"🇺🇸🇯🇵", AUDUSD:"🇦🇺🇺🇸", USDCHF:"🇺🇸🇨🇭", BTCUSD:"₿🇺🇸", ETHUSD:"Ξ🇺🇸" };
const PAIR_NAMES = { EURUSD:"Euro / Dollar", GBPUSD:"Pound / Dollar", USDJPY:"Dollar / Yen", AUDUSD:"Aussie / Dollar", USDCHF:"Dollar / Franc", BTCUSD:"Bitcoin / Dollar", ETHUSD:"Ethereum / Dollar" };
const TIMEFRAMES = ["M1","M5","M15","H1","H4","D1"];
const BASE_PRICES = { EURUSD:1.0845, GBPUSD:1.2734, USDJPY:154.21, AUDUSD:0.6412, USDCHF:0.9023, BTCUSD:77071.22, ETHUSD:2419.93 };
const DIGITS = { EURUSD:5, GBPUSD:5, USDJPY:3, AUDUSD:5, USDCHF:5, BTCUSD:2, ETHUSD:2 };

// ===================== MOCK DATA =====================
function generateMockCandles(symbol, count=80) {
  const base = BASE_PRICES[symbol];
  const isCrypto = ["BTCUSD","ETHUSD"].includes(symbol);
  const volatility = symbol==="USDJPY" ? 0.15 : isCrypto ? (symbol==="BTCUSD" ? 80 : 5) : 0.0008;
  const data = [];
  let price = base;
  const now = Date.now();
  for (let i = count; i >= 0; i--) {
    const change = (Math.random()-0.49)*volatility;
    const open = price;
    price += change;
    const high = Math.max(open, price) + Math.random()*volatility*0.5;
    const low = Math.min(open, price) - Math.random()*volatility*0.5;
    data.push({ time: new Date(now - i*5*60000).toISOString(), open:+open.toFixed(DIGITS[symbol]), high:+high.toFixed(DIGITS[symbol]), low:+low.toFixed(DIGITS[symbol]), close:+price.toFixed(DIGITS[symbol]), volume:Math.floor(Math.random()*2000+500) });
  }
  return data;
}

function generateMockTick(symbol, prev) {
  const base = prev?.bid || BASE_PRICES[symbol];
  const isCrypto = ["BTCUSD","ETHUSD"].includes(symbol);
  const vol = symbol==="USDJPY" ? 0.03 : isCrypto ? (symbol==="BTCUSD" ? 10 : 0.5) : 0.00015;
  const bid = +(base + (Math.random()-0.49)*vol).toFixed(DIGITS[symbol]);
  const spread = symbol==="USDJPY" ? 0.02 : isCrypto ? (symbol==="BTCUSD" ? 9.80 : 0.8) : 0.00012;
  const ask = +(bid + spread).toFixed(DIGITS[symbol]);
  return { symbol, bid, ask, spread: isCrypto ? (symbol==="BTCUSD" ? 980 : 80) : (symbol==="USDJPY" ? 2 : 1.2), time: new Date().toISOString(), digits: DIGITS[symbol] };
}

// ===================== AI ANALYSIS =====================
const GROQ_API_KEY = "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";
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function analyzeWithGroq(symbol, candles, tick, eaConfig) {
  const recent = candles.slice(-20);
  const closes = recent.map(c => c.close);
  const last = closes[closes.length-1];
  const first = closes[0];
  const trend = last > first ? "naik" : "turun";
  const change = (((last - first)/first)*100).toFixed(3);
  const high20 = Math.max(...recent.map(c=>c.high));
  const low20 = Math.min(...recent.map(c=>c.low));

  // Simple technical indicators
  const sma5 = closes.slice(-5).reduce((a,b)=>a+b,0)/5;
  const sma10 = closes.slice(-10).reduce((a,b)=>a+b,0)/10;
  const sma20 = closes.reduce((a,b)=>a+b,0)/closes.length;

  const prompt = `Kamu adalah sistem EA (Expert Advisor) trading profesional. Berikan analisis teknikal dan sinyal trading otomatis.

Pair: ${symbol}
Bid: ${tick.bid} | Ask: ${tick.ask} | Spread: ${tick.spread} pips
Trend 20 candle M15: ${trend} ${change}%
High 20: ${high20} | Low 20: ${low20}
SMA5: ${sma5.toFixed(DIGITS[symbol])} | SMA10: ${sma10.toFixed(DIGITS[symbol])} | SMA20: ${sma20.toFixed(DIGITS[symbol])}
Close 5 terakhir: ${closes.slice(-5).join(", ")}

EA Config: SL=${eaConfig.defaultSL}pips, TP=${eaConfig.defaultTP}pips, MaxLot=${eaConfig.maxLot}, MinConfidence=${eaConfig.minConfidence}

Berikan analisis untuk EA auto trading:
1. Signal (BUY/SELL/WAIT) berdasarkan SMA crossover, momentum, dan trend
2. Entry price yang optimal
3. SL dan TP dalam pips
4. Confidence level
5. Alasan signal

Kembalikan HANYA JSON valid ini:
{
  "signal": "BUY|SELL|WAIT",
  "confidence": "HIGH|MEDIUM|LOW",
  "entry_price": ${tick.bid},
  "sl_pips": ${eaConfig.defaultSL},
  "tp_pips": ${eaConfig.defaultTP},
  "trend": "...",
  "sma_cross": "bullish|bearish|neutral",
  "momentum": "strong|moderate|weak",
  "signal_reason": "...",
  "summary": "...",
  "support": ${low20},
  "resistance": ${high20},
  "rr_ratio": 2.5
}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Kamu adalah EA trading professional. Jawab HANYA dengan JSON valid, tanpa markdown, tanpa teks tambahan." },
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
    return JSON.parse(clean);
  } catch(e) {
    console.error("[Groq Fetch Error]", e);
    return { signal:"WAIT", summary:`Error: ${e.message}`, confidence:"LOW", trend:"—", sl_pips:eaConfig.defaultSL, tp_pips:eaConfig.defaultTP, rr_ratio:0 };
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

// EA CONFIG PANEL
function EAConfigPanel({ config, onChange }) {
  const field = (key, label, min, max, step=1) => (
    <div style={{flex:1}}>
      <div style={{color:"#475569",fontSize:10,fontFamily:"monospace",marginBottom:3}}>{label}</div>
      <input
        type="number" value={config[key]} min={min} max={max} step={step}
        onChange={e=>onChange({...config,[key]:parseFloat(e.target.value)||0})}
        style={{width:"100%",background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:4,padding:"6px 8px",color:"#e2e8f0",fontFamily:"monospace",fontSize:12,boxSizing:"border-box"}}
      />
    </div>
  );
  return (
    <div style={{background:"#070e1d",border:"1px solid #1e3a5f",borderRadius:10,padding:16}}>
      <div style={{color:"#06b6d4",fontSize:11,fontFamily:"monospace",letterSpacing:2,marginBottom:12}}>⚙ EA CONFIGURATION</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
        {field("defaultSL","Default SL (pips)",10,500)}
        {field("defaultTP","Default TP (pips)",10,1000)}
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

  const slPrice = tick?.bid && sl ? (tick.bid - parseFloat(sl) * 0.0001).toFixed(DIGITS[symbol]) : "—";
  const tpPrice = tick?.bid && tp ? (tick.bid + parseFloat(tp) * 0.0001).toFixed(DIGITS[symbol]) : "—";
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
        <div style={{display:"flex",gap:16,fontSize:10,fontFamily:"monospace",marginBottom:8,padding:"4px 0"}}>
          <span style={{color:"#64748b"}}>SL price: <span style={{color:"#f97316"}}>{slPrice}</span></span>
          <span style={{color:"#64748b"}}>TP price: <span style={{color:"#a78bfa"}}>{tpPrice}</span></span>
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
function EALog({ logs }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  return (
    <div ref={ref} style={{background:"#030712",border:"1px solid #0f172a",borderRadius:8,padding:12,height:180,overflowY:"auto",fontFamily:"monospace",fontSize:11}}>
      {logs.length === 0 && <div style={{color:"#1e293b"}}>EA log kosong...</div>}
      {logs.map((log,i)=>(
        <div key={i} style={{marginBottom:3,color:log.type==="TRADE"?"#4ade80":log.type==="ERROR"?"#f87171":log.type==="WARN"?"#fb923c":"#475569"}}>
          <span style={{color:"#1e3a5f"}}>[{log.time}]</span> <span style={{color:"#334155"}}>[{log.type}]</span> {log.msg}
        </div>
      ))}
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
              {["Ticket","Symbol","Type","Vol","Open","Current","SL","TP","P&L",""].map(h=>(
                <th key={h} style={{padding:"6px 8px",textAlign:"left",fontWeight:600,letterSpacing:0.5}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map(p=>(
              <tr key={p.ticket} style={{borderBottom:"1px solid #0f172a",color:"#94a3b8"}}>
                <td style={{padding:"6px 8px",color:"#475569"}}>{p.ticket}</td>
                <td style={{padding:"6px 8px",color:"#e2e8f0",fontWeight:700}}>{p.symbol}</td>
                <td style={{padding:"6px 8px",color:p.type==="BUY"?"#4ade80":"#f87171",fontWeight:700}}>{p.type}</td>
                <td style={{padding:"6px 8px"}}>{p.volume}</td>
                <td style={{padding:"6px 8px"}}>{p.price_open}</td>
                <td style={{padding:"6px 8px"}}>{p.price_current}</td>
                <td style={{padding:"6px 8px",color:"#f97316"}}>{p.sl||"—"}</td>
                <td style={{padding:"6px 8px",color:"#a78bfa"}}>{p.tp||"—"}</td>
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

// ===================== MAIN APP =====================
export default function App() {
  const [wsUrl, setWsUrl] = useState("ws://localhost:8765");
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [demoMode, setDemoMode] = useState(true);
  const [ticks, setTicks] = useState({});
  const [candles, setCandles] = useState({});
  const [positions, setPositions] = useState([]);
  const [account, setAccount] = useState(null);
  const [selected, setSelected] = useState("BTCUSD");
  const [timeframe, setTimeframe] = useState("M15");
  const [analyses, setAnalyses] = useState({});
  const [mtfData, setMtfData] = useState({});
  const [analyzing, setAnalyzing] = useState({});
  const [tab, setTab] = useState("chart");
  const [eaRunning, setEaRunning] = useState(false);
  const [eaLogs, setEaLogs] = useState([]);
  const [eaStats, setEaStats] = useState({ totalTrades:0, winTrades:0, lossTrades:0, totalPnL:0, todayTrades:0 });
  const [eaConfig, setEaConfig] = useState({
    defaultSL: 200, defaultTP: 500, maxLot: 0.5, defaultLot: 0.1,
    maxDailyLoss: 500, maxOpenTrades: 3, minConfidence: "MEDIUM",
    mtfFilter: "OFF", autoInterval: 60000
  });
  const [activeEAPairs, setActiveEAPairs] = useState(["BTCUSD","ETHUSD"]);

  const wsRef = useRef(null);
  const demoInterval = useRef(null);
  const eaTimerRef = useRef(null);

  const addLog = useCallback((type, msg) => {
    const time = new Date().toTimeString().slice(0,8);
    setEaLogs(prev => [...prev.slice(-200), { type, msg, time }]);
  }, []);

  const startDemo = useCallback(() => {
    setDemoMode(true);
    const initCandles = {}, initTicks = {};
    PAIRS.forEach(p => { initCandles[p] = generateMockCandles(p, 80); initTicks[p] = generateMockTick(p, null); });
    setCandles(initCandles);
    setTicks(initTicks);
    setAccount({ balance:10000, equity:10050, free_margin:9500, profit:50, leverage:100, currency:"USD" });
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
      PAIRS.forEach(p => ws.send(JSON.stringify({type:"get_candles",symbol:p,timeframe,count:100})));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type==="ticks") setTicks(prev=>({...prev,...msg.data}));
        else if (msg.type==="candles") setCandles(prev=>({...prev,[msg.symbol]:msg.data}));
        else if (msg.type==="account"||msg.type==="init") { setPositions(msg.positions||[]); setAccount(msg.account); }
        else if (msg.type==="order_result") {
          if (msg.success) { addLog("TRADE",`Order berhasil — Ticket #${msg.ticket} @ ${msg.price}`); setEaStats(p=>({...p,totalTrades:p.totalTrades+1,todayTrades:p.todayTrades+1})); }
          else addLog("ERROR",`Order gagal: ${msg.error}`);
        }
      } catch {}
    };
    ws.onerror = () => setWsStatus("error");
    ws.onclose = () => { setWsStatus("disconnected"); startDemo(); };
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
  const executeEA = useCallback(async () => {
    if (!eaRunning) return;
    addLog("INFO", `EA scan ${activeEAPairs.length} pair...`);

    for (const symbol of activeEAPairs) {
      const analysis = await handleAnalyze(symbol);
      if (!analysis || analysis.signal === "WAIT") { addLog("INFO", `${symbol}: WAIT`); continue; }

      // Confidence filter
      const confLevel = { HIGH:3, MEDIUM:2, LOW:1 };
      const minConf = confLevel[eaConfig.minConfidence] || 2;
      if (confLevel[analysis.confidence] < minConf) { addLog("WARN", `${symbol}: ${analysis.signal} — confidence terlalu rendah (${analysis.confidence})`); continue; }

      // MTF filter
      const mtf = mtfData[symbol];
      if (eaConfig.mtfFilter !== "OFF" && mtf) {
        const signals = [mtf.M5, mtf.H1, mtf.H4];
        const agree = signals.filter(s=>s===analysis.signal).length;
        const required = eaConfig.mtfFilter === "3OF3" ? 3 : 2;
        if (agree < required) { addLog("WARN", `${symbol}: ${analysis.signal} — MTF tidak konfirmasi (${agree}/3)`); continue; }
      }

      // Max open trades
      if (positions.length >= eaConfig.maxOpenTrades) { addLog("WARN",`Max open trades tercapai (${eaConfig.maxOpenTrades})`); break; }

      // Max daily loss
      const currentLoss = account?.profit || 0;
      if (currentLoss < -eaConfig.maxDailyLoss) { addLog("ERROR","Max daily loss tercapai — EA dihentikan"); setEaRunning(false); return; }

      // Execute order
      const lot = Math.min(eaConfig.defaultLot, eaConfig.maxLot);
      addLog("TRADE", `${symbol} ${analysis.signal} ${lot} lot | SL:${analysis.sl_pips}p TP:${analysis.tp_pips}p | Conf:${analysis.confidence}`);
      handleOrder(symbol, analysis.signal, String(lot), String(analysis.sl_pips), String(analysis.tp_pips));
    }
  }, [eaRunning, activeEAPairs, handleAnalyze, eaConfig, mtfData, positions.length, account]);

  useEffect(() => {
    if (eaRunning) {
      addLog("INFO", `EA dimulai — interval ${eaConfig.autoInterval/1000}s | Pairs: ${activeEAPairs.join(", ")}`);
      executeEA();
      eaTimerRef.current = setInterval(executeEA, eaConfig.autoInterval);
    } else {
      clearInterval(eaTimerRef.current);
    }
    return () => clearInterval(eaTimerRef.current);
  }, [eaRunning, eaConfig.autoInterval]);

  const handleOrder = (symbol, action, volume, sl, tp) => {
    if (!demoMode && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({type:"send_order",symbol,action,volume:parseFloat(volume),sl:parseFloat(sl)||0,tp:parseFloat(tp)||0,comment:`EA_${action}`}));
    } else {
      const ticket = Math.floor(Math.random()*90000+10000);
      const tick = ticks[symbol];
      addLog("TRADE", `[DEMO] ${action} ${volume} lot ${symbol} — Ticket #${ticket}`);
      setPositions(prev => [...prev, {
        ticket, symbol, type:action, volume:parseFloat(volume),
        price_open: action==="BUY" ? tick?.ask||0 : tick?.bid||0,
        price_current: action==="BUY" ? tick?.ask||0 : tick?.bid||0,
        sl: sl ? (action==="BUY" ? (tick?.bid||0) - parseFloat(sl)*0.0001 : (tick?.bid||0) + parseFloat(sl)*0.0001) : 0,
        tp: tp ? (action==="BUY" ? (tick?.bid||0) + parseFloat(tp)*0.0001 : (tick?.bid||0) - parseFloat(tp)*0.0001) : 0,
        profit: 0, swap:0, time:new Date().toISOString(), comment:`EA_${action}`
      }]);
      setEaStats(p=>({...p,totalTrades:p.totalTrades+1,todayTrades:p.todayTrades+1}));
    }
  };

  const handleClose = (ticket) => {
    const pos = positions.find(p=>p.ticket===ticket);
    if (!demoMode && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({type:"close_position",ticket}));
    } else {
      const pnl = (Math.random()-0.45)*50;
      setEaStats(p=>({...p, totalPnL:p.totalPnL+pnl, winTrades:pnl>0?p.winTrades+1:p.winTrades, lossTrades:pnl<0?p.lossTrades+1:p.lossTrades}));
      setPositions(p=>p.filter(pos=>pos.ticket!==ticket));
      addLog("TRADE",`Posisi #${ticket} ditutup`);
    }
  };

  const analyzeAll = async () => { for (const p of PAIRS) await handleAnalyze(p); };
  const statusColor = {connected:"#4ade80",connecting:"#fb923c",disconnected:"#475569",error:"#f87171"}[wsStatus];
  const winRate = eaStats.totalTrades > 0 ? ((eaStats.winTrades/eaStats.totalTrades)*100).toFixed(1) : "0.0";

  return (
    <div style={{background:"#050c18",minHeight:"100vh",fontFamily:"monospace",color:"#e2e8f0",padding:0}}>

      {/* TOP BAR */}
      <div style={{background:"#070e1d",borderBottom:"1px solid #0f172a",padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{color:"#06b6d4",fontSize:16,fontWeight:700,letterSpacing:2}}>⬡ DnR EA TERMINAL</span>
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
                onClick={()=>{ setEaRunning(r=>!r); if(eaRunning) addLog("INFO","EA dihentikan oleh user"); }}
                style={{background:eaRunning?"#2d0b0b":"#052e16",border:`1px solid ${eaRunning?"#dc2626":"#16a34a"}`,color:eaRunning?"#f87171":"#4ade80",padding:"4px 14px",borderRadius:4,cursor:"pointer",fontSize:11,fontFamily:"monospace",fontWeight:700,letterSpacing:1}}
              >{eaRunning?"⏹ STOP EA":"▶ START EA"}</button>
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
            {/* Active Pairs */}
            <div style={{marginTop:8}}>
              <div style={{color:"#334155",fontSize:9,letterSpacing:1,marginBottom:4}}>AKTIF PAIR</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {PAIRS.map(p=>(
                  <button key={p} onClick={()=>setActiveEAPairs(prev=>prev.includes(p)?prev.filter(x=>x!==p):[...prev,p])}
                    style={{background:activeEAPairs.includes(p)?"#0c1a2e":"#0a0f1e",border:`1px solid ${activeEAPairs.includes(p)?"#1d4ed8":"#1e293b"}`,color:activeEAPairs.includes(p)?"#93c5fd":"#334155",padding:"2px 8px",borderRadius:3,cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PAIR LIST */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:"#334155",fontSize:9,letterSpacing:2}}>MARKET WATCH</span>
            <button onClick={analyzeAll} style={{background:"#0f172a",border:"1px solid #1e293b",color:"#06b6d4",padding:"2px 8px",borderRadius:4,cursor:"pointer",fontSize:10}}>⚡ ALL</button>
          </div>
          {PAIRS.map(p=>(
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
                <button key={tf} onClick={()=>{setTimeframe(tf); if(!demoMode&&wsRef.current?.readyState===1) wsRef.current.send(JSON.stringify({type:"get_candles",symbol:selected,timeframe:tf,count:100}));}} style={{
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
                    {[["Trend",analyses[selected].trend,"#94a3b8"],["Support",analyses[selected].support,"#4ade80"],["Resistance",analyses[selected].resistance,"#f87171"],["SMA",analyses[selected].sma_cross,"#06b6d4"],["Momentum",analyses[selected].momentum,"#a78bfa"],["SL",`${analyses[selected].sl_pips} pips`,"#f97316"],["TP",`${analyses[selected].tp_pips} pips`,"#a78bfa"]].map(([k,v,c])=>(
                      <span key={k} style={{color:"#334155"}}>{k}: <span style={{color:c,fontWeight:700}}>{v}</span></span>
                    ))}
                  </div>
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
              <EAConfigPanel config={eaConfig} onChange={setEaConfig}/>
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
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:"#475569",fontSize:9,letterSpacing:2}}>EA ACTIVITY LOG ({eaLogs.length})</span>
                <button onClick={()=>setEaLogs([])} style={{background:"#0f172a",border:"1px solid #1e293b",color:"#475569",padding:"2px 10px",borderRadius:4,cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>🗑 Clear</button>
              </div>
              <EALog logs={eaLogs}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
