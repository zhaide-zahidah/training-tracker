import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Card, Button, Input, Select, Textarea, Modal, Table, Td,
  ConfirmDialog, PageHeader, Spinner, EmptyState, MobileCard
} from '../components/UI';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Minus, AlertTriangle, Target, Users, Brain, Download } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import toast from 'react-hot-toast';

const MISTAKE_CATS = ['Pronunciation','Grammar','Fluency','Vocabulary','Confidence','Accuracy','Others'];
const EMPTY_MISTAKE = { program_id:'', week_label:'', category:'Pronunciation', mistake:'', frequency:1, employees_affected:'', improvement_strategy:'' };

const avatarBg = ['bg-indigo-500','bg-purple-500','bg-blue-500','bg-teal-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500'];
const av = n => avatarBg[(n||'').charCodeAt(0) % avatarBg.length];

function TrendIcon({ val, prev }) {
  if (!prev || !val) return null;
  if (val > prev) return <TrendingUp size={12} className="text-emerald-500"/>;
  if (val < prev) return <TrendingDown size={12} className="text-red-400"/>;
  return <Minus size={12} className="text-slate-400"/>;
}

function ScoreBar({ value, max = 5 }) {
  const pct = ((value || 0) / max) * 100;
  const cls = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${cls}`} style={{ width: `${pct}%` }}/>
      </div>
      <span className={`text-xs font-bold w-6 text-right ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-blue-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
        {value || '–'}
      </span>
    </div>
  );
}

