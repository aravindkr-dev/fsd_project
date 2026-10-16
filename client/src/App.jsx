import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './hooks/useAuth';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/auth/Login';
import { HOME } from './pages/auth/home';
import ToastProvider from './components/ToastProvider';
import AdminDashboard from './pages/admin/AdminDashboard';
import Users from './pages/admin/Users';
import Departments from './pages/admin/Departments';
import Trainings from './pages/admin/Trainings';
import AssessmentEditor from './pages/admin/AssessmentEditor';
import AssignTraining from './pages/admin/AssignTraining';
import Requirements from './pages/admin/Requirements';
import Certificates from './pages/admin/Certificates';
import Reports from './pages/admin/Reports';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import MyTraining from './pages/employee/MyTraining';
import TrainingDetail from './pages/employee/TrainingDetail';
import TakeAssessment from './pages/employee/TakeAssessment';
import MyCertificates from './pages/employee/MyCertificates';
import Notifications from './pages/employee/Notifications';

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? HOME[user.role] : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/departments" element={<Departments />} />
                <Route path="/admin/trainings" element={<Trainings />} />
                <Route path="/admin/trainings/:id/assessment" element={<AssessmentEditor />} />
                <Route path="/admin/assignments" element={<AssignTraining />} />
                <Route path="/admin/requirements" element={<Requirements />} />
                <Route path="/admin/certificates" element={<Certificates />} />
                <Route path="/admin/reports" element={<Reports />} />
              </Route>

              <Route element={<ProtectedRoute roles={['trainer']} />}>
                <Route path="/trainer" element={<Trainings />} />
                <Route path="/trainer/trainings/:id/assessment" element={<AssessmentEditor />} />
                <Route path="/trainer/assignments" element={<AssignTraining />} />
              </Route>

              <Route element={<ProtectedRoute roles={['manager']} />}>
                <Route path="/manager" element={<ManagerDashboard />} />
                <Route path="/manager/reports" element={<Reports />} />
              </Route>

              <Route element={<ProtectedRoute roles={['employee']} />}>
                <Route path="/employee" element={<MyTraining />} />
                <Route path="/employee/trainings/:assignmentId" element={<TrainingDetail />} />
                <Route path="/employee/assessments/:id" element={<TakeAssessment />} />
                <Route path="/employee/certificates" element={<MyCertificates />} />
                <Route path="/employee/notifications" element={<Notifications />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
