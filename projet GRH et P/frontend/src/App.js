// Mise à jour du fichier App.js pour corriger les routes
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { fr } from "date-fns/locale"

// Contextes
import { AuthProvider } from "./contexts/AuthContext"
import { SocketProvider } from "./contexts/SocketContext"
import { NotificationProvider } from "./contexts/NotificationContext"

// Layouts
import DashboardLayout from "./layouts/DashboardLayout"
import AuthLayout from "./layouts/AuthLayout"

// Pages d'authentification
import LoginPage from "./pages/auth/LoginPage"
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage"
import CompleteProfilePage from "./pages/auth/CompleteProfilePage"

// Pages du tableau de bord
import DashboardPage from "./pages/dashboard/DashboardPage"

// Pages de profil
import ProfilePage from "./pages/profile/ProfilePage"
import SettingsPage from "./pages/profile/SettingsPage"

// Pages d'administration
import UsersPage from "./pages/admin/UsersPage"
import UserFormPage from "./pages/admin/UserFormPage"
import DepartmentsPage from "./pages/admin/DepartmentsPage"
import DepartmentFormPage from "./pages/admin/DepartmentFormPage"

// Pages de présence
import AttendancePage from "./pages/attendance/AttendancePage"
import AttendanceReportPage from "./pages/attendance/AttendanceReportPage"
import MyAttendancePage from "./pages/attendance/MyAttendancePage"

// Pages de congés
import LeavesPage from "./pages/leaves/LeavesPage"
import LeaveRequestPage from "./pages/leaves/LeaveRequestPage"
import LeaveApprovalPage from "./pages/leaves/LeaveApprovalPage"
import LeaveDetailPage from "./pages/leaves/LeaveDetailPage"

// Pages de messages
import MessagesPage from "./pages/messages/MessagesPage"
import ConversationPage from "./pages/messages/ConversationPage"

// Pages de tâches
import TasksPage from "./pages/tasks/TasksPage"
import TaskFormPage from "./pages/tasks/TaskFormPage"
import TaskDetailPage from "./pages/tasks/TaskDetailPage"

// Pages de rapports
import ReportsPage from "./pages/reports/ReportsPage"

// Page de calendrier
import CalendarPage from "./pages/calendar/CalendarPage"

// Thème
import theme from "./theme"

// Routes protégées
import ProtectedRoute from "./components/auth/ProtectedRoute"
import RoleRoute from "./components/auth/RoleRoute"

// Pages de l'assistant IA
import AssistantPage from "./pages/ai/AssistantPage"
import PerformanceAnalysisPage from "./pages/ai/PerformanceAnalysisPage"

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
        {/* Placer le Router à l'extérieur de tous les providers qui utilisent useNavigate() */}
        <Router>
          <AuthProvider>
            <NotificationProvider>
              <SocketProvider>
                <Routes>
                  {/* Routes d'authentification */}
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route
                      path="/complete-profile"
                      element={
                        <ProtectedRoute>
                          <CompleteProfilePage />
                        </ProtectedRoute>
                      }
                    />
                  </Route>

                  {/* Routes du tableau de bord */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <DashboardLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Profil et Paramètres */}
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* Administration - Utilisateurs */}
                    <Route
                      path="/admin/users"
                      element={
                        <RoleRoute roles={["admin"]}>
                          <UsersPage />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="/admin/users/new"
                      element={
                        <RoleRoute roles={["admin"]}>
                          <UserFormPage />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="/admin/users/:id"
                      element={
                        <RoleRoute roles={["admin"]}>
                          <UserFormPage />
                        </RoleRoute>
                      }
                    />

                    {/* Administration - Départements */}
                    <Route
                      path="/admin/departments"
                      element={
                        <RoleRoute roles={["admin"]}>
                          <DepartmentsPage />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="/admin/departments/new"
                      element={
                        <RoleRoute roles={["admin"]}>
                          <DepartmentFormPage />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="/admin/departments/:id"
                      element={
                        <RoleRoute roles={["admin"]}>
                          <DepartmentFormPage />
                        </RoleRoute>
                      }
                    />

                    {/* Présence */}
                    <Route path="/attendance" element={<AttendancePage />} />
                    <Route
                      path="/attendance/report"
                      element={
                        <RoleRoute roles={["admin", "manager"]}>
                          <AttendanceReportPage />
                        </RoleRoute>
                      }
                    />
                    <Route
                      path="/attendance/my"
                      element={
                        <ProtectedRoute>
                          <MyAttendancePage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Congés */}
                    <Route path="/leaves" element={<LeavesPage />} />
                    <Route path="/leaves/request" element={<LeaveRequestPage />} />
                    <Route
                      path="/leaves/approval"
                      element={
                        <RoleRoute roles={["admin", "manager"]}>
                          <LeaveApprovalPage />
                        </RoleRoute>
                      }
                    />
                    <Route path="/leaves/:id" element={<LeaveDetailPage />} />

                    {/* Messages */}
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/messages/:id" element={<ConversationPage />} />

                    {/* Tâches */}
                    <Route path="/tasks" element={<TasksPage />} />
                    <Route path="/tasks/new" element={<TaskFormPage />} />
                    <Route path="/tasks/:id" element={<TaskDetailPage />} />
                    <Route path="/tasks/:id/edit" element={<TaskFormPage />} />

                    {/* Rapports */}
                    <Route
                      path="/reports"
                      element={
                        <RoleRoute roles={["admin", "manager", "assistant"]}>
                          <ReportsPage />
                        </RoleRoute>
                      }
                    />

                    {/* Calendrier */}
                    <Route path="/calendar" element={<CalendarPage />} />

                    {/* AI Assistant */}
                    <Route
                      path="/ai-assistant"
                      element={
                        <ProtectedRoute>
                          <AssistantPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/ai-assistant/performance"
                      element={
                        <RoleRoute roles={["admin", "manager"]}>
                          <PerformanceAnalysisPage />
                        </RoleRoute>
                      }
                    />
                  </Route>

                  {/* Redirection par défaut */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </SocketProvider>
            </NotificationProvider>
          </AuthProvider>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App
