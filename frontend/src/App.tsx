import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import SplashCursor from '@/components/SplashCursor';
import { HomePage } from '@/pages/HomePage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { RecordPage } from '@/pages/RecordPage';
import { SolutionPage } from '@/pages/SolutionPage';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SplashCursor RAINBOW_MODE={false} COLOR="#A855F7" />
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <DashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/record"
                        element={
                            <ProtectedRoute>
                                <RecordPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/record/:id"
                        element={
                            <ProtectedRoute>
                                <RecordPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/solution"
                        element={
                            <ProtectedRoute>
                                <SolutionPage />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
