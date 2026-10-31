import { Link } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  IndianRupee,
  Layers,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';
import { useGet } from '../hooks/useApi';
import { formatDate, formatINR, formatNumber, formatPercent } from '../utils/format';
import { Card, ErrorState, PageHeader, StatCard } from '../components/ui';

// Labels/icons are static UI; every value comes from GET /dashboard.
const STATS = {
  STUDENT: [
    { key: 'attendance_percentage', label: 'Attendance', icon: CalendarCheck, fmt: formatPercent, to: '/attendance' },
    { key: 'pending_fees', label: 'Pending fees', icon: Wallet, fmt: formatINR, to: '/fees' },
    { key: 'unread_notifications', label: 'Unread notifications', icon: Bell, fmt: formatNumber, to: '/notifications' },
    { key: 'upcoming_tests', label: 'Upcoming tests', icon: ClipboardList, fmt: formatNumber, to: '/tests' },
    { key: 'average_score_percentage', label: 'Average score', icon: TrendingUp, fmt: formatPercent, to: '/performance' },
    { key: 'tests_taken', label: 'Tests taken', icon: CheckCircle2, fmt: formatNumber, to: '/performance' },
  ],
  FACULTY: [
    { key: 'assigned_batches', label: 'Assigned batches', icon: Layers, fmt: formatNumber, to: '/my-students' },
    { key: 'students', label: 'Students', icon: Users, fmt: formatNumber, to: '/my-students' },
    { key: 'tests_created', label: 'Tests created', icon: ClipboardList, fmt: formatNumber, to: '/tests' },
    { key: 'materials_uploaded', label: 'Materials uploaded', icon: BookOpen, fmt: formatNumber, to: '/materials' },
  ],
  ADMIN: [
    { key: 'students', label: 'Students', icon: GraduationCap, fmt: formatNumber, to: '/users' },
    { key: 'faculty', label: 'Faculty', icon: UserCog, fmt: formatNumber, to: '/users' },
    { key: 'active_batches', label: 'Active batches', icon: Layers, fmt: formatNumber, to: '/batches' },
    { key: 'fees_collected', label: 'Fees collected', icon: IndianRupee, fmt: formatINR, to: '/fees' },
    { key: 'fees_pending', label: 'Fees pending', icon: Wallet, fmt: formatINR, to: '/fees' },
    { key: 'tests', label: 'Tests', icon: ClipboardList, fmt: formatNumber, to: '/tests' },
    { key: 'materials', label: 'Materials', icon: BookOpen, fmt: formatNumber, to: '/materials' },
  ],
};

export default function Dashboard() {
  const { user, role } = useAuth();
  const query = useGet('dashboard', '/dashboard');
  const stats = STATS[role] || [];
  const data = query.data?.data || {};
  const firstName = (user.full_name || '').split(' ')[0];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle={`Here is your overview for ${formatDate(new Date())}.`}
      />

      {query.isError ? (
        <Card>
          <ErrorState message={errMsg(query.error)} onRetry={() => query.refetch()} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((s) => (
            <Link key={s.key} to={s.to} className="block rounded-2xl transition-transform hover:-translate-y-0.5">
              <StatCard
                label={s.label}
                icon={s.icon}
                loading={query.isLoading}
                value={query.isLoading ? null : s.fmt(data[s.key])}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
