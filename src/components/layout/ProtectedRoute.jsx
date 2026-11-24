import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../store'
import PageLoader from '../ui/PageLoader'

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth()
  const { pathname } = useLocation()
  if (!ready) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: pathname }} />
  return children
}
