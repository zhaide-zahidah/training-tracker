import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Card, Button, Input, Select, Textarea, Modal, Table, Td,
  Badge, ConfirmDialog, PageHeader, Spinner, EmptyState, MobileCard
} from '../components/UI';
import {
  Plus, Edit2, Trash2, Download, Search, X, ChevronDown,
  ClipboardList, Mic, Brain, BookOpen, MessageSquare, Save, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

const SHIFTS     = ['Morning','Afternoon','Evening','Split'];
const STATUS_OPT = ['Hadir','Absen','Izin','Sakit'];
const SCORE_CLR  = v => !v ? 'text-slate-300' : v >= 4 ? 'text-emerald-600 font-bold' : v === 3 ? 'text-blue-600' : 'text-orange-500';

const FLASHCARD_CATS = ['Greeting Phrases','Room Service Vocab','Complaint Handling','Check-in Procedure','Local Attractions','Dining Recommendations','Emergency Procedures','Housekeeping Requests'];
const ROLEPLAY_SCEN  = ['Guest Check-in','Handling Complaint','Room Service Order','Concierge Assistance','Late Check-out','Lost & Found','Transportation Request','Restaurant Reservation'];
const MATERI_LIST    = ['1. Self Introduction','2. My Job & Role','3. Places in Property','4. Daily Routines','5. Guest Handling Basics','6. Complaint Resolution','7. Local Recommendations','8. Phone Etiquette'];

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0,10),
  employee_id:'', program_id:'', shift:'Morning', materi:'', kegiatan:'',
  fluency:'', confidence:'', pronunciation:'', grammar:'', accuracy:'',
  flashcard_category:'', roleplay_scenario:'', status:'Hadir', notes:''
};

const avatarBg = ['bg-indigo-500','bg-purple-500','bg-blue-500','bg-teal-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500'];
const av = n => avatarBg[(n||'').charCodeAt(0) % avatarBg.length];