export default function ProgressSummary() {
  const { isAdmin } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [selectedProg, setSelectedProg] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd]     = useState('');
  const [summary, setSummary]     = useState(null);
  const [mistakes, setMistakes]   = useState([]);
  const [weeks, setWeeks]         = useState([]);
  const [weekFilter, setWeekFilter] = useState('');
  const [loadingSum, setLoadingSum] = useState(false);
  const [loadingMis, setLoadingMis] = useState(false);
  const [mistakeModal, setMistakeModal] = useState(false);
  const [editingMistake, setEditingMistake] = useState(null);
  const [mistakeForm, setMistakeForm] = useState(EMPTY_MISTAKE);
  const [savingMistake, setSavingMistake] = useState(false);
  const [delMistakeId, setDelMistakeId] = useState(null);

  useEffect(() => { api.get('/programs').then(r => setPrograms(r.data)); }, []);

  useEffect(() => {
    if (!selectedProg) return;
    api.get('/monitoring/mistakes/weeks', { params: { program_id: selectedProg } }).then(r => setWeeks(r.data));
  }, [selectedProg]);

  const loadSummary = useCallback(async () => {
    setLoadingSum(true);
    try {
      const params = {};
      if (selectedProg) params.program_id = selectedProg;
      if (weekStart)    params.week_start  = weekStart;
      if (weekEnd)      params.week_end    = weekEnd;
      const r = await api.get('/monitoring/summary', { params });
      setSummary(r.data);
    } finally { setLoadingSum(false); }
  }, [selectedProg, weekStart, weekEnd]);

  const loadMistakes = useCallback(async () => {
    setLoadingMis(true);
    try {
      const params = {};
      if (selectedProg) params.program_id = selectedProg;
      if (weekFilter)   params.week_label = weekFilter;
      const r = await api.get('/monitoring/mistakes/list', { params });
      setMistakes(r.data);
    } finally { setLoadingMis(false); }
  }, [selectedProg, weekFilter]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadMistakes(); }, [loadMistakes]);

  const openCreateMistake = () => {
    setEditingMistake(null);
    setMistakeForm({ ...EMPTY_MISTAKE, program_id: selectedProg || '' });
    setMistakeModal(true);
  };
  const openEditMistake = m => {
    setEditingMistake(m);
    setMistakeForm({ program_id: String(m.program_id||''), week_label: m.week_label, category: m.category, mistake: m.mistake, frequency: m.frequency, employees_affected: m.employees_affected||'', improvement_strategy: m.improvement_strategy||'' });
    setMistakeModal(true);
  };

  const saveMistake = async () => {
    if (!mistakeForm.week_label || !mistakeForm.mistake) { toast.error('Week label dan mistake wajib diisi'); return; }
    setSavingMistake(true);
    try {
      if (editingMistake) { await api.put(`/monitoring/mistakes/${editingMistake.id}`, mistakeForm); toast.success('Common mistake diupdate ✓'); }
      else { await api.post('/monitoring/mistakes', mistakeForm); toast.success('Common mistake ditambahkan ✓'); }
      setMistakeModal(false); loadMistakes();
      api.get('/monitoring/mistakes/weeks', { params: { program_id: selectedProg } }).then(r => setWeeks(r.data));
    } catch (e) { toast.error(e.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSavingMistake(false); }
  };

  const delMistake = async () => {
    await api.delete(`/monitoring/mistakes/${delMistakeId}`); toast.success('Dihapus');
    setDelMistakeId(null); loadMistakes();
  };

  const mf = k => e => setMistakeForm(p => ({ ...p, [k]: e.target.value }));

  // Radar chart data
  const radarData = summary?.overall ? [
    { subject:'Fluency',      A: summary.overall.avg_fluency || 0 },
    { subject:'Confidence',   A: summary.overall.avg_confidence || 0 },
    { subject:'Accuracy',     A: ((summary.overall.avg_accuracy||0)/20).toFixed(1) },
  ] : [];

  // Bar chart data
  const barData = (summary?.trend || []).map(t => ({
    date: t.date,
    Fluency: t.avg_fluency,
    Confidence: t.avg_confidence,
    Grammar: t.avg_grammar,
    Pronunciation: t.avg_pronunciation,
  }));

  const CAT_COLOR = { Pronunciation:'bg-blue-100 text-blue-700', Grammar:'bg-purple-100 text-purple-700', Fluency:'bg-amber-100 text-amber-700', Vocabulary:'bg-cyan-100 text-cyan-700', Confidence:'bg-orange-100 text-orange-700', Accuracy:'bg-emerald-100 text-emerald-700', Others:'bg-slate-100 text-slate-600' };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progress Summary"
        sub="Rekap mingguan dan analisis common mistakes"
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-44">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Program Training</label>
            <select className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
              value={selectedProg} onChange={e => { setSelectedProg(e.target.value); setWeekFilter(''); }}>
              <option value="">Semua Program</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Dari Tanggal</label>
            <input type="date" className="border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
              value={weekStart} onChange={e => setWeekStart(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Sampai Tanggal</label>
            <input type="date" className="border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
              value={weekEnd} onChange={e => setWeekEnd(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* ── WEEKLY PROGRESS SUMMARY ── */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-indigo-100 rounded-xl"><TrendingUp size={16} className="text-indigo-600"/></div>
        <h2 className="font-bold text-slate-800 text-lg">Weekly Progress Summary</h2>
      </div>

      {loadingSum
        ? <div className="flex justify-center py-8"><Spinner/></div>
        : !summary
          ? <Card><EmptyState icon="📈" title="Pilih program untuk melihat summary"/></Card>
          : <>
              {/* Overall stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label:'Total Sesi', val: summary.overall?.total_sessions || 0, icon:'📋', cls:'bg-indigo-50 text-indigo-700' },
                  { label:'Peserta', val: summary.overall?.total_participants || 0, icon:'👥', cls:'bg-purple-50 text-purple-700' },
                  { label:'Avg Fluency', val: summary.overall?.avg_fluency || '–', icon:'🗣️', cls:'bg-blue-50 text-blue-700' },
                  { label:'Avg Akurasi', val: summary.overall?.avg_accuracy ? `${summary.overall.avg_accuracy}%` : '–', icon:'🎯', cls:'bg-emerald-50 text-emerald-700' },
                ].map(item => (
                  <Card key={item.label} className="p-4">
                    <div className={`w-9 h-9 rounded-xl ${item.cls} flex items-center justify-center text-lg mb-2`}>{item.icon}</div>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-0.5">{item.val}</p>
                  </Card>
                ))}
              </div>

              {/* Per-employee table */}
              {summary.byEmployee?.length > 0 && (
                <Card>
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Rekap Per Pegawai</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Total praktik, rata-rata skor, dan status kehadiran</p>
                  </div>
                  {/* Mobile */}
                  <div className="sm:hidden divide-y divide-slate-100">
                    {summary.byEmployee.map(e => (
                      <div key={e.id} className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-9 h-9 rounded-xl ${av(e.name)} flex items-center justify-center text-sm font-bold text-white shrink-0`}>{e.name?.[0]}</div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">{e.name}</p>
                            <p className="text-xs text-slate-400">{e.total_sessions} sesi · Hadir: {e.hadir} · Absen: {e.absen}</p>
                          </div>
                          {e.avg_accuracy && <span className={`text-sm font-bold ${e.avg_accuracy >= 85 ? 'text-emerald-600' : 'text-orange-500'}`}>{e.avg_accuracy}%</span>}
                        </div>
                        <div className="space-y-1.5">
                          {[['Fluency',e.avg_fluency],['Confidence',e.avg_confidence],['Pronunciation',e.avg_pronunciation],['Grammar',e.avg_grammar]].map(([l,v]) => (
                            <div key={l} className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 w-24">{l}</span>
                              <ScoreBar value={v}/>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm min-w-max">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          {['Pegawai','Total Praktik','Avg Fluency','Avg Confidence','Avg Pronunciation','Avg Grammar','Avg Akurasi','Hadir','Absen'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest first:pl-5">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {summary.byEmployee.map(e => (
                          <tr key={e.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-xl ${av(e.name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>{e.name?.[0]}</div>
                                <div>
                                  <p className="font-semibold text-slate-800">{e.name}</p>
                                  <p className="text-xs text-slate-400">{e.department}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-bold text-indigo-600">{e.total_sessions}</td>
                            {[e.avg_fluency, e.avg_confidence, e.avg_pronunciation, e.avg_grammar].map((v, i) => (
                              <td key={i} className="px-4 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-sm font-bold ${!v?'text-slate-300':v>=4?'text-emerald-600':v>=3?'text-blue-600':'text-orange-500'}`}>{v || '–'}</span>
                                </div>
                              </td>
                            ))}
                            <td className="px-4 py-3.5">
                              {e.avg_accuracy
                                ? <span className={`font-bold text-sm ${e.avg_accuracy >= 85 ? 'text-emerald-600' : 'text-orange-500'}`}>{e.avg_accuracy}%</span>
                                : <span className="text-slate-300">–</span>}
                            </td>
                            <td className="px-4 py-3.5 font-semibold text-emerald-600">{e.hadir}</td>
                            <td className="px-4 py-3.5 font-semibold text-red-500">{e.absen}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Trend chart */}
              {barData.length > 1 && (
                <Card className="p-5">
                  <h3 className="font-bold text-slate-800 mb-1">Tren Skor Per Sesi</h3>
                  <p className="text-xs text-slate-400 mb-5">Perkembangan rata-rata skor dari waktu ke waktu</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData} margin={{top:0,right:0,left:-20,bottom:0}} barSize={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                      <XAxis dataKey="date" tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                      <YAxis domain={[0,5]} tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{borderRadius:'10px',fontSize:'12px'}} />
                      <Legend wrapperStyle={{fontSize:'11px'}}/>
                      <Bar dataKey="Fluency"      fill="#6366f1" radius={[3,3,0,0]}/>
                      <Bar dataKey="Confidence"   fill="#06b6d4" radius={[3,3,0,0]}/>
                      <Bar dataKey="Grammar"      fill="#10b981" radius={[3,3,0,0]}/>
                      <Bar dataKey="Pronunciation" fill="#f59e0b" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </>
      }

      {/* ── COMMON MISTAKES ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-100 rounded-xl"><AlertTriangle size={16} className="text-orange-600"/></div>
          <h2 className="font-bold text-slate-800 text-lg">Kategori yang Perlu Fokus</h2>
        </div>
        {isAdmin && <Button size="sm" onClick={openCreateMistake}><Plus size={13}/> Tambah</Button>}
      </div>

      {/* Week filter for mistakes */}
      {weeks.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setWeekFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${!weekFilter ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
            Semua Minggu
          </button>
          {weeks.map(w => (
            <button key={w} onClick={() => setWeekFilter(w)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${weekFilter === w ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
              {w}
            </button>
          ))}
        </div>
      )}

      {loadingMis
        ? <div className="flex justify-center py-8"><Spinner/></div>
        : mistakes.length === 0
          ? <Card><EmptyState icon="✅" title="Belum ada common mistakes tercatat" sub={isAdmin ? "Klik 'Tambah' untuk menambahkan kesalahan umum yang perlu diperhatikan" : "Belum ada data"}/></Card>
          : <>
              {/* Group by week */}
              {[...new Set(mistakes.map(m => m.week_label))].map(week => {
                const wMistakes = mistakes.filter(m => m.week_label === week);
                return (
                  <Card key={week} className="overflow-hidden">
                    <div className="px-5 py-3.5 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
                      <p className="font-bold text-slate-800">{week}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{wMistakes.length} kategori tercatat</p>
                    </div>
                    {/* Mobile */}
                    <div className="sm:hidden divide-y divide-slate-100">
                      {wMistakes.map(m => (
                        <div key={m.id} className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${CAT_COLOR[m.category] || 'bg-slate-100 text-slate-600'}`}>{m.category}</span>
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">×{m.frequency}</span>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-1">
                                <button onClick={() => openEditMistake(m)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600"><Edit2 size={13}/></button>
                                <button onClick={() => setDelMistakeId(m.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={13}/></button>
                              </div>
                            )}
                          </div>
                          <p className="font-semibold text-slate-800 text-sm mb-1">{m.mistake}</p>
                          {m.employees_affected && <p className="text-xs text-slate-500">👤 {m.employees_affected}</p>}
                          {m.improvement_strategy && <p className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg mt-1.5">💡 {m.improvement_strategy}</p>}
                        </div>
                      ))}
                    </div>
                    {/* Desktop */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/30">
                            <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Kategori</th>
                            <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Kesalahan Umum</th>
                            <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Frekuensi</th>
                            <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Pegawai Terdampak</th>
                            <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Strategi Perbaikan</th>
                            {isAdmin && <th className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {wMistakes.map(m => (
                            <tr key={m.id} className="border-b border-slate-50 hover:bg-orange-50/30 transition-colors">
                              <td className="px-5 py-3.5">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${CAT_COLOR[m.category] || 'bg-slate-100 text-slate-600'}`}>{m.category}</span>
                              </td>
                              <td className="px-4 py-3.5 font-medium text-slate-800">{m.mistake}</td>
                              <td className="px-4 py-3.5">
                                <span className="text-sm font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">×{m.frequency}</span>
                              </td>
                              <td className="px-4 py-3.5 text-slate-600 text-sm">{m.employees_affected || '–'}</td>
                              <td className="px-4 py-3.5">
                                {m.improvement_strategy
                                  ? <span className="text-emerald-700 text-xs bg-emerald-50 px-2.5 py-1 rounded-lg">💡 {m.improvement_strategy}</span>
                                  : <span className="text-slate-300 text-xs">–</span>}
                              </td>
                              {isAdmin && (
                                <td className="px-4 py-3.5">
                                  <div className="flex gap-1">
                                    <button onClick={() => openEditMistake(m)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
                                    <button onClick={() => setDelMistakeId(m.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })}
            </>
      }

      {/* Common Mistake Modal */}
      <Modal open={mistakeModal} onClose={() => setMistakeModal(false)} title={editingMistake ? 'Edit Common Mistake' : 'Tambah Common Mistake'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Program</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
                value={mistakeForm.program_id} onChange={mf('program_id')}>
                <option value="">– Semua Program –</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <Input label="Label Minggu *" value={mistakeForm.week_label} onChange={mf('week_label')} placeholder="Week 1 (20-24 Jan 2026)"/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Kategori *" value={mistakeForm.category} onChange={mf('category')}>
              {MISTAKE_CATS.map(c => <option key={c}>{c}</option>)}
            </Select>
            <Input label="Frekuensi" type="number" min="1" value={mistakeForm.frequency} onChange={mf('frequency')}/>
          </div>
          <Textarea label="Kesalahan Umum *" value={mistakeForm.mistake} onChange={mf('mistake')} rows={2} placeholder="Contoh: Pengucapan 'th' tidak jelas, sering tertukar dengan 'd'"/>
          <Input label="Pegawai Terdampak" value={mistakeForm.employees_affected} onChange={mf('employees_affected')} placeholder="Windy, Araseli, Puji"/>
          <Textarea label="Strategi Perbaikan" value={mistakeForm.improvement_strategy} onChange={mf('improvement_strategy')} rows={2} placeholder="Contoh: Drill 'th' sound setiap awal sesi selama 5 menit"/>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setMistakeModal(false)} className="flex-1 justify-center">Batal</Button>
            <Button onClick={saveMistake} disabled={savingMistake} className="flex-1 justify-center">{savingMistake ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delMistakeId} onClose={() => setDelMistakeId(null)} onConfirm={delMistake}
        title="Hapus Common Mistake?" message="Data common mistake ini akan dihapus permanen."/>
    </div>
  );
}
