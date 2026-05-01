import { useEffect, useState } from 'react';
import api from '../utils/api';
import { StatCard, Card, Badge, CATEGORY_COLORS, Spinner, EmptyState } from '../components/UI';
import { Users, BookOpen, Clock, TrendingUp, AlertCircle, GraduationCap } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Area, AreaChart
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <b>{p.value}</b></p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-slate-400">Memuat data...</p>
    </div>
  );
  if (!data) return null;

  const monthLabels = {
    '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'Mei','06':'Jun',
    '07':'Jul','08':'Agu','09':'Sep','10':'Okt','11':'Nov','12':'Des'
  };
  const trendData = data.monthlyTrend.map(r => ({
    month: r.month.replace(/(\d{4})-(\d{2})/, (_, y, m) => `${monthLabels[m]}'${y.slice(2)}`),
    peserta: r.count
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
          <GraduationCap size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Ringkasan aktivitas training L&D</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={<Users size={20}/>}     label="Total Karyawan"       value={data.totalEmployees}      sub="Terdaftar di sistem"     color="indigo"/>
        <StatCard icon={<BookOpen size={20}/>}   label="Program Training"     value={data.totalPrograms}       sub="Total program tersedia"  color="purple"/>
        <StatCard icon={<Clock size={20}/>}      label="Jam Training"         value={`${data.hoursThisMonth}j`} sub="Bulan ini"              color="orange"/>
        <StatCard icon={<TrendingUp size={20}/>} label="Completion Rate"      value={`${data.completionRate}%`} sub="Keseluruhan peserta"    color="green"/>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-800">Training per Departemen</h3>
              <p className="text-xs text-slate-400 mt-0.5">Jumlah peserta yang hadir/selesai</p>
            </div>
          </div>
          {data.byDepartment.length === 0
            ? <EmptyState icon="📊" title="Belum ada data" />
            : <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byDepartment} margin={{top:0,right:0,left:-25,bottom:0}} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="department" tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip />} cursor={{fill:'#f8fafc'}}/>
                  <Bar dataKey="count" name="Peserta" fill="#6366f1" radius={[6,6,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
          }
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-800">Tren Training</h3>
              <p className="text-xs text-slate-400 mt-0.5">12 bulan terakhir</p>
            </div>
          </div>
          {trendData.length === 0
            ? <EmptyState icon="📈" title="Belum ada data" />
            : <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{top:0,right:0,left:-25,bottom:0}}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="month" tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip />}/>
                  <Area type="monotone" dataKey="peserta" name="Peserta" stroke="#6366f1" strokeWidth={2.5} fill="url(#trendGrad)" dot={{r:3, fill:'#6366f1'}}/>
                </AreaChart>
              </ResponsiveContainer>
          }
        </Card>
      </div>

      {/* Bottom tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent trainings */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-4">Training Terbaru</h3>
          {data.recentTrainings.length === 0
            ? <EmptyState icon="📋" title="Belum ada jadwal training" />
            : <div className="space-y-2.5">
                {data.recentTrainings.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                      <BookOpen size={15} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{t.training_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{t.start_date} · {t.participant_count} peserta</p>
                    </div>
                    <Badge color={CATEGORY_COLORS[t.category]}>{t.category}</Badge>
                  </div>
                ))}
              </div>
          }
        </Card>

        {/* Never trained */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <AlertCircle size={14} className="text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Belum Pernah Training</h3>
              <p className="text-xs text-slate-400">Perlu perhatian khusus</p>
            </div>
          </div>
          {data.neverTrained.length === 0
            ? <EmptyState icon="🎉" title="Semua karyawan sudah training!" />
            : <div className="space-y-2">
                {data.neverTrained.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-orange-50">
                    <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-xs font-bold text-orange-700 shrink-0">
                      {e.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{e.name}</p>
                      <p className="text-xs text-slate-400">{e.department} · {e.position}</p>
                    </div>
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold shrink-0">0 training</span>
                  </div>
                ))}
              </div>
          }
        </Card>
      </div>
    </div>
  );
}
