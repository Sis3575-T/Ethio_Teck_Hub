import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Auth pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Course pages
import CourseCatalog from './pages/CourseCatalog';
import CourseDetail from './pages/CourseDetail';
import LessonViewer from './pages/LessonViewer';
import QuizRunner from './pages/QuizRunner';

// Placeholder page components — will be replaced with real implementations
const Home = () => <div className="p-8 text-primary-500 font-bold text-2xl">EthioTech Hub — Home</div>;
const Dashboard = () => <div className="p-8">Dashboard</div>;
import Leaderboard from './pages/Leaderboard';
import AIAssistant from './pages/AIAssistant';
const Projects = () => <div className="p-8">Projects</div>;
const Chat = () => <div className="p-8">Chat</div>;
const Marketplace = () => <div className="p-8">Marketplace</div>;
const Portfolio = () => <div className="p-8">Portfolio</div>;
const CertificateVerify = () => <div className="p-8">Certificate Verification</div>;
const Admin = () => <div className="p-8">Admin Dashboard</div>;
const NotFound = () => <div className="p-8">404 — Page Not Found</div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<CourseCatalog />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/courses/:id/lessons/:lessonId" element={<LessonViewer />} />
          <Route path="/courses/:id/quiz" element={<QuizRunner />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/ai" element={<AIAssistant />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/portfolio/:studentId" element={<Portfolio />} />
          <Route path="/certificates/:verificationCode" element={<CertificateVerify />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
