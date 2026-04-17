import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PAIRS = ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCHF"];
const PAIR_FLAGS = { EURUSD:"🇪🇺🇺🇸", GBPUSD:"🇬🇧🇺🇸", USDJPY:"🇺🇸🇯🇵", AUDUSD:"🇦🇺🇺🇸", USDCHF:"🇺🇸🇨🇭" };
const PAIR_NAMES = { EURUSD:"Euro / Dollar", GBPUSD:"Pound / Dollar", USDJPY:"Dollar / Yen", AUDUSD:"Aussie / Dollar", USDCHF:"Dollar / Franc" };
const TIMEFRAMES = ["M1","M5","M15","H1","H4","D1"];
const BASE_PRICES = { EURUSD:1.0845, GBPUSD:1.2734, USDJPY:154.21, AUDUSD:0.6412, USDCHF:0.9023 };
const DIGITS = { EURUSD:5, GBPUSD:5, USDJPY:3, AUDUSD:5, USDCHF:5 };

function generateMockCandles(symbol, count=80) {
  const base = BASE_PRICES[symbol];
  const volatility = symbol === "USDJPY" ? 0.15 : 0.0008;
  const data = [];
  let price = base;
  const now = Date.now();
  for (let i = count; i >= 0; i--) {
    const change = (Math.random() - 0.49) * volatility;
    const open = price;
    price += change;
    const high = Math.max(open, price) + Math.random() * volatility * 0.5;
    const low  = Math.min(open, price) - Math.random() * volatility * 0.5;
    data.push({
      time: new Date(now - i * 5 * 60000).toISOString(),
      open: +open.toFixed(DIGITS[symbol]),
      high: +high.toFixed(DIGITS[symbol]),
      low:  +low.toFixed(DIGITS[symbol]),
      close: +price.toFixed(DIGITS[symbol]),
      volume: Math.floor(Math.random() * 2000 + 500),
    });
  }
  return data;
}

function generateMockTick(symbol, prev) {
  const base = prev?.bid || BASE_PRICES[symbol];
  const vol = symbol === "USDJPY" ? 0.03 : 0.00015;
  const bid = +(base + (Math.random()-0.49)*vol).toFixed(DIGITS[symbol]);
  const spread = symbol === "USDJPY" ? 0.02 : 0.00012;
  const ask = +(bid + spread).toFixed(DIGITS[symbol]);
  return { symbol, bid, ask, spread: symbol==="USDJPY"?2:1.2, time: new Date().toISOString(), digits: DIGITS[symbol] };
}

