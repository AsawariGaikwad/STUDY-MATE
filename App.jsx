import { Suspense, lazy } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { ByRole, FullScreenLoader, PublicOnly, RequireAuth, RequireSession, RoleRoute } from './routes/guards';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import { EmptyState } from './components/ui';

// Pages are code-split. `named` picks a named export from a shared module.
const page = (loader) => lazy(loader);
const named = (loader, key) => lazy(() => loader().then((m) => ({ default: m[key] })));

const Dashboard = page(() => import('./pages/Dashboard'));
const Settings = page(() => import('./pages/Settings'));
const Notifications = page(() => import('./pages/Notifications'));
const Feedback = page(() => import('./pages/Feedback'));

const Users = page(() => import('./pages/Users'));
const Batches = page(() => import('./pages/Batches'));
const Reports = page(() => import('./pages/Reports'));
const res = () => import('./pages/resources');
const Exams = named(res, 'Exams');
const Subjects = named(res, 'Subjects');
const FeeStructures = named(res, 'FeeStructures');
const StaffMaterials = named(res, 'Materials');
const StaffPyqs = named(res, 'Pyqs');
const AdminScholarships = named(res, 'Scholarships');
const CareerContent = named(res, 'CareerContent');
const AuditLog = named(res, 'AuditLog');

const lib = () => import('./pages/StudentLibrary');
const StudyMaterial = named(lib, 'StudyMaterial');
const PyqLibrary = named(lib, 'PyqLibrary');
const CareerGuidance = named(lib, 'CareerGuidance');
const ScholarshipList = named(lib, 'ScholarshipList');

const StudentTests = page(() => import('./pages/Tests'));
const ManageTests = page(() => import('./pages/ManageTests'));
const TakeTest = page(() => import('./pages/TakeTest'));
const TestResult = page(() => import('./pages/TestResult'));
const Attendance = page(() => import('./pages/Attendance'));
const MarkAttendance = page(() => import('./pages/MarkAttendance'));
const StudentFees = page(() => import('./pages/Fees'));
const AdminFees = page(() => import('./pages/StudentFees'));
const Performance = page(() => import('./pages/Performance'));
const StudentPerformance = page(() => import('./pages/StudentPerformance'));
const MyStudents = page(() => import('./pages/MyStudents'));
const Chatbot = page(() => import('./pages/Chatbot'));

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      message="The page you are looking for does not exist."
      action={
        <Link to="/dashboard" className="btn btn-primary">
          Back to dashboard
        </Link>
      }
    />
  );
}

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />
        <Route
          path="/change-password"
          element={
            <RequireSession>
              <ChangePassword />
            </RequireSession>
          }
        />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            {/* All roles */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/feedback" element={<Feedback />} />

            {/* Same URL, page depends on the role */}
            <Route path="/materials" element={<ByRole STUDENT={<StudyMaterial />} FACULTY={<StaffMaterials />} ADMIN={<StaffMaterials />} />} />
            <Route path="/pyqs" element={<ByRole STUDENT={<PyqLibrary />} FACULTY={<StaffPyqs />} ADMIN={<StaffPyqs />} />} />
            <Route path="/tests" element={<ByRole STUDENT={<StudentTests />} FACULTY={<ManageTests />} ADMIN={<ManageTests />} />} />
            <Route path="/fees" element={<ByRole STUDENT={<StudentFees />} ADMIN={<AdminFees />} />} />
            <Route path="/performance" element={<ByRole STUDENT={<Performance />} FACULTY={<StudentPerformance />} ADMIN={<StudentPerformance />} />} />
            <Route path="/scholarships" element={<ByRole STUDENT={<ScholarshipList />} ADMIN={<AdminScholarships />} />} />
            <Route path="/career" element={<ByRole STUDENT={<CareerGuidance />} ADMIN={<CareerContent />} />} />

            {/* Student */}
            <Route element={<RoleRoute roles={['STUDENT']} />}>
              <Route path="/tests/:id/take" element={<TakeTest />} />
              <Route path="/tests/:id/result" element={<TestResult />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/chatbot" element={<Chatbot />} />
            </Route>

            {/* Faculty */}
            <Route element={<RoleRoute roles={['FACULTY']} />}>
              <Route path="/my-students" element={<MyStudents />} />
              <Route path="/attendance/mark" element={<MarkAttendance />} />
            </Route>

            {/* Admin */}
            <Route element={<RoleRoute roles={['ADMIN']} />}>
              <Route path="/users" element={<Users />} />
              <Route path="/batches" element={<Batches />} />
              <Route path="/exams" element={<Exams />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/fee-structures" element={<FeeStructures />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/audit" element={<AuditLog />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
