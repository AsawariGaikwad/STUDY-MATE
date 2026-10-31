// Config-driven master-data pages built on ResourcePage.
import { Award, BookOpen, Compass, Download, FileClock, Library, ListChecks, ScrollText, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { downloadFile, safeUrl } from '../utils/download';
import { formatBytes, formatDate, formatDateTime, formatINR } from '../utils/format';
import {
  ACTIVE_STATUS,
  CLASS_LEVELS,
  batchOptions,
  examOptions,
  mySubjectOptions,
  subjectOptions,
} from '../utils/optionSpecs';
import ResourcePage from '../components/ResourcePage';
import { Badge, toneFor } from '../components/ui';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.docx,.pptx,.xlsx';
const MAX_UPLOAD = 20 * 1024 * 1024;

const activeFilter = { name: 'is_active', label: 'Status', options: ACTIVE_STATUS, allLabel: 'All statuses' };

const StatusBadge = ({ on, yes = 'Active', no = 'Inactive' }) => <Badge tone={on ? 'green' : 'gray'}>{on ? yes : no}</Badge>;

const nameCell = (primary, secondary) => (r) => (
  <div className="min-w-0">
    <p className="font-medium text-slate-900 dark:text-white">{r[primary]}</p>
    {r[secondary] && <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{r[secondary]}</p>}
  </div>
);

const validLink = (v) => !v || !!safeUrl(v) || 'Enter a valid link starting with http:// or https://';

// ------------------------------------------------------------------ Exams
const examFields = [
  { name: 'name', label: 'Name', required: true, full: true },
  { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
  { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true, hint: 'Inactive exams are hidden from students.' },
];

export function Exams() {
  return (
    <ResourcePage
      title="Exams"
      subtitle="Entrance exams your students prepare for."
      noun="Exam"
      endpoint="/exams"
      fields={examFields}
      filters={[activeFilter]}
      searchPlaceholder="Search exams…"
      emptyIcon={GraduationCap}
      emptyMessage="Add the exams your classes prepare students for."
      columns={[
        { key: 'name', header: 'Exam', render: nameCell('name', 'description') },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge on={r.is_active} /> },
      ]}
    />
  );
}

// --------------------------------------------------------------- Subjects
const subjectFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'code', label: 'Code', required: true },
  { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
];

export function Subjects() {
  return (
    <ResourcePage
      title="Subjects"
      subtitle="Subjects taught across batches."
      noun="Subject"
      endpoint="/subjects"
      fields={subjectFields}
      filters={[activeFilter]}
      searchPlaceholder="Search subjects…"
      emptyIcon={Library}
      columns={[
        { key: 'name', header: 'Subject', render: (r) => <span className="font-medium text-slate-900 dark:text-white">{r.name}</span> },
        { key: 'code', header: 'Code' },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge on={r.is_active} /> },
      ]}
    />
  );
}

