import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// ── Pairs & Config ────────────────────────────────────────
const PAIRS = ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCHF","XAUUSD","USOIL","USTEC100"];
const PAIR_FLAGS = {
  EURUSD:"🇪🇺🇺🇸", GBPUSD:"🇬🇧🇺🇸", USDJPY:"🇺🇸🇯🇵", AUDUSD:"🇦🇺🇺🇸", USDCHF:"🇺🇸🇨🇭",
  XAUUSD:"🥇", USOIL:"🛢️", USTEC100:"📊",
};
const PAIR_NAMES = {
  EURUSD:"Euro / Dollar", GBPUSD:"Pound / Dollar", USDJPY:"Dollar / Yen",
  AUDUSD:"Aussie / Dollar", USDCHF:"Dollar / Franc",
  XAUUSD:"Gold / Dollar", USOIL:"US Crude Oil", USTEC100:"Nasdaq 100",
};
const TIMEFRAMES = ["M1","M5","M15","H1","H4","D1"];
const BASE_PRICES = {
  EURUSD:1.0845, GBPUSD:1.2734, USDJPY:154.21, AUDUSD:0.6412, USDCHF:0.9023,
  XAUUSD:2345.50, USOIL:78.40, USTEC100:18250.0,
};
const DIGITS = {
  EURUSD:5, GBPUSD:5, USDJPY:3, AUDUSD:5, USDCHF:5,
  XAUUSD:2, USOIL:2, USTEC100:1,
};
const POINT = {
  EURUSD:0.00001, GBPUSD:0.00001, USDJPY:0.001, AUDUSD:0.00001, USDCHF:0.00001,
  XAUUSD:0.01, USOIL:0.01, USTEC100:0.1,
};

// pips → price distance
function pipsToPrice(symbol, pips) {
  return pips * POINT[symbol] * 10;
}

// ── Mock data ─────────────────────────────────────────────
function generateMockCandles(symbol, count=80) {
  const base = BASE_PRICES[symbol];
  const vol = symbol === "USDJPY" ? 0.15 : symbol === "XAUUSD" ? 3.0 : symbol === "USOIL" ? 0.4 : symbol === "USTEC100" ? 40 : 0.0008;
  const data = [];
  let price = base;
  const now = Date.now();
  for (let i = count; i >= 0; i--) {
    const change = (Math.random()-0.49)*vol;
    const open = price;
    price += change;
    data.push({
      time: new Date(now - i*5*60000).toISOString(),
      open: +open.toFixed(DIGITS[symbol]),
      high: +(Math.max(open,price)+Math.random()*vol*0.5).toFixed(DIGITS[symbol]),
      low:  +(Math.min(open,price)-Math.random()*vol*0.5).toFixed(DIGITS[symbol]),
      close: +price.toFixed(DIGITS[symbol]),
      volume: Math.floor(Math.random()*2000+500),
    });
  }
  return data;
}

function generateMockTick(symbol, prev) {
  const base = prev?.bid || BASE_PRICES[symbol];
  const vol = symbol === "USDJPY" ? 0.03 : symbol === "XAUUSD" ? 0.5 : symbol === "USOIL" ? 0.05 : symbol === "USTEC100" ? 5 : 0.00015;
  const bid = +(base+(Math.random()-0.49)*vol).toFixed(DIGITS[symbol]);
  const spreadPts = symbol === "XAUUSD" ? 0.3 : symbol === "USOIL" ? 0.03 : symbol === "USTEC100" ? 1.5 : symbol === "USDJPY" ? 0.02 : 0.00012;
  const ask = +(bid+spreadPts).toFixed(DIGITS[symbol]);
  return { symbol, bid, ask, spread: symbol==="USDJPY"?2:symbol==="XAUUSD"?30:symbol==="USOIL"?3:symbol==="USTEC100"?15:1.2, time: new Date().toISOString(), digits: DIGITS[symbol] };
}

// ── Notification helpers ──────────────────────────────────
function playAlert(type) {
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const notes = type==="BUY" ? [523,659,784] : [784,659,523];
    notes.forEach((freq,i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime+i*0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+i*0.15+0.3);
      osc.start(ctx.currentTime+i*0.15); osc.stop(ctx.currentTime+i*0.15+0.3);
    });
  } catch {}
}

function showNotification(symbol, signal, confidence, summary) {
  if (!("Notification" in window)) return;
  const fire = () => new Notification(`⚡ DnR Official — ${symbol}`, {
    body: `${signal} | ${confidence}\n${summary}`,
  });
  if (Notification.permission==="granted") fire();
  else if (Notification.permission!=="denied") Notification.requestPermission().then(p=>{if(p==="granted") fire();});
}

