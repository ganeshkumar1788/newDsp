import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PRODUCE_CATEGORIES, GRADE_CLASSIFICATIONS, RIPENESS_STAGES, DEMO_PRODUCTS } from '../../lib/consumerData.js'
import { getCart, addToCart } from '../../lib/consumerData.js'
import PortalNavbar from '../../components/common/PortalNavbar.jsx'
import Icon from '../../components/common/Icon.jsx'

export default function ConsumerProductsPage() {
  const searchParams = new URLSearchParams(window.location.search)
  const initialCategory = searchParams.get('category') || ''

  const [filters, setFilters] = useState({
    category: initialCategory,
    grade: '',
    ripeness: '',
    minPrice: '',
    maxPrice: '',
    search: '',
  })

  const filteredProducts = useMemo(() => {
    return DEMO_PRODUCTS.filter(product => {
      if (filters.category && product.category !== filters.category) return false
      if (filters.grade && product.grade !== filters.grade) return false
      if (filters.ripeness && product.ripeness !== filters.ripeness) return false
      if (filters.minPrice && product.pricePerKg < Number(filters.minPrice)) return false
      if (filters.maxPrice && product.pricePerKg > Number(filters.maxPrice)) return false
      if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) return false
      return true
    })
  }, [filters])

  const handleAddToCart = (product) => {
    addToCart(product, 1)
    alert(`${product.name} added to cart!`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNavbar portal="consumer" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow p-6 sticky top-4">
              <h2 className="font-bold text-gray-800 mb-4">Filters</h2>
              
              {/* Category Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">All Categories</option>
                  {Object.entries(PRODUCE_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Grade Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                <select
                  value={filters.grade}
                  onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">All Grades</option>
                  {Object.values(GRADE_CLASSIFICATIONS).map(grade => (
                    <option key={grade.id} value={grade.id}>{grade.name}</option>
                  ))}
                </select>
              </div>

              {/* Ripeness Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ripeness</label>
                <select
                  value={filters.ripeness}
                  onChange={(e) => setFilters({ ...filters, ripeness: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">All Ripeness</option>
                  {Object.values(RIPENESS_STAGES).map(ripeness => (
                    <option key={ripeness.id} value={ripeness.id}>{ripeness.name}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Range (₹/kg)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    className="w-1/2 border rounded-lg px-3 py-2"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    className="w-1/2 border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <button
                onClick={() => setFilters({ category: '', grade: '', ripeness: '', minPrice: '', maxPrice: '', search: '' })}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-gray-600">{filteredProducts.length} products found</p>
              <Link to="/consumer/bulk-buying" className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 font-bold text-xs">
                <Icon name="store" size={16} />
                Try Bulk Buying
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 overflow-hidden">
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
                    <Link to={`/consumer/product/${product.id}`}>
                      <h3 className="font-bold text-gray-800 hover:text-green-600">{product.name}</h3>
                    </Link>
                    <p className="text-sm text-gray-500">{product.variety} • {product.location}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {GRADE_CLASSIFICATIONS[product.grade]?.name}
                      </span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                        {RIPENESS_STAGES[product.ripeness]?.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-2xl font-bold text-green-600">₹{product.pricePerKg}/kg</span>
                      <span className="text-sm text-gray-500">{product.availableQuantity} kg</span>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Add to Cart
                      </button>
                      <Link
                        to={`/consumer/product/${product.id}`}
                        className="flex-1 border border-green-600 text-green-600 py-2 rounded-lg hover:bg-green-50 transition-colors text-center"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No products found matching your filters.</p>
                <button
                  onClick={() => setFilters({ category: '', grade: '', ripeness: '', minPrice: '', maxPrice: '', search: '' })}
                  className="mt-4 text-green-600 hover:text-green-700 underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
