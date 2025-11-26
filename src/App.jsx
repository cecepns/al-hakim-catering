import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import About from './pages/About';
import Checkout from './pages/Checkout';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import ProductForm from './pages/admin/ProductForm';
import AdminOrders from './pages/admin/Orders';
import AdminOrderDetail from './pages/admin/OrderDetail';
import AdminVouchers from './pages/admin/Vouchers';
import AdminBanners from './pages/admin/Banners';
import AdminUsers from './pages/admin/Users';
import AdminReviews from './pages/admin/Reviews';
import AdminChecklist from './pages/admin/Checklist';
import AdminCommissionWithdrawals from './pages/admin/CommissionWithdrawals';
import CashFlow from './pages/admin/CashFlow';

// Pembeli Pages
import PembeliDashboard from './pages/pembeli/Dashboard';
import Cart from './pages/pembeli/Cart';
import PembeliCheckout from './pages/pembeli/Checkout';
import PembeliOrders from './pages/pembeli/Orders';
import PembeliOrderDetail from './pages/pembeli/OrderDetail';
import Cashback from './pages/pembeli/Cashback';
import Profile from './pages/pembeli/Profile';

// Marketing Pages
import MarketingDashboard from './pages/marketing/Dashboard';
import MarketingPricing from './pages/marketing/Pricing';
import MarketingOrders from './pages/marketing/Orders';
import MarketingOrderDetail from './pages/marketing/OrderDetail';
import MarketingCommission from './pages/marketing/Commission';

// Operasional Pages
import OperasionalDashboard from './pages/operasional/Dashboard';
import OperasionalOrders from './pages/operasional/Orders';
import OperasionalOrderDetail from './pages/operasional/OrderDetail';
import OperasionalStatusFlow from './pages/operasional/StatusFlow';
import OperasionalChecklist from './pages/operasional/Checklist';

// Dapur Pages
import DapurDashboard from './pages/dapur/Dashboard';
import DapurOrders from './pages/dapur/Orders';
import DapurOrderDetail from './pages/dapur/OrderDetail';

// Kurir Pages
import KurirDashboard from './pages/kurir/Dashboard';
import KurirOrders from './pages/kurir/Orders';
import KurirOrderDetail from './pages/kurir/OrderDetail';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

// Layout untuk halaman public
const PublicLayout = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-grow pt-16">{children}</main>
    <Footer />
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes dengan Navbar & Footer */}
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
      <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
      <Route path="/products" element={<PublicLayout><Products /></PublicLayout>} />
      <Route path="/products/:id" element={<PublicLayout><ProductDetail /></PublicLayout>} />
      <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
      <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />

      {/* Admin Routes - Tanpa Navbar & Footer */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminProducts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products/create"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ProductForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products/edit/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ProductForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminOrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/vouchers"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminVouchers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/banners"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminBanners />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reviews"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminReviews />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/checklist"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminChecklist />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/commission-withdrawals"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminCommissionWithdrawals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/cash-flow"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CashFlow />
          </ProtectedRoute>
        }
      />

      {/* Pembeli Routes - Tanpa Navbar & Footer */}
      <Route
        path="/pembeli/dashboard"
        element={
          <ProtectedRoute allowedRoles={['pembeli']}>
            <PembeliDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pembeli/cart"
        element={
          <ProtectedRoute allowedRoles={['pembeli']}>
            <Cart />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pembeli/checkout"
        element={
          <ProtectedRoute allowedRoles={['pembeli', 'admin', 'marketing']}>
            <PembeliCheckout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pembeli/orders"
        element={
          <ProtectedRoute allowedRoles={['pembeli']}>
            <PembeliOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pembeli/orders/:id"
        element={
          <ProtectedRoute allowedRoles={['pembeli']}>
            <PembeliOrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pembeli/cashback"
        element={
          <ProtectedRoute allowedRoles={['pembeli']}>
            <Cashback />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pembeli/profile"
        element={
          <ProtectedRoute allowedRoles={['pembeli']}>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Marketing Routes - Tanpa Navbar & Footer */}
      <Route
        path="/marketing/dashboard"
        element={
          <ProtectedRoute allowedRoles={['marketing']}>
            <MarketingDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/pricing"
        element={
          <ProtectedRoute allowedRoles={['marketing']}>
            <MarketingPricing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/orders"
        element={
          <ProtectedRoute allowedRoles={['marketing']}>
            <MarketingOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/orders/:id"
        element={
          <ProtectedRoute allowedRoles={['marketing']}>
            <MarketingOrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marketing/commission"
        element={
          <ProtectedRoute allowedRoles={['marketing']}>
            <MarketingCommission />
          </ProtectedRoute>
        }
      />

      {/* Operasional Routes - Tanpa Navbar & Footer */}
      <Route
        path="/operasional/dashboard"
        element={
          <ProtectedRoute allowedRoles={['operasional']}>
            <OperasionalDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operasional/orders"
        element={
          <ProtectedRoute allowedRoles={['operasional']}>
            <OperasionalOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operasional/orders/:id"
        element={
          <ProtectedRoute allowedRoles={['operasional']}>
            <OperasionalOrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operasional/status-flow"
        element={
          <ProtectedRoute allowedRoles={['operasional']}>
            <OperasionalStatusFlow />
          </ProtectedRoute>
        }
      />
      <Route
        path="/operasional/checklist"
        element={
          <ProtectedRoute allowedRoles={['operasional']}>
            <OperasionalChecklist />
          </ProtectedRoute>
        }
      />

      {/* Dapur Routes - Tanpa Navbar & Footer */}
      <Route
        path="/dapur/dashboard"
        element={
          <ProtectedRoute allowedRoles={['dapur']}>
            <DapurDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dapur/orders"
        element={
          <ProtectedRoute allowedRoles={['dapur']}>
            <DapurOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dapur/orders/:id"
        element={
          <ProtectedRoute allowedRoles={['dapur']}>
            <DapurOrderDetail />
          </ProtectedRoute>
        }
      />

      {/* Kurir Routes - Tanpa Navbar & Footer */}
      <Route
        path="/kurir/dashboard"
        element={
          <ProtectedRoute allowedRoles={['kurir']}>
            <KurirDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kurir/orders"
        element={
          <ProtectedRoute allowedRoles={['kurir']}>
            <KurirOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kurir/orders/:id"
        element={
          <ProtectedRoute allowedRoles={['kurir']}>
            <KurirOrderDetail />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <AppRoutes />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
