// Student-facing, read-only lists: study material, PYQs, career guides, scholarships.
import { Award, BookOpen, Calendar, Compass, FileClock, FileText } from 'lucide-react';
import { downloadFile } from '../utils/download';
import { formatBytes, formatDate, formatINR } from '../utils/format';
import { CLASS_LEVELS, examOptions, subjectOptions } from '../utils/optionSpecs';
import ReadOnlyCards from '../components/ReadOnlyCards';

const join = (...parts) => parts.filter(Boolean).join(' · ');
const fileMeta = (r) => [{ icon: FileText, text: join(r.original_name, r.file_size ? formatBytes(r.file_size) : '') }];
const download = (r) => downloadFile(r.download_url, r.original_name || 'download');

export function StudyMaterial() {
  return (
    <ReadOnlyCards
      title="Study material"
      subtitle="Notes and resources shared by your faculty."
      endpoint="/materials"
      queryKey="materials"
      searchPlaceholder="Search material…"
      filters={[
        { name: 'class_level', label: 'Class', options: CLASS_LEVELS },
        { name: 'subject_id', label: 'Subject', optionsSpec: subjectOptions },
        { name: 'exam_id', label: 'Exam', optionsSpec: examOptions },
      ]}
      emptyTitle="No study material yet"
      emptyMessage="Material your faculty publishes will show up here."
      card={{
        icon: BookOpen,
        title: (r) => r.title,
        subtitle: (r) => join(r.subject_name, r.exam_name),
        description: (r) => r.description,
        badges: (r) => [
          { label: r.class_level ? `Class ${r.class_level}` : '', tone: 'blue' },
          { label: r.category, tone: 'gray' },
        ],
        meta: fileMeta,
        onDownload: download,
      }}
    />
  );
}

export function PyqLibrary() {
  return (
    <ReadOnlyCards
      title="Previous-year papers"
      subtitle="Practise with real exam papers."
      endpoint="/pyqs"
      queryKey="pyqs"
      searchPlaceholder="Search papers…"
      filters={[
        { name: 'exam_id', label: 'Exam', optionsSpec: examOptions },
        { name: 'subject_id', label: 'Subject', optionsSpec: subjectOptions },
      ]}
      emptyTitle="No papers yet"
      emptyMessage="Previous-year papers will show up here."
      card={{
        icon: FileClock,
        title: (r) => r.title,
        subtitle: (r) => join(r.exam_name, r.subject_name),
        badges: (r) => [{ label: r.year ? String(r.year) : '', tone: 'amber' }],
        meta: fileMeta,
        onDownload: download,
      }}
    />
  );
}

export function CareerGuidance() {
  return (
    <ReadOnlyCards
      title="Career guidance"
      subtitle="Guides to help you plan your path."
      endpoint="/career-guides"
      queryKey="career-guides"
      searchPlaceholder="Search guides…"
      filters={[{ name: 'exam_id', label: 'Exam', optionsSpec: examOptions }]}
      emptyTitle="No guides yet"
      emptyMessage="Career guides will show up here."
      card={{
        icon: Compass,
        title: (r) => r.title,
        subtitle: (r) => join(r.category, r.exam_name),
        description: (r) => r.content,
        details: (r) => [{ label: 'Guide', text: r.content }],
        href: (r) => r.link,
        hrefLabel: 'Learn more',
      }}
    />
  );
}

export function ScholarshipList() {
  return (
    <ReadOnlyCards
      title="Scholarships"
      subtitle="Opportunities you may be eligible for."
      endpoint="/scholarships"
      queryKey="scholarships"
      searchPlaceholder="Search scholarships…"
      emptyTitle="No scholarships yet"
      emptyMessage="New scholarships will show up here."
      card={{
        icon: Award,
        title: (r) => r.name,
        subtitle: (r) => r.provider,
        description: (r) => r.description,
        badges: (r) => [{ label: r.amount ? formatINR(r.amount) : '', tone: 'green' }],
        meta: (r) => [{ icon: Calendar, text: r.deadline ? `Deadline: ${formatDate(r.deadline)}` : '' }],
        details: (r) => [
          { label: 'About', text: r.description },
          { label: 'Eligibility', text: r.eligibility },
        ],
        href: (r) => r.link,
        hrefLabel: 'Apply',
      }}
    />
  );
}
