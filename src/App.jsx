import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";

// ─────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────
const PAIRS = [
  "EURUSD","GBPUSD","USDJPY","AUDUSD","USDCHF","USDCAD","NZDUSD",
  "EURGBP","EURJPY","EURCAD","EURAUD","EURNZD","EURCHF",
  "GBPJPY","GBPAUD","GBPCAD","GBPCHF","GBPNZD",
  "AUDJPY","AUDCAD","AUDCHF","AUDNZD","CADJPY","CHFJPY","NZDJPY",
  "XAUUSD","XAGUSD","USOIL","UKOIL",
  "USTEC","US30","US500",
  "BTCUSD","ETHUSD",
];
const GROUPS = {
  FX:     ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCHF","USDCAD","NZDUSD"],
  CROSS:  ["EURGBP","EURJPY","EURCAD","EURAUD","EURNZD","EURCHF","GBPJPY","GBPAUD","GBPCAD","GBPCHF","GBPNZD","AUDJPY","AUDCAD","AUDCHF","AUDNZD","CADJPY","CHFJPY","NZDJPY"],
  METAL:  ["XAUUSD","XAGUSD"],
  ENERGY: ["USOIL","UKOIL"],
  INDEX:  ["USTEC","US30","US500"],
  CRYPTO: ["BTCUSD","ETHUSD"],
};
const FLAGS = {
  EURUSD:"EU",GBPUSD:"GB",USDJPY:"JP",AUDUSD:"AU",USDCHF:"CH",USDCAD:"CA",NZDUSD:"NZ",
  EURGBP:"EG",EURJPY:"EJ",EURCAD:"EC",EURAUD:"EA",EURNZD:"EN",EURCHF:"EF",
  GBPJPY:"GJ",GBPAUD:"GA",GBPCAD:"GC",GBPCHF:"GF",GBPNZD:"GN",
  AUDJPY:"AJ",AUDCAD:"AC",AUDCHF:"AF",AUDNZD:"AN",CADJPY:"CJ",CHFJPY:"XJ",NZDJPY:"NJ",
  XAUUSD:"AU",XAGUSD:"AG",USOIL:"OL",UKOIL:"UK",
  USTEC:"NQ",US30:"DJ",US500:"SP",
  BTCUSD:"BT",ETHUSD:"ET",
};
const NAMES = {
  EURUSD:"EUR/USD",GBPUSD:"GBP/USD",USDJPY:"USD/JPY",AUDUSD:"AUD/USD",USDCHF:"USD/CHF",USDCAD:"USD/CAD",NZDUSD:"NZD/USD",
  EURGBP:"EUR/GBP",EURJPY:"EUR/JPY",EURCAD:"EUR/CAD",EURAUD:"EUR/AUD",EURNZD:"EUR/NZD",EURCHF:"EUR/CHF",
  GBPJPY:"GBP/JPY",GBPAUD:"GBP/AUD",GBPCAD:"GBP/CAD",GBPCHF:"GBP/CHF",GBPNZD:"GBP/NZD",
  AUDJPY:"AUD/JPY",AUDCAD:"AUD/CAD",AUDCHF:"AUD/CHF",AUDNZD:"AUD/NZD",
  CADJPY:"CAD/JPY",CHFJPY:"CHF/JPY",NZDJPY:"NZD/JPY",
  XAUUSD:"XAU/USD",XAGUSD:"XAG/USD",USOIL:"US OIL",UKOIL:"UK OIL",
  USTEC:"NASDAQ",US30:"DOW 30",US500:"S&P 500",
  BTCUSD:"BTC/USD",ETHUSD:"ETH/USD",
};
const TFS = ["M1","M5","M15","H1","H4","D1"];
const BASE = {
  EURUSD:1.0845,GBPUSD:1.2734,USDJPY:154.21,AUDUSD:0.6412,USDCHF:0.9023,USDCAD:1.3650,NZDUSD:0.5980,
  EURGBP:0.8512,EURJPY:167.40,EURCAD:1.4801,EURAUD:1.6910,EURNZD:1.8130,EURCHF:0.9740,
  GBPJPY:196.60,GBPAUD:1.9870,GBPCAD:1.7390,GBPCHF:1.1440,GBPNZD:2.1290,
  AUDJPY:99.01,AUDCAD:0.8820,AUDCHF:0.5840,AUDNZD:1.0870,CADJPY:112.97,CHFJPY:170.80,NZDJPY:92.10,
  XAUUSD:2345.50,XAGUSD:28.40,USOIL:78.40,UKOIL:82.10,USTEC:18250.0,US30:39800.0,US500:5280.0,
  BTCUSD:67500.0,ETHUSD:3450.0,
};
const DIG = {
  EURUSD:5,GBPUSD:5,USDJPY:3,AUDUSD:5,USDCHF:5,USDCAD:5,NZDUSD:5,
  EURGBP:5,EURJPY:3,EURCAD:5,EURAUD:5,EURNZD:5,EURCHF:5,
  GBPJPY:3,GBPAUD:5,GBPCAD:5,GBPCHF:5,GBPNZD:5,
  AUDJPY:3,AUDCAD:5,AUDCHF:5,AUDNZD:5,CADJPY:3,CHFJPY:3,NZDJPY:3,
  XAUUSD:2,XAGUSD:3,USOIL:2,UKOIL:2,USTEC:1,US30:1,US500:1,BTCUSD:2,ETHUSD:2,
};
const PIP = {
  EURUSD:0.0001,GBPUSD:0.0001,USDJPY:0.01,AUDUSD:0.0001,USDCHF:0.0001,USDCAD:0.0001,NZDUSD:0.0001,
  EURGBP:0.0001,EURJPY:0.01,EURCAD:0.0001,EURAUD:0.0001,EURNZD:0.0001,EURCHF:0.0001,
  GBPJPY:0.01,GBPAUD:0.0001,GBPCAD:0.0001,GBPCHF:0.0001,GBPNZD:0.0001,
  AUDJPY:0.01,AUDCAD:0.0001,AUDCHF:0.0001,AUDNZD:0.0001,CADJPY:0.01,CHFJPY:0.01,NZDJPY:0.01,
  XAUUSD:0.1,XAGUSD:0.01,USOIL:0.01,UKOIL:0.01,USTEC:1.0,US30:1.0,US500:0.1,BTCUSD:1.0,ETHUSD:0.1,
};

