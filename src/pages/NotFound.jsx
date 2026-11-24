import { SearchX } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState'

export default function NotFound() {
  return <EmptyState level="h1" icon={SearchX} title="Page not found" text="The page you opened does not exist or has moved." cta="Back to home" to="/" />
}
