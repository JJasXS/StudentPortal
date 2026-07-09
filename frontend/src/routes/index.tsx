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
import AdminParentsPage from '@/pages/admin/AdminParentsPage';
import AdminParentDetailPage from '@/pages/admin/AdminParentDetailPage';
import TeachersManagement from '@/pages/admin/TeachersManagement';
import CourseDetailPage from '@/pages/admin/CourseDetailPage';
import ClassDetailPage from '@/pages/admin/ClassDetailPage';
import ClassesManagement from '@/pages/admin/ClassesManagement';
import EnrollmentsManagement from '@/pages/admin/EnrollmentsManagement';
import AnnouncementsPage from '@/pages/admin/AnnouncementsPage';
import AdminAuditLogPage from '@/pages/admin/AdminAuditLogPage';
import AdminCalendarPage from '@/pages/admin/AdminCalendarPage';
import CalendarEventEditPage from '@/pages/admin/CalendarEventEditPage';
import AdminLeavePage from '@/pages/admin/AdminLeavePage';
import SettingsPage from '@/pages/admin/SettingsPage';
import TeacherDashboard from '@/pages/teacher/TeacherDashboard';
import TeacherClassesPage from '@/pages/teacher/TeacherClassesPage';
import TeacherClassDetailPage from '@/pages/teacher/TeacherClassDetailPage';
import TeacherAnnouncementsPage from '@/pages/teacher/TeacherAnnouncementsPage';
import TeacherCalendarPage from '@/pages/teacher/TeacherCalendarPage';
import ParentDashboardPage from '@/pages/parent/ParentDashboardPage';
import StudentDashboard from '@/pages/student/StudentDashboard';
import StudentHomeworkPage from '@/pages/student/StudentHomeworkPage';
import StudentHomeworkClassPage from '@/pages/student/StudentHomeworkClassPage';
import StudentLeavePage from '@/pages/student/StudentLeavePage';
import LearnerSchedulePage from '@/pages/shared/LearnerSchedulePage';
import LearnerCoursesPage from '@/pages/shared/LearnerCoursesPage';
import LearnerLessonNotesPage from '@/pages/shared/LearnerLessonNotesPage';
import StudentAnnouncementsPage from '@/pages/student/StudentAnnouncementsPage';
import ParentAnnouncementsPage from '@/pages/parent/ParentAnnouncementsPage';
import AnnouncementDetailPage from '@/pages/shared/AnnouncementDetailPage';
import { ParentStudentPathRedirect } from '@/components/ParentStudentPathRedirect';
import { dashboardPathForRole } from '@/utils/learnerPortal';

function LegacyTeacherClassRedirect() {
  const { classId } = useParams<{ classId: string }>();
  if (!classId) return <Navigate to="/teacher/classes" replace />;
  return <Navigate to={`/teacher/classes/${classId}`} replace />;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={dashboardPathForRole(user.role)} replace />;
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
            <Route path="/admin/students" element={<Navigate to="/admin/parents" replace />} />
            <Route path="/admin/parents" element={<AdminParentsPage />} />
            <Route path="/admin/parents/:customerCode" element={<AdminParentDetailPage />} />
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
            <Route path="/admin/calendar/events/:eventId/edit" element={<CalendarEventEditPage />} />
            <Route path="/admin/leave" element={<AdminLeavePage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Teacher']} />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/calendar" element={<TeacherCalendarPage />} />
            <Route path="/teacher/classes" element={<TeacherClassesPage />} />
            <Route path="/teacher/classes/:classId" element={<TeacherClassDetailPage />} />
            <Route path="/teacher/classes/:classId/sessions" element={<LegacyTeacherClassRedirect />} />
            <Route
              path="/teacher/classes/:classId/sessions/:sessionId/attendance"
              element={<Navigate to="/teacher/classes" replace />}
            />
            <Route path="/teacher/classes/:classId/attendance" element={<LegacyTeacherClassRedirect />} />
            <Route path="/teacher/sessions" element={<Navigate to="/teacher/classes" replace />} />
            <Route path="/teacher/attendance" element={<Navigate to="/teacher/classes" replace />} />
            <Route path="/teacher/attendance/:classId" element={<LegacyTeacherClassRedirect />} />
            <Route path="/teacher/lesson-notes" element={<Navigate to="/teacher/classes" replace />} />
            <Route path="/teacher/homework" element={<Navigate to="/teacher/classes" replace />} />
            <Route path="/teacher/announcements" element={<TeacherAnnouncementsPage />} />
            <Route
              path="/teacher/announcements/:announcementId"
              element={<AnnouncementDetailPage mode="viewer" audience="Teacher" />}
            />
            <Route path="/teacher/notifications" element={<Navigate to="/teacher/announcements" replace />} />
            <Route
              path="/teacher/notifications/:announcementId"
              element={<AnnouncementDetailPage mode="viewer" audience="Teacher" />}
            />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Student']} />}>
            <Route element={<ParentStudentPathRedirect />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/schedule" element={<LearnerSchedulePage />} />
              <Route path="/student/courses/:courseId/:classId" element={<LearnerCoursesPage />} />
              <Route path="/student/courses/:courseId" element={<LearnerCoursesPage />} />
              <Route path="/student/courses" element={<LearnerCoursesPage />} />
              <Route path="/student/lesson-notes" element={<LearnerLessonNotesPage />} />
              <Route path="/student/homework" element={<StudentHomeworkPage />} />
              <Route path="/student/homework/:classId" element={<StudentHomeworkClassPage />} />
              <Route path="/student/leave" element={<StudentLeavePage />} />
              <Route path="/student/announcements" element={<StudentAnnouncementsPage />} />
              <Route
                path="/student/announcements/:announcementId"
                element={<AnnouncementDetailPage mode="viewer" audience="Student" />}
              />
              <Route path="/student/notifications" element={<Navigate to="/student/announcements" replace />} />
              <Route path="/student/classes" element={<Navigate to="/student/courses" replace />} />
              <Route path="/student/attendance" element={<Navigate to="/student/schedule" replace />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Parent']} />}>
            <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
            <Route path="/parent/schedule" element={<LearnerSchedulePage />} />
            <Route path="/parent/children/:courseId/:classId" element={<LearnerCoursesPage />} />
            <Route path="/parent/children/:courseId" element={<LearnerCoursesPage />} />
            <Route path="/parent/children" element={<LearnerCoursesPage />} />
            <Route path="/parent/lesson-notes" element={<LearnerLessonNotesPage />} />
            <Route path="/parent/homework" element={<Navigate to="/parent/children" replace />} />
            <Route path="/parent/homework/:classId" element={<Navigate to="/parent/children" replace />} />
            <Route path="/parent/leave" element={<StudentLeavePage />} />
            <Route path="/parent/announcements" element={<ParentAnnouncementsPage />} />
            <Route
              path="/parent/announcements/:announcementId"
              element={<AnnouncementDetailPage mode="viewer" audience="Parent" />}
            />
            <Route path="/parent/notifications" element={<Navigate to="/parent/announcements" replace />} />
            <Route path="/parent/classes" element={<Navigate to="/parent/schedule" replace />} />
            <Route path="/parent/attendance" element={<Navigate to="/parent/schedule" replace />} />
            <Route path="/parent/progress" element={<Navigate to="/parent/dashboard" replace />} />
            <Route path="/parent/invoices" element={<Navigate to="/parent/dashboard" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
