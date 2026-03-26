'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase'

const C = {
  bg:'#FFF8F3',header:'#1A1A2E',orange:'#FF6B35',orangeL:'#FFF0EA',
  white:'#FFFFFF',border:'#F0E8E0',textDark:'#1A1A2E',textGray:'#8A7E75',
  textLight:'#B5ADA6',green:'#22C55E',greenL:'#F0FDF4',red:'#EF4444',
  redL:'#FEF2F2',yellow:'#F59E0B',yellowL:'#FFFBEB',shadow:'rgba(26,26,46,0.08)',
  purple:'#8B5CF6',purpleL:'#F5F3FF',
};

const S = {
  card:{background:C.white,borderRadius:16,border:`1px solid ${C.border}`,boxShadow:`0 2px 12px ${C.shadow}`},
  btn:(v='primary')=>({
    display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,
    padding:'9px 16px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',border:'none',transition:'all .18s',
    ...(v==='primary'?{background:C.orange,color:C.white}
      :v==='ghost'?{background:'transparent',color:C.textGray,border:`1.5px solid ${C.border}`}
      :{background:C.orangeL,color:C.orange}),
  }),
  input:{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,color:C.textDark,background:C.white,outline:'none',fontFamily:'system-ui, sans-serif',boxSizing:'border-box'},
  label:{fontSize:12,fontWeight:600,color:C.textGray,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6,display:'block'},
};

const Icon = {
  home:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  menu:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  table:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  order:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>,
  history:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.44-4.22"/></svg>,
  download:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  trend:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  calendar:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  close:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

function BottomNav({active}){
  const router=useRouter();
  const items=[
    {id:'home',label:'Accueil',icon:Icon.home,path:'/dashboard'},
    {id:'menu',label:'Menu',icon:Icon.menu,path:'/dashboard/menu'},
    {id:'tables',label:'Tables',icon:Icon.table,path:'/dashboard/tables'},
    {id:'commandes',label:'Commandes',icon:Icon.order,path:'/dashboard/commandes'},
    {id:'historique',label:'Historique',icon:Icon.history,path:'/dashboard/historique'},
  ];
  return(
    <nav style={{position:'fixed',bottom:0,left:0,right:0,zIndex:100,background:C.white,borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'stretch',paddingBottom:'env(safe-area-inset-bottom)'}}>
      {items.map(it=>(
        <button key={it.id} onClick={()=>router.push(it.path)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,padding:'10px 4px 8px',border:'none',background:'transparent',cursor:'pointer',color:active===it.id?C.orange:C.textLight,fontSize:10,fontWeight:600,fontFamily:'system-ui, sans-serif',position:'relative'}}>
          <span style={{transform:active===it.id?'scale(1.15)':'scale(1)',transition:'transform .18s'}}>{it.icon}</span>
          {it.label}
          {active===it.id&&<span style={{width:4,height:4,borderRadius:'50%',background:C.orange,position:'absolute',bottom:6}}/>}
        </button>
      ))}
    </nav>
  );
}

