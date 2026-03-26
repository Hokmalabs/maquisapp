'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

// URL de base de l'app — définie dans .env.local et sur Vercel
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

const C = {
  bg:'#FFF8F3',header:'#1A1A2E',orange:'#FF6B35',orangeL:'#FFF0EA',
  white:'#FFFFFF',border:'#F0E8E0',textDark:'#1A1A2E',textGray:'#8A7E75',
  textLight:'#B5ADA6',green:'#22C55E',greenL:'#F0FDF4',red:'#EF4444',
  redL:'#FEF2F2',yellow:'#F59E0B',shadow:'rgba(26,26,46,0.08)',
};
const S={
  card:{background:C.white,borderRadius:16,border:`1px solid ${C.border}`,boxShadow:`0 2px 12px ${C.shadow}`},
  btn:(v='primary')=>({display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px 18px',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer',border:'none',transition:'all .18s',...(v==='primary'?{background:C.orange,color:C.white}:v==='ghost'?{background:'transparent',color:C.textGray,border:`1.5px solid ${C.border}`}:v==='danger'?{background:C.redL,color:C.red,border:`1.5px solid ${C.red}`}:{background:C.orangeL,color:C.orange})}),
  input:{width:'100%',padding:'10px 14px',borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,color:C.textDark,background:C.white,outline:'none',fontFamily:'system-ui, sans-serif',boxSizing:'border-box'},
  label:{fontSize:12,fontWeight:600,color:C.textGray,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6,display:'block'},
};

const ZONES=['Salle','Terrasse','Bar','VIP','Extérieur'];
const ZONE_COLORS={'Salle':{bg:'#EFF6FF',color:'#3B82F6'},'Terrasse':{bg:'#F0FDF4',color:'#22C55E'},'Bar':{bg:'#FFF7ED',color:'#F97316'},'VIP':{bg:'#FDF4FF',color:'#A855F7'},'Extérieur':{bg:'#FFFBEB',color:'#F59E0B'}};
const zoneStyle=(z)=>ZONE_COLORS[z]||{bg:C.orangeL,color:C.orange};

const Icon={
  plus:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  close:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  qr:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="5" y="5" width="3" height="3" fill="currentColor"/><rect x="16" y="5" width="3" height="3" fill="currentColor"/><rect x="5" y="16" width="3" height="3" fill="currentColor"/></svg>,
  download:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  users:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  home:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  menu:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  table:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  order:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  history:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.44-4.22"/></svg>,
};

function BottomNav({active}){
  const router=useRouter();
  const items=[{id:'home',label:'Accueil',icon:Icon.home,path:'/dashboard'},{id:'menu',label:'Menu',icon:Icon.menu,path:'/dashboard/menu'},{id:'tables',label:'Tables',icon:Icon.table,path:'/dashboard/tables'},{id:'commandes',label:'Commandes',icon:Icon.order,path:'/dashboard/commandes'},{id:'historique',label:'Historique',icon:Icon.history,path:'/dashboard/historique'}];
  return(<nav style={{position:'fixed',bottom:0,left:0,right:0,zIndex:100,background:C.white,borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'stretch',paddingBottom:'env(safe-area-inset-bottom)'}}>{items.map(it=>(<button key={it.id} onClick={()=>router.push(it.path)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,padding:'10px 4px 8px',border:'none',background:'transparent',cursor:'pointer',color:active===it.id?C.orange:C.textLight,fontSize:10,fontWeight:600,fontFamily:'system-ui, sans-serif',position:'relative'}}><span style={{transform:active===it.id?'scale(1.15)':'scale(1)',transition:'transform .18s'}}>{it.icon}</span>{it.label}{active===it.id&&<span style={{width:4,height:4,borderRadius:'50%',background:C.orange,position:'absolute',bottom:6}}/>}</button>))}</nav>);
}

function Modal({open,onClose,title,children}){
  useEffect(()=>{document.body.style.overflow=open?'hidden':'';return()=>{document.body.style.overflow='';};},[open]);
  if(!open)return null;
  return(<div style={{position:'fixed',inset:0,zIndex:200,background:'rgba(26,26,46,0.55)',backdropFilter:'blur(4px)',display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>e.target===e.currentTarget&&onClose()}><div style={{background:C.white,borderRadius:'20px 20px 0 0',width:'100%',maxWidth:480,maxHeight:'92vh',overflowY:'auto',padding:'0 0 32px'}}><div style={{display:'flex',justifyContent:'center',padding:'12px 0 4px'}}><div style={{width:40,height:4,borderRadius:2,background:C.border}}/></div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 20px 16px'}}><h3 style={{margin:0,fontSize:18,fontWeight:700,color:C.textDark}}>{title}</h3><button onClick={onClose} style={{...S.btn('ghost'),padding:'6px',borderRadius:8}}>{Icon.close}</button></div><div style={{padding:'0 20px'}}>{children}</div></div></div>);
}

function Toast({msg,type}){
  if(!msg)return null;
  const bg=type==='error'?C.red:type==='warn'?C.yellow:C.green;
  return(<div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:999,background:bg,color:C.white,padding:'10px 20px',borderRadius:10,fontSize:14,fontWeight:600,boxShadow:'0 4px 20px rgba(0,0,0,0.2)'}}>{msg}</div>);
}

