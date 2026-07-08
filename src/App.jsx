import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ClassroomView from './pages/ClassroomView';
import AssignmentView from './pages/AssignmentView';
import StudentsListPage from './pages/StudentsListPage';
import ProjectTimelinePage from './pages/ProjectTimelinePage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/c/:id" 
            element={
              <ProtectedRoute>
                <ClassroomView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/c/:classId/a/:assignmentId" 
            element={
              <ProtectedRoute>
                <AssignmentView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/c/:classId/students" 
            element={
              <ProtectedRoute>
                <StudentsListPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/c/:classId/project/:projectId" 
            element={
              <ProtectedRoute>
                <ProjectTimelinePage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
