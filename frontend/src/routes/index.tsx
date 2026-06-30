import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/layouts/DashboardLayout';
import LoginPage from '@/pages/public/LoginPage';
import RegisterPage from '@/pages/public/RegisterPage';
import StudentRegisterPage from '@/pages/public/StudentRegisterPage';
import ForgotPasswordPage from '@/pages/public/ForgotPasswordPage';
import ProfilePage from '@/pages/shared/ProfilePage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import StudentsManagement from '@/pages/admin/StudentsManagement';
import TeachersManagement from '@/pages/admin/TeachersManagement';
import CourseDetailPage from '@/pages/admin/CourseDetailPage';
import ClassDetailPage from '@/pages/admin/ClassDetailPage';
import ClassesManagement from '@/pages/admin/ClassesManagement';
import EnrollmentsManagement from '@/pages/admin/EnrollmentsManagement';
import AnnouncementsPage from '@/pages/admin/AnnouncementsPage';
import AdminAuditLogPage from '@/pages/admin/AdminAuditLogPage';
import AdminCalendarPage from '@/pages/admin/AdminCalendarPage';
import AdminHomeworkPage from '@/pages/admin/AdminHomeworkPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import TeacherDashboard from '@/pages/teacher/TeacherDashboard';
import TeacherClassesPage from '@/pages/teacher/TeacherClassesPage';
import ClassSessionsPage from '@/pages/teacher/ClassSessionsPage';
import TakeAttendancePage from '@/pages/teacher/TakeAttendancePage';
import TeacherLessonNotesPage from '@/pages/teacher/TeacherLessonNotesPage';
import TeacherAnnouncementsPage from '@/pages/teacher/TeacherAnnouncementsPage';
import TeacherCalendarPage from '@/pages/teacher/TeacherCalendarPage';
import TeacherHomeworkPage from '@/pages/teacher/TeacherHomeworkPage';
import StudentDashboard from '@/pages/student/StudentDashboard';
import StudentHomeworkPage from '@/pages/student/StudentHomeworkPage';
import StudentHomeworkClassPage from '@/pages/student/StudentHomeworkClassPage';
import LearnerSchedulePage from '@/pages/shared/LearnerSchedulePage';
import LearnerCoursesPage from '@/pages/shared/LearnerCoursesPage';
import LearnerLessonNotesPage from '@/pages/shared/LearnerLessonNotesPage';
import LearnerNotificationsPage from '@/pages/shared/LearnerNotificationsPage';
import AnnouncementDetailPage from '@/pages/shared/AnnouncementDetailPage';
import { dashboardPathForRole, studentDashboardPath } from '@/utils/learnerPortal';
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
    Admin: dashboardPathForRole('Admin'),
    Teacher: dashboardPathForRole('Teacher'),
    Student: studentDashboardPath(),
    Parent: '/login',
  };
  return <Navigate to={map[user.role]} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/student" element={<StudentRegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/" element={<RoleRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/profile" element={<ProfilePage />} />

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<StudentsManagement />} />
            <Route path="/admin/parents" element={<Navigate to="/admin/students" replace />} />
            <Route path="/admin/teachers" element={<TeachersManagement />} />
            <Route path="/admin/courses" element={<Navigate to="/admin/calendar" replace />} />
            <Route path="/admin/courses/:courseId" element={<CourseDetailPage />} />
            <Route path="/admin/courses/:courseId/classes/:classId" element={<ClassDetailPage />} />
            <Route path="/admin/classes" element={<ClassesManagement />} />
            <Route path="/admin/enrollments" element={<EnrollmentsManagement />} />
            <Route path="/admin/attendance" element={<Navigate to="/admin/calendar" replace />} />
            <Route path="/admin/announcements" element={<AnnouncementsPage />} />
            <Route
              path="/admin/announcements/:announcementId"
              element={<AnnouncementDetailPage mode="admin" />}
            />
            <Route path="/admin/invoices" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/reports" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
            <Route path="/admin/calendar" element={<AdminCalendarPage />} />
            <Route path="/admin/homework" element={<AdminHomeworkPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Teacher']} />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/calendar" element={<TeacherCalendarPage />} />
            <Route path="/teacher/classes" element={<TeacherClassesPage />} />
            <Route path="/teacher/classes/:classId/sessions" element={<ClassSessionsPage />} />
            <Route
              path="/teacher/classes/:classId/sessions/:sessionId/attendance"
              element={<TakeAttendancePage />}
            />
            <Route path="/teacher/classes/:classId/attendance" element={<TakeAttendancePage />} />
            <Route path="/teacher/sessions" element={<Navigate to="/teacher/classes" replace />} />
            <Route path="/teacher/attendance" element={<Navigate to="/teacher/classes" replace />} />
            <Route path="/teacher/attendance/:classId" element={<LegacyTeacherAttendanceRedirect />} />
            <Route path="/teacher/lesson-notes" element={<TeacherLessonNotesPage />} />
            <Route path="/teacher/homework" element={<TeacherHomeworkPage />} />
            <Route path="/teacher/notifications" element={<TeacherAnnouncementsPage />} />
            <Route path="/teacher/announcements" element={<Navigate to="/teacher/notifications" replace />} />
            <Route
              path="/teacher/announcements/:announcementId"
              element={<AnnouncementDetailPage mode="viewer" audience="Teacher" />}
            />
            <Route
              path="/teacher/notifications/:announcementId"
              element={<AnnouncementDetailPage mode="viewer" audience="Teacher" />}
            />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Student']} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/schedule" element={<LearnerSchedulePage />} />
            <Route path="/student/courses/:courseId/:classId" element={<LearnerCoursesPage />} />
            <Route path="/student/courses/:courseId" element={<LearnerCoursesPage />} />
            <Route path="/student/courses" element={<LearnerCoursesPage />} />
            <Route path="/student/lesson-notes" element={<LearnerLessonNotesPage />} />
            <Route path="/student/homework" element={<StudentHomeworkPage />} />
            <Route path="/student/homework/:classId" element={<StudentHomeworkClassPage />} />
            <Route path="/student/notifications" element={<LearnerNotificationsPage />} />
            <Route
              path="/student/announcements/:announcementId"
              element={<AnnouncementDetailPage mode="viewer" audience="Student" />}
            />
            <Route path="/student/classes" element={<Navigate to="/student/courses" replace />} />
            <Route path="/student/attendance" element={<Navigate to="/student/schedule" replace />} />
            <Route path="/student/announcements" element={<Navigate to="/student/notifications" replace />} />
            {/* Legacy parent URLs → student portal */}
            <Route path="/parent/dashboard" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/parent/children" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/parent/progress" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/parent/notifications" element={<Navigate to="/student/notifications" replace />} />
            <Route path="/parent/classes" element={<Navigate to="/student/schedule" replace />} />
            <Route path="/parent/attendance" element={<Navigate to="/student/schedule" replace />} />
            <Route path="/parent/lesson-notes" element={<Navigate to="/student/lesson-notes" replace />} />
            <Route path="/parent/announcements" element={<Navigate to="/student/notifications" replace />} />
            <Route path="/parent/invoices" element={<Navigate to="/student/dashboard" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
