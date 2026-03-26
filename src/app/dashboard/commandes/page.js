'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase'

const C = {
  bg:'#FFF8F3',header:'#1A1A2E',orange:'#FF6B35',orangeL:'#FFF0EA',
  white:'#FFFFFF',border:'#F0E8E0',textDark:'#1A1A2E',textGray:'#8A7E75',
  textLight:'#B5ADA6',green:'#22C55E',greenL:'#F0FDF4',red:'#EF4444',
  redL:'#FEF2F2',yellow:'#F59E0B',yellowL:'#FFFBEB',purple:'#8B5CF6',purpleL:'#F5F3FF',
  blue:'#3B82F6',blueL:'#EFF6FF',shadow:'rgba(26,26,46,0.08)',
};
const S={
  card:{background:C.white,borderRadius:16,border:`1px solid ${C.border}`,boxShadow:`0 2px 12px ${C.shadow}`},
  btn:(v='primary')=>({display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px 18px',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer',border:'none',transition:'all .18s',...(v==='primary'?{background:C.orange,color:C.white}:v==='ghost'?{background:'transparent',color:C.textGray,border:`1.5px solid ${C.border}`}:v==='danger'?{background:C.redL,color:C.red,border:`1.5px solid ${C.red}`}:v==='green'?{background:C.greenL,color:C.green,border:`1.5px solid ${C.green}`}:{background:C.orangeL,color:C.orange})}),
  input:{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,color:C.textDark,background:C.white,outline:'none',fontFamily:'system-ui, sans-serif',boxSizing:'border-box'},
  label:{fontSize:12,fontWeight:600,color:C.textGray,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6,display:'block'},
};

// ─── Statut config ────────────────────────────────────────────────────
const STATUTS = {
  en_attente:   {label:'En attente',   bg:'#FFF3CD',color:'#856404',  dot:'#F59E0B',icon:'⏳'},
  valide:       {label:'Validée',      bg:C.blueL,  color:C.blue,    dot:C.blue,   icon:'✅'},
  en_preparation:{label:'En cuisine',  bg:'#FFF0EA',color:C.orange,   dot:C.orange, icon:'🍳'},
  presque_pret: {label:'Presque prêt', bg:C.purpleL,color:C.purple,  dot:C.purple, icon:'🔔'},
  servi:        {label:'Servi',        bg:C.greenL,  color:C.green,   dot:C.green,  icon:'✓'},
  cloture:      {label:'Clôturée',     bg:'#F3F4F6',color:'#6B7280',  dot:'#9CA3AF',icon:'🏁'},
  annule:       {label:'Annulée',      bg:C.redL,    color:C.red,     dot:C.red,    icon:'✗'},
};

// Next status transitions (gérant)
const NEXT_STATUT = {
  en_attente:    {label:'Valider',         next:'valide',        style:'primary'},
  valide:        {label:'En préparation',  next:'en_preparation',style:'soft'},
  en_preparation:{label:'Presque prêt',   next:'presque_pret',  style:'soft'},
  presque_pret:  {label:'Servi',           next:'servi',         style:'green'},
  servi:         {label:'Clôturer & libérer table', next:'cloture', style:'primary'},
};

const FILTRES = [
  {id:'actif',  label:'En cours',  statuts:['en_attente','valide','en_preparation','presque_pret','servi']},
  {id:'cloture',label:'Clôturées', statuts:['cloture']},
  {id:'annule', label:'Annulées',  statuts:['annule']},
  {id:'all',    label:'Toutes',    statuts:null},
];

const MODES_PAIEMENT = ['especes','mobile_money','carte','offert'];
const MODES_LABEL = {especes:'Espèces',mobile_money:'Mobile Money',carte:'Carte',offert:'Offert'};

const Icon={
  close:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  refresh:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.44-4.22"/></svg>,
  home:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  menu:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  table:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  order:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  history:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.44-4.22"/></svg>,
  trash:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  bell:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  clock:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  live:<svg width="8" height="8" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#22C55E"/></svg>,
};