// ─────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────
const VOL = {USDJPY:0.12,EURJPY:0.14,GBPJPY:0.18,AUDJPY:0.08,CADJPY:0.1,CHFJPY:0.13,NZDJPY:0.07,XAUUSD:2.0,XAGUSD:0.12,USOIL:0.3,UKOIL:0.32,USTEC:30,US30:70,US500:8,BTCUSD:200,ETHUSD:12};
const getVol = s => VOL[s]||0.0007;
function mockCandles(s,n=80){const b=BASE[s]||1,v=getVol(s),d=DIG[s]||5;let p=b;const now=Date.now();return Array.from({length:n+1},(_,i)=>{const c=(Math.random()-.49)*v,o=p;p+=c;return{time:new Date(now-(n-i)*5*60000).toISOString(),open:+o.toFixed(d),high:+(Math.max(o,p)+Math.random()*v*.4).toFixed(d),low:+(Math.min(o,p)-Math.random()*v*.4).toFixed(d),close:+p.toFixed(d),volume:Math.floor(Math.random()*2000+300)};});}
function mockTick(s,prev){const b=prev?.bid||BASE[s]||1,v=getVol(s)*.18,d=DIG[s]||5,p=PIP[s]||0.0001;const bid=+(b+(Math.random()-.49)*v).toFixed(d);const spr={XAUUSD:30,BTCUSD:50,USTEC:15,US30:20,USDJPY:2,EURJPY:2,GBPJPY:3}[s]||1.2;return{symbol:s,bid,ask:+(bid+spr*p).toFixed(d),spread:spr,time:new Date().toISOString(),digits:d};}

// ─────────────────────────────────────────────────────────
// AI & NOTIFICATIONS
// ─────────────────────────────────────────────────────────
function playAlert(t){try{const c=new(window.AudioContext||window.webkitAudioContext)();([t==="BUY"?[523,659,784]:[784,659,523]][0]).forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.value=f;o.type="sine";g.gain.setValueAtTime(.25,c.currentTime+i*.15);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+i*.15+.25);o.start(c.currentTime+i*.15);o.stop(c.currentTime+i*.15+.25);});}catch{}}

async function aiAnalyze(symbol,candles,tick,ws,tf="M5"){
  if(!ws||ws.readyState!==1)return{signal:"WAIT",summary:"Connect to MT5 bridge first.",confidence:"LOW",trend:"—",sl_pips:0,tp_pips:0,timeframe:tf};
  return new Promise(resolve=>{
    ws.send(JSON.stringify({type:"analyze",symbol,candles,tick,timeframe:tf}));
    const h=e=>{try{const m=JSON.parse(e.data);if(m.type==="analysis"&&m.symbol===symbol){ws.removeEventListener("message",h);resolve({...m,timeframe:tf});}}catch{}};
    ws.addEventListener("message",h);
    setTimeout(()=>{ws.removeEventListener("message",h);resolve({signal:"WAIT",summary:"Timeout.",confidence:"LOW",trend:"—",sl_pips:0,tp_pips:0,timeframe:tf});},30000);
  });
}
async function aiMTF(symbol,byTf,tick,ws){
  if(!ws||ws.readyState!==1)return null;
  const res={};
  for(const tf of["M5","H1","H4"]){const c=byTf[tf]||[];if(c.length)res[tf]=await aiAnalyze(symbol,c,tick,ws,tf);}
  const sig=Object.values(res).map(r=>r.signal);
  const b=sig.filter(s=>s==="BUY").length,sl=sig.filter(s=>s==="SELL").length;
  return{results:res,consensus:b>=2?"BUY":sl>=2?"SELL":"WAIT",confidence:b===3||sl===3?"HIGH":b>=2||sl>=2?"MEDIUM":"LOW"};
}

// ─────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────
const C = {
  bg:"#08090d", panel:"#0d0f15", border:"#1a1d26", gold:"#b8935a",
  goldDim:"#7a5f38", text:"#c8cdd8", dim:"#4a5060", up:"#2ecc71", dn:"#e74c3c",
  buy:"#1a6b3a", sell:"#6b1a1a", accent:"#1e3a5f",
};

