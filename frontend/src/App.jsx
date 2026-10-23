import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import FarmerDashboardPage from './pages/FarmerDashboardPage'
import FarmersManagementPage from './pages/FarmersManagementPage'
import AdminLandEditorPage from './pages/AdminLandEditorPage'
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import MapViewPage from './pages/MapViewPage'
import IoTDashboardPage from './pages/IoTDashboardPage'
import DataToolsPage from './pages/DataToolsPage'
import UsersPage from './pages/UsersPage'
import MarketplacePage from './pages/MarketplacePage'
import SurveyorManagementPage from './pages/SurveyorManagementPage'
import AdminRequestsPage from './pages/AdminRequestsPage'
import FarmerSellPage from './pages/FarmerSellPage'
import SurveyorSellPage from './pages/SurveyorSellPage'
import DemandInsightsPage from './pages/admin/DemandInsightsPage'

// Consumer Portal Pages
import ConsumerHomepage from './pages/consumer/ConsumerHomepage'
import ConsumerProductsPage from './pages/consumer/ConsumerProductsPage'
import ProductDetailPage from './pages/consumer/ProductDetailPage'
import BulkBuyingPage from './pages/consumer/BulkBuyingPage'
import CartPage from './pages/consumer/CartPage'
import CheckoutPage from './pages/consumer/CheckoutPage'
import OrdersPage from './pages/consumer/OrdersPage'

// Dealer Portal Pages
import DealerHomepage from './pages/dealer/DealerHomepage'
import DealerProductsPage from './pages/dealer/DealerProductsPage'
import DealerProductDetailPage from './pages/dealer/DealerProductDetailPage'
import DealerBulkBuyingPage from './pages/dealer/DealerBulkBuyingPage'
import DealerCartPage from './pages/dealer/DealerCartPage'
import DealerCheckoutPage from './pages/dealer/DealerCheckoutPage'
import DealerOrdersPage from './pages/dealer/DealerOrdersPage'

// Layout
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { NavigationLoaderProvider } from './contexts/NavigationLoaderContext'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavigationLoaderProvider>
          <Routes>
          {/* Public Gateway & Showcase */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/showcase" element={<LandingPage />} />

          {/* Consumer Portal Routes - Public for testing */}
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/consumer" element={<MarketplacePage />} />
          <Route path="/consumer/home" element={<ConsumerHomepage />} />
          <Route path="/consumer/products" element={<ConsumerProductsPage />} />
          <Route path="/consumer/product/:id" element={<ProductDetailPage />} />
          <Route path="/consumer/bulk-buying" element={<BulkBuyingPage />} />
          <Route path="/consumer/cart" element={<CartPage />} />
          <Route path="/consumer/checkout" element={<CheckoutPage />} />
          <Route path="/consumer/orders" element={<OrdersPage />} />

          {/* Dealer Portal Routes - Public for testing */}
          <Route path="/dealer" element={<DealerHomepage />} />
          <Route path="/dealer/products" element={<DealerProductsPage />} />
          <Route path="/dealer/product/:id" element={<DealerProductDetailPage />} />
          <Route path="/dealer/bulk-buying" element={<DealerBulkBuyingPage />} />
          <Route path="/dealer/cart" element={<DealerCartPage />} />
          <Route path="/dealer/checkout" element={<DealerCheckoutPage />} />
          <Route path="/dealer/orders" element={<DealerOrdersPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/marketplace" element={<MarketplacePage />} />
              {/* Farmer Portal: Dedicated interactive farmland map (farmer, admin, verifier) */}
              <Route path="/farmer" element={<FarmerDashboardPage />} />
              <Route path="/farmer/sell" element={<FarmerSellPage />} />
              <Route path="/surveyor/sell" element={<SurveyorSellPage />} />

              {/* Land Verifier & Verifier (farmers view for approval + map editing) */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'verifier', 'land_verifier']} />}>
                <Route path="/admin/farmers" element={<FarmersManagementPage />} />
                <Route path="/admin/requests" element={<AdminRequestsPage />} />
                <Route path="/admin/editor/:fieldId" element={<AdminLandEditorPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="/map/:fieldId" element={<MapViewPage />} />
                <Route path="/iot" element={<IoTDashboardPage />} />
                <Route path="/iot/:fieldId" element={<IoTDashboardPage />} />
                <Route path="/data-tools" element={<DataToolsPage />} />
              </Route>

              {/* Admin Management Console (farmers, surveyors, demand insights) */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/surveyors" element={<SurveyorManagementPage />} />
                <Route path="/admin/demand-insights" element={<DemandInsightsPage />} />
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </NavigationLoaderProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}