// ─── Chronomètre ─────────────────────────────────────────────────────
function Chrono({createdAt,statut}){
  const [elapsed,setElapsed]=useState('');
  useEffect(()=>{
    if(['cloture','annule'].includes(statut)){setElapsed('—');return;}
    const update=()=>{
      const diff=Date.now()-new Date(createdAt).getTime();
      const m=Math.floor(diff/60000);
      const h=Math.floor(m/60);
      setElapsed(h>0?`${h}h${String(m%60).padStart(2,'0')}`:`${m}min`);
    };
    update();
    const t=setInterval(update,30000);
    return()=>clearInterval(t);
  },[createdAt,statut]);
  const diff=(Date.now()-new Date(createdAt).getTime())/60000;
  const urgent=diff>30&&!['cloture','annule','servi'].includes(statut);
  return(<span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:12,fontWeight:700,color:urgent?C.red:C.textGray}}>{Icon.clock}{elapsed}</span>);
}

function BottomNav({active}){
  const router=useRouter();
  const items=[{id:'home',label:'Accueil',icon:Icon.home,path:'/dashboard'},{id:'menu',label:'Menu',icon:Icon.menu,path:'/dashboard/menu'},{id:'tables',label:'Tables',icon:Icon.table,path:'/dashboard/tables'},{id:'commandes',label:'Commandes',icon:Icon.order,path:'/dashboard/commandes'},{id:'historique',label:'Historique',icon:Icon.history,path:'/dashboard/historique'}];
  return(<nav style={{position:'fixed',bottom:0,left:0,right:0,zIndex:100,background:C.white,borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'stretch',paddingBottom:'env(safe-area-inset-bottom)'}}>{items.map(it=>(<button key={it.id} onClick={()=>router.push(it.path)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,padding:'10px 4px 8px',border:'none',background:'transparent',cursor:'pointer',color:active===it.id?C.orange:C.textLight,fontSize:10,fontWeight:600,fontFamily:'system-ui, sans-serif',position:'relative'}}><span style={{transform:active===it.id?'scale(1.15)':'scale(1)',transition:'transform .18s'}}>{it.icon}</span>{it.label}{active===it.id&&<span style={{width:4,height:4,borderRadius:'50%',background:C.orange,position:'absolute',bottom:6}}/>}</button>))}</nav>);
}

function Modal({open,onClose,title,children,fullHeight}){
  useEffect(()=>{document.body.style.overflow=open?'hidden':'';return()=>{document.body.style.overflow='';};},[open]);
  if(!open)return null;
  return(<div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(26,26,46,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>e.target===e.currentTarget&&onClose()}><div style={{background:C.white,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:520,maxHeight:fullHeight?'96vh':'88vh',display:'flex',flexDirection:'column',overflow:'hidden'}}><div style={{flexShrink:0,display:'flex',justifyContent:'center',padding:'12px 0 4px'}}><div style={{width:40,height:4,borderRadius:2,background:C.border}}/></div><div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 20px 12px'}}><h3 style={{margin:0,fontSize:18,fontWeight:700,color:C.textDark}}>{title}</h3><button onClick={onClose} style={{background:'transparent',border:`1.5px solid ${C.border}`,borderRadius:8,padding:'6px',cursor:'pointer',display:'flex'}}>{Icon.close}</button></div><div style={{flex:1,overflowY:'auto',padding:'0 20px 24px'}}>{children}</div></div></div>);
}

function Toast({msg,type}){
  if(!msg)return null;
  const bg=type==='error'?C.red:type==='warn'?C.yellow:C.green;
  return(<div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:999,background:bg,color:C.white,padding:'10px 20px',borderRadius:10,fontSize:14,fontWeight:600,boxShadow:'0 4px 20px rgba(0,0,0,0.2)'}}>{msg}</div>);
}