function Spark({data,up}){
  if(!data||data.length<2)return<div style={{height:28}}/>;
  const cd=data.slice(-24).map((c,i)=>({i,v:c.close}));
  const col=up?"#2ecc71":"#e74c3c";
  return(<ResponsiveContainer width="100%" height={28}><AreaChart data={cd} margin={{top:1,right:0,bottom:0,left:0}}><defs><linearGradient id={`sp${col.replace("#","")}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity={0.25}/><stop offset="100%" stopColor={col} stopOpacity={0}/></linearGradient></defs><Area type="monotone" dataKey="v" stroke={col} strokeWidth={1.2} fill={`url(#sp${col.replace("#","")})`} dot={false} isAnimationActive={false}/></AreaChart></ResponsiveContainer>);
}

function MainChart({data,symbol}){
  if(!data||data.length<2)return<div style={{height:180,display:"flex",alignItems:"center",justifyContent:"center",color:C.dim,fontSize:11,letterSpacing:2}}>NO DATA</div>;
  const cd=data.map(c=>({t:c.time.slice(11,16),v:c.close}));
  const vals=data.map(c=>c.close);
  const mn=Math.min(...vals),mx=Math.max(...vals),pad=(mx-mn)*.12||mn*0.001;
  const col=vals[vals.length-1]>=vals[0]?C.up:C.dn;
  const dig=DIG[symbol]||5;
  return(
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={cd} margin={{top:6,right:4,bottom:0,left:2}}>
        <defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity={.2}/><stop offset="100%" stopColor={col} stopOpacity={0}/></linearGradient></defs>
        <YAxis domain={[mn-pad,mx+pad]} hide={false} width={dig>3?60:50} tick={{fill:C.dim,fontSize:9,fontFamily:"'JetBrains Mono',monospace"}} tickLine={false} axisLine={false} tickFormatter={v=>v.toFixed(dig>3?dig-1:dig)}/>
        <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:4,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.text,padding:"4px 8px"}} labelStyle={{color:C.dim}} itemStyle={{color:col}} formatter={v=>[v.toFixed(dig),""]}/>
        <Area type="monotone" dataKey="v" stroke={col} strokeWidth={1.5} fill="url(#mg)" dot={false} isAnimationActive={false}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Badge({signal,size="sm"}){
  const cfg={BUY:{bg:"#0d2b1a",bd:"#2ecc71",c:"#2ecc71",l:"▲ BUY"},SELL:{bg:"#2b0d0d",bd:"#e74c3c",c:"#e74c3c",l:"▼ SELL"},WAIT:{bg:"#1a1a1a",bd:"#4a5060",c:"#4a5060",l:"◼ WAIT"}};
  const s=cfg[signal]||cfg.WAIT;
  const fs=size==="sm"?9:11;
  return<span style={{background:s.bg,border:`1px solid ${s.bd}`,color:s.c,padding:size==="sm"?"1px 6px":"2px 8px",borderRadius:2,fontSize:fs,fontWeight:700,letterSpacing:1,fontFamily:"'JetBrains Mono',monospace"}}>{s.l}</span>;
}

function PairRow({symbol,tick,candles,analysis,analyzing,selected,onSelect,onAnalyze}){
  const cur=tick?.bid,prev=candles?.slice(-2,-1)[0]?.close;
  const isUp=cur&&prev?cur>=prev:true;
  const chg=candles?.length>1?(((cur-candles[0].close)/candles[0].close)*100).toFixed(2):"0.00";
  const pos=parseFloat(chg)>=0;
  const d=DIG[symbol]||5;
  return(
    <div onClick={()=>onSelect(symbol)} style={{
      display:"grid",gridTemplateColumns:"52px 1fr 72px 28px",alignItems:"center",
      padding:"5px 8px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,
      background:selected?C.accent:"transparent",
      borderLeft:`2px solid ${selected?C.gold:"transparent"}`,
      transition:"background 0.1s",
    }}>
      {/* Symbol */}
      <div>
        <div style={{color:C.text,fontSize:10,fontWeight:700,letterSpacing:.5,fontFamily:"'JetBrains Mono',monospace"}}>{symbol.slice(0,6)}</div>
        <div style={{color:C.dim,fontSize:8,marginTop:1}}>{FLAGS[symbol]}</div>
      </div>
      {/* Spark + change */}
      <div style={{overflow:"hidden"}}>
        <Spark data={candles} up={isUp}/>
        <div style={{display:"flex",gap:6,alignItems:"center",marginTop:1}}>
          {analysis&&<Badge signal={analysis.signal} size="sm"/>}
          <span style={{color:pos?"#2ecc71":"#e74c3c",fontSize:8}}>{pos?"+":""}{chg}%</span>
        </div>
      </div>
      {/* Price */}
      <div style={{textAlign:"right"}}>
        <div style={{color:isUp?C.gold:"#e74c3c",fontSize:11,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",letterSpacing:.5}}>
          {tick?tick.bid.toFixed(d):"—"}
        </div>
        <div style={{color:C.dim,fontSize:8}}>{tick?.spread||"—"}</div>
      </div>
      {/* AI btn */}
      <button onClick={e=>{e.stopPropagation();onAnalyze(symbol);}} style={{
        background:"none",border:"none",color:analyzing?C.gold:C.dim,
        fontSize:10,cursor:"pointer",padding:2,fontFamily:"'JetBrains Mono',monospace",
      }}>{analyzing?"◌":"⚡"}</button>
    </div>
  );
}

function OrderPanel({symbol,tick,onOrder,wsConnected}){
  const [vol,setVol]=useState("0.01");
  const [slP,setSlP]=useState("");
  const [tpP,setTpP]=useState("");
  const [res,setRes]=useState(null);
  const d=DIG[symbol]||5,pip=PIP[symbol]||0.0001;
  const sl=parseFloat(slP)||0,tp=parseFloat(tpP)||0;
  const calc=tick?{slB:sl?+(tick.ask-sl*pip).toFixed(d):null,slS:sl?+(tick.bid+sl*pip).toFixed(d):null,tpB:tp?+(tick.ask+tp*pip).toFixed(d):null,tpS:tp?+(tick.bid-tp*pip).toFixed(d):null}:{};

  const go=act=>{
    if(!wsConnected){setRes({ok:false,msg:"Not connected to MT5"});setTimeout(()=>setRes(null),4000);return;}
    onOrder(symbol,act,vol,act==="BUY"?(calc.slB||0):(calc.slS||0),act==="BUY"?(calc.tpB||0):(calc.tpS||0));
    setRes({ok:true,msg:`${act} ${vol} ${symbol} sent`});setTimeout(()=>setRes(null),4000);
  };

  const inp=(val,set,clr)=>(
    <input value={val} onChange={e=>set(e.target.value)} style={{
      width:"100%",background:C.bg,border:`1px solid ${clr}`,borderRadius:3,
      padding:"5px 7px",color:C.text,fontFamily:"'JetBrains Mono',monospace",fontSize:11,
      boxSizing:"border-box",outline:"none",
    }}/>
  );

  return(
    <div style={{padding:"10px 12px",borderTop:`1px solid ${C.border}`}}>
      <div style={{color:C.gold,fontSize:9,letterSpacing:2,marginBottom:8,fontWeight:700}}>ORDER — {symbol}</div>

      {/* BID/ASK */}
      {tick&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:0,marginBottom:8,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
          <div style={{padding:"5px 8px",background:"#150a0a",textAlign:"center"}}>
            <div style={{color:C.dim,fontSize:8,letterSpacing:1}}>BID</div>
            <div style={{color:"#e74c3c",fontSize:13,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{tick.bid?.toFixed(d)}</div>
          </div>
          <div style={{padding:"5px 8px",background:C.panel,textAlign:"center",borderLeft:`1px solid ${C.border}`,borderRight:`1px solid ${C.border}`}}>
            <div style={{color:C.dim,fontSize:8}}>SPR</div>
            <div style={{color:C.dim,fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{tick.spread}</div>
          </div>
          <div style={{padding:"5px 8px",background:"#0a150a",textAlign:"center"}}>
            <div style={{color:C.dim,fontSize:8,letterSpacing:1}}>ASK</div>
            <div style={{color:"#2ecc71",fontSize:13,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{tick.ask?.toFixed(d)}</div>
          </div>
        </div>
      )}

      {/* Inputs */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:6}}>
        <div>
          <div style={{color:C.dim,fontSize:8,letterSpacing:1,marginBottom:3}}>VOL</div>
          {inp(vol,setVol,C.gold+"66")}
        </div>
        <div>
          <div style={{color:"#e74c3c",fontSize:8,letterSpacing:1,marginBottom:3}}>SL pips</div>
          {inp(slP,setSlP,"#e74c3c44")}
          {sl>0&&tick&&<div style={{fontSize:8,color:"#e74c3c",marginTop:2,lineHeight:1.4}}>▲{calc.slB} ▼{calc.slS}</div>}
        </div>
        <div>
          <div style={{color:"#a78bfa",fontSize:8,letterSpacing:1,marginBottom:3}}>TP pips</div>
          {inp(tpP,setTpP,"#a78bfa44")}
          {tp>0&&tick&&<div style={{fontSize:8,color:"#a78bfa",marginTop:2,lineHeight:1.4}}>▲{calc.tpB} ▼{calc.tpS}</div>}
        </div>
      </div>

      {/* R:R */}
      {sl>0&&tp>0&&(
        <div style={{color:C.dim,fontSize:8,marginBottom:6,fontFamily:"'JetBrains Mono',monospace"}}>
          R:R <span style={{color:"#22d3ee"}}>1:{(tp/sl).toFixed(1)}</span>
        </div>
      )}

      {/* Buttons */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        <button onClick={()=>go("BUY")} style={{padding:"8px 0",background:"linear-gradient(135deg,#1a6b3a,#145c30)",border:"1px solid #2ecc7144",borderRadius:4,color:"#fff",fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
          ▲ BUY<br/><span style={{fontSize:9,opacity:.8}}>{tick?.ask?.toFixed(d)}</span>
        </button>
        <button onClick={()=>go("SELL")} style={{padding:"8px 0",background:"linear-gradient(135deg,#6b1a1a,#5c1414)",border:"1px solid #e74c3c44",borderRadius:4,color:"#fff",fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
          ▼ SELL<br/><span style={{fontSize:9,opacity:.8}}>{tick?.bid?.toFixed(d)}</span>
        </button>
      </div>

      {res&&<div style={{marginTop:6,padding:"4px 8px",borderRadius:3,fontSize:9,background:res.ok?"#0d2b1a":"#2b0d0d",border:`1px solid ${res.ok?"#2ecc7144":"#e74c3c44"}`,color:res.ok?"#2ecc71":"#e74c3c",fontFamily:"'JetBrains Mono',monospace"}}>{res.ok?"✓":"✗"} {res.msg}</div>}
    </div>
  );
}

function PositionsPanel({positions,onClose}){
  if(!positions?.length)return<div style={{padding:"20px 12px",textAlign:"center",color:C.dim,fontSize:10,letterSpacing:2}}>NO OPEN POSITIONS</div>;
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'JetBrains Mono',monospace",fontSize:9}}>
        <thead><tr style={{color:C.dim,borderBottom:`1px solid ${C.border}`}}>
          {["#","SYM","TYPE","VOL","OPEN","NOW","SL","TP","P&L",""].map(h=><th key={h} style={{padding:"4px 6px",textAlign:"left",fontWeight:600,letterSpacing:.5}}>{h}</th>)}
        </tr></thead>
        <tbody>{positions.map(p=>(
          <tr key={p.ticket} style={{borderBottom:`1px solid ${C.border}22`,color:C.dim}}>
            <td style={{padding:"4px 6px",color:C.dim+"99",fontSize:8}}>{p.ticket}</td>
            <td style={{padding:"4px 6px",color:C.text,fontWeight:700}}>{p.symbol}</td>
            <td style={{padding:"4px 6px",color:p.type==="BUY"?"#2ecc71":"#e74c3c",fontWeight:700}}>{p.type}</td>
            <td style={{padding:"4px 6px"}}>{p.volume}</td>
            <td style={{padding:"4px 6px"}}>{p.price_open}</td>
            <td style={{padding:"4px 6px",color:C.text}}>{p.price_current}</td>
            <td style={{padding:"4px 6px",color:"#f97316"}}>{p.sl||"—"}</td>
            <td style={{padding:"4px 6px",color:"#a78bfa"}}>{p.tp||"—"}</td>
            <td style={{padding:"4px 6px",color:p.profit>=0?"#2ecc71":"#e74c3c",fontWeight:700}}>{p.profit>=0?"+":""}{p.profit?.toFixed(2)}</td>
            <td style={{padding:"4px 6px"}}><button onClick={()=>onClose(p.ticket)} style={{background:"none",border:`1px solid #e74c3c44`,color:"#e74c3c",padding:"1px 5px",borderRadius:2,cursor:"pointer",fontSize:8}}>✕</button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────
export default function App(){
  const [wsUrl,setWsUrl]=useState("ws://localhost:8765");
  const [wsStatus,setWsStatus]=useState("disconnected");
  const [demo,setDemo]=useState(true);
  const [ticks,setTicks]=useState({});
  const [candles,setCandles]=useState({});
  const [byTf,setByTf]=useState({});
  const [positions,setPositions]=useState([]);
  const [account,setAccount]=useState(null);
  const [sel,setSel]=useState("EURUSD");
  const [tf,setTf]=useState("M5");
  const [analyses,setAnalyses]=useState({});
  const [analyzing,setAnalyzing]=useState({});
  const [mtf,setMtf]=useState({});
  const [mtfBusy,setMtfBusy]=useState({});
  const [autoOn,setAutoOn]=useState(false);
  const [autoMin,setAutoMin]=useState(15);
  const [notif,setNotif]=useState(null);
  const [tab,setTab]=useState("chart");
  const [group,setGroup]=useState("FX");
  const [wsInput,setWsInput]=useState(false);

  const wsRef=useRef(null),demoRef=useRef(null),autoRef=useRef(null);

  const startDemo=useCallback(()=>{
    setDemo(true);
    const c={},t={};
    PAIRS.forEach(p=>{c[p]=mockCandles(p,80);t[p]=mockTick(p,null);});
    setCandles(c);setTicks(t);
    setAccount({balance:10000,equity:10050,free_margin:9500,profit:50,leverage:100,currency:"USD"});
    if(demoRef.current)clearInterval(demoRef.current);
    demoRef.current=setInterval(()=>{
      setTicks(prev=>{const n={};PAIRS.forEach(p=>{n[p]=mockTick(p,prev[p]);});return n;});
      setCandles(prev=>{const n={...prev};PAIRS.forEach(p=>{if(!n[p])return;const l=n[p][n[p].length-1],nc=mockTick(p,{bid:l.close}).bid;n[p]=[...n[p].slice(-79),{...l,close:nc,high:Math.max(l.high,nc),low:Math.min(l.low,nc),time:new Date().toISOString()}];});return n;});
    },1000);
  },[]);

  useEffect(()=>{startDemo();return()=>clearInterval(demoRef.current);},[startDemo]);

  const connect=useCallback(()=>{
    if(wsRef.current)wsRef.current.close();
    setWsStatus("connecting");
    const ws=new WebSocket(wsUrl);wsRef.current=ws;
    ws.onopen=()=>{setWsStatus("connected");setDemo(false);clearInterval(demoRef.current);PAIRS.forEach(p=>ws.send(JSON.stringify({type:"get_candles",symbol:p,timeframe:tf,count:100})));};
    ws.onmessage=e=>{try{const m=JSON.parse(e.data);
      if(m.type==="ticks")setTicks(p=>({...p,...m.data}));
      else if(m.type==="candles"){setCandles(p=>({...p,[m.symbol]:m.data}));setByTf(p=>({...p,[m.symbol]:{...(p[m.symbol]||{}),[m.timeframe]:m.data}}));}
      else if(m.type==="account"||m.type==="init"){setPositions(m.positions||[]);setAccount(m.account);}
      else if(m.type==="order_result"){
        const ok=m.success;
        setNotif({ok,symbol:m.symbol||sel,signal:ok?`✓ ${m.action} EXECUTED`:"✕ ORDER FAILED",summary:ok?`#${m.ticket} @ ${m.price}`:m.error});
        setTimeout(()=>setNotif(null),5000);
      }
      else if(m.type==="close_result"){
        setNotif({ok:m.success,symbol:"POS",signal:m.success?"✓ CLOSED":"✕ CLOSE FAILED",summary:m.success?`#${m.ticket}`:m.error});
        setTimeout(()=>setNotif(null),4000);
      }
    }catch{}};
    ws.onerror=()=>setWsStatus("error");
    ws.onclose=()=>{setWsStatus("disconnected");startDemo();};
  },[wsUrl,tf,startDemo,sel]);

  const disconnect=()=>{wsRef.current?.close();setWsStatus("disconnected");startDemo();};

  const doAnalyze=async sym=>{
    setAnalyzing(p=>({...p,[sym]:true}));
    const r=await aiAnalyze(sym,candles[sym]||[],ticks[sym]||{},wsRef.current,tf);
    setAnalyses(p=>({...p,[sym]:r}));
    setAnalyzing(p=>({...p,[sym]:false}));
    if((r.signal==="BUY"||r.signal==="SELL")&&r.confidence==="HIGH"){
      playAlert(r.signal);
      setNotif({ok:true,symbol:sym,signal:`⚡ ${r.signal} HIGH`,summary:r.summary||""});
      setTimeout(()=>setNotif(null),8000);
    }
  };

  const doMTF=async sym=>{
    setMtfBusy(p=>({...p,[sym]:true}));
    if(!demo&&wsRef.current?.readyState===1){for(const t of["M5","H1","H4"])wsRef.current.send(JSON.stringify({type:"get_candles",symbol:sym,timeframe:t,count:100}));await new Promise(r=>setTimeout(r,2000));}
    const r=await aiMTF(sym,byTf[sym]||{},ticks[sym]||{},wsRef.current);
    setMtf(p=>({...p,[sym]:r}));
    setMtfBusy(p=>({...p,[sym]:false}));
  };

  useEffect(()=>{
    if(autoRef.current)clearInterval(autoRef.current);
    if(autoOn&&wsStatus==="connected"){autoRef.current=setInterval(()=>{for(const p of PAIRS)doAnalyze(p);},autoMin*60*1000);}
    return()=>clearInterval(autoRef.current);
  },[autoOn,autoMin,wsStatus]);

  const doOrder=(symbol,action,volume,sl,tp)=>{
    if(!demo&&wsRef.current?.readyState===1)wsRef.current.send(JSON.stringify({type:"send_order",symbol,action,volume:parseFloat(volume),sl:parseFloat(sl)||0,tp:parseFloat(tp)||0}));
  };
  const doClose=ticket=>{
    if(!demo&&wsRef.current?.readyState===1)wsRef.current.send(JSON.stringify({type:"close_position",ticket}));
    else setPositions(p=>p.filter(x=>x.ticket!==ticket));
  };

  const connected=wsStatus==="connected";
  const stCol={connected:C.up,connecting:"#f97316",disconnected:C.dim,error:C.dn}[wsStatus];
  const filteredPairs=GROUPS[group]||PAIRS;

  return(
    <div style={{background:C.bg,height:"100vh",overflow:"hidden",fontFamily:"'JetBrains Mono',monospace",color:C.text,display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        button:hover{opacity:.85}
        input:focus{outline:none;border-color:${C.gold}!important}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>

      {/* NOTIFICATION */}
      {notif&&(
        <div style={{position:"fixed",top:10,right:10,zIndex:9999,background:C.panel,border:`1px solid ${notif.ok?C.up+"55":C.dn+"55"}`,borderRadius:5,padding:"8px 12px",maxWidth:260,boxShadow:`0 4px 20px #000a`,animation:"fadeSlide .2s ease",minWidth:200}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
            <div>
              <div style={{color:notif.ok?C.up:C.dn,fontSize:10,fontWeight:700,letterSpacing:.5}}>{notif.symbol} {notif.signal}</div>
              <div style={{color:C.dim,fontSize:9,marginTop:2,lineHeight:1.4}}>{notif.summary}</div>
            </div>
            <button onClick={()=>setNotif(null)} style={{background:"none",border:"none",color:C.dim,cursor:"pointer",fontSize:12,flexShrink:0}}>✕</button>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,padding:"0 12px",height:36,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        {/* Brand */}
        <div style={{display:"flex",alignItems:"center",gap:8,borderRight:`1px solid ${C.border}`,paddingRight:12}}>
          <div style={{width:20,height:20,background:`linear-gradient(135deg,${C.gold},#d4a96a)`,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"#000",fontSize:9,fontWeight:900}}>D</span>
          </div>
          <div>
            <div style={{color:C.gold,fontSize:11,fontWeight:700,letterSpacing:2,lineHeight:1}}>DnR OFFICIAL</div>
            <div style={{color:C.dim,fontSize:7,letterSpacing:3}}>TRADING TERMINAL</div>
          </div>
        </div>

        {/* Status */}
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:stCol,animation:wsStatus==="connecting"?"pulse 1s infinite":"none"}}/>
          <span style={{color:stCol,fontSize:9,letterSpacing:1}}>{wsStatus.toUpperCase()}</span>
          <span style={{color:demo?"#f97316":C.up,fontSize:9,marginLeft:4}}>{demo?"DEMO":"LIVE"}</span>
        </div>

        {/* WS input toggle */}
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          {wsInput&&<input value={wsUrl} onChange={e=>setWsUrl(e.target.value)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:3,padding:"2px 7px",color:C.text,fontSize:9,width:160,fontFamily:"'JetBrains Mono',monospace"}}/>}
          {connected
            ?<button onClick={disconnect} style={{background:C.sell,border:`1px solid ${C.dn}44`,color:C.dn,padding:"2px 8px",borderRadius:3,cursor:"pointer",fontSize:9,letterSpacing:1}}>DISCONNECT</button>
            :<button onClick={connect} style={{background:"#1a2e1a",border:`1px solid ${C.up}44`,color:C.up,padding:"2px 8px",borderRadius:3,cursor:"pointer",fontSize:9,letterSpacing:1}}>CONNECT</button>
          }
          <button onClick={()=>setWsInput(p=>!p)} style={{background:"none",border:`1px solid ${C.border}`,color:C.dim,padding:"2px 6px",borderRadius:3,cursor:"pointer",fontSize:9}}>⚙</button>
        </div>

        {/* Auto refresh */}
        <div style={{display:"flex",alignItems:"center",gap:4,borderLeft:`1px solid ${C.border}`,paddingLeft:8}}>
          <button onClick={()=>setAutoOn(p=>!p)} style={{background:autoOn?"#1a2e1a":"none",border:`1px solid ${autoOn?C.up+"44":C.border}`,color:autoOn?C.up:C.dim,padding:"2px 6px",borderRadius:3,cursor:"pointer",fontSize:8,letterSpacing:1}}>AUTO {autoOn?"ON":"OFF"}</button>
          <select value={autoMin} onChange={e=>setAutoMin(+e.target.value)} style={{background:C.bg,border:`1px solid ${C.border}`,color:C.dim,borderRadius:3,padding:"2px 4px",fontSize:8,fontFamily:"'JetBrains Mono',monospace"}}>
            {[5,10,15,30,60].map(m=><option key={m} value={m}>{m}m</option>)}
          </select>
        </div>

        {/* Account */}
        {account&&(
          <div style={{marginLeft:"auto",display:"flex",gap:12,alignItems:"center"}}>
            {[["BAL",`$${account.balance?.toLocaleString()}`,C.dim],["EQ",`$${account.equity?.toLocaleString()}`,C.gold],["PnL",`${account.profit>=0?"+":""}$${account.profit?.toFixed(2)}`,account.profit>=0?C.up:C.dn]].map(([k,v,c])=>(
              <div key={k} style={{textAlign:"right"}}>
                <div style={{color:C.dim,fontSize:7,letterSpacing:1}}>{k}</div>
                <div style={{color:c,fontSize:10,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",flex:1,overflow:"hidden"}}>

        {/* ── LEFT SIDEBAR ── */}
        <div style={{borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflow:"hidden",background:C.panel}}>
          {/* Group tabs */}
          <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            {Object.keys(GROUPS).map(g=>(
              <button key={g} onClick={()=>setGroup(g)} style={{
                flex:1,padding:"5px 0",background:group===g?C.accent:"none",
                border:"none",borderBottom:`2px solid ${group===g?C.gold:"transparent"}`,
                color:group===g?C.gold:C.dim,cursor:"pointer",fontSize:7,letterSpacing:1,
                fontFamily:"'JetBrains Mono',monospace",fontWeight:group===g?700:400,
                transition:"all .15s",
              }}>{g}</button>
            ))}
          </div>
          {/* Header */}
          <div style={{display:"grid",gridTemplateColumns:"52px 1fr 72px 28px",padding:"4px 8px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            {["SYM","","PRICE","AI"].map(h=><div key={h} style={{color:C.dim,fontSize:7,letterSpacing:1}}>{h}</div>)}
          </div>
          {/* Pairs */}
          <div style={{overflowY:"auto",flex:1}}>
            {filteredPairs.map(p=>(
              <PairRow key={p} symbol={p} tick={ticks[p]} candles={candles[p]}
                analysis={analyses[p]} analyzing={analyzing[p]}
                selected={sel===p}
                onSelect={(sym)=>{
                  setSel(sym);
                  if(connected&&wsRef.current?.readyState===1)
                    wsRef.current.send(JSON.stringify({type:"get_candles",symbol:sym,timeframe:tf,count:100}));
                }}
                onAnalyze={doAnalyze}/>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* Pair header */}
          <div style={{borderBottom:`1px solid ${C.border}`,padding:"6px 14px",display:"flex",alignItems:"center",gap:12,flexShrink:0,background:C.panel}}>
            <div>
              <div style={{color:C.text,fontSize:14,fontWeight:700,letterSpacing:2}}>{sel}</div>
              <div style={{color:C.dim,fontSize:8,letterSpacing:1}}>{NAMES[sel]}</div>
            </div>
            <div style={{color:C.gold,fontSize:20,fontWeight:700,letterSpacing:1,fontFamily:"'JetBrains Mono',monospace"}}>
              {ticks[sel]?.bid?.toFixed(DIG[sel])||"—"}
            </div>
            {/* TF buttons */}
            <div style={{display:"flex",gap:3,marginLeft:"auto"}}>
              {TFS.map(t=>(
                <button key={t} onClick={()=>{setTf(t);if(connected)wsRef.current.send(JSON.stringify({type:"get_candles",symbol:sel,timeframe:t,count:100}));}} style={{
                  background:tf===t?C.accent:"none",border:`1px solid ${tf===t?C.gold:C.border}`,
                  color:tf===t?C.gold:C.dim,padding:"2px 8px",borderRadius:3,cursor:"pointer",
                  fontSize:9,fontFamily:"'JetBrains Mono',monospace",fontWeight:tf===t?700:400,
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            {[["chart","CHART"],["positions",`POSITIONS${positions.length?` (${positions.length})`:""}`]].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{
                padding:"5px 14px",background:"none",border:"none",
                borderBottom:`2px solid ${tab===k?C.gold:"transparent"}`,
                color:tab===k?C.gold:C.dim,cursor:"pointer",fontSize:9,letterSpacing:1,
                fontFamily:"'JetBrains Mono',monospace",fontWeight:tab===k?700:400,
              }}>{l}</button>
            ))}
          </div>

          {/* Content */}
          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
            {tab==="chart"&&(
              <>
                {/* Chart */}
                <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`}}>
                  <MainChart data={candles[sel]} symbol={sel}/>
                </div>

                {/* AI Analysis row */}
                <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"flex-start",flexWrap:"wrap"}}>
                  {/* Single TF */}
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <span style={{color:C.dim,fontSize:8,letterSpacing:1}}>AI [{tf}]</span>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>doAnalyze(sel)} style={{background:C.accent,border:`1px solid ${C.gold}33`,color:C.gold,padding:"1px 7px",borderRadius:2,cursor:"pointer",fontSize:8,letterSpacing:1}}>
                          {analyzing[sel]?"◌ ...":"⚡ ANALYZE"}
                        </button>
                      </div>
                    </div>
                    {analyses[sel]?(
                      <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 10px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                          <Badge signal={analyses[sel].signal}/>
                          <span style={{color:analyses[sel].confidence==="HIGH"?C.up:analyses[sel].confidence==="MEDIUM"?"#f97316":C.dim,fontSize:8}}>{analyses[sel].confidence}</span>
                          <span style={{color:C.dim,fontSize:8,marginLeft:"auto"}}>{analyses[sel].timeframe}</span>
                        </div>
                        <p style={{color:C.text,fontSize:9,lineHeight:1.5,marginBottom:5}}>{analyses[sel].summary||analyses[sel].trend}</p>
                        <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:8}}>
                          {[["S",analyses[sel].support,C.up],["R",analyses[sel].resistance,C.dn],["SL",`${analyses[sel].sl_pips}p`,"#f97316"],["TP",`${analyses[sel].tp_pips}p`,"#a78bfa"]].map(([k,v,c])=>(
                            <span key={k} style={{color:C.dim}}>{k} <b style={{color:c}}>{v}</b></span>
                          ))}
                        </div>
                        {analyses[sel].signal_reason&&<p style={{color:C.dim,fontSize:8,marginTop:4,paddingTop:4,borderTop:`1px solid ${C.border}`}}>{analyses[sel].signal_reason}</p>}
                      </div>
                    ):<div style={{color:C.dim,fontSize:9,padding:"6px 0"}}>Click ANALYZE for AI signal</div>}
                  </div>

                  {/* MTF */}
                  <div style={{flex:1,minWidth:200}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <span style={{color:C.dim,fontSize:8,letterSpacing:1}}>MTF M5+H1+H4</span>
                      <button onClick={()=>doMTF(sel)} style={{background:C.accent,border:`1px solid ${C.gold}33`,color:C.gold,padding:"1px 7px",borderRadius:2,cursor:"pointer",fontSize:8,letterSpacing:1}}>
                        {mtfBusy[sel]?"◌ ...":"🔭 MTF"}
                      </button>
                    </div>
                    {mtf[sel]?(
                      <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,padding:"7px 10px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                          <Badge signal={mtf[sel].consensus}/>
                          <span style={{color:mtf[sel].confidence==="HIGH"?C.up:mtf[sel].confidence==="MEDIUM"?"#f97316":C.dim,fontSize:8}}>{mtf[sel].confidence}</span>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          {Object.entries(mtf[sel].results||{}).map(([t,r])=>(
                            <div key={t} style={{flex:1,background:C.panel,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 6px",textAlign:"center"}}>
                              <div style={{color:C.dim,fontSize:7,letterSpacing:1,marginBottom:3}}>{t}</div>
                              <Badge signal={r.signal} size="sm"/>
                            </div>
                          ))}
                        </div>
                      </div>
                    ):<div style={{color:C.dim,fontSize:9,padding:"6px 0"}}>Click MTF for multi-timeframe consensus</div>}
                  </div>
                </div>

                {/* Order Panel */}
                <OrderPanel symbol={sel} tick={ticks[sel]} onOrder={doOrder} wsConnected={connected}/>
              </>
            )}
            {tab==="positions"&&(
              <div style={{padding:"8px 0"}}>
                <PositionsPanel positions={positions} onClose={doClose}/>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{borderTop:`1px solid ${C.border}`,padding:"3px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <span style={{color:C.dim,fontSize:7,letterSpacing:2}}>DnR OFFICIAL © 2025</span>
            <span style={{color:C.dim,fontSize:7,letterSpacing:1}}>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
