import { Suspense, lazy, useEffect } from 'react'
import { useAuth } from './store'
import { useCatalog } from './store/catalog'
import PageLoader from './components/ui/PageLoader'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { Guard } from './admin/components/Guard'
const AdminLayout = lazy(() => import('./admin/components/AdminLayout'))

const Home = lazy(() => import('./pages/Home'))
const Shop = lazy(() => import('./pages/Shop'))
const Product = lazy(() => import('./pages/Product'))
const Cart = lazy(() => import('./pages/Cart'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const Compare = lazy(() => import('./pages/Compare'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Account = lazy(() => import('./pages/Account'))
const OrderTracking = lazy(() => import('./pages/OrderTracking'))
const Contact = lazy(() => import('./pages/Contact'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ForgotPassword = lazy(() => import('./pages/AuthTokens').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('./pages/AuthTokens').then((m) => ({ default: m.ResetPassword })))
const VerifyEmail = lazy(() => import('./pages/AuthTokens').then((m) => ({ default: m.VerifyEmail })))

const AdminLogin = lazy(() => import('./admin/pages/Login'))
const Dashboard = lazy(() => import('./admin/pages/Dashboard'))
const Orders = lazy(() => import('./admin/pages/Orders'))
const Inventory = lazy(() => import('./admin/pages/Inventory'))
const Sales = lazy(() => import('./admin/pages/Sales'))
const Currency = lazy(() => import('./admin/pages/Currency'))
const Content = lazy(() => import('./admin/pages/Content'))
const Notifications = lazy(() => import('./admin/pages/Notifications'))
const Admins = lazy(() => import('./admin/pages/Admins'))
const Logs = lazy(() => import('./admin/pages/Logs'))
const Settings = lazy(() => import('./admin/pages/Settings'))
const res = (name) => lazy(() => import('./admin/pages/Resources.jsx').then((m) => ({ default: m[name] })))
const Products = lazy(() => import('./admin/pages/Products'))
const Categories = res('Categories')
const Brands = res('Brands')
const Banners = res('Banners')
const Coupons = res('Coupons')
const Reviews = res('Reviews')
const Customers = res('Customers')
const Shipping = res('Shipping')
const Seo = lazy(() => import('./admin/pages/Seo'))

export default function App() {
  // Load store-wide data and restore the customer session once, when the app starts.
  useEffect(() => { useCatalog.getState().load(); useAuth.getState().init() }, [])
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="admin/login" element={<AdminLogin />} />
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Guard id="dashboard"><Dashboard /></Guard>} />
        <Route path="orders" element={<Guard id="orders"><Orders /></Guard>} />
        <Route path="customers" element={<Guard id="customers"><Customers /></Guard>} />
        <Route path="sales" element={<Guard id="sales"><Sales /></Guard>} />
        <Route path="coupons" element={<Guard id="coupons"><Coupons /></Guard>} />
        <Route path="products" element={<Guard id="products"><Products /></Guard>} />
        <Route path="categories" element={<Guard id="categories"><Categories /></Guard>} />
        <Route path="brands" element={<Guard id="brands"><Brands /></Guard>} />
        <Route path="inventory" element={<Guard id="inventory"><Inventory /></Guard>} />
        <Route path="reviews" element={<Guard id="reviews"><Reviews /></Guard>} />
        <Route path="banners" element={<Guard id="banners"><Banners /></Guard>} />
        <Route path="content" element={<Guard id="content"><Content /></Guard>} />
        <Route path="seo" element={<Guard id="seo"><Seo /></Guard>} />
        <Route path="shipping" element={<Guard id="shipping"><Shipping /></Guard>} />
        <Route path="currency" element={<Guard id="currency"><Currency /></Guard>} />
        <Route path="notifications" element={<Guard id="notifications"><Notifications /></Guard>} />
        <Route path="admins" element={<Guard id="admins"><Admins /></Guard>} />
        <Route path="logs" element={<Guard id="logs"><Logs /></Guard>} />
        <Route path="settings" element={<Guard id="settings"><Settings /></Guard>} />
      </Route>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<Product />} />
        <Route path="cart" element={<Cart />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="compare" element={<Compare />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="order-tracking" element={<OrderTracking />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