// ── AI via bridge ─────────────────────────────────────────
async function analyzeWithAI(symbol, candles, tick, ws, timeframe="M5") {
  if (!ws || ws.readyState!==1)
    return {signal:"WAIT",summary:"Hubungkan ke MT5 bridge untuk analisis AI.",confidence:"LOW",trend:"—",sl_pips:0,tp_pips:0,timeframe};
  return new Promise((resolve) => {
    ws.send(JSON.stringify({type:"analyze",symbol,candles,tick,timeframe}));
    const handler = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type==="analysis" && msg.symbol===symbol) {
          ws.removeEventListener("message",handler);
          resolve({...msg,timeframe});
        }
      } catch {}
    };
    ws.addEventListener("message",handler);
    setTimeout(()=>{
      ws.removeEventListener("message",handler);
      resolve({signal:"WAIT",summary:"Timeout — AI tidak merespons.",confidence:"LOW",trend:"—",sl_pips:0,tp_pips:0,timeframe});
    },30000);
  });
}

async function multiTimeframeAnalyze(symbol, candlesByTf, tick, ws) {
  if (!ws || ws.readyState!==1) return null;
  const TFS = ["M5","H1","H4"];
  const results = {};
  for (const tf of TFS) {
    const c = candlesByTf[tf]||[];
    if (c.length>0) results[tf] = await analyzeWithAI(symbol,c,tick,ws,tf);
  }
  const signals = Object.values(results).map(r=>r.signal);
  const buy = signals.filter(s=>s==="BUY").length;
  const sell = signals.filter(s=>s==="SELL").length;
  return {
    results,
    consensus: buy>=2?"BUY":sell>=2?"SELL":"WAIT",
    confidence: buy===3||sell===3?"HIGH":buy>=2||sell>=2?"MEDIUM":"LOW",
  };
}

// ── UI Components ─────────────────────────────────────────
function MiniChart({data, color}) {
  if (!data||data.length<2) return <div style={{height:48,display:"flex",alignItems:"center",justifyContent:"center",color:"#334155",fontSize:11}}>No data</div>;
  const chartData = data.slice(-30).map((c,i)=>({i,v:c.close}));
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

function MainChart({data, symbol}) {
  if (!data||data.length<2) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:260,color:"#475569",fontFamily:"monospace"}}>No chart data</div>;
  const chartData = data.map(c=>({t:c.time.slice(11,16),v:c.close}));
  const vals = data.map(c=>c.close);
  const mn=Math.min(...vals), mx=Math.max(...vals), pad=(mx-mn)*0.1;
  const color = vals[vals.length-1]>=vals[0]?"#c9a84c":"#f43f5e";
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
        <YAxis domain={[mn-pad,mx+pad]} tick={{fill:"#475569",fontSize:10,fontFamily:"monospace"}} tickLine={false} axisLine={false} width={65} tickFormatter={v=>v.toFixed(DIGITS[symbol]||5)}/>
        <Tooltip contentStyle={{background:"#0d1117",border:"1px solid #c9a84c33",borderRadius:6,fontFamily:"monospace",fontSize:11}} labelStyle={{color:"#94a3b8"}} itemStyle={{color}}/>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#mainGrad)" dot={false} isAnimationActive={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SignalBadge({signal, confidence}) {
  const cfg = {
    BUY:  {bg:"#052e16",border:"#16a34a",text:"#4ade80",label:"▲ BUY"},
    SELL: {bg:"#2d0b0b",border:"#dc2626",text:"#f87171",label:"▼ SELL"},
    WAIT: {bg:"#1c1917",border:"#78716c",text:"#a8a29e",label:"◼ WAIT"},
  };
  const c = cfg[signal]||cfg.WAIT;
  return <span style={{background:c.bg,border:`1px solid ${c.border}`,color:c.text,padding:"2px 10px",borderRadius:4,fontSize:12,fontFamily:"monospace",fontWeight:700,letterSpacing:1}}>{c.label}</span>;
}

