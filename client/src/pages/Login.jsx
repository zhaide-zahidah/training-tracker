import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, GraduationCap, BookOpen, Users, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon: Users,    text: 'Manajemen data karyawan terpusat' },
  { icon: BookOpen, text: 'Kelola program & jadwal training' },
  { icon: BarChart3, text: 'Dashboard analitik & laporan lengkap' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');

  const handle = async e => {
    e.preventDefault();
    if (!form.username || !form.password) { setError('Username dan password wajib diisi'); return; }
    setLoading(true); setError('');
    try {
      await login(form.username, form.password);
      toast.success('Selamat datang!');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Username atau password salah');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-[52%] relative bg-gradient-to-br from-indigo-950 via-indigo-900 to-cyan-900 flex-col justify-between p-12 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 bg-white/10 backdrop-blur rounded-xl border border-white/20">
            <GraduationCap size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Training Tracker</p>
            <p className="text-indigo-300 text-xs">HR Learning & Development</p>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-5xl font-bold text-white leading-tight">
              Kelola Training<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-300">Lebih Cerdas</span>
            </h1>
            <p className="mt-4 text-indigo-200 text-base leading-relaxed max-w-sm">
              Platform terpadu untuk manajemen program pelatihan karyawan, penjadwalan, dan analitik L&D.
            </p>
          </div>
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
                  <Icon size={14} className="text-cyan-300" />
                </div>
                <span className="text-indigo-200 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-indigo-400 text-xs">© 2025 Training Tracker · HR L&D System</p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 bg-white min-h-screen lg:min-h-0">
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <GraduationCap size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-800">Training Tracker</p>
            <p className="text-xs text-slate-400">HR Learning & Development</p>
          </div>
        </div>

        <div className="w-full max-w-sm fade-in-up">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Selamat Datang 👋</h2>
            <p className="text-slate-500 text-sm mt-1.5">Masuk untuk mengelola program training</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <span className="shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handle} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Username</label>
              <div className={`relative rounded-xl border-2 transition-all duration-200 ${focused === 'username' ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-200 bg-slate-50'}`}>
                <input
                  className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none rounded-xl"
                  placeholder="Masukkan username"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused('')}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Password</label>
              <div className={`relative rounded-xl border-2 transition-all duration-200 ${focused === 'password' ? 'border-indigo-500 bg-indigo-50/40' : 'border-slate-200 bg-slate-50'}`}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="w-full bg-transparent px-4 py-3.5 pr-12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none rounded-xl"
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full mt-1 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 text-sm">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : 'Masuk ke Sistem'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            Training Tracker · HR Learning &amp; Development System
          </p>
        </div>
      </div>
    </div>
  );
}