async function analyzeWithClaude(symbol, candles, tick) {
  const recent = candles.slice(-20);
  const closes = recent.map(c => c.close);
  const last = closes[closes.length-1];
  const first = closes[0];
  const trend = last > first ? "naik" : "turun";
  const change = (((last - first)/first)*100).toFixed(3);
  const high20 = Math.max(...recent.map(c=>c.high));
  const low20  = Math.min(...recent.map(c=>c.low));

  const prompt = `Kamu adalah analis forex profesional. Berikan analisis teknikal singkat dalam Bahasa Indonesia.

Pair: ${symbol}
Bid: ${tick.bid} | Ask: ${tick.ask} | Spread: ${tick.spread} pips
20 candle terakhir (M5):
- Harga awal: ${first} → Harga saat ini: ${last}
- Trend: ${trend} ${change}%
- High 20 bar: ${high20} | Low 20 bar: ${low20}
- Close prices: ${closes.slice(-5).join(", ")}

Berikan:
1. Analisis trend (2 kalimat)
2. Level support & resistance penting
3. Sinyal: BUY / SELL / WAIT (dengan alasan singkat)
4. Saran SL dan TP (dalam pips)

Format output JSON seperti ini:
{
  "trend": "...",
  "support": ...,
  "resistance": ...,
  "signal": "BUY|SELL|WAIT",
  "signal_reason": "...",
  "sl_pips": ...,
  "tp_pips": ...,
  "confidence": "HIGH|MEDIUM|LOW",
  "summary": "..."
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
        system: "Kamu analis forex profesional. Selalu jawab dalam format JSON valid saja, tanpa markdown, tanpa penjelasan tambahan di luar JSON."
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g,"").trim();
    return JSON.parse(clean);
  } catch(e) {
    return { signal:"WAIT", summary:"Gagal mengambil analisis AI.", confidence:"LOW", trend:"—", sl_pips:0, tp_pips:0 };
  }
}

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

function MainChart({ data, symbol }) {
  if (!data || data.length < 2) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:260,color:"#475569",fontFamily:"monospace"}}>No chart data</div>;
  const chartData = data.map(c => ({ t: c.time.slice(11,16), v: c.close, h: c.high, l: c.low }));
  const vals = data.map(c=>c.close);
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const pad = (mx-mn)*0.1;
  const color = vals[vals.length-1] >= vals[0] ? "#22d3ee" : "#f43f5e";
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{top:10,right:8,bottom:0,left:8}}>
        <defs>
          <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="t" tick={{fill:"#475569",fontSize:10,fontFamily:"monospace"}} tickLine={false} axisLine={false} interval={Math.floor(chartData.length/6)}/>
        <YAxis domain={[mn-pad, mx+pad]} tick={{fill:"#475569",fontSize:10,fontFamily:"monospace"}} tickLine={false} axisLine={false} width={60} tickFormatter={v=>v.toFixed(DIGITS[symbol]||5)}/>
        <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:6,fontFamily:"monospace",fontSize:11}} labelStyle={{color:"#94a3b8"}} itemStyle={{color}}/>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#mainGrad)" dot={false} isAnimationActive={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SignalBadge({ signal, confidence }) {
  const cfg = {
    BUY:  { bg:"#052e16", border:"#16a34a", text:"#4ade80", label:"▲ BUY" },
    SELL: { bg:"#2d0b0b", border:"#dc2626", text:"#f87171", label:"▼ SELL" },
    WAIT: { bg:"#1c1917", border:"#78716c", text:"#a8a29e", label:"◼ WAIT" },
  };
  const c = cfg[signal] || cfg.WAIT;
  return (
    <span style={{background:c.bg, border:`1px solid ${c.border}`, color:c.text, padding:"2px 10px", borderRadius:4, fontSize:12, fontFamily:"monospace", fontWeight:700, letterSpacing:1}}>
      {c.label}
    </span>
  );
}

function OrderPanel({ symbol, tick, onOrder }) {
  const [vol, setVol] = useState("0.01");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const btnStyle = (type) => ({
    flex:1, padding:"10px 0", border:"none", borderRadius:6, fontFamily:"monospace",
    fontWeight:700, fontSize:13, cursor:"pointer", letterSpacing:1,
    ...(type==="BUY" ? {background:"#16a34a",color:"#fff"} : {background:"#dc2626",color:"#fff"}),
  });
  return (
    <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:8,padding:14,marginTop:12}}>
      <div style={{color:"#64748b",fontSize:11,fontFamily:"monospace",marginBottom:8,letterSpacing:1}}>QUICK ORDER — {symbol}</div>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        {[["Vol",vol,setVol],["SL (pips)",sl,setSl],["TP (pips)",tp,setTp]].map(([label,val,setter])=>(
          <div key={label} style={{flex:1}}>
            <div style={{color:"#475569",fontSize:10,fontFamily:"monospace",marginBottom:3}}>{label}</div>
            <input value={val} onChange={e=>setter(e.target.value)} style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:4,padding:"6px 8px",color:"#e2e8f0",fontFamily:"monospace",fontSize:12,boxSizing:"border-box"}}/>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={btnStyle("BUY")} onClick={()=>onOrder(symbol,"BUY",vol,sl,tp)}>▲ BUY {tick?.ask}</button>
        <button style={btnStyle("SELL")} onClick={()=>onOrder(symbol,"SELL",vol,sl,tp)}>▼ SELL {tick?.bid}</button>
      </div>
    </div>
  );
}

function PairCard({ symbol, tick, candles, analysis, selected, analyzing, onSelect, onAnalyze }) {
  const prev = candles?.slice(-2,-1)[0]?.close;
  const cur  = tick?.bid;
  const isUp = cur && prev ? cur >= prev : true;
  const dayChange = candles?.length > 1
    ? (((cur - candles[0].close)/candles[0].close)*100).toFixed(2)
    : "0.00";
  const isPos = parseFloat(dayChange) >= 0;
  return (
    <div onClick={()=>onSelect(symbol)} style={{
      background: selected ? "#0f1f3a" : "#0a0f1e",
      border: `1px solid ${selected ? "#1e40af" : "#1e293b"}`,
      borderRadius:10, padding:"14px 16px", cursor:"pointer",
      transition:"all 0.2s", position:"relative",
      boxShadow: selected ? "0 0 0 1px #1d4ed8 inset, 0 4px 20px #1d4ed820" : "none",
    }}>
      {selected && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#1d4ed8,#06b6d4)",borderRadius:"10px 10px 0 0"}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:16}}>{PAIR_FLAGS[symbol]}</span>
            <span style={{color:"#e2e8f0",fontFamily:"monospace",fontWeight:700,fontSize:14,letterSpacing:1}}>{symbol}</span>
          </div>
          <div style={{color:"#475569",fontSize:10,fontFamily:"monospace",marginTop:1}}>{PAIR_NAMES[symbol]}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{color: isUp?"#22d3ee":"#f43f5e", fontFamily:"monospace", fontWeight:700, fontSize:18, letterSpacing:1}}>
            {tick ? tick.bid.toFixed(DIGITS[symbol]) : "—"}
          </div>
          <div style={{color: isPos?"#4ade80":"#f87171", fontSize:11, fontFamily:"monospace"}}>
            {isPos?"+":""}{dayChange}%
          </div>
        </div>
      </div>
      <MiniChart data={candles} color={isUp?"#22d3ee":"#f43f5e"}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
        <div style={{display:"flex",gap:12}}>
          <span style={{color:"#64748b",fontSize:10,fontFamily:"monospace"}}>ASK <span style={{color:"#94a3b8"}}>{tick?.ask?.toFixed(DIGITS[symbol])||"—"}</span></span>
          <span style={{color:"#64748b",fontSize:10,fontFamily:"monospace"}}>SPR <span style={{color:"#94a3b8"}}>{tick?.spread||"—"}</span></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {analysis && <SignalBadge signal={analysis.signal} confidence={analysis.confidence}/>}
          <button onClick={e=>{e.stopPropagation();onAnalyze(symbol);}} style={{
            background:"#1e293b",border:"1px solid #334155",color:analyzing?"#06b6d4":"#64748b",
            fontSize:10,fontFamily:"monospace",padding:"3px 8px",borderRadius:4,cursor:"pointer",letterSpacing:0.5,
          }}>
            {analyzing?"◌ AI...":"⚡ AI"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PositionsTable({ positions, onClose }) {
  if (!positions?.length) return (
    <div style={{textAlign:"center",color:"#334155",fontFamily:"monospace",fontSize:12,padding:"20px 0"}}>
      Tidak ada posisi terbuka
    </div>
  );
  return (
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
              <td style={{padding:"6px 8px",color:p.profit>=0?"#4ade80":"#f87171",fontWeight:700}}>
                {p.profit>=0?"+":""}{p.profit?.toFixed(2)}
              </td>
              <td style={{padding:"6px 8px"}}>
                <button onClick={()=>onClose(p.ticket)} style={{background:"#2d0b0b",border:"1px solid #7f1d1d",color:"#f87171",padding:"2px 8px",borderRadius:3,cursor:"pointer",fontSize:10,fontFamily:"monospace"}}>✕ Close</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [wsUrl, setWsUrl] = useState("ws://localhost:8765");
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [demoMode, setDemoMode] = useState(true);
  const [ticks, setTicks] = useState({});
  const [candles, setCandles] = useState({});
  const [positions, setPositions] = useState([]);
  const [account, setAccount] = useState(null);
  const [selected, setSelected] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("M5");
  const [analyses, setAnalyses] = useState({});
  const [analyzing, setAnalyzing] = useState({});
  const [tab, setTab] = useState("chart");

  const wsRef = useRef(null);
  const demoInterval = useRef(null);

  const startDemo = useCallback(() => {
    setDemoMode(true);
    const initCandles = {};
    const initTicks = {};
    PAIRS.forEach(p => {
      initCandles[p] = generateMockCandles(p, 80);
      initTicks[p] = generateMockTick(p, null);
    });
    setCandles(initCandles);
    setTicks(initTicks);
    setAccount({ balance:10000, equity:10050, free_margin:9500, profit:50, leverage:100, currency:"USD" });

    if (demoInterval.current) clearInterval(demoInterval.current);
    demoInterval.current = setInterval(() => {
      setTicks(prev => {
        const next = {};
        PAIRS.forEach(p => { next[p] = generateMockTick(p, prev[p]); });
        return next;
      });
      setCandles(prev => {
        const next = {...prev};
        PAIRS.forEach(p => {
          if (!next[p]) return;
          const last = next[p][next[p].length-1];
          const newClose = generateMockTick(p, {bid:last.close}).bid;
          next[p] = [...next[p].slice(-79), {
            ...last, close: newClose,
            high: Math.max(last.high, newClose),
            low:  Math.min(last.low,  newClose),
            time: new Date().toISOString(),
          }];
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
      setWsStatus("connected");
      setDemoMode(false);
      clearInterval(demoInterval.current);
      PAIRS.forEach(p => ws.send(JSON.stringify({type:"get_candles",symbol:p,timeframe,count:100})));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "ticks") setTicks(prev => ({...prev, ...msg.data}));
        else if (msg.type === "candles") setCandles(prev => ({...prev, [msg.symbol]: msg.data}));
        else if (msg.type === "account") { setPositions(msg.positions || []); setAccount(msg.account); }
        else if (msg.type === "init") { setPositions(msg.positions || []); setAccount(msg.account); }
      } catch {}
    };
    ws.onerror = () => setWsStatus("error");
    ws.onclose = () => { setWsStatus("disconnected"); startDemo(); };
  }, [wsUrl, timeframe, startDemo]);

  const disconnect = () => {
    wsRef.current?.close();
    setWsStatus("disconnected");
    startDemo();
  };

  const handleAnalyze = async (symbol) => {
    setAnalyzing(p=>({...p,[symbol]:true}));
    const result = await analyzeWithClaude(symbol, candles[symbol]||[], ticks[symbol]||{});
    setAnalyses(p=>({...p,[symbol]:result}));
    setAnalyzing(p=>({...p,[symbol]:false}));
  };

  const analyzeAll = async () => {
    for (const p of PAIRS) await handleAnalyze(p);
  };

  const handleOrder = (symbol, action, volume, sl, tp) => {
    if (!demoMode && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({type:"send_order",symbol,action,volume:parseFloat(volume),sl:parseFloat(sl)||0,tp:parseFloat(tp)||0}));
    } else {
      alert(`[DEMO] ${action} ${volume} lot ${symbol} — Hubungkan ke MT5 untuk order nyata.`);
    }
  };

  const handleClose = (ticket) => {
    if (!demoMode && wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({type:"close_position",ticket}));
    } else {
      setPositions(p=>p.filter(pos=>pos.ticket!==ticket));
    }
  };

  const statusColor = {connected:"#4ade80",connecting:"#fb923c",disconnected:"#475569",error:"#f87171"}[wsStatus];

  return (
    <div style={{background:"#050c18",minHeight:"100vh",fontFamily:"monospace",color:"#e2e8f0",padding:0}}>

      {/* TOP BAR */}
      <div style={{background:"#070e1d",borderBottom:"1px solid #0f172a",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{color:"#06b6d4",fontSize:18,fontWeight:700,letterSpacing:2}}>⬡ FX TERMINAL</span>
          <span style={{color:"#1e3a5f",fontSize:12}}>|</span>
          <span style={{color:demoMode?"#fb923c":"#4ade80",fontSize:11,letterSpacing:1}}>● {demoMode?"DEMO MODE":"LIVE MT5"}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <input value={wsUrl} onChange={e=>setWsUrl(e.target.value)} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:4,padding:"5px 10px",color:"#94a3b8",fontSize:11,width:200}}/>
          {wsStatus==="connected"
            ? <button onClick={disconnect} style={{background:"#2d0b0b",border:"1px solid #7f1d1d",color:"#f87171",padding:"5px 14px",borderRadius:4,cursor:"pointer",fontSize:11,letterSpacing:1}}>✕ DISCONNECT</button>
            : <button onClick={connect} style={{background:"#052e16",border:"1px solid #15803d",color:"#4ade80",padding:"5px 14px",borderRadius:4,cursor:"pointer",fontSize:11,letterSpacing:1}}>⚡ CONNECT MT5</button>
          }
          <span style={{color:statusColor,fontSize:11,letterSpacing:1}}>● {wsStatus.toUpperCase()}</span>
        </div>
        {account && (
          <div style={{display:"flex",gap:16,fontSize:11}}>
            {[["BAL",`$${account.balance?.toLocaleString()}`,"#94a3b8"],
              ["EQ",`$${account.equity?.toLocaleString()}`,"#22d3ee"],
              ["PnL",`${account.profit>=0?"+":""}$${account.profit?.toFixed(2)}`,account.profit>=0?"#4ade80":"#f87171"],
            ].map(([k,v,c])=>(
              <span key={k}><span style={{color:"#475569"}}>{k} </span><span style={{color:c,fontWeight:700}}>{v}</span></span>
            ))}
          </div>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:0,height:"calc(100vh - 57px)"}}>

        {/* LEFT — PAIR LIST */}
        <div style={{borderRight:"1px solid #0f172a",overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{color:"#475569",fontSize:10,letterSpacing:2}}>FOREX PAIRS</span>
            <button onClick={analyzeAll} style={{background:"#0f172a",border:"1px solid #1e293b",color:"#06b6d4",padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:10,letterSpacing:1}}>⚡ AI ALL</button>
          </div>
          {PAIRS.map(p=>(
            <PairCard
              key={p} symbol={p}
              tick={ticks[p]} candles={candles[p]}
              analysis={analyses[p]}
              analyzing={analyzing[p]}
              selected={selected===p}
              onSelect={setSelected}
              onAnalyze={handleAnalyze}
            />
          ))}
        </div>

        {/* RIGHT — DETAIL */}
        <div style={{overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>

          {/* PAIR HEADER */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:24}}>{PAIR_FLAGS[selected]}</span>
              <div>
                <div style={{color:"#e2e8f0",fontSize:22,fontWeight:700,letterSpacing:2}}>{selected}</div>
                <div style={{color:"#475569",fontSize:11}}>{PAIR_NAMES[selected]}</div>
              </div>
              <div style={{color:"#22d3ee",fontSize:28,fontWeight:700,letterSpacing:1}}>
                {ticks[selected]?.bid?.toFixed(DIGITS[selected])||"—"}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {TIMEFRAMES.map(tf=>(
                <button key={tf} onClick={()=>{setTimeframe(tf); if(!demoMode&&wsRef.current?.readyState===1) wsRef.current.send(JSON.stringify({type:"get_candles",symbol:selected,timeframe:tf,count:100}));}} style={{
                  background:timeframe===tf?"#1e3a5f":"#0f172a",
                  border:`1px solid ${timeframe===tf?"#1d4ed8":"#1e293b"}`,
                  color:timeframe===tf?"#93c5fd":"#475569",
                  padding:"4px 12px",borderRadius:4,cursor:"pointer",fontSize:11,fontFamily:"monospace"
                }}>{tf}</button>
              ))}
            </div>
          </div>

          {/* TABS */}
          <div style={{display:"flex",gap:0,borderBottom:"1px solid #1e293b"}}>
            {[["chart","📈 Chart & Order"],["positions","📋 Positions"]].map(([key,label])=>(
              <button key={key} onClick={()=>setTab(key)} style={{
                background:"transparent",border:"none",borderBottom:`2px solid ${tab===key?"#1d4ed8":"transparent"}`,
                color:tab===key?"#93c5fd":"#475569",padding:"8px 16px",cursor:"pointer",
                fontFamily:"monospace",fontSize:12,letterSpacing:0.5,transition:"all 0.15s",
              }}>{label}</button>
            ))}
          </div>

          {tab==="chart" && (
            <>
              <div style={{background:"#070e1d",border:"1px solid #0f172a",borderRadius:10,padding:"12px 8px"}}>
                <MainChart data={candles[selected]} symbol={selected}/>
              </div>

              {analyses[selected] && (
                <div style={{background:"#070e1d",border:"1px solid #1e293b",borderRadius:10,padding:16}}>
                  <div style={{color:"#475569",fontSize:10,letterSpacing:2,marginBottom:10}}>⚡ AI ANALYSIS — {selected}</div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <SignalBadge signal={analyses[selected].signal} confidence={analyses[selected].confidence}/>
                    <span style={{color:"#475569",fontSize:11}}>Confidence: <span style={{color:analyses[selected].confidence==="HIGH"?"#4ade80":analyses[selected].confidence==="MEDIUM"?"#fb923c":"#f87171"}}>{analyses[selected].confidence}</span></span>
                  </div>
                  <p style={{color:"#94a3b8",fontSize:12,lineHeight:1.6,margin:"0 0 10px 0"}}>{analyses[selected].summary || analyses[selected].trend}</p>
                  <div style={{display:"flex",gap:16,fontSize:11,flexWrap:"wrap"}}>
                    {[["Trend", analyses[selected].trend,"#94a3b8"],
                      ["Support",analyses[selected].support,"#4ade80"],
                      ["Resistance",analyses[selected].resistance,"#f87171"],
                      ["SL",`${analyses[selected].sl_pips} pips`,"#f97316"],
                      ["TP",`${analyses[selected].tp_pips} pips`,"#a78bfa"],
                    ].map(([k,v,c])=>(
                      <span key={k} style={{color:"#475569"}}>{k}: <span style={{color:c,fontWeight:700}}>{v}</span></span>
                    ))}
                  </div>
                  {analyses[selected].signal_reason && (
                    <p style={{color:"#475569",fontSize:11,marginTop:8,borderTop:"1px solid #1e293b",paddingTop:8}}>{analyses[selected].signal_reason}</p>
                  )}
                </div>
              )}
              {!analyses[selected] && (
                <div style={{textAlign:"center",padding:"20px 0"}}>
                  <button onClick={()=>handleAnalyze(selected)} style={{background:"#0c1a2e",border:"1px solid #1d4ed8",color:"#93c5fd",padding:"10px 24px",borderRadius:6,cursor:"pointer",fontFamily:"monospace",fontSize:13,letterSpacing:1}}>
                    {analyzing[selected]?"⟳ Menganalisis...":"⚡ Analisis AI untuk "+selected}
                  </button>
                </div>
              )}

              <OrderPanel symbol={selected} tick={ticks[selected]} onOrder={handleOrder}/>
            </>
          )}

          {tab==="positions" && (
            <div style={{background:"#070e1d",border:"1px solid #1e293b",borderRadius:10,padding:16}}>
              <div style={{color:"#475569",fontSize:10,letterSpacing:2,marginBottom:12}}>📋 OPEN POSITIONS ({positions.length})</div>
              <PositionsTable positions={positions} onClose={handleClose}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
