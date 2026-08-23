import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { RecordPage } from '@/pages/RecordPage';
import { SolutionPage } from '@/pages/SolutionPage';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<HomePage />} />
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
