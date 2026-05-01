import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Card, Button, Input, Select, Textarea, Modal, Table, Td,
  Badge, ConfirmDialog, PageHeader, Spinner, EmptyState,
  STATUS_COLORS, CATEGORY_COLORS, MobileCard
} from '../components/UI';
import { Plus, Edit2, Trash2, UserPlus, Save, ArrowLeft, Clock, MapPin, ChevronRight, Users, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY = { training_id:'', start_date:'', end_date:'', location:'', notes:'' };

const STATUS_STAT = [
  { key:'Completed', label:'Selesai', icon: CheckCircle2, color:'text-emerald-600 bg-emerald-50' },
  { key:'Attended',  label:'Hadir',   icon: Users,        color:'text-teal-600 bg-teal-50' },
  { key:'Absent',    label:'Absen',   icon: XCircle,      color:'text-red-500 bg-red-50' },
  { key:'Registered',label:'Daftar',  icon: AlertCircle,  color:'text-blue-600 bg-blue-50' },
];

export default function Schedules() {
  const { isAdmin } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);
  const [addPartModal, setAddPartModal] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmps, setSelectedEmps] = useState([]);
  const [empSearch, setEmpSearch] = useState('');
  const [editingPart, setEditingPart] = useState(null);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/schedules'); setSchedules(r.data); }
    finally { setLoading(false); }
  }, []);

  const loadDetail = useCallback(async (id) => {
    const r = await api.get(`/schedules/${id}`);
    setDetail(r.data);
  }, []);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);
  useEffect(() => { api.get('/programs').then(r => setPrograms(r.data)); }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = s => {
    setEditing(s);
    setForm({ training_id: s.training_id, start_date: s.start_date, end_date: s.end_date, location: s.location||'', notes: s.notes||'' });
    setModal(true);
  };

  const save = async () => {
    if (!form.training_id || !form.start_date || !form.end_date) { toast.error('Program dan tanggal wajib diisi'); return; }
    setSaving(true);
    try {
      if (editing) { await api.put(`/schedules/${editing.id}`, form); toast.success('Jadwal diupdate ✓'); }
      else { await api.post('/schedules', form); toast.success('Jadwal dibuat ✓'); }
      setModal(false); loadSchedules();
      if (detail) loadDetail(detail.id);
    } catch (e) { toast.error(e.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    await api.delete(`/schedules/${delId}`);
    toast.success('Jadwal dihapus'); setDelId(null); setDetail(null); loadSchedules();
  };

  const openAddPart = async () => {
    const r = await api.get('/employees', { params: { limit: 200 } });
    const existing = new Set((detail.participants || []).map(p => p.employee_id));
    setAllEmployees(r.data.data.filter(e => !existing.has(e.id)));
    setSelectedEmps([]); setEmpSearch(''); setAddPartModal(true);
  };

  const addParticipants = async () => {
    if (!selectedEmps.length) return;
    await api.post(`/schedules/${detail.id}/participants`, { employee_ids: selectedEmps });
    toast.success(`${selectedEmps.length} peserta didaftarkan ✓`);
    setAddPartModal(false); loadDetail(detail.id);
  };

  const savePart = async (partId, data) => {
    await api.put(`/schedules/${detail.id}/participants/${partId}`, data);
    toast.success('Status diupdate ✓'); setEditingPart(null); loadDetail(detail.id);
  };

  const delPart = async partId => {
    await api.delete(`/schedules/${detail.id}/participants/${partId}`);
    toast.success('Peserta dihapus'); loadDetail(detail.id);
  };

  const filteredEmps = allEmployees.filter(e =>
    e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.department.toLowerCase().includes(empSearch.toLowerCase())
  );

  const avatarBg = ['bg-indigo-500','bg-purple-500','bg-blue-500','bg-teal-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500'];
  const av = name => avatarBg[(name || '').charCodeAt(0) % avatarBg.length];

  const scheduleForm = (
    <div className="space-y-4">
      <Select label="Program Training *" value={form.training_id} onChange={f('training_id')}>
        <option value="">-- Pilih Program --</option>
        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </Select>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Tanggal Mulai *" type="date" value={form.start_date} onChange={f('start_date')} />
        <Input label="Tanggal Selesai *" type="date" value={form.end_date} onChange={f('end_date')} />
      </div>
      <Input label="Lokasi" value={form.location} onChange={f('location')} placeholder="Ruang Training, Hotel, Online..." />
      <Textarea label="Catatan" value={form.notes} onChange={f('notes')} rows={2} placeholder="Catatan tambahan..." />
      <div className="flex gap-3 pt-1">
        <Button variant="secondary" onClick={() => setModal(false)} className="flex-1 justify-center">Batal</Button>
        <Button onClick={save} disabled={saving} className="flex-1 justify-center">{saving ? 'Menyimpan...' : 'Simpan'}</Button>
      </div>
    </div>
  );

  /* ── DETAIL VIEW ─────────────────────────────────────────────────── */
  if (detail) {
    const parts = detail.participants || [];
    const statCounts = STATUS_STAT.map(s => ({ ...s, count: parts.filter(p => p.status === s.key).length }));

    return (
      <div className="space-y-5">
        {/* Back + title */}
        <div className="flex items-start gap-3 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => { setDetail(null); loadSchedules(); }}>
            <ArrowLeft size={14}/> Kembali
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{detail.training_name}</h1>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1"><Clock size={12}/>{detail.start_date}{detail.start_date !== detail.end_date ? ` – ${detail.end_date}` : ''}</span>
              {detail.location && <span className="flex items-center gap-1"><MapPin size={12}/>{detail.location}</span>}
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" size="sm" onClick={() => openEdit(detail)}><Edit2 size={13}/> Edit</Button>
              <Button variant="danger" size="sm" onClick={() => setDelId(detail.id)}><Trash2 size={13}/> Hapus</Button>
              <Button size="sm" onClick={openAddPart}><UserPlus size={13}/> Peserta</Button>
            </div>
          )}
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Kategori', val: <Badge color={CATEGORY_COLORS[detail.category]}>{detail.category}</Badge> },
            { label:'Penyelenggara', val: <span className="font-semibold text-slate-700">{detail.organizer}</span> },
            { label:'Durasi', val: <span className="font-semibold text-slate-700">{detail.duration_hours} jam</span> },
          ].map(item => (
            <Card key={item.label} className="p-3 sm:p-4">
              <p className="text-xs text-slate-400 mb-1">{item.label}</p>
              <div className="text-sm">{item.val}</div>
            </Card>
          ))}
        </div>

        {/* Participant summary stats */}
        {parts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCounts.map(({ key, label, icon: Icon, color, count }) => count > 0 && (
              <Card key={key} className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${color.split(' ')[1]}`}>
                  <Icon size={15} className={color.split(' ')[0]}/>
                </div>
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="font-bold text-slate-800 text-lg leading-none mt-0.5">{count}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Participants card */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">
              Daftar Peserta <span className="font-normal text-slate-400 text-sm ml-1">({parts.length})</span>
            </h3>
          </div>

          {parts.length === 0
            ? <EmptyState icon="👥" title="Belum ada peserta" sub="Klik 'Peserta' untuk mendaftarkan karyawan"/>
            : <>
                {/* Mobile list */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {parts.map(p => (
                    <div key={p.id} className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-xl ${av(p.employee_name)} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
                          {p.employee_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{p.employee_name}</p>
                          <p className="text-xs text-slate-400">{p.department} · {p.position}</p>
                        </div>
                        <Badge color={STATUS_COLORS[p.status]}>{p.status}</Badge>
                      </div>
                      {(p.score != null || p.notes) && (
                        <div className="flex gap-4 text-xs">
                          {p.score != null && <span className={`font-bold ${p.score >= 70 ? 'text-emerald-600' : 'text-red-500'}`}>Nilai: {p.score}</span>}
                          {p.notes && <span className="text-slate-400 truncate">{p.notes}</span>}
                        </div>
                      )}
                      {isAdmin && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => setEditingPart({id:p.id,status:p.status,score:p.score,notes:p.notes})}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition-colors">
                            <Edit2 size={12}/> Edit Status
                          </button>
                          <button onClick={() => delPart(p.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block">
                  <Table headers={['Peserta','Departemen','Status','Nilai','Catatan','Aksi']}>
                    {parts.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl ${av(p.employee_name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                              {p.employee_name?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{p.employee_name}</p>
                              <p className="text-xs text-slate-400">{p.nik} · {p.position}</p>
                            </div>
                          </div>
                        </Td>
                        <Td><span className="text-slate-600 text-sm">{p.department}</span></Td>
                        <Td>
                          {editingPart?.id === p.id
                            ? <select className="border-2 border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500 bg-slate-50"
                                value={editingPart.status}
                                onChange={e => setEditingPart(prev => ({...prev, status: e.target.value}))}>
                                {['Registered','Attended','Completed','Absent'].map(s => <option key={s}>{s}</option>)}
                              </select>
                            : <Badge color={STATUS_COLORS[p.status]}>{p.status}</Badge>
                          }
                        </Td>
                        <Td>
                          {editingPart?.id === p.id
                            ? <input type="number" min="0" max="100"
                                className="border-2 border-slate-200 rounded-lg px-2 py-1.5 text-xs w-16 focus:outline-none focus:border-indigo-500 bg-slate-50"
                                value={editingPart.score ?? ''}
                                onChange={e => setEditingPart(prev => ({...prev, score: e.target.value !== '' ? Number(e.target.value) : null}))} />
                            : p.score != null
                              ? <span className={`font-bold text-sm ${p.score >= 70 ? 'text-emerald-600' : 'text-red-500'}`}>{p.score}</span>
                              : <span className="text-slate-300">–</span>
                          }
                        </Td>
                        <Td>
                          {editingPart?.id === p.id
                            ? <input className="border-2 border-slate-200 rounded-lg px-2 py-1.5 text-xs w-36 focus:outline-none focus:border-indigo-500 bg-slate-50"
                                value={editingPart.notes ?? ''} placeholder="Catatan..."
                                onChange={e => setEditingPart(prev => ({...prev, notes: e.target.value}))} />
                            : <span className="text-slate-500 text-xs">{p.notes || '–'}</span>
                          }
                        </Td>
                        <Td>
                          {isAdmin && (
                            <div className="flex gap-1">
                              {editingPart?.id === p.id ? (
                                <>
                                  <button onClick={() => savePart(p.id, editingPart)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"><Save size={13}/></button>
                                  <button onClick={() => setEditingPart(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors text-xs font-bold">✕</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => setEditingPart({id:p.id,status:p.status,score:p.score,notes:p.notes})} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
                                  <button onClick={() => delPart(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                                </>
                              )}
                            </div>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </Table>
                </div>
              </>
          }
        </Card>

        {/* Edit participant modal (mobile) */}
        {editingPart && (
          <Modal open={!!editingPart} onClose={() => setEditingPart(null)} title="Update Status Peserta">
            <div className="space-y-4">
              <Select label="Status" value={editingPart.status} onChange={e => setEditingPart(p => ({...p, status: e.target.value}))}>
                {['Registered','Attended','Completed','Absent'].map(s => <option key={s}>{s}</option>)}
              </Select>
              <Input label="Nilai (0–100)" type="number" min="0" max="100"
                value={editingPart.score ?? ''}
                onChange={e => setEditingPart(p => ({...p, score: e.target.value !== '' ? Number(e.target.value) : null}))}
                placeholder="Kosongkan jika belum ada nilai"/>
              <Textarea label="Catatan" value={editingPart.notes ?? ''} rows={2}
                onChange={e => setEditingPart(p => ({...p, notes: e.target.value}))} placeholder="Catatan..." />
              <div className="flex gap-3 pt-1">
                <Button variant="secondary" onClick={() => setEditingPart(null)} className="flex-1 justify-center">Batal</Button>
                <Button onClick={() => savePart(editingPart.id, editingPart)} className="flex-1 justify-center"><Save size={14}/> Simpan</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Add participants modal */}
        <Modal open={addPartModal} onClose={() => setAddPartModal(false)} title="Tambah Peserta Training" width="max-w-xl">
          <div className="space-y-3">
            <input className="w-full border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
              placeholder="Cari nama atau departemen..." value={empSearch} onChange={e => setEmpSearch(e.target.value)} />
            <div className="border border-slate-100 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-50">
              {filteredEmps.length === 0
                ? <p className="text-sm text-slate-400 text-center py-8">Semua karyawan sudah terdaftar</p>
                : filteredEmps.map(e => (
                  <label key={e.id} className="flex items-center gap-3 px-3.5 py-3 hover:bg-indigo-50/50 cursor-pointer transition-colors">
                    <input type="checkbox" className="rounded accent-indigo-600 w-4 h-4 shrink-0"
                      checked={selectedEmps.includes(e.id)}
                      onChange={ev => setSelectedEmps(prev => ev.target.checked ? [...prev, e.id] : prev.filter(id => id !== e.id))} />
                    <div className={`w-8 h-8 rounded-xl ${av(e.name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>{e.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800">{e.name}</p>
                      <p className="text-xs text-slate-400">{e.department} · {e.position}</p>
                    </div>
                  </label>
                ))
              }
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-slate-500 font-medium">{selectedEmps.length} dipilih</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setAddPartModal(false)}>Batal</Button>
                <Button onClick={addParticipants} disabled={!selectedEmps.length}>Daftarkan</Button>
              </div>
            </div>
          </div>
        </Modal>

        <Modal open={modal} onClose={() => setModal(false)} title="Edit Jadwal Training">{scheduleForm}</Modal>
        <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={del} title="Hapus Jadwal?" message="Jadwal dan semua data pesertanya akan dihapus permanen." />
      </div>
    );
  }

  /* ── LIST VIEW ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      <PageHeader
        title="Penjadwalan Training"
        sub={`${schedules.length} jadwal terdaftar`}
        actions={isAdmin && <Button size="sm" onClick={openCreate}><Plus size={13}/> Buat Jadwal</Button>}
      />

      {loading
        ? <div className="flex justify-center py-16"><Spinner size="lg"/></div>
        : <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {schedules.length === 0
                ? <Card><EmptyState icon="📅" title="Belum ada jadwal" sub="Buat jadwal training pertama"/></Card>
                : schedules.map(s => (
                  <MobileCard key={s.id} onClick={() => loadDetail(s.id)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 leading-tight">{s.training_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{s.organizer}</p>
                      </div>
                      <Badge color={CATEGORY_COLORS[s.category]}>{s.category}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={11}/>{s.start_date}{s.start_date !== s.end_date ? ` – ${s.end_date}` : ''}</span>
                      {s.location && <span className="flex items-center gap-1"><MapPin size={11}/>{s.location}</span>}
                      <span className="flex items-center gap-1"><Users size={11}/>{s.participant_count} peserta</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-1">
                        {isAdmin && <>
                          <button onClick={e => { e.stopPropagation(); openEdit(s); }} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
                          <button onClick={e => { e.stopPropagation(); setDelId(s.id); }} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                        </>}
                      </div>
                      <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">Lihat detail <ChevronRight size={12}/></span>
                    </div>
                  </MobileCard>
                ))
              }
            </div>

            {/* Desktop table */}
            <Card className="hidden sm:block">
              <Table
                headers={['Program Training','Tanggal','Lokasi','Peserta','Kategori','Aksi']}
                empty={schedules.length === 0 && <EmptyState icon="📅" title="Belum ada jadwal" sub="Buat jadwal training pertama untuk mulai mendaftarkan peserta"/>}
              >
                {schedules.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors cursor-pointer" onClick={() => loadDetail(s.id)}>
                    <Td>
                      <p className="font-semibold text-slate-800">{s.training_name}</p>
                      <p className="text-xs text-slate-400">{s.organizer}</p>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                        <Clock size={12} className="text-slate-400"/>
                        {s.start_date === s.end_date ? s.start_date : `${s.start_date} – ${s.end_date}`}
                      </div>
                    </Td>
                    <Td>
                      {s.location
                        ? <div className="flex items-center gap-1.5 text-slate-500 text-sm"><MapPin size={12}/>{s.location}</div>
                        : <span className="text-slate-300">–</span>}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Users size={11} className="text-indigo-600"/>
                        </div>
                        <span className="font-semibold text-slate-700">{s.participant_count}</span>
                      </div>
                    </Td>
                    <Td><Badge color={CATEGORY_COLORS[s.category]}>{s.category}</Badge></Td>
                    <Td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => loadDetail(s.id)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors"><ChevronRight size={13}/></button>
                        {isAdmin && <>
                          <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
                          <button onClick={() => setDelId(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                        </>}
                      </div>
                    </Td>
                  </tr>
                ))}
              </Table>
            </Card>
          </>
      }

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Jadwal' : 'Buat Jadwal Training'}>{scheduleForm}</Modal>
      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={del} title="Hapus Jadwal?" message="Jadwal dan semua data pesertanya akan dihapus permanen." />
    </div>
  );
}
