import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/layouts/DashboardLayout';
import LoginPage from '@/pages/public/LoginPage';
import RegisterPage from '@/pages/public/RegisterPage';
import ForgotPasswordPage from '@/pages/public/ForgotPasswordPage';
import ProfilePage from '@/pages/shared/ProfilePage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import StudentsManagement from '@/pages/admin/StudentsManagement';
import ParentsManagement from '@/pages/admin/ParentsManagement';
import TeachersManagement from '@/pages/admin/TeachersManagement';
import CoursesManagement from '@/pages/admin/CoursesManagement';
import CourseDetailPage from '@/pages/admin/CourseDetailPage';
import ClassDetailPage from '@/pages/admin/ClassDetailPage';
import ClassesManagement from '@/pages/admin/ClassesManagement';
import EnrollmentsManagement from '@/pages/admin/EnrollmentsManagement';
import AttendanceOverview from '@/pages/admin/AttendanceOverview';
import AnnouncementsPage from '@/pages/admin/AnnouncementsPage';
import AdminInvoicesPage from '@/pages/admin/AdminInvoicesPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import TeacherDashboard from '@/pages/teacher/TeacherDashboard';
import TeacherClassesPage from '@/pages/teacher/TeacherClassesPage';
import ClassSessionsPage from '@/pages/teacher/ClassSessionsPage';
import TakeAttendancePage from '@/pages/teacher/TakeAttendancePage';
import TeacherLessonNotesPage from '@/pages/teacher/TeacherLessonNotesPage';
import TeacherAnnouncementsPage from '@/pages/teacher/TeacherAnnouncementsPage';
import StudentDashboard from '@/pages/student/StudentDashboard';
import StudentClassesPage from '@/pages/student/StudentClassesPage';
import StudentAttendancePage from '@/pages/student/StudentAttendancePage';
import StudentLessonNotesPage from '@/pages/student/StudentLessonNotesPage';
import StudentAnnouncementsPage from '@/pages/student/StudentAnnouncementsPage';
import ParentDashboard from '@/pages/parent/ParentDashboard';
import MyChildrenPage from '@/pages/parent/MyChildrenPage';
import ChildClassesPage from '@/pages/parent/ChildClassesPage';
import ChildAttendancePage from '@/pages/parent/ChildAttendancePage';
import ParentLessonNotesPage from '@/pages/parent/ParentLessonNotesPage';
import ParentAnnouncementsPage from '@/pages/parent/ParentAnnouncementsPage';
import ParentInvoicesPage from '@/pages/parent/ParentInvoicesPage';
import type { UserRole } from '@/types';

function LegacyTeacherAttendanceRedirect() {
  const { classId } = useParams<{ classId: string }>();
  if (!classId) return <Navigate to="/teacher/classes" replace />;
  return <Navigate to={`/teacher/classes/${classId}/attendance`} replace />;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const map: Record<UserRole, string> = {
    Admin: '/admin/dashboard',
    Teacher: '/teacher/dashboard',
    Student: '/student/dashboard',
    Parent: '/parent/dashboard',
  };
  return <Navigate to={map[user.role]} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/" element={<RoleRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/profile" element={<ProfilePage />} />

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<StudentsManagement />} />
            <Route path="/admin/parents" element={<ParentsManagement />} />
            <Route path="/admin/teachers" element={<TeachersManagement />} />
            <Route path="/admin/courses" element={<CoursesManagement />} />
            <Route path="/admin/courses/:courseId" element={<CourseDetailPage />} />
            <Route path="/admin/courses/:courseId/classes/:classId" element={<ClassDetailPage />} />
            <Route path="/admin/classes" element={<ClassesManagement />} />
            <Route path="/admin/enrollments" element={<EnrollmentsManagement />} />
            <Route path="/admin/attendance" element={<AttendanceOverview />} />
            <Route path="/admin/announcements" element={<AnnouncementsPage />} />
            <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Teacher']} />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/classes" element={<TeacherClassesPage />} />
            <Route path="/teacher/classes/:classId/sessions" element={<ClassSessionsPage />} />
            <Route path="/teacher/classes/:classId/attendance" element={<TakeAttendancePage />} />
            <Route path="/teacher/sessions" element={<Navigate to="/teacher/classes" replace />} />
            <Route path="/teacher/attendance" element={<Navigate to="/teacher/classes" replace />} />
            <Route path="/teacher/attendance/:classId" element={<LegacyTeacherAttendanceRedirect />} />
            <Route path="/teacher/lesson-notes" element={<TeacherLessonNotesPage />} />
            <Route path="/teacher/announcements" element={<TeacherAnnouncementsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Student']} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/classes" element={<StudentClassesPage />} />
            <Route path="/student/attendance" element={<StudentAttendancePage />} />
            <Route path="/student/lesson-notes" element={<StudentLessonNotesPage />} />
            <Route path="/student/announcements" element={<StudentAnnouncementsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Parent']} />}>
            <Route path="/parent/dashboard" element={<ParentDashboard />} />
            <Route path="/parent/children" element={<MyChildrenPage />} />
            <Route path="/parent/classes" element={<ChildClassesPage />} />
            <Route path="/parent/attendance" element={<ChildAttendancePage />} />
            <Route path="/parent/lesson-notes" element={<ParentLessonNotesPage />} />
            <Route path="/parent/announcements" element={<ParentAnnouncementsPage />} />
            <Route path="/parent/invoices" element={<ParentInvoicesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