// ---------------------------------------------------------- Fee structures
const feeStructureFields = [
  { name: 'name', label: 'Name', required: true, full: true },
  { name: 'batch_id', label: 'Batch', type: 'select', optionsSpec: batchOptions, required: true },
  { name: 'academic_year', label: 'Academic year', required: true },
  { name: 'total_amount', label: 'Total amount (₹)', type: 'number', min: 0, required: true },
  { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
  { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
];

export function FeeStructures() {
  return (
    <ResourcePage
      title="Fee structures"
      subtitle="Templates you assign to students or whole batches."
      noun="Fee structure"
      endpoint="/fee-structures"
      fields={feeStructureFields}
      filters={[{ name: 'batch_id', label: 'Batch', optionsSpec: batchOptions }, activeFilter]}
      searchPlaceholder="Search fee structures…"
      emptyIcon={ListChecks}
      columns={[
        { key: 'name', header: 'Name', render: nameCell('name', 'description') },
        { key: 'batch_name', header: 'Batch' },
        { key: 'academic_year', header: 'Year' },
        { key: 'total_amount', header: 'Total', render: (r) => formatINR(r.total_amount), className: 'whitespace-nowrap' },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge on={r.is_active} /> },
      ]}
    />
  );
}

// ---------------------------------------------------- Materials and PYQs
// Faculty may change only their own uploads; the server enforces it, the UI
// just hides actions it can tell are not allowed.
function useCanManage() {
  const { user, role } = useAuth();
  return (row) => {
    if (role === 'ADMIN') return true;
    if (typeof row.can_edit === 'boolean') return row.can_edit;
    const by = row.uploaded_by;
    if (typeof by === 'number') return by === user.id || by === user.faculty?.id;
    if (typeof by === 'string') return [user.full_name, user.username].includes(by);
    return true;
  };
}

const uploaderName = (r) => (typeof r.uploaded_by === 'string' ? r.uploaded_by : r.uploaded_by_name) || '—';

const fileColumns = [
  { key: 'file', header: 'File', render: (r) => <span className="break-all text-xs">{r.original_name || '—'}<span className="block text-slate-500">{formatBytes(r.file_size)}</span></span> },
  { key: 'uploaded_by', header: 'Uploaded by', render: uploaderName },
];

const downloadAction = {
  id: 'download',
  label: (r) => `Download ${r.title}`,
  icon: Download,
  onClick: (r) => downloadFile(r.download_url, r.original_name || 'download'),
  show: (r) => !!r.download_url,
};

export function Materials() {
  const { role } = useAuth();
  const canManage = useCanManage();
  const fields = [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'class_level', label: 'Class', type: 'select', options: CLASS_LEVELS, required: true },
    {
      name: 'subject_id',
      label: 'Subject',
      type: 'select',
      required: true,
      optionsSpec: role === 'FACULTY' ? mySubjectOptions() : subjectOptions,
      hint: role === 'FACULTY' ? 'Only subjects you teach are listed.' : undefined,
    },
    { name: 'exam_id', label: 'Exam', type: 'select', optionsSpec: examOptions, placeholder: 'Not exam-specific' },
    { name: 'category', label: 'Category' },
    { name: 'is_published', label: 'Published', type: 'checkbox', defaultValue: true, hint: 'Students can see published material.' },
    {
      name: 'file',
      label: 'File',
      type: 'file',
      required: true,
      createOnly: true,
      accept: ACCEPT,
      maxSize: MAX_UPLOAD,
      hint: 'PDF, PNG, JPG, DOCX, PPTX or XLSX, up to 20 MB.',
    },
  ];

  return (
    <ResourcePage
      title={role === 'ADMIN' ? 'Materials' : 'Study material'}
      subtitle="Notes and resources shared with students."
      noun="Material"
      endpoint="/materials"
      fields={fields}
      upload
      createLabel="Upload material"
      modalSize="lg"
      filters={[
        { name: 'class_level', label: 'Class', options: CLASS_LEVELS },
        { name: 'subject_id', label: 'Subject', optionsSpec: subjectOptions },
        { name: 'exam_id', label: 'Exam', optionsSpec: examOptions },
      ]}
      searchPlaceholder="Search materials…"
      emptyIcon={BookOpen}
      emptyTitle="No materials yet"
      emptyMessage="Upload notes and worksheets for your students."
      itemName={(r) => r.title}
      canEdit={canManage}
      canDelete={canManage}
      rowActions={[downloadAction]}
      columns={[
        { key: 'title', header: 'Title', render: nameCell('title', 'description') },
        { key: 'class_level', header: 'Class', render: (r) => (r.class_level ? `Class ${r.class_level}` : '—') },
        { key: 'subject_name', header: 'Subject' },
        { key: 'exam_name', header: 'Exam' },
        { key: 'category', header: 'Category' },
        ...fileColumns,
        { key: 'is_published', header: 'Status', render: (r) => <StatusBadge on={r.is_published} yes="Published" no="Draft" /> },
      ]}
    />
  );
}

export function Pyqs() {
  const { role } = useAuth();
  const canManage = useCanManage();
  const thisYear = new Date().getFullYear();
  const fields = [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'exam_id', label: 'Exam', type: 'select', optionsSpec: examOptions, required: true },
    {
      name: 'subject_id',
      label: 'Subject',
      type: 'select',
      required: true,
      optionsSpec: role === 'FACULTY' ? mySubjectOptions() : subjectOptions,
      hint: role === 'FACULTY' ? 'Only subjects you teach are listed.' : undefined,
    },
    { name: 'year', label: 'Year', type: 'number', integer: true, min: 1950, max: thisYear, required: true },
    { name: 'is_published', label: 'Published', type: 'checkbox', defaultValue: true },
    {
      name: 'file',
      label: 'File',
      type: 'file',
      required: true,
      createOnly: true,
      accept: ACCEPT,
      maxSize: MAX_UPLOAD,
      hint: 'PDF, PNG, JPG, DOCX, PPTX or XLSX, up to 20 MB.',
    },
  ];

  return (
    <ResourcePage
      title={role === 'ADMIN' ? 'PYQs' : 'Previous-year papers'}
      subtitle="Previous-year question papers."
      noun="Paper"
      endpoint="/pyqs"
      fields={fields}
      upload
      createLabel="Upload paper"
      modalSize="lg"
      filters={[
        { name: 'exam_id', label: 'Exam', optionsSpec: examOptions },
        { name: 'subject_id', label: 'Subject', optionsSpec: subjectOptions },
      ]}
      searchPlaceholder="Search papers…"
      emptyIcon={FileClock}
      emptyTitle="No papers yet"
      emptyMessage="Upload previous-year papers for your students."
      itemName={(r) => r.title}
      canEdit={canManage}
      canDelete={canManage}
      rowActions={[downloadAction]}
      columns={[
        { key: 'title', header: 'Title', render: (r) => <span className="font-medium text-slate-900 dark:text-white">{r.title}</span> },
        { key: 'exam_name', header: 'Exam' },
        { key: 'subject_name', header: 'Subject' },
        { key: 'year', header: 'Year' },
        ...fileColumns,
        { key: 'is_published', header: 'Status', render: (r) => <StatusBadge on={r.is_published} yes="Published" no="Draft" /> },
      ]}
    />
  );
}