// ── Order Panel (FIXED + SL/TP in price) ─────────────────
function OrderPanel({symbol, tick, onOrder, wsConnected}) {
  const [vol, setVol] = useState("0.01");
  const [slPips, setSlPips] = useState("");
  const [tpPips, setTpPips] = useState("");
  const [orderResult, setOrderResult] = useState(null);

  const digits = DIGITS[symbol]||5;
  const pt = POINT[symbol]||0.00001;

  // Hitung harga SL/TP dari pips
  const slPrice = slPips && tick ? {
    buy:  +(tick.ask - parseFloat(slPips)*pt*10).toFixed(digits),
    sell: +(tick.bid + parseFloat(slPips)*pt*10).toFixed(digits),
  } : null;
  const tpPrice = tpPips && tick ? {
    buy:  +(tick.ask + parseFloat(tpPips)*pt*10).toFixed(digits),
    sell: +(tick.bid - parseFloat(tpPips)*pt*10).toFixed(digits),
  } : null;

  const doOrder = (action) => {
    if (!wsConnected) {
      setOrderResult({ok:false, msg:"Tidak terhubung ke MT5. Pastikan bridge berjalan dan klik CONNECT."});
      setTimeout(()=>setOrderResult(null),5000);
      return;
    }
    const slVal = slPrice ? (action==="BUY"?slPrice.buy:slPrice.sell) : 0;
    const tpVal = tpPrice ? (action==="BUY"?tpPrice.buy:tpPrice.sell) : 0;
    onOrder(symbol, action, vol, slVal, tpVal);
    setOrderResult({ok:true, msg:`Order ${action} ${vol} lot ${symbol} dikirim ke MT5...`});
    setTimeout(()=>setOrderResult(null),4000);
  };

  return (
    <div style={{background:"#0d1117",border:"1px solid #c9a84c33",borderRadius:10,padding:16,marginTop:12}}>
      <div style={{color:"#c9a84c",fontSize:11,fontFamily:"monospace",marginBottom:10,letterSpacing:2,fontWeight:700}}>
        ◈ QUICK ORDER — {symbol}
        {!wsConnected && <span style={{color:"#f87171",marginLeft:8,fontSize:10}}>⚠ Tidak terhubung MT5</span>}
      </div>

      {/* Harga BID/ASK */}
      {tick && (
        <div style={{display:"flex",gap:16,marginBottom:12,padding:"8px 12px",background:"#0a0f1e",borderRadius:6,border:"1px solid #1e293b"}}>
          <span style={{fontSize:11,color:"#475569"}}>BID <span style={{color:"#f87171",fontWeight:700,fontSize:14}}>{tick.bid?.toFixed(digits)}</span></span>
          <span style={{fontSize:11,color:"#475569"}}>ASK <span style={{color:"#4ade80",fontWeight:700,fontSize:14}}>{tick.ask?.toFixed(digits)}</span></span>
          <span style={{fontSize:11,color:"#475569"}}>SPR <span style={{color:"#94a3b8"}}>{tick.spread}</span></span>
        </div>
      )}

      {/* Input fields */}
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        {/* Volume */}
        <div style={{flex:1}}>
          <div style={{color:"#475569",fontSize:10,marginBottom:3}}>VOLUME (lot)</div>
          <input value={vol} onChange={e=>setVol(e.target.value)}
            style={{width:"100%",background:"#1e293b",border:"1px solid #334155",borderRadius:4,padding:"7px 8px",color:"#e2e8f0",fontFamily:"monospace",fontSize:12,boxSizing:"border-box"}}/>
        </div>
        {/* SL */}
        <div style={{flex:1}}>
          <div style={{color:"#475569",fontSize:10,marginBottom:3}}>SL (pips)</div>
          <input value={slPips} onChange={e=>setSlPips(e.target.value)} placeholder="0"
            style={{width:"100%",background:"#1e293b",border:"1px solid #f9731622",borderRadius:4,padding:"7px 8px",color:"#f97316",fontFamily:"monospace",fontSize:12,boxSizing:"border-box"}}/>
          {slPrice && <div style={{fontSize:9,color:"#f97316",marginTop:2}}>BUY: {slPrice.buy} | SELL: {slPrice.sell}</div>}
        </div>
        {/* TP */}
        <div style={{flex:1}}>
          <div style={{color:"#475569",fontSize:10,marginBottom:3}}>TP (pips)</div>
          <input value={tpPips} onChange={e=>setTpPips(e.target.value)} placeholder="0"
            style={{width:"100%",background:"#1e293b",border:"1px solid #a78bfa22",borderRadius:4,padding:"7px 8px",color:"#a78bfa",fontFamily:"monospace",fontSize:12,boxSizing:"border-box"}}/>
          {tpPrice && <div style={{fontSize:9,color:"#a78bfa",marginTop:2}}>BUY: {tpPrice.buy} | SELL: {tpPrice.sell}</div>}
        </div>
      </div>

      {/* BUY / SELL buttons */}
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>doOrder("BUY")} style={{
          flex:1,padding:"11px 0",border:"none",borderRadius:6,fontFamily:"monospace",
          fontWeight:700,fontSize:13,cursor:"pointer",letterSpacing:1,
          background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",
          boxShadow:"0 2px 12px #16a34a44",transition:"opacity 0.15s",
        }}>▲ BUY {tick?.ask?.toFixed(digits)}</button>
        <button onClick={()=>doOrder("SELL")} style={{
          flex:1,padding:"11px 0",border:"none",borderRadius:6,fontFamily:"monospace",
          fontWeight:700,fontSize:13,cursor:"pointer",letterSpacing:1,
          background:"linear-gradient(135deg,#dc2626,#b91c1c)",color:"#fff",
          boxShadow:"0 2px 12px #dc262644",transition:"opacity 0.15s",
        }}>▼ SELL {tick?.bid?.toFixed(digits)}</button>
      </div>

      {/* Order result feedback */}
      {orderResult && (
        <div style={{marginTop:8,padding:"7px 10px",borderRadius:5,fontSize:11,fontFamily:"monospace",
          background: orderResult.ok?"#052e16":"#2d0b0b",
          border: `1px solid ${orderResult.ok?"#16a34a":"#dc2626"}`,
          color: orderResult.ok?"#4ade80":"#f87171",
        }}>{orderResult.ok?"✓":"✕"} {orderResult.msg}</div>
      )}
    </div>
  );
}

