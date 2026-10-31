import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Camera, Eye, EyeOff, LogOut, Moon, ShieldCheck, Sun, Trash2, User, SlidersHorizontal } from 'lucide-react';
import { api, errDetails, errMsg, flattenDetails } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAction } from '../hooks/useApi';
import { changePasswordSchema } from '../utils/password';
import { LANGUAGES, NOTIFICATION_PREFS, THEMES } from '../utils/optionSpecs';
import { formatDate, formatDateTime, todayISO } from '../utils/format';
import { ROLE_LABEL } from '../layouts/nav';
import Avatar from '../components/Avatar';
import DynamicForm, { cleanValues, toFormValues } from '../components/DynamicForm';
import { ConfirmDialog } from '../components/Modal';
import PasswordChecklist from '../components/PasswordChecklist';
import { Badge, Button, Card, Field, PageHeader, Switch, Tabs, tabPanelProps, cx } from '../components/ui';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
];

// ---------------------------------------------------------------- Profile
function ReadOnlyItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value || '—'}</dd>
    </div>
  );
}

function ProfileTab() {
  const { user, refreshUser, photoVersion, bumpPhoto } = useAuth();
  const fileRef = useRef(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const fields = [
    { name: 'full_name', label: 'Full name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'dob', label: 'Date of birth', type: 'date', max: todayISO() },
    { name: 'address', label: 'Address', type: 'textarea', rows: 3 },
  ];

  const afterPhoto = async () => {
    await refreshUser().catch(() => {});
    bumpPhoto();
  };

  const uploadPhoto = useAction(
    (file) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.post('/profile/photo', fd);
    },
    { success: 'Photo updated', onSuccess: afterPhoto }
  );
  const removePhoto = useAction(() => api.del('/profile/photo'), {
    success: 'Photo removed',
    onSuccess: async () => {
      setConfirmRemove(false);
      await afterPhoto();
    },
  });

  const onPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) return toast.error('Please choose a PNG or JPG image.');
    if (file.size > 2 * 1024 * 1024) return toast.error('The photo must be 2 MB or smaller.');
    uploadPhoto.mutate(file);
  };

  const save = async (vals) => {
    await api.patch('/profile', cleanValues(fields, vals, { mode: 'edit' }));
    await refreshUser().catch(() => {});
    toast.success('Profile updated');
  };

  const s = user.student;
  const f = user.faculty;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6">
        <Card className="flex flex-col items-center text-center">
          <Avatar name={user.full_name} src={user.photo_url} version={photoVersion} size={96} />
          <p className="mt-3 text-base font-semibold">{user.full_name}</p>
          <Badge tone="blue" className="mt-1">
            {ROLE_LABEL[user.role]}
          </Badge>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onPick} />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="secondary" icon={Camera} loading={uploadPhoto.isPending} onClick={() => fileRef.current?.click()}>
              {user.photo_url ? 'Change photo' : 'Upload photo'}
            </Button>
            {user.photo_url && (
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirmRemove(true)}>
                Remove
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">PNG or JPG, up to 2 MB.</p>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Account</h3>
          <dl className="grid grid-cols-2 gap-4">
            <ReadOnlyItem label="Username" value={user.username} />
            <ReadOnlyItem label="Role" value={ROLE_LABEL[user.role]} />
            {s && (
              <>
                <ReadOnlyItem label="Roll no." value={s.roll_no} />
                <ReadOnlyItem label="Class" value={s.class_level && `Class ${s.class_level}`} />
                <ReadOnlyItem label="Batch" value={s.batch_name} />
                <ReadOnlyItem label="Stream" value={s.stream} />
                <div className="col-span-2">
                  <ReadOnlyItem label="Target exams" value={(s.exam_names || []).join(', ')} />
                </div>
              </>
            )}
            {f && (
              <>
                <ReadOnlyItem label="Employee code" value={f.employee_code} />
                <ReadOnlyItem label="Joined" value={f.joining_date && formatDate(f.joining_date)} />
                <div className="col-span-2">
                  <ReadOnlyItem label="Qualification" value={f.qualification} />
                </div>
                <div className="col-span-2">
                  <ReadOnlyItem label="Specialization" value={f.specialization} />
                </div>
              </>
            )}
          </dl>
        </Card>
      </div>

      <Card className="lg:col-span-2">
        <h3 className="mb-4 text-base font-semibold">Personal details</h3>
        <DynamicForm fields={fields} defaultValues={toFormValues(fields, user)} onSubmit={save} submitLabel="Save changes" />
      </Card>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove profile photo?"
        message="Your initials will be shown instead."
        confirmLabel="Remove"
        danger
        loading={removePhoto.isPending}
        onConfirm={() => removePhoto.mutate()}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  );
}

// --------------------------------------------------------------- Security
const pwSchema = changePasswordSchema('Enter your current password');

