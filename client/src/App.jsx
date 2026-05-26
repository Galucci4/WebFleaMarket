import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import VendorDashboard from './pages/vendor/VendorDashboard.jsx'
import CreateListingPage from './pages/vendor/CreateListingPage.jsx'
import EditListingPage from './pages/vendor/EditListingPage.jsx'
import VendorProfilePage from './pages/vendor/VendorProfilePage.jsx'
import InquiriesPage from './pages/vendor/InquiriesPage.jsx'
import VendorChatPage from './pages/vendor/ChatPage.jsx'
import BuyerHomePage from './pages/buyer/BuyerHomePage.jsx'
import ListingDetailPage from './pages/buyer/ListingDetailPage.jsx'
import PublicVendorProfilePage from './pages/buyer/VendorProfilePage.jsx'
import MessagesPage from './pages/buyer/MessagesPage.jsx'
import BuyerChatPage from './pages/buyer/ChatPage.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import ReviewListingsPage from './pages/admin/ReviewListingsPage.jsx'
import ReviewReportsPage from './pages/admin/ReviewReportsPage.jsx'
import ManageEventsPage from './pages/admin/ManageEventsPage.jsx'
import ManageVendorsPage from './pages/admin/ManageVendorsPage.jsx'
import ProtectedRoute, { roleHome } from './components/ProtectedRoute.jsx'
import useAuth from './hooks/useAuth.js'

/** Redirects "/" to the user's role-based home, or /login. */
function RootRedirect() {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) return <p>Loading…</p>
  if (!currentUser || !userProfile) return <Navigate to="/login" replace />
  return <Navigate to={roleHome(userProfile.role)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/buyer/*"
        element={
          <ProtectedRoute allowedRoles={['buyer']}>
            <Routes>
              <Route index element={<BuyerHomePage />} />
              <Route path="listings/:id" element={<ListingDetailPage />} />
              <Route path="vendors/:vendorId" element={<PublicVendorProfilePage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="messages/new" element={<BuyerChatPage />} />
              <Route path="messages/:conversationId" element={<BuyerChatPage />} />
              <Route path="*" element={<Navigate to="/buyer" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor/*"
        element={
          <ProtectedRoute allowedRoles={['vendor']}>
            <Routes>
              <Route path="dashboard" element={<VendorDashboard />} />
              <Route path="listings/new" element={<CreateListingPage />} />
              <Route path="listings/:id/edit" element={<EditListingPage />} />
              <Route path="profile" element={<VendorProfilePage />} />
              <Route path="inquiries" element={<InquiriesPage />} />
              <Route path="messages/:conversationId" element={<VendorChatPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['administrator']}>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="listings" element={<ReviewListingsPage />} />
              <Route path="reports" element={<ReviewReportsPage />} />
              <Route path="events" element={<ManageEventsPage />} />
              <Route path="vendors" element={<ManageVendorsPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
