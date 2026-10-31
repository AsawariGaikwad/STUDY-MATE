import { useState } from 'react';
import { Layers, UserPlus, X } from 'lucide-react';
import { api, errMsg } from '../api/client';
import { useAction, useGet } from '../hooks/useApi';
import { formatDate } from '../utils/format';
import { ACTIVE_STATUS, CLASS_LEVELS, facultyOptions, subjectOptions } from '../utils/optionSpecs';
import DynamicForm, { cleanValues } from '../components/DynamicForm';
import { Modal } from '../components/Modal';
import ResourcePage from '../components/ResourcePage';
import { Badge, Button, ErrorState, IconButton, SkeletonText } from '../components/ui';

const batchFields = [
  { name: 'name', label: 'Name', required: true, full: true },
  { name: 'class_level', label: 'Class', type: 'select', options: CLASS_LEVELS, required: true },
  { name: 'academic_year', label: 'Academic year', required: true },
  { name: 'start_date', label: 'Start date', type: 'date' },
  {
    name: 'end_date',
    label: 'End date',
    type: 'date',
    validate: (v, vals) => !vals.start_date || v >= vals.start_date || 'End date must be on or after the start date',
  },
  { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
];

const assignFields = [
  { name: 'faculty_id', label: 'Faculty', type: 'select', optionsSpec: facultyOptions, required: true, placeholder: 'Select faculty…' },
  { name: 'subject_id', label: 'Subject', type: 'select', optionsSpec: subjectOptions, required: true, placeholder: 'Select subject…' },
];

function AssignmentsDialog({ batch, onClose }) {
  const [formKey, setFormKey] = useState(0);
  const refresh = ['batches', 'batch-assign'];

  // The table row is a snapshot; this query keeps the dialog current after changes.
  const live = useGet('batch-assign', '/batches', { q: batch?.name, per_page: 50 }, { enabled: !!batch });
  const current = live.data?.data?.find((b) => b.id === batch?.id) || batch;
  const assignments = current?.assignments || [];

  const add = useAction((payload) => api.post(`/batches/${batch.id}/assignments`, payload), {
    invalidate: refresh,
    success: 'Faculty assigned',
    toastError: false, // shown inside the form
    onSuccess: () => setFormKey((k) => k + 1),
  });
  const remove = useAction((id) => api.del(`/assignments/${id}`), {
    invalidate: refresh,
    success: 'Assignment removed',
  });

  return (
    <Modal
      open={!!batch}
      onClose={onClose}
      size="lg"
      title={batch ? `Faculty for ${batch.name}` : 'Faculty'}
      description="Choose which faculty member teaches which subject in this batch."
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      {batch && (
        <div className="space-y-6">
          <section aria-label="Current assignments">
            <h3 className="mb-2 text-sm font-semibold">Current assignments</h3>
            {live.isError && !current ? (
              <ErrorState message={errMsg(live.error)} onRetry={() => live.refetch()} />
            ) : live.isLoading && !assignments.length ? (
              <SkeletonText lines={3} />
            ) : assignments.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                No faculty assigned yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <p className="min-w-0 text-sm">
                      <span className="font-medium">{a.faculty_name}</span>
                      <span className="text-slate-500 dark:text-slate-400"> teaches </span>
                      <Badge tone="blue">{a.subject_name}</Badge>
                    </p>
                    <IconButton
                      icon={X}
                      tone="danger"
                      label={`Remove ${a.faculty_name} from ${a.subject_name}`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(a.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Add assignment">
            <h3 className="mb-2 text-sm font-semibold">Add assignment</h3>
            <DynamicForm
              key={formKey}
              fields={assignFields}
              onSubmit={(vals) => add.mutateAsync(cleanValues(assignFields, vals))}
              submitLabel="Assign"
            />
          </section>
        </div>
      )}
    </Modal>
  );
}

export default function Batches() {
  const [assigning, setAssigning] = useState(null);

  return (
    <>
      <ResourcePage
        title="Batches"
        subtitle="Groups of students, and the faculty who teach them."
        noun="Batch"
        endpoint="/batches"
        fields={batchFields}
        filters={[
          { name: 'class_level', label: 'Class', options: CLASS_LEVELS },
          { name: 'is_active', label: 'Status', options: ACTIVE_STATUS, allLabel: 'All statuses' },
        ]}
        searchPlaceholder="Search batches…"
        emptyIcon={Layers}
        emptyMessage="Create a batch, then assign faculty and students to it."
        rowActions={[
          {
            id: 'assign',
            label: (r) => `Manage faculty for ${r.name}`,
            icon: UserPlus,
            onClick: (row) => setAssigning(row),
          },
        ]}
        columns={[
          { key: 'name', header: 'Batch', render: (r) => <span className="font-medium text-slate-900 dark:text-white">{r.name}</span> },
          { key: 'class_level', header: 'Class', render: (r) => (r.class_level ? `Class ${r.class_level}` : '—') },
          { key: 'academic_year', header: 'Year' },
          {
            key: 'dates',
            header: 'Dates',
            className: 'whitespace-nowrap',
            render: (r) => (r.start_date || r.end_date ? `${formatDate(r.start_date)} – ${formatDate(r.end_date)}` : '—'),
          },
          { key: 'student_count', header: 'Students', render: (r) => r.student_count ?? '—' },
          {
            key: 'assignments',
            header: 'Faculty',
            render: (r) => {
              const n = r.assignments?.length || 0;
              return n ? <Badge tone="blue">{n} assignment{n > 1 ? 's' : ''}</Badge> : <span className="text-slate-400">None</span>;
            },
          },
          {
            key: 'is_active',
            header: 'Status',
            render: (r) => <Badge tone={r.is_active ? 'green' : 'gray'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>,
          },
        ]}
      />
      <AssignmentsDialog batch={assigning} onClose={() => setAssigning(null)} />
    </>
  );
}