function PairCard({symbol, tick, candles, analysis, selected, analyzing, onSelect, onAnalyze}) {
  const prev = candles?.slice(-2,-1)[0]?.close;
  const cur  = tick?.bid;
  const isUp = cur&&prev ? cur>=prev : true;
  const dayChange = candles?.length>1 ? (((cur-candles[0].close)/candles[0].close)*100).toFixed(2) : "0.00";
  const isPos = parseFloat(dayChange)>=0;
  return (
    <div onClick={()=>onSelect(symbol)} style={{
      background: selected?"#0f1a2e":"#0a0f1e",
      border: `1px solid ${selected?"#c9a84c":"#1e293b"}`,
      borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"all 0.2s",position:"relative",
      boxShadow: selected?"0 0 0 1px #c9a84c44 inset,0 4px 20px #c9a84c12":"none",
    }}>
      {selected && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#c9a84c,#f5d78e)",borderRadius:"10px 10px 0 0"}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:15}}>{PAIR_FLAGS[symbol]}</span>
            <span style={{color:"#e2e8f0",fontFamily:"monospace",fontWeight:700,fontSize:13,letterSpacing:1}}>{symbol}</span>
          </div>
          <div style={{color:"#475569",fontSize:9,marginTop:1}}>{PAIR_NAMES[symbol]}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{color:isUp?"#c9a84c":"#f43f5e",fontFamily:"monospace",fontWeight:700,fontSize:16,letterSpacing:1}}>
            {tick ? tick.bid.toFixed(DIGITS[symbol]) : "—"}
          </div>
          <div style={{color:isPos?"#4ade80":"#f87171",fontSize:10}}>{isPos?"+":""}{dayChange}%</div>
        </div>
      </div>
      <MiniChart data={candles} color={isUp?"#c9a84c":"#f43f5e"}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:7}}>
        <div style={{display:"flex",gap:10}}>
          <span style={{color:"#475569",fontSize:9}}>ASK <span style={{color:"#94a3b8"}}>{tick?.ask?.toFixed(DIGITS[symbol])||"—"}</span></span>
          <span style={{color:"#475569",fontSize:9}}>SPR <span style={{color:"#94a3b8"}}>{tick?.spread||"—"}</span></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {analysis && <SignalBadge signal={analysis.signal} confidence={analysis.confidence}/>}
          <button onClick={e=>{e.stopPropagation();onAnalyze(symbol);}} style={{
            background:"#1e293b",border:"1px solid #334155",color:analyzing?"#c9a84c":"#475569",
            fontSize:9,fontFamily:"monospace",padding:"3px 7px",borderRadius:4,cursor:"pointer",
          }}>{analyzing?"◌ AI...":"⚡ AI"}</button>
        </div>
      </div>
    </div>
  );
}

