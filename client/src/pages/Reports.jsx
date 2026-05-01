import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Card, Button, Badge, PageHeader, Spinner, EmptyState, STATUS_COLORS, CATEGORY_COLORS, MobileCard } from '../components/UI';
import { Download, Search, BarChart3, User, Building2, BookOpen } from 'lucide-react';

const TABS = [
  { key:'Karyawan',    icon: User,       label:'Per Karyawan' },
  { key:'Program',     icon: BookOpen,   label:'Per Program' },
  { key:'Departemen',  icon: Building2,  label:'Per Departemen' },
];

const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function Reports() {
  const [tab, setTab] = useState('Karyawan');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const curYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => String(curYear - i));
  const [filters, setFilters] = useState({ employee_id:'', training_id:'', department:'', year:'', month:'' });
  const filt = k => e => setFilters(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    api.get('/employees', { params: { limit: 200 } }).then(r => setEmployees(r.data.data));
    api.get('/programs').then(r => setPrograms(r.data));
    api.get('/employees/departments').then(r => setDepartments(r.data));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'Karyawan' ? '/dashboard/by-employee'
        : tab === 'Program' ? '/dashboard/by-program'
        : '/dashboard/by-department';
      const params = {};
      if (tab === 'Karyawan' && filters.employee_id) params.employee_id = filters.employee_id;
      if (tab === 'Program' && filters.training_id) params.training_id = filters.training_id;
      if (tab === 'Departemen' && filters.department) params.department = filters.department;
      if (filters.year) params.year = filters.year;
      if (filters.month) params.month = filters.month;
      const r = await api.get(endpoint, { params });
      setRows(r.data);
    } finally { setLoading(false); }
  };

  const exportCsv = () => {
    const type = tab === 'Karyawan' ? 'employee' : tab === 'Program' ? 'program' : 'department';
    const params = new URLSearchParams({ type });
    if (tab === 'Karyawan' && filters.employee_id) params.append('employee_id', filters.employee_id);
    if (tab === 'Departemen' && filters.department) params.append('department', filters.department);
    if (filters.year) params.append('year', filters.year);
    if (filters.month) params.append('month', filters.month);
    window.open(`/api/dashboard/export-csv?${params.toString()}`);
  };

  const avatarBg = ['bg-indigo-500','bg-purple-500','bg-blue-500','bg-teal-500','bg-emerald-500','bg-orange-500','bg-pink-500','bg-cyan-500'];
  const av = name => avatarBg[(name || '').charCodeAt(0) % avatarBg.length];

  const selectClass = "border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 bg-slate-50 transition-all";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laporan Training"
        sub="Analisis dan rekap data training per periode"
        actions={rows.length > 0 && (
          <Button variant="secondary" size="sm" onClick={exportCsv}><Download size={13}/> Export CSV</Button>
        )}
      />

      {/* Tab selector */}
      <div className="flex gap-1 p-1.5 bg-slate-100 rounded-2xl w-full sm:w-fit overflow-x-auto">
        {TABS.map(({ key, icon: Icon, label }) => (
          <button key={key}
            onClick={() => { setTab(key); setRows([]); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-1 sm:flex-none justify-center
              ${tab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon size={14}/>
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{key}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {tab === 'Karyawan' && (
            <div className="flex-1 min-w-44">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Karyawan</label>
              <select className={`w-full ${selectClass}`} value={filters.employee_id} onChange={filt('employee_id')}>
                <option value="">Semua Karyawan</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.nik})</option>)}
              </select>
            </div>
          )}
          {tab === 'Program' && (
            <div className="flex-1 min-w-44">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Program Training</label>
              <select className={`w-full ${selectClass}`} value={filters.training_id} onChange={filt('training_id')}>
                <option value="">Semua Program</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          {tab === 'Departemen' && (
            <div className="flex-1 min-w-44">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Departemen</label>
              <select className={`w-full ${selectClass}`} value={filters.department} onChange={filt('department')}>
                <option value="">Semua Departemen</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Tahun</label>
            <select className={selectClass} value={filters.year} onChange={filt('year')}>
              <option value="">Semua</option>
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Bulan</label>
            <select className={selectClass} value={filters.month} onChange={filt('month')}>
              <option value="">Semua</option>
              {MONTHS.map((m,i) => <option key={m} value={m}>{MONTH_NAMES[i]}</option>)}
            </select>
          </div>
          <Button onClick={load} className="self-end"><Search size={14}/> Tampilkan</Button>
        </div>
      </Card>

      {/* Results */}
      {loading && <div className="flex justify-center py-16"><Spinner size="lg"/></div>}

      {!loading && rows.length === 0 && (
        <Card>
          <EmptyState icon="📊" title="Belum ada data ditampilkan" sub="Pilih filter di atas lalu klik 'Tampilkan' untuk melihat laporan"/>
        </Card>
      )}

      {/* Karyawan results */}
      {!loading && rows.length > 0 && tab === 'Karyawan' && (
        <>
          <div className="text-sm text-slate-500 px-1">{rows.length} data ditemukan</div>
          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {rows.map((r, i) => (
              <MobileCard key={i}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl ${av(r.name)} flex items-center justify-center text-sm font-bold text-white shrink-0`}>{r.name?.[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.department}</p>
                  </div>
                  <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge>
                </div>
                <p className="font-semibold text-slate-700 text-sm">{r.training_name}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge color={CATEGORY_COLORS[r.category]}>{r.category}</Badge>
                  <span className="text-xs text-slate-400">{r.start_date}</span>
                  {r.score != null && <span className={`text-xs font-bold ${r.score >= 70 ? 'text-emerald-600' : 'text-red-500'}`}>Nilai: {r.score}</span>}
                </div>
              </MobileCard>
            ))}
          </div>
          {/* Desktop */}
          <Card className="hidden sm:block">
            <div className="px-5 py-3 border-b border-slate-100 text-sm text-slate-500 font-medium">{rows.length} data ditemukan</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Karyawan','Departemen','Program Training','Kategori','Tanggal','Status','Nilai','Durasi'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest first:pl-5">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                      <td className="px-4 py-3.5 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-xl ${av(r.name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>{r.name?.[0]}</div>
                          <div><p className="font-semibold text-slate-800">{r.name}</p><p className="text-xs text-slate-400">{r.nik}</p></div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{r.department}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">{r.training_name}</td>
                      <td className="px-4 py-3.5"><Badge color={CATEGORY_COLORS[r.category]}>{r.category}</Badge></td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{r.start_date}</td>
                      <td className="px-4 py-3.5"><Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge></td>
                      <td className="px-4 py-3.5">{r.score != null ? <span className={`font-bold ${r.score >= 70 ? 'text-emerald-600' : 'text-red-500'}`}>{r.score}</span> : <span className="text-slate-300">–</span>}</td>
                      <td className="px-4 py-3.5 text-slate-600">{r.duration_hours}j</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Program results */}
      {!loading && rows.length > 0 && tab === 'Program' && (
        <>
          <div className="text-sm text-slate-500 px-1">{rows.length} data ditemukan</div>
          <div className="sm:hidden space-y-3">
            {rows.map((r, i) => (
              <MobileCard key={i}>
                <p className="font-bold text-slate-800 mb-1">{r.training_name}</p>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-xl ${av(r.employee_name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>{r.employee_name?.[0]}</div>
                  <div><p className="font-semibold text-slate-700 text-sm">{r.employee_name}</p><p className="text-xs text-slate-400">{r.department}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge>
                  <span className="text-xs text-slate-400">{r.start_date}</span>
                  {r.score != null && <span className={`text-xs font-bold ${r.score >= 70 ? 'text-emerald-600' : 'text-red-500'}`}>Nilai: {r.score}</span>}
                </div>
              </MobileCard>
            ))}
          </div>
          <Card className="hidden sm:block">
            <div className="px-5 py-3 border-b border-slate-100 text-sm text-slate-500 font-medium">{rows.length} data ditemukan</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Program','Peserta','Departemen','Jabatan','Tanggal','Status','Nilai'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest first:pl-5">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                      <td className="px-4 py-3.5 pl-5"><p className="font-semibold text-slate-800">{r.training_name}</p><div className="mt-1"><Badge color={CATEGORY_COLORS[r.category]}>{r.category}</Badge></div></td>
                      <td className="px-4 py-3.5"><div className="flex items-center gap-2"><div className={`w-7 h-7 rounded-xl ${av(r.employee_name)} flex items-center justify-center text-xs font-bold text-white shrink-0`}>{r.employee_name?.[0]}</div><div><p className="font-semibold text-slate-800">{r.employee_name}</p><p className="text-xs text-slate-400">{r.nik}</p></div></div></td>
                      <td className="px-4 py-3.5 text-slate-600">{r.department}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-sm">{r.position}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{r.start_date}</td>
                      <td className="px-4 py-3.5"><Badge color={STATUS_COLORS[r.status]}>{r.status}</Badge></td>
                      <td className="px-4 py-3.5">{r.score != null ? <span className={`font-bold ${r.score >= 70 ? 'text-emerald-600' : 'text-red-500'}`}>{r.score}</span> : <span className="text-slate-300">–</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Departemen results */}
      {!loading && rows.length > 0 && tab === 'Departemen' && (
        <>
          <div className="text-sm text-slate-500 px-1">{rows.length} departemen</div>
          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            {rows.map((r, i) => (
              <MobileCard key={i}>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-slate-800 text-base">{r.department}</p>
                  {r.avg_score != null && (
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${r.avg_score >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                      Rata-rata: {r.avg_score}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-400">Total Karyawan</p><p className="font-bold text-indigo-600 text-xl mt-0.5">{r.total_employees}</p></div>
                  <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-400">Partisipasi</p><p className="font-bold text-slate-800 text-xl mt-0.5">{r.total_participations}</p></div>
                  <div className="bg-emerald-50 rounded-xl p-3"><p className="text-xs text-slate-400">Selesai</p><p className="font-bold text-emerald-600 text-xl mt-0.5">{r.completed}</p></div>
                  <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-400">Total Jam</p><p className="font-bold text-slate-800 text-xl mt-0.5">{r.total_hours || 0}j</p></div>
                </div>
              </MobileCard>
            ))}
          </div>
          {/* Desktop */}
          <Card className="hidden sm:block">
            <div className="px-5 py-3 border-b border-slate-100 text-sm text-slate-500 font-medium">{rows.length} departemen</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Departemen','Total Karyawan','Total Partisipasi','Selesai','Absen','Rata-rata Nilai','Total Jam'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest first:pl-5">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                      <td className="px-4 py-4 pl-5 font-bold text-slate-800">{r.department}</td>
                      <td className="px-4 py-4 font-bold text-indigo-600 text-lg">{r.total_employees}</td>
                      <td className="px-4 py-4 font-semibold text-slate-700">{r.total_participations}</td>
                      <td className="px-4 py-4 font-bold text-emerald-600">{r.completed}</td>
                      <td className="px-4 py-4 font-bold text-red-500">{r.absent}</td>
                      <td className="px-4 py-4">{r.avg_score != null ? <span className={`font-bold text-base ${r.avg_score >= 70 ? 'text-emerald-600' : 'text-orange-500'}`}>{r.avg_score}</span> : <span className="text-slate-300">–</span>}</td>
                      <td className="px-4 py-4 font-semibold text-slate-700">{r.total_hours || 0} jam</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