// ─── CommandeCard ─────────────────────────────────────────────────────
function CommandeCard({commande,items,tables,onOpen,appelServeur}){
  const st=STATUTS[commande.statut]||STATUTS.en_attente;
  const table=tables.find(t=>t.id===commande.table_id);
  const hasAppel=appelServeur.some(a=>a.table_id===commande.table_id&&!a.traite);
  return(
    <div onClick={()=>onOpen(commande)} style={{...S.card,padding:16,cursor:'pointer',borderLeft:`4px solid ${st.dot}`,position:'relative'}}>
      {/* Appel serveur badge */}
      {hasAppel&&(
        <div style={{position:'absolute',top:10,right:10,display:'flex',alignItems:'center',gap:4,background:C.yellowL,border:`1px solid ${C.yellow}`,borderRadius:999,padding:'2px 8px',fontSize:11,fontWeight:700,color:C.yellow}}>
          {Icon.bell} Appel
        </div>
      )}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.textDark}}>Table {table?.numero||'?'}</div>
          <div style={{fontSize:12,color:C.textGray}}>{table?.zone||''}</div>
        </div>
        <span style={{fontSize:12,fontWeight:700,background:st.bg,color:st.color,padding:'4px 10px',borderRadius:999}}>{st.icon} {st.label}</span>
      </div>
      {/* Items preview */}
      <div style={{fontSize:13,color:C.textGray,marginBottom:10}}>
        {items.slice(0,3).map(it=><div key={it.id} style={{display:'flex',justifyContent:'space-between'}}><span>× {it.quantite} {it.nom_plat}</span><span style={{fontWeight:600,color:C.textDark}}>{(it.prix_unitaire*it.quantite).toLocaleString('fr-CI')} F</span></div>)}
        {items.length>3&&<div style={{color:C.textLight,fontSize:12}}>+ {items.length-3} autre{items.length-3>1?'s':''} article{items.length-3>1?'s':''}</div>}
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <Chrono createdAt={commande.created_at} statut={commande.statut}/>
        <div style={{fontSize:16,fontWeight:800,color:C.orange}}>{Number(commande.total||0).toLocaleString('fr-CI')} F</div>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────
