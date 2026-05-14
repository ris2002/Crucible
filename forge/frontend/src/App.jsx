import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { CreditsProvider } from './hooks/useCredits'
import Header from './components/Layout/Header'
import Footer from './components/Layout/Footer'
import FeedPage from './components/Feed/FeedPage'
import ForgePage from './components/Forge/ForgePage'
import ProfilePage from './components/Profile/ProfilePage'
import IdeaDetailPage from './components/Feed/IdeaDetailPage'
import LoginPage from './components/Auth/LoginPage'
import SignupPage from './components/Auth/SignupPage'
import ForgotPasswordPage from './components/Auth/ForgotPasswordPage'
import ResetPasswordPage from './components/Auth/ResetPasswordPage'
import NotificationsPage from './components/Notifications/NotificationsPage'
import DraftsPage from './components/Forge/DraftsPage'
import SettingsPage from './components/Profile/SettingsPage'
import AdminPage from './components/Admin/AdminPage'

export default function App() {
  return (
    <AuthProvider>
      <CreditsProvider>
      <BrowserRouter>
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/forge" element={<ForgePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/idea/:id" element={<IdeaDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/drafts" element={<DraftsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
      </CreditsProvider>
    </AuthProvider>
  )
}