function SecurityTab() {
  const { user, setUser, endSession } = useAuth();
  const [show, setShow] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(pwSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });
  const newPassword = watch('new_password');

  const onSubmit = async ({ current_password, new_password }) => {
    try {
      const res = await api.post('/auth/change-password', { current_password, new_password });
      if (res?.data?.id) setUser(res.data);
      toast.success('Password updated');
      reset();
    } catch (err) {
      let matched = false;
      Object.entries(flattenDetails(errDetails(err))).forEach(([k, msg]) => {
        if (['current_password', 'new_password'].includes(k)) {
          setError(k, { type: 'server', message: msg });
          matched = true;
        }
      });
      if (!matched) toast.error(errMsg(err));
    }
  };

  const logoutAll = useAction(() => api.post('/auth/logout-all'), {
    onSuccess: () => {
      endSession();
      toast.success('You have been signed out of all devices.');
    },
  });

  const type = show ? 'text' : 'password';
  const input = (name, autoComplete) => ({
    id: name,
    type,
    autoComplete,
    className: 'input',
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
    ...register(name),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-base font-semibold">Change password</h3>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field label="Current password" htmlFor="current_password" error={errors.current_password?.message}>
            <input {...input('current_password', 'current-password')} />
          </Field>
          <Field label="New password" htmlFor="new_password" error={errors.new_password?.message}>
            <input {...input('new_password', 'new-password')} />
          </Field>
          <PasswordChecklist value={newPassword} />
          <Field label="Confirm new password" htmlFor="confirm_password" error={errors.confirm_password?.message}>
            <input {...input('confirm_password', 'new-password')} />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            />
            {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            Show passwords
          </label>
          <Button type="submit" loading={isSubmitting}>
            Update password
          </Button>
        </form>
      </Card>

      <div className="space-y-6">
        <Card>
          <h3 className="mb-4 text-base font-semibold">Account activity</h3>
          <dl className="grid grid-cols-2 gap-4">
            <ReadOnlyItem label="Last sign-in" value={user.last_login && formatDateTime(user.last_login)} />
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Account status</dt>
              <dd className="mt-1">
                <Badge tone={user.is_active ? 'green' : 'red'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
              </dd>
            </div>
            <ReadOnlyItem label="Member since" value={user.created_at && formatDate(user.created_at)} />
          </dl>
        </Card>

        <Card>
          <h3 className="text-base font-semibold">Devices</h3>
          <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
            Signed in somewhere you no longer use? End every session, including this one.
          </p>
          <Button variant="secondary" icon={LogOut} onClick={() => setConfirmAll(true)}>
            Log out from all devices
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmAll}
        danger
        title="Log out from all devices?"
        message="You will be signed out here too and will need to sign in again."
        confirmLabel="Log out everywhere"
        loading={logoutAll.isPending}
        onConfirm={() => logoutAll.mutate()}
        onCancel={() => setConfirmAll(false)}
      />
    </div>
  );
}

// ------------------------------------------------------------ Preferences
function PreferencesTab() {
  const { user, theme, setTheme, setUser, refreshUser } = useAuth();
  const normalise = (p) => Object.fromEntries(NOTIFICATION_PREFS.map(({ key }) => [key, (p || {})[key] !== false]));
  const [prefs, setPrefs] = useState(() => normalise(user.notification_prefs));
  const [language, setLanguage] = useState(user.language || 'en');

  const save = async (patch, revert) => {
    try {
      const res = await api.patch('/profile/preferences', { theme, language, notification_prefs: prefs, ...patch });
      if (res?.data?.id) setUser(res.data);
      else await refreshUser().catch(() => {});
      toast.success('Preference saved', { id: 'pref-saved' });
    } catch (err) {
      revert?.();
      toast.error(errMsg(err));
    }
  };

  const toggle = (key, value) => {
    const before = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    save({ notification_prefs: next }, () => setPrefs(before));
  };

  const changeLanguage = (value) => {
    const before = language;
    setLanguage(value);
    save({ language: value }, () => setLanguage(before));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-4 text-base font-semibold">Appearance</h3>
        <fieldset>
          <legend className="label">Theme</legend>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map((t) => {
              const Icon = t.value === 'dark' ? Moon : Sun;
              return (
                <label key={t.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={t.value}
                    checked={theme === t.value}
                    onChange={() => setTheme(t.value)}
                    className="peer sr-only"
                  />
                  <span
                    className={cx(
                      'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 dark:peer-focus-visible:ring-accent-light',
                      theme === t.value
                        ? 'border-brand-700 bg-brand-50 text-brand-900 dark:border-accent dark:bg-slate-800 dark:text-accent-light'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {t.label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field label="Language" htmlFor="language" className="mt-5">
          <select id="language" className="input" value={language} onChange={(e) => changeLanguage(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <Card>
        <h3 className="mb-1 text-base font-semibold">Notifications</h3>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Choose what you want to hear about. Changes save instantly.</p>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {NOTIFICATION_PREFS.map((p) => (
            <li key={p.key} className="flex items-center justify-between gap-4 py-3">
              <label htmlFor={`pref-${p.key}`} className="cursor-pointer text-sm font-medium">
                {p.label}
              </label>
              <Switch id={`pref-${p.key}`} label={p.label} checked={prefs[p.key]} onChange={(v) => toggle(p.key, v)} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------- page
export default function Settings() {
  const [tab, setTab] = useState('profile');
  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile, security and preferences." />
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Settings sections" className="mb-6" />
      <div {...tabPanelProps(tab)} className="outline-none">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'preferences' && <PreferencesTab />}
      </div>
    </div>
  );
}