export default function CommandesPage(){
  const router=useRouter();
  const [restaurant,setRestaurant]=useState(null);
  const [commandes,setCommandes]=useState([]);
  const [itemsMap,setItemsMap]=useState({});
  const [tables,setTables]=useState([]);
  const [appels,setAppels]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [filtre,setFiltre]=useState('actif');
  const [selected,setSelected]=useState(null); // commande detail
  const [modalPaiement,setModalPaiement]=useState(false);
  const [modePaiement,setModePaiement]=useState('especes');

  const showToast=(msg,type='success',d=2500)=>{setToast({msg,type});setTimeout(()=>setToast(null),d);};

  const loadAll=useCallback(async(restaurantId)=>{
    const [
      {data:cmds},
      {data:its},
      {data:tabs},
      {data:ap},
    ]=await Promise.all([
      supabase.from('commandes').select('*').eq('restaurant_id',restaurantId).order('created_at',{ascending:false}).limit(100),
      supabase.from('commande_items').select('*').in('commande_id',(await supabase.from('commandes').select('id').eq('restaurant_id',restaurantId).limit(100)).data?.map(c=>c.id)||[]),
      supabase.from('tables').select('*').eq('restaurant_id',restaurantId),
      supabase.from('appels_serveur').select('*').eq('restaurant_id',restaurantId).eq('traite',false),
    ]);
    setCommandes(cmds||[]);
    const map={};
    (its||[]).forEach(it=>{if(!map[it.commande_id])map[it.commande_id]=[];map[it.commande_id].push(it);});
    setItemsMap(map);
    setTables(tabs||[]);
    setAppels(ap||[]);
  },[]);

  useEffect(()=>{
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){router.push('/auth/login');return;}
      const {data:profile}=await supabase.from('profiles').select('restaurant_id').eq('id',session.user.id).single();
      if(!profile){router.push('/auth/login');return;}
      const {data:resto}=await supabase.from('restaurants').select('*').eq('id',profile.restaurant_id).single();
      setRestaurant(resto);
      await loadAll(profile.restaurant_id);
      setLoading(false);

      // Realtime
      const ch=supabase.channel('commandes-rt')
        .on('postgres_changes',{event:'*',schema:'public',table:'commandes',filter:`restaurant_id=eq.${profile.restaurant_id}`},()=>loadAll(profile.restaurant_id))
        .on('postgres_changes',{event:'*',schema:'public',table:'commande_items'},()=>loadAll(profile.restaurant_id))
        .on('postgres_changes',{event:'*',schema:'public',table:'appels_serveur',filter:`restaurant_id=eq.${profile.restaurant_id}`},()=>loadAll(profile.restaurant_id))
        .subscribe();
      return()=>supabase.removeChannel(ch);
    })();
  },[loadAll]);

  // ── Filtered commandes ──
  const filtreConfig=FILTRES.find(f=>f.id===filtre);
  const filtered=commandes.filter(c=>!filtreConfig.statuts||filtreConfig.statuts.includes(c.statut));

  // ── Stats ──
  const stats={
    enAttente:commandes.filter(c=>c.statut==='en_attente').length,
    enCours:commandes.filter(c=>['valide','en_preparation','presque_pret'].includes(c.statut)).length,
    servis:commandes.filter(c=>c.statut==='servi').length,
    appels:appels.length,
  };

  // ── Avancer statut ──
  const advanceStatut=async(commande)=>{
    const next=NEXT_STATUT[commande.statut];
    if(!next)return;
    setSaving(true);
    const update={statut:next.next};
    if(next.next==='valide')update.validated_at=new Date().toISOString();
    if(next.next==='servi')update.served_at=new Date().toISOString();

    if(next.next==='cloture'){
      // Clôture → demander mode paiement
      setSaving(false);
      setModalPaiement(true);
      return;
    }

    const {error}=await supabase.from('commandes').update(update).eq('id',commande.id);
    if(!error){
      setCommandes(cs=>cs.map(c=>c.id===commande.id?{...c,...update}:c));
      if(selected?.id===commande.id)setSelected(s=>({...s,...update}));
      showToast(`Commande → ${STATUTS[next.next].label}`);
    }
    setSaving(false);
  };

  const cloturerCommande=async()=>{
    if(!selected)return;
    setSaving(true);
    const update={statut:'cloture',mode_paiement:modePaiement,paye:true};
    const {error}=await supabase.from('commandes').update(update).eq('id',selected.id);
    if(!error){
      // Libérer la table
      await supabase.from('tables').update({statut:'libre'}).eq('id',selected.table_id);
      setCommandes(cs=>cs.map(c=>c.id===selected.id?{...c,...update}:c));
      setTables(ts=>ts.map(t=>t.id===selected.table_id?{...t,statut:'libre'}:t));
      setSelected(s=>({...s,...update}));
      showToast('Commande clôturée, table libérée ✓');
      setModalPaiement(false);
      setSelected(null);
    }
    setSaving(false);
  };

  const annulerCommande=async(commande)=>{
    if(!confirm('Annuler cette commande ?'))return;
    const {error}=await supabase.from('commandes').update({statut:'annule'}).eq('id',commande.id);
    if(!error){
      setCommandes(cs=>cs.map(c=>c.id===commande.id?{...c,statut:'annule'}:c));
      if(selected?.id===commande.id)setSelected(s=>({...s,statut:'annule'}));
      showToast('Commande annulée','warn');
    }
  };

  const supprimerItem=async(itemId,commandeId)=>{
    const {error}=await supabase.from('commande_items').delete().eq('id',itemId);
    if(!error){
      setItemsMap(m=>{
        const newItems=(m[commandeId]||[]).filter(i=>i.id!==itemId);
        const newTotal=newItems.reduce((a,i)=>a+i.prix_unitaire*i.quantite,0);
        supabase.from('commandes').update({total:newTotal}).eq('id',commandeId);
        if(selected?.id===commandeId)setSelected(s=>({...s,total:newTotal}));
        return{...m,[commandeId]:newItems};
      });
      showToast('Article supprimé','warn');
    }
  };

  const traiterAppel=async(tableId)=>{
    await supabase.from('appels_serveur').update({traite:true}).eq('table_id',tableId).eq('traite',false);
    setAppels(a=>a.filter(x=>x.table_id!==tableId));
    showToast('Appel traité ✓');
  };

  if(loading)return(<div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:14,color:C.textGray}}>Chargement des commandes…</div></div>);

  const selectedItems=selected?itemsMap[selected.id]||[]:[];
  const selectedTable=selected?tables.find(t=>t.id===selected.table_id):null;
  const selectedSt=selected?STATUTS[selected.statut]:null;
  const selectedNext=selected?NEXT_STATUT[selected.statut]:null;

  return(
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:'system-ui, sans-serif',paddingBottom:80}}>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}

      {/* Header */}
      <div style={{background:C.header,padding:'16px 20px 20px',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>Temps réel</div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.white}}>Commandes</h1>
              <span style={{display:'flex',alignItems:'center',gap:5,background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:999,padding:'3px 10px'}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:C.green,boxShadow:`0 0 0 3px rgba(34,197,94,0.3)`,animation:'pulse 1.5s infinite'}}/>
                <span style={{fontSize:11,fontWeight:700,color:C.green}}>LIVE</span>
              </span>
            </div>
          </div>
          <button onClick={()=>restaurant&&loadAll(restaurant.id)} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:8,padding:'8px',cursor:'pointer',color:C.white,display:'flex'}}>{Icon.refresh}</button>
        </div>

        {/* Stats */}
        <div style={{display:'flex',gap:10,marginTop:16}}>
          {[
            {label:'En attente',value:stats.enAttente,color:C.yellow,bg:'rgba(245,158,11,0.15)'},
            {label:'En cours',  value:stats.enCours,  color:C.orange,bg:'rgba(255,107,53,0.15)'},
            {label:'Servis',    value:stats.servis,   color:C.green, bg:'rgba(34,197,94,0.15)'},
            {label:'Appels',    value:stats.appels,   color:C.red,   bg:'rgba(239,68,68,0.15)'},
          ].map(s=>(
            <div key={s.label} style={{flex:1,background:s.bg,borderRadius:10,padding:'8px 6px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',fontWeight:600}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Appels serveur banner */}
      {appels.length>0&&(
        <div style={{margin:'12px 16px 0',background:C.yellowL,border:`1.5px solid ${C.yellow}`,borderRadius:12,padding:'12px 14px'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#92400E',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>{Icon.bell} {appels.length} appel{appels.length>1?'s':''} serveur</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {appels.map(a=>{
              const t=tables.find(x=>x.id===a.table_id);
              return(<div key={a.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:13,color:'#92400E'}}>Table {t?.numero||'?'} {t?.zone?`(${t.zone})`:''}</span>
                <button onClick={()=>traiterAppel(a.table_id)} style={{...S.btn('ghost'),padding:'4px 10px',fontSize:12}}>Traité ✓</button>
              </div>);
            })}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{padding:'12px 0 4px',overflowX:'auto',display:'flex',gap:8,paddingLeft:16,paddingRight:16,scrollbarWidth:'none'}}>
        {FILTRES.map(f=>(
          <button key={f.id} onClick={()=>setFiltre(f.id)} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:999,fontSize:13,fontWeight:600,cursor:'pointer',border:`1.5px solid ${filtre===f.id?C.orange:C.border}`,background:filtre===f.id?C.orange:C.white,color:filtre===f.id?C.white:C.textGray,whiteSpace:'nowrap'}}>
            {f.label}
            <span style={{fontSize:11,opacity:0.8}}>({commandes.filter(c=>!f.statuts||f.statuts.includes(c.statut)).length})</span>
          </button>
        ))}
      </div>

      {/* Liste commandes */}
      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:10}}>
        {filtered.length===0?(
          <div style={{...S.card,padding:40,textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12}}>📋</div>
            <div style={{fontWeight:700,color:C.textDark,marginBottom:6}}>Aucune commande</div>
            <div style={{fontSize:13,color:C.textGray}}>
              {filtre==='actif'?'Aucune commande en cours pour l\'instant.':'Aucune commande dans cette catégorie.'}
            </div>
          </div>
        ):filtered.map(cmd=>(
          <CommandeCard key={cmd.id} commande={cmd} items={itemsMap[cmd.id]||[]} tables={tables} onOpen={setSelected} appelServeur={appels}/>
        ))}
      </div>

      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)}50%{box-shadow:0 0 0 6px rgba(34,197,94,0)}}`}</style>

      {/* ── Modal détail commande ── */}
      <Modal open={!!selected} onClose={()=>setSelected(null)} title={`Commande — Table ${selectedTable?.numero||'?'}`} fullHeight>
        {selected&&(
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {/* Statut + chrono */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:selectedSt?.bg,borderRadius:12,border:`1px solid ${selectedSt?.dot}`}}>
              <span style={{fontSize:14,fontWeight:700,color:selectedSt?.color}}>{selectedSt?.icon} {selectedSt?.label}</span>
              <Chrono createdAt={selected.created_at} statut={selected.statut}/>
            </div>

            {/* Infos table */}
            <div style={{display:'flex',gap:10}}>
              <div style={{flex:1,background:C.bg,borderRadius:10,padding:'10px 12px',textAlign:'center'}}><div style={{fontSize:11,color:C.textGray,fontWeight:600}}>Table</div><div style={{fontSize:16,fontWeight:800,color:C.textDark}}>{selectedTable?.numero||'?'}</div></div>
              <div style={{flex:1,background:C.bg,borderRadius:10,padding:'10px 12px',textAlign:'center'}}><div style={{fontSize:11,color:C.textGray,fontWeight:600}}>Zone</div><div style={{fontSize:16,fontWeight:800,color:C.textDark}}>{selectedTable?.zone||'—'}</div></div>
              <div style={{flex:1,background:C.bg,borderRadius:10,padding:'10px 12px',textAlign:'center'}}><div style={{fontSize:11,color:C.textGray,fontWeight:600}}>Articles</div><div style={{fontSize:16,fontWeight:800,color:C.textDark}}>{selectedItems.length}</div></div>
            </div>

            {/* Items */}
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.textGray,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Articles commandés</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {selectedItems.map(it=>(
                  <div key={it.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:C.bg,borderRadius:10}}>
                    <div style={{width:28,height:28,borderRadius:8,background:C.orangeL,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:C.orange,flexShrink:0}}>×{it.quantite}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:C.textDark,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.nom_plat}</div>
                      {it.note&&<div style={{fontSize:11,color:C.textGray,fontStyle:'italic'}}>{it.note}</div>}
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:C.textDark,flexShrink:0}}>{(it.prix_unitaire*it.quantite).toLocaleString('fr-CI')} F</div>
                    {/* Supprimer item seulement si en_attente ou valide */}
                    {['en_attente','valide'].includes(selected.statut)&&(
                      <button onClick={()=>supprimerItem(it.id,selected.id)} style={{background:C.redL,border:'none',borderRadius:6,padding:'4px',cursor:'pointer',color:C.red,display:'flex'}}>{Icon.trash}</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:C.textDark,borderRadius:12}}>
              <span style={{fontSize:14,fontWeight:600,color:'rgba(255,255,255,0.7)'}}>Total</span>
              <span style={{fontSize:22,fontWeight:800,color:C.white}}>{Number(selected.total||0).toLocaleString('fr-CI')} FCFA</span>
            </div>

            {/* Actions statut */}
            {selectedNext&&(
              <button onClick={()=>advanceStatut(selected)} disabled={saving} style={{...S.btn(selectedNext.style==='green'?'green':'primary'),width:'100%',padding:'14px',fontSize:15}}>
                {saving?'…':selectedNext.label}
              </button>
            )}
            {!['cloture','annule'].includes(selected.statut)&&(
              <button onClick={()=>annulerCommande(selected)} style={{...S.btn('danger'),width:'100%',padding:'12px'}}>Annuler la commande</button>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal paiement ── */}
      <Modal open={modalPaiement} onClose={()=>setModalPaiement(false)} title="Mode de paiement">
        <div style={{display:'flex',flexDirection:'column',gap:14,paddingBottom:8}}>
          <div style={{fontSize:13,color:C.textGray}}>Sélectionnez le mode de paiement pour clôturer et libérer la table.</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {MODES_PAIEMENT.map(m=>(
              <button key={m} onClick={()=>setModePaiement(m)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderRadius:12,border:`2px solid ${modePaiement===m?C.orange:C.border}`,background:modePaiement===m?C.orangeL:C.white,cursor:'pointer'}}>
                <span style={{fontSize:15,fontWeight:600,color:C.textDark}}>{MODES_LABEL[m]}</span>
                {modePaiement===m&&<span style={{width:20,height:20,borderRadius:'50%',background:C.orange,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:C.white}}>✓</span>}
              </button>
            ))}
          </div>
          {selected&&<div style={{padding:'12px 14px',background:C.textDark,borderRadius:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{color:'rgba(255,255,255,0.7)',fontSize:14}}>Total à encaisser</span><span style={{color:C.white,fontWeight:800,fontSize:18}}>{Number(selected.total||0).toLocaleString('fr-CI')} F</span></div>}
          <button onClick={cloturerCommande} disabled={saving} style={{...S.btn('primary'),width:'100%',padding:'14px',fontSize:15}}>
            {saving?'Clôture en cours…':'Confirmer & Clôturer'}
          </button>
        </div>
      </Modal>

      <BottomNav active="commandes"/>
    </div>
  );
}