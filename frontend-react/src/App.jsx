import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import Timeline from './pages/Timeline';
import Relationships from './pages/Relationships';
import Shorts from './pages/Shorts';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import CreatePost from './pages/CreatePost';
import CreateStory from './pages/CreateStory';
import EditProfile from './pages/EditProfile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { VideoProvider } from './context/VideoContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <VideoProvider>
          <AuthProvider>
            <Router>
              <Routes>
                {/* Main App Layout */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Home />} />
                  <Route path="timeline" element={<Timeline />} />
                  <Route path="explore" element={<Explore />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="profile/:username" element={<Profile />} />
                  <Route path="relationships" element={<Relationships />} />
                  <Route path="shorts" element={<Shorts />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="create/post" element={<CreatePost />} />
                  <Route path="create/story" element={<CreateStory />} />
                  <Route path="edit-profile" element={<EditProfile />} />
                </Route>

                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/confirm" element={<ResetPasswordConfirm />} />
              </Routes>
            </Router>
          </AuthProvider>
        </VideoProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
