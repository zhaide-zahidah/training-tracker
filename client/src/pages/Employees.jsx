import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Select, Modal, Table, Td, ConfirmDialog, PageHeader, Spinner, EmptyState, MobileCard } from '../components/UI';
import { Plus, Search, Download, Edit2, Trash2, X, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY = { nik:'', name:'', department:'', position:'', end_of_contract:'', shift:'Morning', join_date:'' };
const SHIFTS = ['Morning','Afternoon','Evening','Split','Off'];

const avatarBg = ['bg-indigo-500','bg-purple-500','bg-blue-500','bg-teal-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500'];
const av = name => avatarBg[(name||'').charCodeAt(0) % avatarBg.length];

const DEPT_COLORS = ['bg-blue-100 text-blue-700','bg-purple-100 text-purple-700','bg-emerald-100 text-emerald-700','bg-orange-100 text-orange-700','bg-pink-100 text-pink-700','bg-cyan-100 text-cyan-700','bg-amber-100 text-amber-700','bg-indigo-100 text-indigo-700'];
const deptColor = d => DEPT_COLORS[Math.abs((d||'').split('').reduce((a,c) => a + c.charCodeAt(0),0)) % DEPT_COLORS.length];

function eocStatus(eoc) {
  if (!eoc) return null;
  const diff = Math.ceil((new Date(eoc) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0)  return { label: 'Kontrak Berakhir', cls: 'bg-red-100 text-red-700' };
  if (diff <= 30) return { label: `${diff}h lagi`, cls: 'bg-orange-100 text-orange-700' };
  if (diff <= 90) return { label: `${diff}h lagi`, cls: 'bg-amber-100 text-amber-700' };
  return { label: eoc, cls: 'bg-slate-100 text-slate-600' };
}

export default function Employees() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (search) params.search = search;
      if (deptFilter) params.department = deptFilter;
      const r = await api.get('/employees', { params });
      setRows(r.data.data); setTotal(r.data.total);
    } finally { setLoading(false); }
  }, [search, deptFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/employees/departments').then(r => setDepts(r.data)); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = emp => {
    setEditing(emp);
    setForm({ nik:emp.nik, name:emp.name, department:emp.department, position:emp.position, end_of_contract:emp.end_of_contract||'', shift:emp.shift||'Morning', join_date:emp.join_date });
    setModal(true);
  };

  const save = async () => {
    if (!form.nik || !form.name || !form.department || !form.position || !form.join_date) {
      toast.error('Field wajib belum lengkap'); return;
    }
    setSaving(true);
    try {
      if (editing) { await api.put(`/employees/${editing.id}`, form); toast.success('Karyawan diupdate ✓'); }
      else { await api.post('/employees', form); toast.success('Karyawan ditambahkan ✓'); }
      setModal(false); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    await api.delete(`/employees/${delId}`); toast.success('Karyawan dihapus');
    setDelId(null); load();
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // Count contracts expiring soon
  const expiringSoon = rows.filter(r => {
    if (!r.end_of_contract) return false;
    const diff = Math.ceil((new Date(r.end_of_contract) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  }).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen Karyawan"
        sub={`${total} karyawan terdaftar${expiringSoon > 0 ? ` · ⚠️ ${expiringSoon} kontrak hampir berakhir` : ''}`}
        actions={<>
          <Button variant="secondary" size="sm" onClick={() => window.open('/api/employees/export/csv')}><Download size={13}/> Export</Button>
          {isAdmin && <Button size="sm" onClick={openCreate}><Plus size={13}/> Tambah</Button>}
        </>}
      />

      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-44 relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 transition-all"
              placeholder="Cari nama atau NIK..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50"
            value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">Semua Departemen</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {(search || deptFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDeptFilter(''); }}><X size={13}/> Reset</Button>
          )}
        </div>
      </Card>

      {loading ? <div className="flex justify-center py-16"><Spinner size="lg"/></div> : <>
        {/* Mobile */}
        <div className="sm:hidden space-y-3">
          {rows.length === 0
            ? <Card><EmptyState icon="👥" title="Tidak ada karyawan" sub="Tambahkan karyawan baru"/></Card>
            : rows.map(r => {
              const eoc = eocStatus(r.end_of_contract);
              return (
                <MobileCard key={r.id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${av(r.name)} flex items-center justify-center text-sm font-bold text-white shrink-0`}>{r.name[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.nik} · {r.shift}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(r)} className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={14}/></button>
                        <button onClick={() => setDelId(r.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-400">Dept</span><p className="mt-0.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${deptColor(r.department)}`}>{r.department}</span></p></div>
                    <div><span className="text-slate-400">Jabatan</span><p className="font-semibold text-slate-700 mt-0.5 truncate">{r.position}</p></div>
                    <div className="col-span-2">
                      <span className="text-slate-400 flex items-center gap-1"><CalendarClock size={11}/> End of Contract</span>
                      <p className="mt-0.5">{eoc ? <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${eoc.cls}`}>{eoc.label}</span> : <span className="text-slate-300 text-xs">–</span>}</p>
                    </div>
                  </div>
                </MobileCard>
              );
            })
          }
        </div>

        {/* Desktop */}
        <Card className="hidden sm:block">
          <Table
            headers={['Karyawan','Departemen','Jabatan','Shift','End of Contract','Tgl Bergabung','Aksi']}
            empty={rows.length === 0 && <EmptyState icon="👥" title="Tidak ada karyawan" sub="Tambahkan karyawan baru untuk memulai"/>}
          >
            {rows.map(r => {
              const eoc = eocStatus(r.end_of_contract);
              return (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl ${av(r.name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>{r.name[0]}</div>
                      <div>
                        <p className="font-semibold text-slate-800">{r.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.nik}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${deptColor(r.department)}`}>{r.department}</span></Td>
                  <Td><span className="text-slate-600">{r.position}</span></Td>
                  <Td><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{r.shift || '–'}</span></Td>
                  <Td>
                    {eoc
                      ? <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${eoc.cls}`}>{eoc.label}</span>
                      : <span className="text-slate-300 text-xs">–</span>}
                  </Td>
                  <Td><span className="text-slate-400 text-xs">{r.join_date}</span></Td>
                  <Td>
                    <div className="flex gap-1">
                      {isAdmin && <>
                        <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
                        <button onClick={() => setDelId(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
                      </>}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </Card>
      </>}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="NIK *" value={form.nik} onChange={f('nik')} placeholder="FO001"/>
            <Input label="Nama Lengkap *" value={form.name} onChange={f('name')} placeholder="Nama karyawan"/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Departemen *" value={form.department} onChange={f('department')} placeholder="Frontline, F&B..."/>
            <Input label="Jabatan *" value={form.position} onChange={f('position')} placeholder="Receptionist..."/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Shift" value={form.shift} onChange={f('shift')}>
              {SHIFTS.map(s => <option key={s}>{s}</option>)}
            </Select>
            <Input label="End of Contract" type="date" value={form.end_of_contract} onChange={f('end_of_contract')}/>
          </div>
          <Input label="Tanggal Bergabung *" type="date" value={form.join_date} onChange={f('join_date')}/>
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={() => setModal(false)} className="flex-1 justify-center">Batal</Button>
            <Button onClick={save} disabled={saving} className="flex-1 justify-center">{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={del}
        title="Hapus Karyawan?" message="Data karyawan dan semua riwayat trainingnya akan dihapus permanen."/>
    </div>
  );
}
