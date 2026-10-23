import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PRODUCE_CATEGORIES, INTENDED_USES, RIPENESS_STAGES, GRADE_CLASSIFICATIONS } from '../../lib/consumerData.js'
import { matchBuyerDemand } from '../../lib/marketIntelligence.js'
import { addToCart } from '../../lib/consumerData.js'
import PortalNavbar from '../../components/common/PortalNavbar.jsx'

export default function DealerBulkBuyingPage() {
  const navigate = useNavigate()
  const [requirements, setRequirements] = useState({
    product: '',
    intendedUse: '',
    requiredQuantity: '',
    minBudget: '',
    maxBudget: '',
    preferredRipeness: '',
    qualityRequirements: '',
    deliveryLocation: 'Chennai',
    deliveryDate: '',
    minShelfLife: '',
  })

  const [isSearching, setIsSearching] = useState(false)
  const [matchedProducts, setMatchedProducts] = useState([])

  const handleSearch = () => {
    if (!requirements.product || !requirements.intendedUse || !requirements.requiredQuantity) {
      alert('Please fill in the required fields: Product, Intended Use, and Required Quantity')
      return
    }

    setIsSearching(true)
    
    setTimeout(() => {
      const matches = matchBuyerDemand(requirements)
      setMatchedProducts(matches)
      setIsSearching(false)
    }, 1500)
  }

  const handleAddToCart = (product) => {
    addToCart(product, requirements.requiredQuantity)
    alert(`${product.name} (${requirements.requiredQuantity} kg) added to cart!`)
    navigate('/dealer/cart')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <PortalNavbar portal="dealer" />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold mb-2">🏭 AI-Powered Bulk Buying (Dealer)</h1>
            <p className="text-indigo-100">
              Find the perfect produce for your business. Specify your requirements and let our AI match you with suitable lots.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Requirements Form */}
          <div className="lg:w-96 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Buyer Requirements</h2>
              
              <div className="space-y-4">
                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product *</label>
                  <select
                    value={requirements.product}
                    onChange={(e) => setRequirements({ ...requirements, product: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select Product</option>
                    {Object.entries(PRODUCE_CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Intended Use */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Intended Use *</label>
                  <select
                    value={requirements.intendedUse}
                    onChange={(e) => setRequirements({ ...requirements, intendedUse: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select Intended Use</option>
                    {INTENDED_USES.map(use => (
                      <option key={use.id} value={use.id}>{use.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{INTENDED_USES.find(u => u.id === requirements.intendedUse)?.description}</p>
                </div>

                {/* Required Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Required Quantity (kg) *</label>
                  <input
                    type="number"
                    value={requirements.requiredQuantity}
                    onChange={(e) => setRequirements({ ...requirements, requiredQuantity: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., 500"
                    required
                  />
                </div>

                {/* Budget Range */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Budget (₹)</label>
                    <input
                      type="number"
                      value={requirements.minBudget}
                      onChange={(e) => setRequirements({ ...requirements, minBudget: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Min"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Budget (₹)</label>
                    <input
                      type="number"
                      value={requirements.maxBudget}
                      onChange={(e) => setRequirements({ ...requirements, maxBudget: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Max"
                    />
                  </div>
                </div>

                {/* Preferred Ripeness */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Ripeness</label>
                  <select
                    value={requirements.preferredRipeness}
                    onChange={(e) => setRequirements({ ...requirements, preferredRipeness: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Any Ripeness</option>
                    {Object.values(RIPENESS_STAGES).map(ripeness => (
                      <option key={ripeness.id} value={ripeness.id}>{ripeness.icon} {ripeness.name}</option>
                    ))}
                  </select>
                </div>

                {/* Quality Requirements */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quality Requirements</label>
                  <select
                    value={requirements.qualityRequirements}
                    onChange={(e) => setRequirements({ ...requirements, qualityRequirements: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Any Quality</option>
                    {Object.values(GRADE_CLASSIFICATIONS).map(grade => (
                      <option key={grade.id} value={grade.id}>{grade.icon} {grade.name}</option>
                    ))}
                  </select>
                </div>

                {/* Delivery Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Location</label>
                  <select
                    value={requirements.deliveryLocation}
                    onChange={(e) => setRequirements({ ...requirements, deliveryLocation: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="Chennai">Chennai</option>
                    <option value="Coimbatore">Coimbatore</option>
                    <option value="Madurai">Madurai</option>
                    <option value="Salem">Salem</option>
                    <option value="Trichy">Trichy</option>
                  </select>
                </div>

                {/* Delivery Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Required Delivery Date</label>
                  <input
                    type="date"
                    value={requirements.deliveryDate}
                    onChange={(e) => setRequirements({ ...requirements, deliveryDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                {/* Min Shelf Life */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Shelf Life (days)</label>
                  <input
                    type="number"
                    value={requirements.minShelfLife}
                    onChange={(e) => setRequirements({ ...requirements, minShelfLife: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., 3"
                  />
                </div>

                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-lg font-bold hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? '🤖 AI Searching...' : '🔍 Find Matching Products'}
                </button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="flex-1">
            {matchedProducts.length === 0 && !isSearching && (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-6xl mb-4">🏭</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Find Your Perfect Produce</h3>
                <p className="text-gray-600 mb-4">
                  Fill in your requirements on the left and let our AI find the best matching lots from farmers.
                </p>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 inline-block">
                  <p className="text-sm text-indigo-800">
                    <strong>AI Features:</strong> Ripeness matching, quality analysis, price optimization, and suitability scoring
                  </p>
                </div>
              </div>
            )}

            {matchedProducts.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Found {matchedProducts.length} Matching Lots
                </h2>
                <div className="space-y-4">
                  {matchedProducts.map((product, index) => (
                    <div key={product.id} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="lg:w-48 h-48 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={product.imageUrl || '/images/products/durum_wheat.jpg'}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/images/products/durum_wheat.jpg';
                            }}
                          />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-bold text-gray-800">{product.name}</h3>
                              <p className="text-sm text-gray-500">{product.variety} • {product.location}</p>
                            </div>
                            <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-bold">
                              {product.suitabilityScore}% Match
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              {GRADE_CLASSIFICATIONS[product.grade]?.name}
                            </span>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                              {RIPENESS_STAGES[product.ripeness]?.name}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              {product.availableQuantity} kg available
                            </span>
                          </div>

                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Why this match:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {product.matchReasons.map((reason, i) => (
                                <li key={i}>• {reason}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <div>
                              <p className="text-sm text-gray-500">Estimated Total:</p>
                              <p className="text-2xl font-bold text-blue-600">₹{product.estimatedTotalCost.toLocaleString()}</p>
                              {product.estimatedSavings > 0 && (
                                <p className="text-sm text-blue-600">
                                  Save ₹{product.estimatedSavings.toLocaleString()} vs market price
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleAddToCart(product)}
                              className="bg-indigo-500 text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                            >
                              Add to Cart →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Demo Mode:</strong> All prices, recommendations, and market data are simulated for demonstration purposes. 
            Real-time market integration will be available when connected to actual APMC data sources.
          </p>
        </div>
      </div>
    </div>
  )
}
