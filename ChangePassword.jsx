// Forced on first login with a temporary password; also the only page such a
// user can reach until the password is changed.
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, errDetails, errMsg, flattenDetails } from '../api/client';
import { newPasswordSchema } from '../utils/password';
import Brand from '../components/Brand';
import PasswordChecklist from '../components/PasswordChecklist';
import { Button, Card, Field } from '../components/ui';

const schema = z
  .object({
    current_password: z.string().min(1, 'Enter your temporary password'),
    new_password: newPasswordSchema,
    confirm_password: z.string().min(1, 'Confirm your new password'),
  })
  .superRefine((v, ctx) => {
    if (v.new_password && v.confirm_password && v.new_password !== v.confirm_password) {
      ctx.addIssue({ code: 'custom', path: ['confirm_password'], message: 'Passwords do not match' });
    }
    if (v.new_password && v.new_password === v.current_password) {
      ctx.addIssue({ code: 'custom', path: ['new_password'], message: 'New password must be different from the current one' });
    }
  });

export default function ChangePassword() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });
  const newPassword = watch('new_password');

  // Only users who must change their password belong here.
  if (!user.must_change_password) return <Navigate to="/dashboard" replace />;

  const onSubmit = async ({ current_password, new_password }) => {
    try {
      const res = await api.post('/auth/change-password', { current_password, new_password });
      toast.success('Password updated. Welcome aboard!');
      setUser(res.data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const flat = flattenDetails(errDetails(err));
      const names = ['current_password', 'new_password'];
      let matched = false;
      Object.entries(flat).forEach(([k, msg]) => {
        if (names.includes(k)) {
          setError(k, { type: 'server', message: msg });
          matched = true;
        }
      });
      if (!matched) toast.error(errMsg(err));
    }
  };

  const type = show ? 'text' : 'password';
  const fieldProps = (name) => ({
    id: name,
    type,
    className: 'input',
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
    ...register(name),
  });

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Brand className="mb-6 justify-center" />
        <Card className="!p-6 sm:!p-8">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-accent-light">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-semibold">Set a new password</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Hi {user.full_name}. For your security, replace your temporary password before continuing.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Field label="Temporary password" htmlFor="current_password" error={errors.current_password?.message}>
              <input autoComplete="current-password" {...fieldProps('current_password')} />
            </Field>
            <Field label="New password" htmlFor="new_password" error={errors.new_password?.message}>
              <input autoComplete="new-password" {...fieldProps('new_password')} />
            </Field>
            <PasswordChecklist value={newPassword} />
            <Field label="Confirm new password" htmlFor="confirm_password" error={errors.confirm_password?.message}>
              <input autoComplete="new-password" {...fieldProps('confirm_password')} />
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

            <Button type="submit" className="w-full" loading={isSubmitting}>
              Update password
            </Button>
          </form>
        </Card>

        <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" icon={LogOut} onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </main>
  );
}
