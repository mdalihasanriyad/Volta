import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AnnouncementBar from './AnnouncementBar'
import Header from './Header'
import MobileDrawer from './MobileDrawer'
import BottomNav from './BottomNav'
import Footer from './Footer'
import Toaster from '../ui/Toaster'
import PageLoader from '../ui/PageLoader'
import { useCatalog } from '../../store/catalog'

export default function Layout() {
  const { pathname } = useLocation()
  const { loaded, error, settings, load } = useCatalog()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  if (!loaded) return <PageLoader />
  if (error) return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div><h1 className="text-xl font-extrabold">We could not load the store</h1><p className="mt-2 text-gray-500">{error}</p><button type="button" onClick={load} className="btn-primary mt-5">Try again</button></div>
    </div>
  )
  if (settings.maintenance) return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div><h1 className="text-2xl font-extrabold">We will be back soon</h1><p className="mt-2 text-gray-500">{settings.storeName || 'The store'} is being updated. Please check again shortly.</p></div>
    </div>
  )
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Header />
      <MobileDrawer />
      <main className="flex-1 pb-20 md:pb-0"><Suspense fallback={<PageLoader />}><Outlet /></Suspense></main>
      <Footer />
      <BottomNav />
      <Toaster />
    </div>
  )
}
