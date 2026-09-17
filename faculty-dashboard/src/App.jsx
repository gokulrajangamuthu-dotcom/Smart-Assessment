import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/Home';

import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import FacultyForgotPassword from './pages/FacultyForgotPassword';
import Dashboard from './pages/Dashboard';
import FacultyProfile from './pages/FacultyProfile';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminAssessments from './pages/AdminAssessments';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminDepartments from './pages/AdminDepartments';
import AdminReports from './pages/AdminReports';
import AdminSettings from './pages/AdminSettings';
import AdminProfile from './pages/AdminProfile';
import CreateAssessment from './pages/CreateAssessment';
import AddStudents from './pages/AddStudents';
import AddFaculty from './pages/AddFaculty';
import EditAssessment from './pages/EditAssessment';
import FacultyStudentReview from './pages/FacultyStudentReview';
import Messages from './pages/Messages';

import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import StudentForgotPassword from './pages/StudentForgotPassword';
import StudentAssessments from './pages/StudentAssessments';
import StudentTakeAssessment from './pages/StudentTakeAssessment';
import StudentResult from './pages/StudentResult';
import StudentSolutions from './pages/StudentSolutions';
import StudentProfile from './pages/StudentProfile';

function FacultyPrivateRoute({ children }) {
  const token = localStorage.getItem('faculty_token');
  return token ? children : <Navigate to="/faculty/login" />;
}

function AdminPrivateRoute({ children }) {
  const token = localStorage.getItem('faculty_token');
  const isAdmin = localStorage.getItem('faculty_is_admin') === 'true';
  if (!token) return <Navigate to="/faculty/login" />;
  if (!isAdmin) return <Navigate to="/faculty/dashboard" />;
  return children;
}

function StudentPrivateRoute({ children }) {
  const token = localStorage.getItem('student_token');
  return token ? children : <Navigate to="/student/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Faculty */}
        <Route path="/faculty/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/faculty/forgot-password" element={<FacultyForgotPassword />} />
        <Route path="/faculty/dashboard" element={<FacultyPrivateRoute><Dashboard /></FacultyPrivateRoute>} />
        <Route path="/faculty/profile" element={<FacultyPrivateRoute><FacultyProfile /></FacultyPrivateRoute>} />

        {/* Admin shell — shared Sidebar/Header via AdminLayout, all children admin-only */}
        <Route path="/admin" element={<AdminPrivateRoute><AdminLayout /></AdminPrivateRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="assessments" element={<AdminAssessments />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="faculty" element={<AddFaculty />} />
          <Route path="students" element={<AddStudents />} />
          <Route path="departments" element={<AdminDepartments />} />
          <Route path="messages" element={<Messages />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>

        <Route path="/faculty/messages" element={<FacultyPrivateRoute><Messages /></FacultyPrivateRoute>} />
        <Route path="/faculty/create" element={<FacultyPrivateRoute><CreateAssessment /></FacultyPrivateRoute>} />
        <Route path="/faculty/add-students" element={<FacultyPrivateRoute><AddStudents /></FacultyPrivateRoute>} />
        <Route path="/faculty/add-faculty" element={<Navigate to="/admin/faculty" replace />} />
        <Route path="/faculty/edit/:id" element={<FacultyPrivateRoute><EditAssessment /></FacultyPrivateRoute>} />
        <Route path="/faculty/review/:assessmentId/:studentId" element={<FacultyPrivateRoute><FacultyStudentReview /></FacultyPrivateRoute>} />

        {/* Route aliases */}
        <Route path="/login" element={<Navigate to="/faculty/login" replace />} />
        <Route path="/student-login" element={<Navigate to="/student/login" replace />} />
        <Route path="/student/dashboard" element={<Navigate to="/student/assessments" replace />} />

        {/* Student */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/register" element={<StudentRegister />} />
        <Route path="/student/forgot-password" element={<StudentForgotPassword />} />
        <Route path="/student/assessments" element={<StudentPrivateRoute><StudentAssessments /></StudentPrivateRoute>} />
        <Route path="/student/take/:assessmentId" element={<StudentPrivateRoute><StudentTakeAssessment /></StudentPrivateRoute>} />
        <Route path="/student/result" element={<StudentPrivateRoute><StudentResult /></StudentPrivateRoute>} />
        <Route path="/student/solutions/:assessmentId" element={<StudentPrivateRoute><StudentSolutions /></StudentPrivateRoute>} />
        <Route path="/student/profile" element={<StudentPrivateRoute><StudentProfile /></StudentPrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
