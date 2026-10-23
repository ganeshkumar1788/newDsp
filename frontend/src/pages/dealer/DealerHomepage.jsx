import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PRODUCE_CATEGORIES, DEMO_PRODUCTS } from '../../lib/consumerData.js'
import { getCart } from '../../lib/consumerData.js'
import PortalNavbar from '../../components/common/PortalNavbar.jsx'

export default function DealerHomepage() {
  const cart = getCart()
  const cartItemsCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <PortalNavbar portal="dealer" />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">AgriMap Dealer Marketplace</h1>
          <p className="text-xl text-blue-100 mb-8">
            Wholesale produce for retailers and businesses. Bulk purchasing with AI-powered matching.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/dealer/products"
              className="bg-white text-blue-700 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors"
            >
              📦 Browse Products
            </Link>
            <Link
              to="/dealer/bulk-buying"
              className="bg-indigo-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-600 transition-colors"
            >
              🏭 Bulk Buying
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Why Choose AgriMap for Dealers?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Wholesale Pricing</h3>
            <p className="text-gray-600">Competitive bulk pricing with tiered discounts for large orders.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">AI Matching</h3>
            <p className="text-gray-600">Find the perfect produce based on your business requirements and budget.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="text-4xl mb-4">🏭</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Processing Grade</h3>
            <p className="text-gray-600">Access processing-grade produce suitable for manufacturing and food processing.</p>
          </div>
        </div>
      </div>

      {/* Quick Categories */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(PRODUCE_CATEGORIES).map(([key, category]) => (
            <Link
              key={key}
              to={`/dealer/products?category=${key}`}
              className="bg-white p-5 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 hover:border-blue-300 text-center flex flex-col items-center group"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-sm border border-gray-100 mb-3 bg-gray-50 flex items-center justify-center">
                {category.image ? (
                  <img src={category.image} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }} />
                ) : null}
                <span className="text-3xl" style={{ display: category.image ? 'none' : 'block' }}>{category.icon}</span>
              </div>
              <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{category.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {DEMO_PRODUCTS.filter(p => p.category === key).length} products
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* AI-Powered Bulk Buying Banner */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">AI-Powered Bulk Buying for Dealers</h2>
              <p className="text-indigo-100 text-lg">
                Find the perfect produce for your business. Specify your requirements and let our AI match you with suitable lots.
              </p>
              <ul className="mt-4 space-y-2 text-indigo-100">
                <li>✓ Specify intended use (retail, processing, manufacturing)</li>
                <li>✓ Set quality and ripeness requirements</li>
                <li>✓ Get AI-recommended products based on your needs</li>
                <li>✓ Intelligent pricing with bulk discounts</li>
              </ul>
            </div>
            <Link
              to="/dealer/bulk-buying"
              className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold hover:bg-indigo-50 transition-colors text-center whitespace-nowrap"
            >
              Try Bulk Buying →
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Products */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Featured Products</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {DEMO_PRODUCTS.slice(0, 3).map(product => (
            <Link
              key={product.id}
              to={`/dealer/product/${product.id}`}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 overflow-hidden"
            >
              <div className="h-48 bg-gray-100 overflow-hidden relative group">
                <img
                  src={product.imageUrl || '/images/products/durum_wheat.jpg'}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/images/products/durum_wheat.jpg';
                  }}
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.variety} • {product.location}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-2xl font-bold text-blue-600">₹{product.pricePerKg}/kg</span>
                  <span className="text-sm text-gray-500">{product.availableQuantity} kg</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Cart Floating Button */}
      {cartItemsCount > 0 && (
        <Link
          to="/dealer/cart"
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <div className="relative">
            <span className="text-2xl">🛒</span>
            <span className="absolute -top-2 -right-2 bg-indigo-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
              {cartItemsCount}
            </span>
          </div>
        </Link>
      )}
    </div>
  )
}
