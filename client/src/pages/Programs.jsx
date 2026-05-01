import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Select, Textarea, Modal, Table, Td, Badge, ConfirmDialog, PageHeader, Spinner, EmptyState, STATUS_COLORS, CATEGORY_COLORS, MobileCard } from '../components/UI';
import { Plus, Search, Edit2, Trash2, X, Clock, Building2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY = { name:'', category:'Hard Skill', duration_hours:'', organizer:'Internal', description:'', status:'Planned' };

const STATUS_DOT = { Planned:'bg-amber-400', Active:'bg-indigo-500', Completed:'bg-emerald-500', Cancelled:'bg-red-400' };
const CAT_ICON = { 'Hard Skill':'💻', 'Soft Skill':'🤝', Compliance:'📋', Leadership:'🎯' };

export default function Programs() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (catFilter) params.category = catFilter;
      if (statusFilter) params.status = statusFilter;
      const r = await api.get('/programs', { params });
      setRows(r.data);
    } finally { setLoading(false); }
  }, [search, catFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = p => {
    setEditing(p);
    setForm({ name:p.name, category:p.category, duration_hours:p.duration_hours, organizer:p.organizer, description:p.description||'', status:p.status });
    setModal(true);
  };

  const save = async () => {
    if (!form.name || !form.duration_hours) { toast.error('Nama dan durasi wajib diisi'); return; }
    setSaving(true);
    try {
      if (editing) { await api.put(`/programs/${editing.id}`, form); toast.success('Program diupdate ✓'); }
      else { await api.post('/programs', form); toast.success('Program ditambahkan ✓'); }
      setModal(false); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    await api.delete(`/programs/${delId}`); toast.success('Program dihapus');
    setDelId(null); load();
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const formContent = (
    <div className="space-y-4">
      <Input label="Nama Training *" value={form.name} onChange={f('name')} placeholder="Nama program training" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Kategori *" value={form.category} onChange={f('category')}>
          {['Hard Skill','Soft Skill','Compliance','Leadership'].map(c => <option key={c}>{c}</option>)}
        </Select>
        <Select label="Penyelenggara *" value={form.organizer} onChange={f('organizer')}>
          <option>Internal</option><option>Eksternal</option>
        </Select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Durasi (jam) *" type="number" min="0.5" step="0.5" value={form.duration_hours} onChange={f('duration_hours')} placeholder="8"/>
        <Select label="Status *" value={form.status} onChange={f('status')}>
          {['Planned','Active','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
        </Select>
      </div>
      <Textarea label="Deskripsi" value={form.description} onChange={f('description')} rows={3} placeholder="Deskripsi singkat program training..." />
      <div className="flex gap-3 pt-1">
        <Button variant="secondary" onClick={() => setModal(false)} className="flex-1 justify-center">Batal</Button>
        <Button onClick={save} disabled={saving} className="flex-1 justify-center">{saving ? 'Menyimpan...' : 'Simpan'}</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Program Training"
        sub={`${rows.length} program terdaftar`}
        actions={isAdmin && <Button size="sm" onClick={openCreate}><Plus size={13}/> Tambah Program</Button>}
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-44 relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 transition-all"
              placeholder="Cari nama program..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
            value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Semua Kategori</option>
            {['Hard Skill','Soft Skill','Compliance','Leadership'].map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Semua Status</option>
            {['Planned','Active','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
          </select>
          {(search || catFilter || statusFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCatFilter(''); setStatusFilter(''); }}>
              <X size={13}/> Reset
            </Button>
          )}
        </div>
      </Card>

      {loading
        ? <div className="flex justify-center py-16"><Spinner size="lg"/></div>
        : <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {rows.length === 0
              ? <Card><EmptyState icon="📚" title="Belum ada program" sub="Tambahkan program training pertama"/></Card>
              : rows.map(r => (
                <MobileCard key={r.id}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-2xl shrink-0">{CAT_ICON[r.category] || '📚'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 leading-tight">{r.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[r.status]}`}/>
                        <span className="text-xs text-slate-500">{r.status}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
                        <button onClick={() => setDelId(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge color={CATEGORY_COLORS[r.category]}>{r.category}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      <Clock size={11}/> {r.duration_hours}j
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      <Building2 size={11}/> {r.organizer}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {r.schedule_count} jadwal
                    </span>
                  </div>
                  {r.description && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{r.description}</p>}
                </MobileCard>
              ))
            }
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block">
            <Table
              headers={['Program Training','Kategori','Durasi','Penyelenggara','Status','Jadwal','Aksi']}
              empty={rows.length === 0 && <EmptyState icon="📚" title="Belum ada program" sub="Tambahkan program training pertama"/>}
            >
              {rows.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="text-xl shrink-0">{CAT_ICON[r.category] || '📚'}</span>
                      <div>
                        <p className="font-semibold text-slate-800">{r.name}</p>
                        {r.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs">{r.description}</p>}
                      </div>
                    </div>
                  </Td>
                  <Td><Badge color={CATEGORY_COLORS[r.category]}>{r.category}</Badge></Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock size={13} className="text-slate-400"/> {r.duration_hours} jam
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Building2 size={13} className="text-slate-400"/> {r.organizer}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[r.status]}`}/>
                      <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-slate-500 text-sm font-medium">{r.schedule_count}</span>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      {isAdmin && <>
                        <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
                        <button onClick={() => setDelId(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                      </>}
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      }

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Program Training' : 'Tambah Program Training'}>
        {formContent}
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={del}
        title="Hapus Program?" message="Program dan semua jadwal serta pesertanya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."/>
    </div>
  );
}