function QRCodeDisplay({url,size=200}){
  const src=`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=1A1A2E&margin=10`;
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
      <div style={{padding:12,background:C.white,borderRadius:12,border:`1px solid ${C.border}`,boxShadow:`0 2px 12px ${C.shadow}`}}>
        <img src={src} alt="QR" width={size} height={size} style={{display:'block',borderRadius:4}}/>
      </div>
      <div style={{fontSize:11,color:C.textGray,textAlign:'center',wordBreak:'break-all',maxWidth:260}}>{url}</div>
    </div>
  );
}

export default function TablesPage(){
  const router=useRouter();
  const [restaurant,setRestaurant]=useState(null);
  const [tables,setTables]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState(null);
  const [filterZone,setFilterZone]=useState(null);
  const [modalTable,setModalTable]=useState(false);
  const [editTable,setEditTable]=useState(null);
  const [deleteTable,setDeleteTable]=useState(null);
  const [qrModal,setQrModal]=useState(null);
  const [form,setForm]=useState({numero:'',capacite:'2',zone:'Salle'});
  const setF=(k,v)=>setForm(f=>({...f,[k]:v}));
  const showToast=(msg,type='success',d=2500)=>{setToast({msg,type});setTimeout(()=>setToast(null),d);};

  useEffect(()=>{
    (async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){router.push('/auth/login');return;}
      const {data:profile}=await supabase.from('profiles').select('restaurant_id').eq('id',session.user.id).single();
      if(!profile){router.push('/auth/login');return;}
      const {data:resto}=await supabase.from('restaurants').select('*').eq('id',profile.restaurant_id).single();
      setRestaurant(resto);
      const {data:t}=await supabase.from('tables').select('*').eq('restaurant_id',profile.restaurant_id).order('numero');
      setTables(t||[]);
      setLoading(false);
    })();
  },[]);

  const openCreate=()=>{
    const nextNum=tables.length>0?Math.max(...tables.map(t=>parseInt(t.numero)||0))+1:1;
    setForm({numero:String(nextNum),capacite:'2',zone:'Salle'});
    setEditTable(null);setModalTable(true);
  };
  const openEdit=(t)=>{setForm({numero:String(t.numero),capacite:String(t.capacite),zone:t.zone||'Salle'});setEditTable(t);setModalTable(true);};

  const saveTable=async()=>{
    if(!form.numero.trim()){showToast('Numéro requis','error');return;}
    setSaving(true);
    const payload={numero:form.numero.trim(),capacite:parseInt(form.capacite)||2,zone:form.zone,restaurant_id:restaurant.id};
    if(editTable){
      const {error}=await supabase.from('tables').update(payload).eq('id',editTable.id);
      if(!error){setTables(ts=>ts.map(t=>t.id===editTable.id?{...t,...payload}:t));showToast('Table modifiée');}
    } else {
      const {data,error}=await supabase.from('tables').insert({...payload,statut:'libre',actif:true}).select().single();
      if(!error){
        // ✅ Correction : utiliser APP_URL (variable d'env) au lieu de window.location.origin
        const full_url=`${APP_URL}/menu/${restaurant.slug}/${data.id}`;
        await supabase.from('tables').update({qr_code_url:full_url}).eq('id',data.id);
        setTables(ts=>[...ts,{...data,qr_code_url:full_url}]);
        showToast('Table créée');
      } else showToast(error.message,'error');
    }
    setSaving(false);setModalTable(false);setEditTable(null);
  };

  const toggleActif=async(t)=>{
    const next=!t.actif;
    const {error}=await supabase.from('tables').update({actif:next}).eq('id',t.id);
    if(!error){setTables(ts=>ts.map(x=>x.id===t.id?{...x,actif:next}:x));showToast(next?'Table activée':'Table désactivée',next?'success':'warn');}
  };

  const confirmDelete=async()=>{
    const {error}=await supabase.from('tables').delete().eq('id',deleteTable.id);
    if(!error){setTables(ts=>ts.filter(t=>t.id!==deleteTable.id));showToast('Table supprimée','warn');}
    setDeleteTable(null);
  };

  const downloadQR=(table)=>{
    // ✅ Correction : utiliser APP_URL (variable d'env) au lieu de window.location.origin
    const url=table.qr_code_url||`${APP_URL}/menu/${restaurant?.slug}/${table.id}`;
    const imgUrl=`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=1A1A2E&margin=20`;
    const a=document.createElement('a');a.href=imgUrl;a.download=`qr-table-${table.numero}.png`;a.target='_blank';a.click();
  };

  const zones=[...new Set(tables.map(t=>t.zone).filter(Boolean))];
  const filtered=filterZone?tables.filter(t=>t.zone===filterZone):tables;
  const stats={total:tables.length,libres:tables.filter(t=>t.statut==='libre').length,occupees:tables.filter(t=>t.statut==='occupee').length,capacite:tables.reduce((a,t)=>a+(parseInt(t.capacite)||0),0)};

  if(loading)return(<div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:14,color:C.textGray}}>Chargement des tables…</div></div>);

  return(
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:'system-ui, sans-serif',paddingBottom:80}}>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}

      {/* Header */}
      <div style={{background:C.header,padding:'16px 20px 20px',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>Gestion</div>
            <h1 style={{margin:0,fontSize:22,fontWeight:800,color:C.white}}>Tables</h1>
          </div>
          <button onClick={openCreate} style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:10,border:'none',background:C.orange,color:C.white,fontSize:13,fontWeight:600,cursor:'pointer'}}>{Icon.plus} Nouvelle table</button>
        </div>
        <div style={{display:'flex',gap:10,marginTop:16}}>
          {[{label:'Total',value:stats.total,color:'#818CF8'},{label:'Libres',value:stats.libres,color:C.green},{label:'Occupées',value:stats.occupees,color:C.red},{label:'Couverts',value:stats.capacite,color:C.orange}].map(s=>(
            <div key={s.label} style={{flex:1,background:'rgba(255,255,255,0.08)',borderRadius:10,padding:'8px 6px',textAlign:'center'}}>
              <div style={{fontSize:18,fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',fontWeight:600}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Zone filter */}
      {zones.length>1&&(
        <div style={{padding:'12px 0 4px',overflowX:'auto',display:'flex',gap:8,paddingLeft:16,paddingRight:16,scrollbarWidth:'none'}}>
          <button style={{display:'inline-flex',padding:'6px 14px',borderRadius:999,fontSize:13,fontWeight:600,cursor:'pointer',border:`1.5px solid ${!filterZone?C.orange:C.border}`,background:!filterZone?C.orange:C.white,color:!filterZone?C.white:C.textGray,whiteSpace:'nowrap'}} onClick={()=>setFilterZone(null)}>Toutes</button>
          {zones.map(z=>(<button key={z} style={{display:'inline-flex',padding:'6px 14px',borderRadius:999,fontSize:13,fontWeight:600,cursor:'pointer',border:`1.5px solid ${filterZone===z?C.orange:C.border}`,background:filterZone===z?C.orange:C.white,color:filterZone===z?C.white:C.textGray,whiteSpace:'nowrap'}} onClick={()=>setFilterZone(filterZone===z?null:z)}>{z}</button>))}
        </div>
      )}

      {/* Grid */}
      <div style={{padding:16,display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(155px, 1fr))',gap:12}}>
        {filtered.length===0&&(
          <div style={{gridColumn:'1/-1',...S.card,padding:32,textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:12}}>🪑</div>
            <div style={{fontWeight:700,color:C.textDark,marginBottom:6}}>Aucune table</div>
            <div style={{fontSize:13,color:C.textGray,marginBottom:16}}>Ajoutez vos tables pour générer les QR codes.</div>
            <button onClick={openCreate} style={{...S.btn('primary'),padding:'10px 24px'}}>{Icon.plus} Ajouter</button>
          </div>
        )}
        {filtered.map(t=>{
          const st=t.statut==='occupee'?{bg:C.redL,color:C.red,label:'Occupée'}:{bg:C.greenL,color:C.green,label:'Libre'};
          const zs=zoneStyle(t.zone);
          return(
            <div key={t.id} style={{...S.card,padding:14,display:'flex',flexDirection:'column',gap:10,opacity:t.actif?1:0.5}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:24,fontWeight:800,color:C.textDark}}>T{t.numero}</div>
                  <div style={{display:'flex',alignItems:'center',gap:4,marginTop:2,color:C.textGray}}>{Icon.users}<span style={{fontSize:12}}>{t.capacite} pers.</span></div>
                </div>
                <span style={{fontSize:11,fontWeight:600,background:st.bg,color:st.color,padding:'3px 8px',borderRadius:999}}>{st.label}</span>
              </div>
              {t.zone&&<span style={{fontSize:11,fontWeight:600,background:zs.bg,color:zs.color,padding:'3px 8px',borderRadius:999,alignSelf:'flex-start'}}>{t.zone}</span>}
              <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:'auto'}}>
                <button onClick={()=>setQrModal(t)} style={{...S.btn('soft'),padding:'7px',fontSize:12,width:'100%'}}>{Icon.qr} QR Code</button>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>openEdit(t)} style={{...S.btn('ghost'),flex:1,padding:'6px'}}>{Icon.edit}</button>
                  <button onClick={()=>toggleActif(t)} style={{padding:'6px 8px',borderRadius:8,border:`1px solid ${C.border}`,background:t.actif?C.orangeL:'transparent',cursor:'pointer',fontSize:11,color:t.actif?C.orange:C.textGray,fontWeight:600}}>{t.actif?'ON':'OFF'}</button>
                  <button onClick={()=>setDeleteTable(t)} style={{...S.btn('danger'),padding:'6px'}}>{Icon.trash}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal form table */}
      <Modal open={modalTable} onClose={()=>{setModalTable(false);setEditTable(null);}} title={editTable?'Modifier la table':'Nouvelle table'}>
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div><label style={S.label}>Numéro *</label><input style={S.input} value={form.numero} onChange={e=>setF('numero',e.target.value)} placeholder="1"/></div>
            <div><label style={S.label}>Capacité</label><input style={S.input} type="number" min="1" value={form.capacite} onChange={e=>setF('capacite',e.target.value)} placeholder="2"/></div>
          </div>
          <div>
            <label style={S.label}>Zone</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {ZONES.map(z=>(<button key={z} onClick={()=>setF('zone',z)} style={{padding:'7px 14px',borderRadius:999,fontSize:13,fontWeight:600,cursor:'pointer',border:`1.5px solid ${form.zone===z?C.orange:C.border}`,background:form.zone===z?C.orangeL:C.white,color:form.zone===z?C.orange:C.textGray}}>{z}</button>))}
            </div>
          </div>
          <button onClick={saveTable} style={{...S.btn('primary'),width:'100%',padding:'12px'}} disabled={saving}>{saving?'Enregistrement…':editTable?'Modifier':'Créer la table'}</button>
        </div>
      </Modal>

      {/* Modal QR */}
      <Modal open={!!qrModal} onClose={()=>setQrModal(null)} title={`QR Code — Table ${qrModal?.numero}`}>
        {qrModal&&(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20,paddingBottom:8}}>
            {/* ✅ Correction : URL construite avec APP_URL */}
            <QRCodeDisplay url={qrModal.qr_code_url||`${APP_URL}/menu/${restaurant?.slug}/${qrModal.id}`}/>
            <div style={{width:'100%',display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',gap:10}}>
                <div style={{flex:1,background:C.bg,borderRadius:10,padding:'10px 12px',textAlign:'center'}}><div style={{fontSize:11,color:C.textGray,fontWeight:600}}>Zone</div><div style={{fontSize:14,fontWeight:700,color:C.textDark}}>{qrModal.zone||'—'}</div></div>
                <div style={{flex:1,background:C.bg,borderRadius:10,padding:'10px 12px',textAlign:'center'}}><div style={{fontSize:11,color:C.textGray,fontWeight:600}}>Capacité</div><div style={{fontSize:14,fontWeight:700,color:C.textDark}}>{qrModal.capacite} pers.</div></div>
              </div>
              <button onClick={()=>downloadQR(qrModal)} style={{...S.btn('primary'),width:'100%',padding:'12px'}}>{Icon.download} Télécharger le QR Code</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal delete */}
      <Modal open={!!deleteTable} onClose={()=>setDeleteTable(null)} title="Supprimer la table">
        <div style={{textAlign:'center',paddingBottom:8}}>
          <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
          <div style={{fontWeight:700,color:C.textDark,marginBottom:8}}>Supprimer Table {deleteTable?.numero} ?</div>
          <div style={{fontSize:13,color:C.textGray,marginBottom:20}}>L'historique des commandes sera conservé mais le QR code ne fonctionnera plus.</div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setDeleteTable(null)} style={{...S.btn('ghost'),flex:1,padding:'12px'}}>Annuler</button>
            <button onClick={confirmDelete} style={{...S.btn('danger'),flex:1,padding:'12px'}}>Supprimer</button>
          </div>
        </div>
      </Modal>

      <BottomNav active="tables"/>
    </div>
  );
}