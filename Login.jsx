import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { BarChart3, BookOpenCheck, Eye, EyeOff, GraduationCap, ShieldCheck, Moon, Sun, Users, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';
import { ROLES } from '../utils/optionSpecs';
import Brand from '../components/Brand';
import { Button, Field, Tabs, tabPanelProps } from '../components/ui';

const schema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});

const ROLE_TABS = ROLES.map((r) => ({
  id: r.value,
  label: r.label,
  icon: { STUDENT: GraduationCap, FACULTY: Users, ADMIN: ShieldCheck }[r.value],
}));

// Feature bullets are static marketing copy, not data.
const FEATURES = [
  { icon: ClipboardList, text: 'Timed mock tests with instant, detailed result review' },
  { icon: BookOpenCheck, text: 'Study material and previous-year papers in one place' },
  { icon: BarChart3, text: 'Attendance, fees and performance, always up to date' },
];

function Illustration() {
  return (
    <svg
      viewBox="0 0 420 300"
      className="w-full max-w-md"
      role="img"
      aria-label="A stack of books with a graduation cap beside a rising bar chart"
    >
      <defs>
        <linearGradient id="amber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <ellipse cx="210" cy="276" rx="190" ry="10" fill="#000" opacity=".18" />

      {/* rising chart */}
      <rect x="250" y="196" width="30" height="72" rx="7" fill="#8fa9ff" opacity=".45" />
      <rect x="289" y="164" width="30" height="104" rx="7" fill="#8fa9ff" opacity=".65" />
      <rect x="328" y="124" width="30" height="144" rx="7" fill="#bccdff" opacity=".85" />
      <rect x="367" y="80" width="30" height="188" rx="7" fill="url(#amber)" />
      <path d="M252 176 L304 146 L342 112 L384 60" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M366 58 L386 58 L384 78" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* books */}
      <rect x="28" y="232" width="206" height="36" rx="7" fill="#3d57d6" />
      <rect x="40" y="232" width="8" height="36" fill="#fbbf24" />
      <rect x="196" y="244" width="30" height="4" rx="2" fill="#fff" opacity=".6" />
      <rect x="46" y="194" width="172" height="38" rx="7" fill="url(#amber)" />
      <rect x="58" y="194" width="8" height="38" fill="#18235c" opacity=".35" />
      <rect x="170" y="207" width="36" height="4" rx="2" fill="#18235c" opacity=".45" />
      <rect x="36" y="158" width="190" height="36" rx="7" fill="#fff" />
      <rect x="50" y="158" width="8" height="36" fill="#273a9f" />
      <rect x="186" y="170" width="30" height="4" rx="2" fill="#273a9f" opacity=".5" />

      {/* graduation cap */}
      <path d="M96 118 v22 c0 12 70 12 70 0 v-22 l-35 14z" fill="#1f2f7d" />
      <polygon points="131,84 212,114 131,144 50,114" fill="#111a45" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinejoin="round" />
      <path d="M212 114 v34" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="212" cy="152" r="6" fill="#fbbf24" />
    </svg>
  );
}

export default function Login() {
  const { login, theme, setTheme } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('STUDENT');
  const [showPwd, setShowPwd] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } });

  const onSubmit = async ({ username, password }) => {
    try {
      const user = await login({ username: username.trim(), password, role });
      navigate(user.must_change_password ? '/change-password' : '/dashboard', { replace: true });
    } catch (err) {
      toast.error(errMsg(err, 'Could not sign in. Please try again.'));
      resetField('password');
      setFocus('password');
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel (hidden on mobile) */}
      <section
        aria-label="About StudyMate"
        className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 p-12 text-white lg:flex"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-accent-light ring-1 ring-white/25">
            <GraduationCap className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="font-heading text-lg font-semibold tracking-wide">STUDYMATE OF MOUNGIRI</p>
        </div>

        <div className="relative">
          <h1 className="max-w-md font-heading text-3xl font-semibold leading-tight text-white xl:text-4xl">
            Moungiri Coaching Classes – Your Smart Study Partner
          </h1>
          <div className="mt-8 flex justify-center">
            <Illustration />
          </div>
        </div>

        <ul className="relative space-y-3">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-center gap-3 text-sm text-brand-100">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-accent-light">
                <f.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </section>

      {/* Sign-in form */}
      <main className="relative flex items-center justify-center px-5 py-10 sm:px-10">
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
        </button>

        <div className="w-full max-w-md">
          <Brand className="mb-8 lg:hidden" />
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to continue to your account.</p>

          <Tabs tabs={ROLE_TABS} value={role} onChange={setRole} label="Sign in as" className="mb-6 w-full [&>button]:flex-1 [&>button]:justify-center" />

          <div {...tabPanelProps(role)} className="outline-none">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Field label="Username" htmlFor="username" error={errors.username?.message}>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  className="input"
                  aria-invalid={errors.username ? true : undefined}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                  {...register('username')}
                />
              </Field>

              <Field label="Password" htmlFor="password" error={errors.password?.message}>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="input !pr-11"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    aria-pressed={showPwd}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </Field>

              <Button type="submit" className="w-full" loading={isSubmitting}>
                {isSubmitting ? 'Signing in…' : `Sign in as ${ROLE_TABS.find((t) => t.id === role).label}`}
              </Button>
            </form>
          </div>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setShowForgot((s) => !s)}
              aria-expanded={showForgot}
              aria-controls="forgot-note"
              className="text-sm font-medium text-brand-700 hover:underline dark:text-accent-light"
            >
              Forgot password?
            </button>
            {showForgot && (
              <p
                id="forgot-note"
                role="status"
                className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900 dark:bg-slate-800 dark:text-slate-200"
              >
                Contact your administrator to reset your password.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
