import { useState } from 'react';
import { Check, Copy, KeyRound, ShieldAlert, UserCheck, UserX, Users as UsersIcon } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAction } from '../hooks/useApi';
import { formatDateTime, todayISO } from '../utils/format';
import { ACTIVE_STATUS, CLASS_LEVELS, ROLES, batchOptions, examOptions } from '../utils/optionSpecs';
import { ROLE_LABEL, ROLE_TONE } from '../layouts/nav';
import Avatar from '../components/Avatar';
import ResourcePage from '../components/ResourcePage';
import { ConfirmDialog, Modal } from '../components/Modal';
import { Badge, Button } from '../components/ui';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

// Shown once, right after a user is created or their password is reset.
function TempPasswordDialog({ info, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(info.password)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <Modal
      open={!!info}
      onClose={onClose}
      dismissible={false}
      size="sm"
      title="Temporary password"
      footer={<Button onClick={onClose}>Done</Button>}
    >
      {info && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Share this password with <strong>{info.name}</strong> (<span className="font-mono">{info.username}</span>). They must change it
            when they first sign in.
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <code className="min-w-0 flex-1 select-all break-all text-base font-semibold tracking-wide">{info.password}</code>
            <Button size="sm" variant="secondary" icon={copied ? Check : Copy} onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300" role="note">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            This is the only time the password is shown. Copy it before closing.
          </p>
        </div>
      )}
    </Modal>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const [tempPw, setTempPw] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: 'reset' | 'activate' | 'deactivate', row }

  const refresh = ['users', 'options'];

  const reset = useAction((row) => api.post(`/users/${row.id}/reset-password`), {
    invalidate: refresh,
    onSuccess: (res, row) => {
      setConfirm(null);
      setTempPw({ name: row.full_name, username: row.username, password: res.temporary_password });
    },
  });
  const toggle = useAction((row) => api.post(`/users/${row.id}/${row.is_active ? 'deactivate' : 'activate'}`), {
    invalidate: refresh,
    success: (_r, row) => `${row.full_name} ${row.is_active ? 'deactivated' : 'activated'}`,
    onSuccess: () => setConfirm(null),
  });

  // All fields for every role; role-specific ones hide themselves.
  const fields = [
    { name: 'full_name', label: 'Full name', required: true },
    { name: 'role', label: 'Role', type: 'select', options: ROLES, required: true, defaultValue: 'STUDENT', lockOnEdit: true },
    { name: 'username', label: 'Username', required: true, lockOnEdit: true, autoComplete: 'off' },
    { name: 'email', label: 'Email', type: 'email', required: true },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      createOnly: true,
      omitEmpty: true,
      hint: 'Leave blank to generate a temporary password.',
    },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'dob', label: 'Date of birth', type: 'date', max: todayISO() },
    { name: 'address', label: 'Address', type: 'textarea', rows: 2 },

    // Student
    { name: 'student.class_level', label: 'Class', type: 'select', options: CLASS_LEVELS, required: true, hidden: (v) => v.role !== 'STUDENT' },
    { name: 'student.batch_id', label: 'Batch', type: 'select', optionsSpec: batchOptions, hidden: (v) => v.role !== 'STUDENT' },
    { name: 'student.stream', label: 'Stream', hidden: (v) => v.role !== 'STUDENT' },
    { name: 'student.roll_no', label: 'Roll number', hidden: (v) => v.role !== 'STUDENT' },
    { name: 'student.parent_name', label: 'Parent / guardian name', hidden: (v) => v.role !== 'STUDENT' },
    { name: 'student.parent_phone', label: 'Parent phone', type: 'tel', hidden: (v) => v.role !== 'STUDENT' },
    { name: 'student.admission_date', label: 'Admission date', type: 'date', hidden: (v) => v.role !== 'STUDENT' },
    { name: 'student.exam_ids', label: 'Target exams', type: 'multiselect', optionsSpec: examOptions, hidden: (v) => v.role !== 'STUDENT' },

    // Faculty
    { name: 'faculty.employee_code', label: 'Employee code', hidden: (v) => v.role !== 'FACULTY' },
    { name: 'faculty.joining_date', label: 'Joining date', type: 'date', hidden: (v) => v.role !== 'FACULTY' },
    { name: 'faculty.qualification', label: 'Qualification', hidden: (v) => v.role !== 'FACULTY' },
    { name: 'faculty.specialization', label: 'Specialization', hidden: (v) => v.role !== 'FACULTY' },
  ];

  const isSelf = (row) => row.id === me.id;

  const rowActions = [
    {
      id: 'reset',
      label: (r) => `Reset password for ${r.full_name}`,
      icon: KeyRound,
      onClick: (row) => setConfirm({ type: 'reset', row }),
      show: (r) => !isSelf(r),
    },
    {
      id: 'deactivate',
      label: (r) => `Deactivate ${r.full_name}`,
      icon: UserX,
      onClick: (row) => setConfirm({ type: 'toggle', row }),
      show: (r) => r.is_active && !isSelf(r),
    },
    {
      id: 'activate',
      label: (r) => `Activate ${r.full_name}`,
      icon: UserCheck,
      onClick: (row) => setConfirm({ type: 'toggle', row }),
      show: (r) => !r.is_active && !isSelf(r),
    },
  ];

  const details = (r) => {
    if (r.student) {
      return [r.student.roll_no, r.student.class_level && `Class ${r.student.class_level}`, r.student.batch_name].filter(Boolean).join(' · ');
    }
    if (r.faculty) return [r.faculty.employee_code, r.faculty.specialization].filter(Boolean).join(' · ');
    return '';
  };

  const confirmCfg =
    confirm?.type === 'reset'
      ? {
          title: 'Reset password?',
          message: `A new temporary password will be generated for ${confirm.row.full_name}. Their current password stops working.`,
          label: 'Reset password',
          danger: true,
          loading: reset.isPending,
          run: () => reset.mutate(confirm.row),
        }
      : confirm
      ? {
          title: confirm.row.is_active ? 'Deactivate user?' : 'Activate user?',
          message: confirm.row.is_active
            ? `${confirm.row.full_name} will no longer be able to sign in.`
            : `${confirm.row.full_name} will be able to sign in again.`,
          label: confirm.row.is_active ? 'Deactivate' : 'Activate',
          danger: confirm.row.is_active,
          loading: toggle.isPending,
          run: () => toggle.mutate(confirm.row),
        }
      : null;

  return (
    <>
      <ResourcePage
        title="Users"
        subtitle="Create and manage student, faculty and admin accounts."
        noun="User"
        endpoint="/users"
        queryKey="users"
        fields={fields}
        formDefaults={{ role: 'STUDENT' }}
        modalSize="lg"
        createLabel="Add user"
        itemName={(r) => r.full_name}
        searchPlaceholder="Search name, username or email…"
        filters={[
          { name: 'role', label: 'Role', options: ROLES, allLabel: 'All roles' },
          { name: 'is_active', label: 'Status', options: ACTIVE_STATUS, allLabel: 'All statuses' },
        ]}
        canDelete={(r) => !isSelf(r)}
        rowActions={rowActions}
        emptyIcon={UsersIcon}
        emptyMessage="Add your first student, faculty member or admin."
        onSaved={(res, vars) => {
          if (vars.mode === 'create' && res?.temporary_password) {
            setTempPw({
              name: res.data?.full_name || vars.payload.full_name,
              username: res.data?.username || vars.payload.username,
              password: res.temporary_password,
            });
          }
        }}
        columns={[
          {
            key: 'user',
            header: 'User',
            render: (r) => (
              <div className="flex items-center gap-3">
                <Avatar name={r.full_name} src={r.photo_url} size={36} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-white">{r.full_name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    @{r.username} · {r.email}
                  </p>
                </div>
              </div>
            ),
          },
          { key: 'role', header: 'Role', render: (r) => <Badge tone={ROLE_TONE[r.role]}>{ROLE_LABEL[r.role]}</Badge> },
          { key: 'details', header: 'Details', render: (r) => details(r) || '—' },
          {
            key: 'status',
            header: 'Status',
            render: (r) => (
              <div className="flex flex-wrap gap-1">
                <Badge tone={r.is_active ? 'green' : 'red'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                {r.must_change_password && <Badge tone="amber">Temp password</Badge>}
              </div>
            ),
          },
          { key: 'last_login', header: 'Last sign-in', render: (r) => (r.last_login ? formatDateTime(r.last_login) : 'Never'), className: 'whitespace-nowrap' },
        ]}
      />

      <TempPasswordDialog info={tempPw} onClose={() => setTempPw(null)} />

      <ConfirmDialog
        open={!!confirm}
        title={confirmCfg?.title}
        message={confirmCfg?.message}
        confirmLabel={confirmCfg?.label}
        danger={confirmCfg?.danger}
        loading={confirmCfg?.loading}
        onConfirm={() => confirmCfg?.run()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