// ─── Mini bar chart (CSS only) ────────────────────────────────────────
function BarChart({data}){
  if(!data||data.length===0)return null;
  const max=Math.max(...data.map(d=>d.total),1);
  const today=new Date().toISOString().slice(0,10);
  return(
    <div style={{display:'flex',alignItems:'flex-end',gap:4,height:80,padding:'0 4px'}}>
      {data.slice(-14).map((d,i)=>{
        const h=Math.max((d.total/max)*70,2);
        const isToday=d.date===today;
        return(
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <div style={{width:'100%',height:h,borderRadius:'4px 4px 0 0',background:isToday?C.orange:'rgba(255,107,53,0.25)',minHeight:2}}/>
            <span style={{fontSize:8,color:isToday?C.orange:C.textLight,fontWeight:isToday?700:400}}>
              {new Date(d.date).getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Export CSV ───────────────────────────────────────────────────────
function exportCSV(commandes, tables){
  const rows=[['Date','Heure','Table','Total (FCFA)','Mode paiement','Statut']];
  commandes.forEach(c=>{
    const t=tables.find(x=>x.id===c.table_id);
    const dt=new Date(c.created_at);
    rows.push([
      dt.toLocaleDateString('fr-CI'),
      dt.toLocaleTimeString('fr-CI',{hour:'2-digit',minute:'2-digit'}),
      `Table ${t?.numero||'?'}`,
      c.total||0,
      c.mode_paiement||'—',
      c.statut,
    ]);
  });
  const csv=rows.map(r=>r.join(';')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`maquisapp_historique_${new Date().toISOString().slice(0,10)}.csv`;a.click();
  URL.revokeObjectURL(url);
}

// ─── Helpers ──────────────────────────────────────────────────────────
function fmtCFA(n){return Number(n||0).toLocaleString('fr-CI')+' F';}
function fmtDate(d){return new Date(d).toLocaleDateString('fr-CI',{day:'2-digit',month:'short'});}
function fmtTime(d){return new Date(d).toLocaleTimeString('fr-CI',{hour:'2-digit',minute:'2-digit'});}

const PERIODS=[
  {id:'today',label:"Aujourd'hui"},
  {id:'week',label:'7 jours'},
  {id:'month',label:'30 jours'},
  {id:'custom',label:'Personnalisé'},
];

function getPeriodRange(period,customFrom,customTo){
  const now=new Date();
  const todayStr=now.toISOString().slice(0,10);
  if(period==='today') return{from:todayStr,to:todayStr};
  if(period==='week'){
    const f=new Date(now);f.setDate(f.getDate()-6);
    return{from:f.toISOString().slice(0,10),to:todayStr};
  }
  if(period==='month'){
    const f=new Date(now);f.setDate(f.getDate()-29);
    return{from:f.toISOString().slice(0,10),to:todayStr};
  }
  return{from:customFrom||todayStr,to:customTo||todayStr};
}

export default function HistoriquePage(){
  const router=useRouter();
  const [restaurant,setRestaurant]=useState(null);
  const [tables,setTables]=useState([]);
  const [commandes,setCommandes]=useState([]);
  const [loading,setLoading]=useState(true);
  const [period,setPeriod]=useState('today');
  const [customFrom,setCustomFrom]=useState('');
  const [customTo,setCustomTo]=useState('');
  const [showCustom,setShowCustom]=useState(false);

  useEffect(()=>{
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){router.push('/auth/login');return;}
      const {data:profile}=await supabase.from('profiles').select('restaurant_id').eq('id',session.user.id).single();
      if(!profile){router.push('/auth/login');return;}
      const {data:resto}=await supabase.from('restaurants').select('*').eq('id',profile.restaurant_id).single();
      setRestaurant(resto);
      const {data:ts}=await supabase.from('tables').select('*').eq('restaurant_id',profile.restaurant_id);
      setTables(ts||[]);
      setLoading(false);
    })();
  },[]);

  // Load commandes when period changes
  useEffect(()=>{
    if(!restaurant)return;
    const {from,to}=getPeriodRange(period,customFrom,customTo);
    const fromDt=from+'T00:00:00';
    const toDt=to+'T23:59:59';
    supabase.from('commandes')
      .select('*')
      .eq('restaurant_id',restaurant.id)
      .eq('statut','cloture')
      .gte('created_at',fromDt)
      .lte('created_at',toDt)
      .order('created_at',{ascending:false})
      .then(({data})=>setCommandes(data||[]));
  },[restaurant,period,customFrom,customTo]);

  // ── Compute stats ──
  const ca=commandes.reduce((s,c)=>s+(c.total||0),0);
  const nbCommandes=commandes.length;
  const panier=nbCommandes>0?ca/nbCommandes:0;
  const paye=commandes.filter(c=>c.paye).reduce((s,c)=>s+(c.total||0),0);
  const nonPaye=ca-paye;

  // Modes paiement
  const modes={};
  commandes.forEach(c=>{
    const m=c.mode_paiement||'non spécifié';
    modes[m]=(modes[m]||0)+1;
  });

  // Bar chart data (group by day)
  const byDay={};
  commandes.forEach(c=>{
    const d=c.created_at.slice(0,10);
    byDay[d]=(byDay[d]||0)+(c.total||0);
  });
  const {from,to}=getPeriodRange(period,customFrom,customTo);
  const chartData=[];
  const cur=new Date(from);
  const end=new Date(to);
  while(cur<=end){
    const d=cur.toISOString().slice(0,10);
    chartData.push({date:d,total:byDay[d]||0});
    cur.setDate(cur.getDate()+1);
  }

  if(loading)return(<div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:14,color:C.textGray}}>Chargement…</div></div>);

  return(
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:'system-ui, sans-serif',paddingBottom:80}}>
      {/* Header */}
      <div style={{background:C.header,padding:'16px 20px 20px',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>Rapports</div>
            <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.white}}>Historique</h1>
          </div>
          <button onClick={()=>exportCSV(commandes,tables)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,border:`1.5px solid rgba(255,255,255,0.2)`,background:'transparent',color:C.white,fontSize:13,fontWeight:600,cursor:'pointer'}}>
            {Icon.download} Export CSV
          </button>
        </div>

        {/* Period selector */}
        <div style={{display:'flex',gap:6,marginTop:14,overflowX:'auto',scrollbarWidth:'none'}}>
          {PERIODS.map(p=>(
            <button key={p.id} onClick={()=>{setPeriod(p.id);setShowCustom(p.id==='custom');}} style={{
              padding:'6px 14px',borderRadius:999,border:`1.5px solid ${period===p.id?C.orange:'rgba(255,255,255,0.2)'}`,
              background:period===p.id?C.orange:'transparent',color:C.white,
              fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,
            }}>{p.label}</button>
          ))}
        </div>

        {/* Custom dates */}
        {showCustom&&(
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <input type="date" style={{...S.input,flex:1,fontSize:13,padding:'8px 10px'}} value={customFrom} onChange={e=>setCustomFrom(e.target.value)}/>
            <span style={{color:'rgba(255,255,255,0.5)',alignSelf:'center'}}>→</span>
            <input type="date" style={{...S.input,flex:1,fontSize:13,padding:'8px 10px'}} value={customTo} onChange={e=>setCustomTo(e.target.value)}/>
          </div>
        )}
      </div>

      <div style={{padding:'16px 16px',display:'flex',flexDirection:'column',gap:14}}>

        {/* CA principal */}
        <div style={{...S.card,padding:20,background:C.header}}>
          <div style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>Chiffre d'affaires</div>
          <div style={{fontSize:32,fontWeight:800,color:C.white,marginBottom:2}}>{fmtCFA(ca)}</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>{nbCommandes} commande{nbCommandes!==1?'s':''} clôturée{nbCommandes!==1?'s':''}</div>
          {/* Chart */}
          {chartData.length>1&&(
            <div style={{marginTop:16}}>
              <BarChart data={chartData}/>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            {label:'Panier moyen',value:fmtCFA(panier),color:C.purple,bg:C.purpleL},
            {label:'Encaissé',value:fmtCFA(paye),color:C.green,bg:C.greenL},
            {label:'Non encaissé',value:fmtCFA(nonPaye),color:nonPaye>0?C.red:C.textGray,bg:nonPaye>0?C.redL:C.bg},
            {label:'Commandes/jour',value:period==='today'?nbCommandes:(chartData.length>0?(nbCommandes/chartData.length).toFixed(1):0),color:C.orange,bg:C.orangeL},
          ].map(k=>(
            <div key={k.label} style={{...S.card,padding:14,background:k.bg,border:`1px solid ${k.color}22`}}>
              <div style={{fontSize:11,fontWeight:600,color:C.textGray,marginBottom:4}}>{k.label}</div>
              <div style={{fontSize:18,fontWeight:800,color:k.color}}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Modes paiement */}
        {Object.keys(modes).length>0&&(
          <div style={S.card}>
            <div style={{padding:'14px 16px',borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:14,fontWeight:700,color:C.textDark}}>Modes de paiement</div>
            </div>
            <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:8}}>
              {Object.entries(modes).sort((a,b)=>b[1]-a[1]).map(([m,n])=>(
                <div key={m} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,flex:1}}>
                    <span style={{fontSize:13,color:C.textDark,textTransform:'capitalize'}}>{m}</span>
                    <div style={{flex:1,height:6,background:C.bg,borderRadius:999,overflow:'hidden',maxWidth:120}}>
                      <div style={{height:'100%',background:C.orange,borderRadius:999,width:`${(n/nbCommandes)*100}%`}}/>
                    </div>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:C.textDark,marginLeft:8}}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste commandes */}
        <div style={S.card}>
          <div style={{padding:'14px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{fontSize:14,fontWeight:700,color:C.textDark}}>Détail</div>
            <span style={{fontSize:12,color:C.textGray}}>{commandes.length} entrées</span>
          </div>
          {commandes.length===0?(
            <div style={{padding:24,textAlign:'center',color:C.textGray,fontSize:13}}>Aucune commande clôturée sur cette période</div>
          ):(
            <div style={{display:'flex',flexDirection:'column'}}>
              {commandes.map((c,i)=>{
                const t=tables.find(x=>x.id===c.table_id);
                return(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:i<commandes.length-1?`1px solid ${C.border}`:'none'}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:C.textDark}}>Table {t?.numero||'?'}</div>
                      <div style={{fontSize:11,color:C.textGray,display:'flex',gap:6,marginTop:1}}>
                        <span>{Icon.calendar} {fmtDate(c.created_at)}</span>
                        <span>· {fmtTime(c.created_at)}</span>
                        {c.mode_paiement&&<span>· {c.mode_paiement}</span>}
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:14,fontWeight:700,color:C.orange}}>{fmtCFA(c.total)}</div>
                      <div style={{fontSize:11,fontWeight:600,color:c.paye?C.green:C.red}}>{c.paye?'Payée':'Non payée'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <BottomNav active="historique"/>
    </div>
  );
}