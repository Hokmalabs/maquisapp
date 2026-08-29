'use client'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { C } from '../theme'

const formatCFA = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' F'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const ca = payload.find(p => p.dataKey === 'ca')?.value ?? 0
  const commandes = payload.find(p => p.dataKey === 'commandes')?.value ?? 0
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,.12)', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: C.primary, fontWeight: 600 }}>CA : {formatCFA(ca)}</div>
      <div style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>Commandes : {Math.round(commandes)}</div>
    </div>
  )
}

export default function GrapheVentes({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={C.border} vertical={false} />
        <XAxis dataKey="jour" tick={{ fontSize: 11, fill: C.gray }} axisLine={{ stroke: C.border }} tickLine={false} />
        <YAxis yAxisId="ca" hide />
        <YAxis yAxisId="commandes" orientation="right" hide />
        <Tooltip content={<CustomTooltip />} />
        <Bar yAxisId="commandes" dataKey="commandes" fill={C.orange} radius={[4, 4, 0, 0]} barSize={22} />
        <Line yAxisId="ca" type="monotone" dataKey="ca" stroke={C.primary} strokeWidth={3} dot={{ r: 4, fill: C.primary }} activeDot={{ r: 6 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