// Score badge
function ScoreDot({ val }) {
  if (!val) return <span className="text-slate-300 text-xs">–</span>;
  const cls = val >= 4 ? 'bg-emerald-100 text-emerald-700' : val === 3 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700';
  return <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${cls}`}>{val}</span>;
}

export default function DailyMonitoring() {
  const { isAdmin } = useAuth();
  const [tab, setTab]         = useState('phase1'); // 'phase1' | 'daily'
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms]   = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filters
  const [filterDate, setFilterDate]       = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterSearch, setFilterSearch]   = useState('');

  // Modal
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [delId, setDelId]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDate)    params.date       = filterDate;
      if (filterProgram) params.program_id = filterProgram;
      const r = await api.get('/monitoring', { params });
      setRows(r.data);
    } finally { setLoading(false); }
  }, [filterDate, filterProgram]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/programs').then(r => setPrograms(r.data));
    api.get('/employees', { params: { limit: 200 } }).then(r => setEmployees(r.data.data));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: filterDate || new Date().toISOString().slice(0,10), program_id: filterProgram || '' });
    setModal(true);
  };

  const openEdit = row => {
    setEditing(row);
    setForm({
      date: row.date, employee_id: String(row.employee_id), program_id: String(row.program_id || ''),
      shift: row.shift || 'Morning', materi: row.materi || '', kegiatan: row.kegiatan || '',
      fluency: row.fluency || '', confidence: row.confidence || '',
      pronunciation: row.pronunciation || '', grammar: row.grammar || '',
      accuracy: row.accuracy || '', flashcard_category: row.flashcard_category || '',
      roleplay_scenario: row.roleplay_scenario || '', status: row.status || 'Hadir', notes: row.notes || ''
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.date || !form.employee_id) { toast.error('Tanggal dan pegawai wajib diisi'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        fluency: form.fluency ? Number(form.fluency) : null,
        confidence: form.confidence ? Number(form.confidence) : null,
        pronunciation: form.pronunciation ? Number(form.pronunciation) : null,
        grammar: form.grammar ? Number(form.grammar) : null,
        accuracy: form.accuracy ? Number(form.accuracy) : null,
      };
      if (editing) { await api.put(`/monitoring/${editing.id}`, payload); toast.success('Data diupdate ✓'); }
      else { await api.post('/monitoring', payload); toast.success('Data ditambahkan ✓'); }
      setModal(false); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    await api.delete(`/monitoring/${delId}`); toast.success('Data dihapus');
    setDelId(null); load();
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (filterProgram) params.append('program_id', filterProgram);
    if (filterDate)    params.append('week_start', filterDate);
    window.open(`/api/monitoring/export/csv?${params.toString()}`);
  };

  // Filter rows by search
  const filtered = rows.filter(r =>
    !filterSearch || r.employee_name?.toLowerCase().includes(filterSearch.toLowerCase())
  );

  // Group by date for Phase 1 view
  const byDate = filtered.reduce((acc, r) => {
    const d = r.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort((a,b) => b.localeCompare(a));

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Daily Monitoring"
        sub="Lembar monitoring harian English Storytelling Mastery"
        actions={<>
          <Button variant="secondary" size="sm" onClick={exportCsv}><Download size={13}/> Export CSV</Button>
          {isAdmin && <Button size="sm" onClick={openCreate}><Plus size={13}/> Input Data</Button>}
        </>}
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button onClick={() => setTab('phase1')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'phase1' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <BookOpen size={14}/> Daily Report Phase 1
        </button>
        <button onClick={() => setTab('daily')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'daily' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <Mic size={14}/> Daily Report (Flashcard)
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
              placeholder="Cari nama pegawai..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
          </div>
          <div>
            <input type="date" className="border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
              value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <select className="border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
            value={filterProgram} onChange={e => setFilterProgram(e.target.value)}>
            <option value="">Semua Program</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {(filterDate || filterProgram || filterSearch) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterDate(''); setFilterProgram(''); setFilterSearch(''); }}><X size={13}/> Reset</Button>
          )}
        </div>
      </Card>

      {loading ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> : (
        filtered.length === 0
          ? <Card><EmptyState icon="📋" title="Belum ada data monitoring" sub="Klik 'Input Data' untuk menambahkan data monitoring harian"/></Card>
          : tab === 'phase1'
            ? <Phase1View byDate={byDate} sortedDates={sortedDates} isAdmin={isAdmin} onEdit={openEdit} onDelete={id => setDelId(id)} av={av} />
            : <DailyView rows={filtered} isAdmin={isAdmin} onEdit={openEdit} onDelete={id => setDelId(id)} av={av} />
      )}

      {/* Input Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Data Monitoring' : 'Input Data Monitoring Harian'} width="max-w-2xl">
        <div className="space-y-5">
          {/* Basic info */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><ClipboardList size={12}/> Informasi Sesi</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Tanggal *" type="date" value={form.date} onChange={f('date')}/>
              <div className="sm:col-span-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Pegawai *</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
                  value={form.employee_id} onChange={f('employee_id')}>
                  <option value="">-- Pilih --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <Select label="Shift" value={form.shift} onChange={f('shift')}>
                {SHIFTS.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Program</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
                  value={form.program_id} onChange={f('program_id')}>
                  <option value="">-- Pilih Program --</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <Select label="Status Kehadiran" value={form.status} onChange={f('status')}>
                {STATUS_OPT.map(s => <option key={s}>{s}</option>)}
              </Select>
            </div>
          </div>

          {/* Materi & Kegiatan */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><BookOpen size={12}/> Materi & Kegiatan</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Materi Dipelajari</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
                  value={form.materi} onChange={f('materi')}>
                  <option value="">-- Pilih Materi --</option>
                  {MATERI_LIST.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Kategori Flashcard</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
                  value={form.flashcard_category} onChange={f('flashcard_category')}>
                  <option value="">-- Pilih --</option>
                  {FLASHCARD_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-1.5">Skenario Roleplay</label>
              <select className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
                value={form.roleplay_scenario} onChange={f('roleplay_scenario')}>
                <option value="">-- Pilih Skenario --</option>
                {ROLEPLAY_SCEN.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <Textarea label="Kegiatan Hari Ini" value={form.kegiatan} onChange={f('kegiatan')} rows={2} className="mt-3" placeholder="Deskripsi kegiatan hari ini..."/>
          </div>

          {/* Scores */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Brain size={12}/> Penilaian (1–5)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[['fluency','Fluency'],['confidence','Confidence'],['pronunciation','Pronunciation'],['grammar','Grammar']].map(([k,l]) => (
                <div key={k}>
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">{l}</label>
                  <select className="w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
                    value={form[k]} onChange={f(k)}>
                    <option value="">–</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-3 max-w-xs">
              <Input label="Akurasi (%)" type="number" min="0" max="100" value={form.accuracy} onChange={f('accuracy')} placeholder="85"/>
            </div>
          </div>

          <Textarea label="Catatan" value={form.notes} onChange={f('notes')} rows={2} placeholder="Catatan tambahan..."/>

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setModal(false)} className="flex-1 justify-center">Batal</Button>
            <Button onClick={save} disabled={saving} className="flex-1 justify-center">{saving ? 'Menyimpan...' : <><Save size={14}/> Simpan</>}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={del}
        title="Hapus Data?" message="Data monitoring ini akan dihapus permanen."/>
    </div>
  );
}

/* ── Phase 1 View (grouped by date, like spreadsheet tab 1) ─── */
function Phase1View({ byDate, sortedDates, isAdmin, onEdit, onDelete, av }) {
  const [collapsed, setCollapsed] = useState({});
  const toggle = d => setCollapsed(p => ({ ...p, [d]: !p[d] }));

  return (
    <div className="space-y-4">
      {sortedDates.map(date => {
        const dayRows = byDate[date];
        const isOpen = !collapsed[date];
        const dayOfWeek = new Date(date).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
        const avgFluency = (dayRows.reduce((a,r) => a + (r.fluency||0), 0) / dayRows.filter(r=>r.fluency).length || 0).toFixed(1);

        return (
          <Card key={date}>
            {/* Date header */}
            <button className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors rounded-t-2xl" onClick={() => toggle(date)}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">{new Date(date).getDate()}</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">{dayOfWeek}</p>
                  <p className="text-xs text-slate-400">{dayRows.length} pegawai · Rata-rata Fluency: {avgFluency}</p>
                </div>
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <>
                {/* Mobile list */}
                <div className="sm:hidden divide-y divide-slate-100 px-4 pb-4 space-y-3 pt-1">
                  {dayRows.map(r => (
                    <div key={r.id} className="pt-3">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-8 h-8 rounded-xl ${av(r.employee_name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>{r.employee_name?.[0]}</div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{r.employee_name}</p>
                          <p className="text-xs text-slate-400">{r.materi}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.status==='Hadir'?'bg-emerald-100 text-emerald-700':r.status==='Absen'?'bg-red-100 text-red-700':'bg-slate-100 text-slate-600'}`}>{r.status}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center mt-2">
                        {[['F',r.fluency],['C',r.confidence],['P',r.pronunciation],['G',r.grammar]].map(([l,v]) => (
                          <div key={l} className="bg-slate-50 rounded-lg p-2">
                            <p className="text-xs text-slate-400">{l}</p>
                            <ScoreDot val={v}/>
                          </div>
                        ))}
                      </div>
                      {r.accuracy != null && <p className="text-xs text-slate-500 mt-1.5 text-center">Akurasi: <b>{r.accuracy}%</b></p>}
                      {isAdmin && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => onEdit(r)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors"><Edit2 size={12}/> Edit</button>
                          <button onClick={() => onDelete(r.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={13}/></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto border-t border-slate-100">
                  <table className="w-full text-sm min-w-max">
                    <thead>
                      <tr className="bg-indigo-50/50 border-b border-indigo-100">
                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Pegawai</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Materi</th>
                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Kegiatan</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Fluency</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Confidence</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Pronunciation</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Grammar</th>
                        <th className="text-center px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayRows.map(r => (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-xl ${av(r.employee_name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>{r.employee_name?.[0]}</div>
                              <div>
                                <p className="font-semibold text-slate-800">{r.employee_name}</p>
                                <p className="text-xs text-slate-400">{r.shift}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[160px]"><p className="text-xs truncate">{r.materi || '–'}</p></td>
                          <td className="px-4 py-3 max-w-[200px]"><p className="text-xs text-slate-500 line-clamp-2">{r.kegiatan || '–'}</p></td>
                          <td className="px-3 py-3 text-center"><ScoreDot val={r.fluency}/></td>
                          <td className="px-3 py-3 text-center"><ScoreDot val={r.confidence}/></td>
                          <td className="px-3 py-3 text-center"><ScoreDot val={r.pronunciation}/></td>
                          <td className="px-3 py-3 text-center"><ScoreDot val={r.grammar}/></td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.status==='Hadir'?'bg-emerald-100 text-emerald-700':r.status==='Absen'?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            {isAdmin && <div className="flex gap-1">
                              <button onClick={() => onEdit(r)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
                              <button onClick={() => onDelete(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                            </div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ── Daily (Flashcard/Roleplay) View ───────────────────────── */
function DailyView({ rows, isAdmin, onEdit, onDelete, av }) {
  return (
    <Card>
      {/* Mobile */}
      <div className="sm:hidden divide-y divide-slate-100">
        {rows.map(r => (
          <div key={r.id} className="p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-8 h-8 rounded-xl ${av(r.employee_name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>{r.employee_name?.[0]}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{r.employee_name}</p>
                <p className="text-xs text-slate-400">{r.date} · {r.shift}</p>
              </div>
              {r.accuracy != null && <span className={`text-sm font-bold ${r.accuracy >= 85 ? 'text-emerald-600' : r.accuracy >= 70 ? 'text-blue-600' : 'text-orange-500'}`}>{r.accuracy}%</span>}
            </div>
            <div className="space-y-1 text-xs">
              {r.flashcard_category && <p className="text-slate-500">🃏 {r.flashcard_category}</p>}
              {r.roleplay_scenario  && <p className="text-slate-500">🎭 {r.roleplay_scenario}</p>}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2 text-center">
              {[['F',r.fluency],['C',r.confidence],['P',r.pronunciation],['G',r.grammar]].map(([l,v]) => (
                <div key={l} className="bg-slate-50 rounded-lg p-1.5">
                  <p className="text-xs text-slate-400">{l}</p>
                  <ScoreDot val={v}/>
                </div>
              ))}
            </div>
            {isAdmin && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => onEdit(r)} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold"><Edit2 size={12}/> Edit</button>
                <button onClick={() => onDelete(r.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg"><Trash2 size={13}/></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              {['Tanggal','Pegawai','Shift','Kategori Flashcard','Skenario Roleplay','Akurasi (%)','Fluency','Confidence','Pronunciation','Grammar','Aksi'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap first:pl-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                <td className="px-5 py-3.5 text-slate-500 text-xs">{r.date}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-xl ${av(r.employee_name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>{r.employee_name?.[0]}</div>
                    <span className="font-semibold text-slate-800">{r.employee_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{r.shift||'–'}</span></td>
                <td className="px-4 py-3.5 text-slate-600 text-xs max-w-[150px] truncate">{r.flashcard_category||'–'}</td>
                <td className="px-4 py-3.5 text-slate-600 text-xs max-w-[150px] truncate">{r.roleplay_scenario||'–'}</td>
                <td className="px-4 py-3.5 text-center">
                  {r.accuracy != null
                    ? <span className={`font-bold text-sm ${r.accuracy >= 85 ? 'text-emerald-600' : r.accuracy >= 70 ? 'text-blue-600' : 'text-orange-500'}`}>{r.accuracy}%</span>
                    : <span className="text-slate-300">–</span>}
                </td>
                <td className="px-4 py-3.5 text-center"><ScoreDot val={r.fluency}/></td>
                <td className="px-4 py-3.5 text-center"><ScoreDot val={r.confidence}/></td>
                <td className="px-4 py-3.5 text-center"><ScoreDot val={r.pronunciation}/></td>
                <td className="px-4 py-3.5 text-center"><ScoreDot val={r.grammar}/></td>
                <td className="px-4 py-3.5">
                  {isAdmin && <div className="flex gap-1">
                    <button onClick={() => onEdit(r)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
                    <button onClick={() => onDelete(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                  </div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