function PositionsTable({positions, onClose}) {
  if (!positions?.length) return (
    <div style={{textAlign:"center",color:"#334155",fontFamily:"monospace",fontSize:12,padding:"20px 0"}}>Tidak ada posisi terbuka</div>
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

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [wsUrl, setWsUrl] = useState("ws://localhost:8765");
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [demoMode, setDemoMode] = useState(true);
  const [ticks, setTicks] = useState({});
  const [candles, setCandles] = useState({});
  const [candlesByTf, setCandlesByTf] = useState({});
  const [positions, setPositions] = useState([]);
  const [account, setAccount] = useState(null);
  const [selected, setSelected] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("M5");
  const [analyses, setAnalyses] = useState({});
  const [analyzing, setAnalyzing] = useState({});
  const [mtfResult, setMtfResult] = useState({});
  const [mtfAnalyzing, setMtfAnalyzing] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoInterval, setAutoIntervalMin] = useState(15);
  const [notification, setNotification] = useState(null);
  const [tab, setTab] = useState("chart");

  const wsRef = useRef(null);
  const demoInterval = useRef(null);
  const autoRefreshRef = useRef(null);

  const startDemo = useCallback(() => {
    setDemoMode(true);
    const initCandles={}, initTicks={};
    PAIRS.forEach(p=>{initCandles[p]=generateMockCandles(p,80); initTicks[p]=generateMockTick(p,null);});
    setCandles(initCandles); setTicks(initTicks);
    setAccount({balance:10000,equity:10050,free_margin:9500,profit:50,leverage:100,currency:"USD"});
    if (demoInterval.current) clearInterval(demoInterval.current);
    demoInterval.current = setInterval(()=>{
      setTicks(prev=>{const n={};PAIRS.forEach(p=>{n[p]=generateMockTick(p,prev[p]);});return n;});
      setCandles(prev=>{
        const n={...prev};
        PAIRS.forEach(p=>{
          if(!n[p]) return;
          const last=n[p][n[p].length-1];
          const nc=generateMockTick(p,{bid:last.close}).bid;
          n[p]=[...n[p].slice(-79),{...last,close:nc,high:Math.max(last.high,nc),low:Math.min(last.low,nc),time:new Date().toISOString()}];
        });
        return n;
      });
    },1000);
  },[]);

  useEffect(()=>{startDemo(); return()=>clearInterval(demoInterval.current);},[startDemo]);

  const connect = useCallback(()=>{
    if(wsRef.current) wsRef.current.close();
    setWsStatus("connecting");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = ()=>{
      setWsStatus("connected"); setDemoMode(false); clearInterval(demoInterval.current);
      PAIRS.forEach(p=>ws.send(JSON.stringify({type:"get_candles",symbol:p,timeframe,count:100})));
    };
    ws.onmessage = (e)=>{
      try {
        const msg = JSON.parse(e.data);
        if (msg.type==="ticks") setTicks(prev=>({...prev,...msg.data}));
        else if (msg.type==="candles") {
          setCandles(prev=>({...prev,[msg.symbol]:msg.data}));
          setCandlesByTf(prev=>({...prev,[msg.symbol]:{...(prev[msg.symbol]||{}),[msg.timeframe]:msg.data}}));
        }
        else if (msg.type==="account") {setPositions(msg.positions||[]);setAccount(msg.account);}
        else if (msg.type==="init") {setPositions(msg.positions||[]);setAccount(msg.account);}
        else if (msg.type==="order_result") {
          // Bridge confirms order
          console.log("Order result:", msg);
        }
      } catch {}
    };
    ws.onerror = ()=>setWsStatus("error");
    ws.onclose = ()=>{setWsStatus("disconnected");startDemo();};
  },[wsUrl,timeframe,startDemo]);

  const disconnect = ()=>{wsRef.current?.close(); setWsStatus("disconnected"); startDemo();};

  const handleAnalyze = async (symbol)=>{
    setAnalyzing(p=>({...p,[symbol]:true}));
    const result = await analyzeWithAI(symbol,candles[symbol]||[],ticks[symbol]||{},wsRef.current,timeframe);
    setAnalyses(p=>({...p,[symbol]:result}));
    setAnalyzing(p=>({...p,[symbol]:false}));
    if ((result.signal==="BUY"||result.signal==="SELL") && result.confidence==="HIGH") {
      playAlert(result.signal);
      showNotification(symbol,result.signal,result.confidence,result.summary||"");
      setNotification({symbol,signal:result.signal,confidence:result.confidence,summary:result.summary});
      setTimeout(()=>setNotification(null),8000);
    }
  };

  const analyzeAll = async ()=>{ for(const p of PAIRS) await handleAnalyze(p); };

  const handleMTF = async (symbol)=>{
    setMtfAnalyzing(p=>({...p,[symbol]:true}));
    if (!demoMode && wsRef.current?.readyState===1) {
      for (const tf of ["M5","H1","H4"])
        wsRef.current.send(JSON.stringify({type:"get_candles",symbol,timeframe:tf,count:100}));
      await new Promise(r=>setTimeout(r,2000));
    }
    const result = await multiTimeframeAnalyze(symbol,candlesByTf[symbol]||{},ticks[symbol]||{},wsRef.current);
    setMtfResult(p=>({...p,[symbol]:result}));
    setMtfAnalyzing(p=>({...p,[symbol]:false}));
    if (result&&(result.consensus==="BUY"||result.consensus==="SELL")&&result.confidence==="HIGH") {
      playAlert(result.consensus);
      setNotification({symbol,signal:`MTF ${result.consensus}`,confidence:result.confidence,summary:"Konsensus M5+H1+H4"});
      setTimeout(()=>setNotification(null),8000);
    }
  };

  useEffect(()=>{
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (autoRefresh && wsStatus==="connected") {
      autoRefreshRef.current = setInterval(()=>analyzeAll(), autoInterval*60*1000);
    }
    return ()=>clearInterval(autoRefreshRef.current);
  },[autoRefresh,autoInterval,wsStatus]);

  // handleOrder — kirim SL/TP sebagai harga (sudah dihitung di OrderPanel)
  const handleOrder = (symbol, action, volume, slPrice, tpPrice)=>{
    if (!demoMode && wsRef.current?.readyState===1) {
      wsRef.current.send(JSON.stringify({
        type:"send_order", symbol, action,
        volume: parseFloat(volume),
        sl: parseFloat(slPrice)||0,
        tp: parseFloat(tpPrice)||0,
      }));
    }
    // OrderPanel handles feedback UI
  };

  const handleClose = (ticket)=>{
    if (!demoMode && wsRef.current?.readyState===1)
      wsRef.current.send(JSON.stringify({type:"close_position",ticket}));
    else setPositions(p=>p.filter(pos=>pos.ticket!==ticket));
  };

  const statusColor = {connected:"#4ade80",connecting:"#fb923c",disconnected:"#475569",error:"#f87171"}[wsStatus];
  const wsConnected = wsStatus==="connected";

  return (
    <div style={{background:"#080d14",minHeight:"100vh",fontFamily:"monospace",color:"#e2e8f0",padding:0}}>

      {/* CSS keyframes */}
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0d1117}
        ::-webkit-scrollbar-thumb{background:#c9a84c44;border-radius:2px}
      `}</style>

      {/* NOTIFICATION */}
      {notification && (
        <div style={{
          position:"fixed",top:16,right:16,zIndex:9999,
          background: notification.signal.includes("BUY")?"#052e16":"#2d0b0b",
          border:`1px solid ${notification.signal.includes("BUY")?"#16a34a":"#dc2626"}`,
          borderRadius:10,padding:"14px 18px",maxWidth:300,boxShadow:"0 8px 32px #000c",
          animation:"fadeIn 0.3s ease",
        }}>
          <div style={{color:notification.signal.includes("BUY")?"#4ade80":"#f87171",fontWeight:700,fontSize:14,marginBottom:4}}>
            ⚡ {notification.symbol} — {notification.signal}
          </div>
          <div style={{color:"#94a3b8",fontSize:11,lineHeight:1.5}}>{notification.summary}</div>
          <div style={{color:"#475569",fontSize:10,marginTop:4}}>Confidence: {notification.confidence}</div>
          <button onClick={()=>setNotification(null)} style={{position:"absolute",top:8,right:10,background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:14}}>✕</button>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={{background:"#0d1117",borderBottom:"1px solid #c9a84c22",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>

        {/* BRANDING */}
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",flexDirection:"column",lineHeight:1}}>
            <span style={{
              background:"linear-gradient(90deg,#c9a84c,#f5d78e,#c9a84c)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              fontSize:18,fontWeight:900,letterSpacing:3,fontFamily:"monospace",
            }}>DnR OFFICIAL</span>
            <span style={{color:"#475569",fontSize:8,letterSpacing:4,marginTop:1}}>TRADING TERMINAL</span>
          </div>
          <div style={{width:1,height:28,background:"#c9a84c33"}}/>
          <span style={{color:demoMode?"#fb923c":"#4ade80",fontSize:10,letterSpacing:2,animation:demoMode?"pulse 2s infinite":"none"}}>
            ● {demoMode?"DEMO MODE":"LIVE MT5"}
          </span>
        </div>

        {/* CONNECTION */}
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <input value={wsUrl} onChange={e=>setWsUrl(e.target.value)}
            style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:4,padding:"5px 10px",color:"#94a3b8",fontSize:11,width:190,fontFamily:"monospace"}}/>
          {wsConnected
            ? <button onClick={disconnect} style={{background:"#2d0b0b",border:"1px solid #7f1d1d",color:"#f87171",padding:"5px 14px",borderRadius:4,cursor:"pointer",fontSize:11,letterSpacing:1,fontFamily:"monospace"}}>✕ DISCONNECT</button>
            : <button onClick={connect} style={{background:"#1a1200",border:"1px solid #c9a84c",color:"#c9a84c",padding:"5px 14px",borderRadius:4,cursor:"pointer",fontSize:11,letterSpacing:1,fontFamily:"monospace"}}>⚡ CONNECT MT5</button>
          }
          <span style={{color:statusColor,fontSize:11,letterSpacing:1}}>● {wsStatus.toUpperCase()}</span>

          {/* AUTO REFRESH */}
          <div style={{display:"flex",alignItems:"center",gap:5,borderLeft:"1px solid #1e293b",paddingLeft:8}}>
            <span style={{color:"#475569",fontSize:9,letterSpacing:1}}>AUTO</span>
            <button onClick={()=>setAutoRefresh(p=>!p)} style={{
              background:autoRefresh?"#1a1200":"#0a0f1e",border:`1px solid ${autoRefresh?"#c9a84c":"#1e293b"}`,
              color:autoRefresh?"#c9a84c":"#475569",padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:9,letterSpacing:1,fontFamily:"monospace",
            }}>{autoRefresh?"● ON":"○ OFF"}</button>
            <select value={autoInterval} onChange={e=>setAutoIntervalMin(+e.target.value)}
              style={{background:"#0a0f1e",border:"1px solid #1e293b",color:"#94a3b8",borderRadius:4,padding:"3px 5px",fontSize:9,fontFamily:"monospace"}}>
              {[5,10,15,30,60].map(m=><option key={m} value={m}>{m}m</option>)}
            </select>
          </div>
        </div>

        {/* ACCOUNT INFO */}
        {account && (
          <div style={{display:"flex",gap:16,fontSize:11}}>
            {[["BAL",`$${account.balance?.toLocaleString()}`,"#94a3b8"],
              ["EQ",`$${account.equity?.toLocaleString()}`,"#c9a84c"],
              ["PnL",`${account.profit>=0?"+":""}$${account.profit?.toFixed(2)}`,account.profit>=0?"#4ade80":"#f87171"],
            ].map(([k,v,c])=>(
              <span key={k}><span style={{color:"#475569"}}>{k} </span><span style={{color:c,fontWeight:700}}>{v}</span></span>
            ))}
          </div>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"290px 1fr",gap:0,height:"calc(100vh - 57px)"}}>

        {/* ── LEFT PANEL ── */}
        <div style={{borderRight:"1px solid #c9a84c11",overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:6,background:"#0a0f1e"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,padding:"0 4px"}}>
            <span style={{color:"#c9a84c",fontSize:9,letterSpacing:3,fontWeight:700}}>MARKETS</span>
            <button onClick={analyzeAll} style={{background:"#1a1200",border:"1px solid #c9a84c44",color:"#c9a84c",padding:"3px 10px",borderRadius:4,cursor:"pointer",fontSize:9,letterSpacing:1,fontFamily:"monospace"}}>⚡ AI ALL</button>
          </div>
          {PAIRS.map(p=>(
            <PairCard key={p} symbol={p} tick={ticks[p]} candles={candles[p]}
              analysis={analyses[p]} analyzing={analyzing[p]}
              selected={selected===p} onSelect={setSelected} onAnalyze={handleAnalyze}/>
          ))}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12,background:"#080d14"}}>

          {/* PAIR HEADER */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:28}}>{PAIR_FLAGS[selected]}</span>
              <div>
                <div style={{color:"#e2e8f0",fontSize:22,fontWeight:700,letterSpacing:3}}>{selected}</div>
                <div style={{color:"#475569",fontSize:11}}>{PAIR_NAMES[selected]}</div>
              </div>
              <div style={{color:"#c9a84c",fontSize:28,fontWeight:700,letterSpacing:1}}>
                {ticks[selected]?.bid?.toFixed(DIGITS[selected])||"—"}
              </div>
            </div>
            {/* TIMEFRAME BUTTONS */}
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {TIMEFRAMES.map(tf=>(
                <button key={tf} onClick={()=>{
                  setTimeframe(tf);
                  if(!demoMode&&wsRef.current?.readyState===1)
                    wsRef.current.send(JSON.stringify({type:"get_candles",symbol:selected,timeframe:tf,count:100}));
                }} style={{
                  background:timeframe===tf?"#1a1200":"#0a0f1e",
                  border:`1px solid ${timeframe===tf?"#c9a84c":"#1e293b"}`,
                  color:timeframe===tf?"#c9a84c":"#475569",
                  padding:"4px 12px",borderRadius:4,cursor:"pointer",fontSize:11,fontFamily:"monospace",
                }}>{tf}</button>
              ))}
            </div>
          </div>

          {/* TABS */}
          <div style={{display:"flex",gap:0,borderBottom:"1px solid #c9a84c22"}}>
            {[["chart","📈 Chart & Order"],["positions","📋 Positions"]].map(([key,label])=>(
              <button key={key} onClick={()=>setTab(key)} style={{
                background:"transparent",border:"none",
                borderBottom:`2px solid ${tab===key?"#c9a84c":"transparent"}`,
                color:tab===key?"#c9a84c":"#475569",
                padding:"8px 16px",cursor:"pointer",fontFamily:"monospace",fontSize:12,letterSpacing:0.5,
              }}>{label}</button>
            ))}
          </div>

          {tab==="chart" && (
            <>
              {/* CHART */}
              <div style={{background:"#0d1117",border:"1px solid #c9a84c11",borderRadius:10,padding:"12px 8px"}}>
                <MainChart data={candles[selected]} symbol={selected}/>
              </div>

              {/* MTF ANALYSIS */}
              <div style={{background:"#0d1117",border:"1px solid #c9a84c22",borderRadius:10,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{color:"#c9a84c",fontSize:9,letterSpacing:2,fontWeight:700}}>🔭 MULTI TIMEFRAME — M5 + H1 + H4</span>
                  <button onClick={()=>handleMTF(selected)} style={{background:"#1a1200",border:"1px solid #c9a84c44",color:"#c9a84c",padding:"4px 12px",borderRadius:4,cursor:"pointer",fontFamily:"monospace",fontSize:9,letterSpacing:1}}>
                    {mtfAnalyzing[selected]?"⟳ Analyzing...":"🔭 MTF Analysis"}
                  </button>
                </div>
                {mtfResult[selected] ? (
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <SignalBadge signal={mtfResult[selected].consensus} confidence={mtfResult[selected].confidence}/>
                      <span style={{color:"#475569",fontSize:11}}>Konsensus: <span style={{color:mtfResult[selected].confidence==="HIGH"?"#4ade80":mtfResult[selected].confidence==="MEDIUM"?"#fb923c":"#94a3b8",fontWeight:700}}>{mtfResult[selected].confidence}</span></span>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {Object.entries(mtfResult[selected].results||{}).map(([tf,r])=>(
                        <div key={tf} style={{background:"#080d14",border:"1px solid #1e293b",borderRadius:6,padding:"8px 12px",minWidth:95}}>
                          <div style={{color:"#c9a84c",fontSize:9,marginBottom:5,letterSpacing:1}}>{tf}</div>
                          <SignalBadge signal={r.signal} confidence={r.confidence}/>
                          <div style={{color:"#475569",fontSize:9,marginTop:4,lineHeight:1.4}}>{r.trend}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{color:"#334155",fontSize:11}}>Klik MTF Analysis untuk konsensus sinyal dari 3 timeframe.</div>
                )}
              </div>

              {/* SINGLE TF AI ANALYSIS */}
              {analyses[selected] ? (
                <div style={{background:"#0d1117",border:"1px solid #c9a84c22",borderRadius:10,padding:16}}>
                  <div style={{color:"#c9a84c",fontSize:9,letterSpacing:2,marginBottom:10,fontWeight:700}}>
                    ⚡ AI ANALYSIS — {selected} <span style={{color:"#475569",marginLeft:6}}>[{analyses[selected].timeframe||timeframe}]</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <SignalBadge signal={analyses[selected].signal} confidence={analyses[selected].confidence}/>
                    <span style={{color:"#475569",fontSize:11}}>Confidence: <span style={{color:analyses[selected].confidence==="HIGH"?"#4ade80":analyses[selected].confidence==="MEDIUM"?"#fb923c":"#f87171"}}>{analyses[selected].confidence}</span></span>
                    <button onClick={()=>handleAnalyze(selected)} style={{marginLeft:"auto",background:"#1a1200",border:"1px solid #c9a84c33",color:"#c9a84c",padding:"3px 10px",borderRadius:4,cursor:"pointer",fontFamily:"monospace",fontSize:9}}>↺ Refresh</button>
                  </div>
                  <p style={{color:"#94a3b8",fontSize:12,lineHeight:1.6,margin:"0 0 10px 0"}}>{analyses[selected].summary||analyses[selected].trend}</p>
                  <div style={{display:"flex",gap:16,fontSize:11,flexWrap:"wrap"}}>
                    {[["Trend",analyses[selected].trend,"#94a3b8"],
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
              ) : (
                <div style={{textAlign:"center",padding:"16px 0"}}>
                  <button onClick={()=>handleAnalyze(selected)} style={{
                    background:"#1a1200",border:"1px solid #c9a84c",color:"#c9a84c",
                    padding:"10px 28px",borderRadius:6,cursor:"pointer",fontFamily:"monospace",fontSize:13,letterSpacing:1,
                    boxShadow:"0 0 20px #c9a84c22",
                  }}>{analyzing[selected]?"⟳ Menganalisis...":"⚡ Analisis AI — "+selected+" ["+timeframe+"]"}</button>
                </div>
              )}

              {/* ORDER PANEL */}
              <OrderPanel symbol={selected} tick={ticks[selected]} onOrder={handleOrder} wsConnected={wsConnected}/>
            </>
          )}

          {tab==="positions" && (
            <div style={{background:"#0d1117",border:"1px solid #c9a84c22",borderRadius:10,padding:16}}>
              <div style={{color:"#c9a84c",fontSize:9,letterSpacing:2,marginBottom:12,fontWeight:700}}>📋 OPEN POSITIONS ({positions.length})</div>
              <PositionsTable positions={positions} onClose={handleClose}/>
            </div>
          )}

          {/* FOOTER */}
          <div style={{textAlign:"center",padding:"8px 0",color:"#1e293b",fontSize:9,letterSpacing:2}}>
            DnR OFFICIAL TRADING TERMINAL — POWERED BY AI
          </div>
        </div>
      </div>
    </div>
  );
}