// ----------------------------------------------------------- Scholarships
const scholarshipFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'provider', label: 'Provider', required: true },
  { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
  { name: 'eligibility', label: 'Eligibility', type: 'textarea', rows: 3 },
  { name: 'amount', label: 'Amount (₹)', type: 'number', min: 0 },
  { name: 'deadline', label: 'Deadline', type: 'date' },
  { name: 'link', label: 'Link', type: 'url', placeholder: 'https://', full: true, validate: validLink },
  { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true, hint: 'Inactive scholarships are hidden from students.' },
];

export function Scholarships() {
  return (
    <ResourcePage
      title="Scholarships"
      subtitle="Opportunities shared with students."
      noun="Scholarship"
      endpoint="/scholarships"
      fields={scholarshipFields}
      modalSize="lg"
      filters={[activeFilter]}
      searchPlaceholder="Search scholarships…"
      emptyIcon={Award}
      columns={[
        { key: 'name', header: 'Scholarship', render: nameCell('name', 'provider') },
        { key: 'amount', header: 'Amount', render: (r) => formatINR(r.amount), className: 'whitespace-nowrap' },
        { key: 'deadline', header: 'Deadline', render: (r) => formatDate(r.deadline), className: 'whitespace-nowrap' },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge on={r.is_active} /> },
      ]}
    />
  );
}

// --------------------------------------------------------- Career content
const careerFields = [
  { name: 'title', label: 'Title', required: true, full: true },
  { name: 'category', label: 'Category', required: true },
  { name: 'exam_id', label: 'Exam', type: 'select', optionsSpec: examOptions, placeholder: 'General' },
  { name: 'content', label: 'Content', type: 'textarea', rows: 8, required: true },
  { name: 'link', label: 'Link', type: 'url', placeholder: 'https://', full: true, validate: validLink },
  { name: 'is_published', label: 'Published', type: 'checkbox', defaultValue: true },
];

export function CareerContent() {
  return (
    <ResourcePage
      title="Career content"
      subtitle="Guidance articles shown in Career Guidance."
      noun="Guide"
      endpoint="/career-guides"
      fields={careerFields}
      modalSize="lg"
      filters={[{ name: 'exam_id', label: 'Exam', optionsSpec: examOptions }]}
      searchPlaceholder="Search guides…"
      emptyIcon={Compass}
      itemName={(r) => r.title}
      columns={[
        { key: 'title', header: 'Title', render: (r) => <span className="font-medium text-slate-900 dark:text-white">{r.title}</span> },
        { key: 'category', header: 'Category' },
        { key: 'exam_name', header: 'Exam' },
        { key: 'is_published', header: 'Status', render: (r) => <StatusBadge on={r.is_published} yes="Published" no="Draft" /> },
      ]}
    />
  );
}

// -------------------------------------------------------------- Audit log
export function AuditLog() {
  return (
    <ResourcePage
      title="Audit log"
      subtitle="A record of sensitive actions taken in the system."
      noun="Entry"
      endpoint="/audit"
      perPage={20}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      filters={[
        { name: 'action', label: 'Action', type: 'text' },
        { name: 'status', label: 'Status', type: 'text' },
      ]}
      searchPlaceholder="Search the log…"
      emptyIcon={ScrollText}
      emptyTitle="No audit entries yet"
      columns={[
        { key: 'created_at', header: 'When', render: (r) => formatDateTime(r.created_at), className: 'whitespace-nowrap' },
        { key: 'username_snapshot', header: 'User', render: (r) => r.username_snapshot || '—' },
        { key: 'action', header: 'Action', render: (r) => <code className="text-xs">{r.action}</code> },
        {
          key: 'entity_type',
          header: 'Entity',
          render: (r) => (r.entity_type ? `${r.entity_type}${r.entity_id ? ` #${r.entity_id}` : ''}` : '—'),
        },
        { key: 'status', header: 'Status', render: (r) => <Badge tone={toneFor(r.status)}>{r.status}</Badge> },
        { key: 'ip_address', header: 'IP', render: (r) => r.ip_address || '—' },
      ]}
    />
  );
}
