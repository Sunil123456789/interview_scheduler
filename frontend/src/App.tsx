import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ScheduleInterview from './pages/ScheduleInterview';
import InterviewStatus from './pages/InterviewStatus';
import Admin from './pages/Admin';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function App() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Navigation */}
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <Calendar className="w-8 h-8 text-blue-600" />
                <span className="text-2xl font-bold text-gray-800">Interview Scheduler</span>
              </div>
              <div className="flex space-x-4">
                <Link to="/" className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition">
                  Dashboard
                </Link>
                <Link to="/schedule" className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition">
                  Schedule
                </Link>
                <Link to="/status" className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition">
                  Status
                </Link>
                <Link to="/admin" className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition">
                  Admin
                </Link>
                {isAuthenticated ? (
                  <button
                    onClick={logout}
                    className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition"
                  >
                    Logout{user?.username ? ` (${user.username})` : ''}
                  </button>
                ) : (
                  <Link to="/login" className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition">
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route
              path="/"
              element={(
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/schedule"
              element={(
                <ProtectedRoute>
                  <ScheduleInterview />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/status"
              element={(
                <ProtectedRoute>
                  <InterviewStatus />
                </ProtectedRoute>
              )}
            />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={(
                <ProtectedRoute requireStaff>
                  <Admin />
                </ProtectedRoute>
              )}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
