import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { PRODUCE_CATEGORIES, GRADE_CLASSIFICATIONS, RIPENESS_STAGES, DEMO_PRODUCTS } from '../../lib/consumerData.js'
import { getPricingRecommendation, generatePriceTiers, calculateTotalCost } from '../../lib/aiPricingEngine.js'
import { addToCart } from '../../lib/consumerData.js'
import PortalNavbar from '../../components/common/PortalNavbar.jsx'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quantity, setQuantity] = React.useState(10)
  
  const product = DEMO_PRODUCTS.find(p => p.id === id)
  
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Product not found</h2>
          <Link to="/consumer/products" className="text-green-600 hover:text-green-700">
            ← Back to Products
          </Link>
        </div>
      </div>
    )
  }

  const pricingRecommendation = getPricingRecommendation(product)
  const priceTiers = generatePriceTiers(product)
  const costCalculation = calculateTotalCost(product, quantity)

  const handleAddToCart = () => {
    addToCart(product, quantity)
    alert(`${product.name} (${quantity} kg) added to cart!`)
    navigate('/consumer/cart')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNavbar portal="consumer" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Product Image */}
          <div className="lg:w-1/2">
            <div className="rounded-2xl h-96 overflow-hidden shadow-lg border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-900 relative">
              <img
                src={product.imageUrl || '/images/products/durum_wheat.jpg'}
                alt={product.name}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/images/products/durum_wheat.jpg';
                }}
              />
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white/90 backdrop-blur-sm">
                Illustrative image
              </span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-1.5 italic">
              * Illustrative image. Actual produce appearance may naturally vary by harvest lot.
            </p>
          </div>

          {/* Product Info */}
          <div className="lg:w-1/2">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{product.name}</h1>
            <p className="text-lg text-gray-600 mb-4">{product.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {GRADE_CLASSIFICATIONS[product.grade]?.name}
              </span>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                {RIPENESS_STAGES[product.ripeness]?.name}
              </span>
              {product.isOrganic && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Organic
                </span>
              )}
            </div>

            <div className="space-y-2 mb-6">
              <p><strong>Variety:</strong> {product.variety}</p>
              <p><strong>Location:</strong> {product.location}</p>
              <p><strong>Farmer:</strong> {product.farmerName}</p>
              <p><strong>Harvest Date:</strong> {product.harvestDate}</p>
              <p><strong>Shelf Life:</strong> {product.shelfLifeDays} days</p>
              <p><strong>Available Quantity:</strong> {product.availableQuantity} kg</p>
              <p><strong>Quality Score:</strong> {product.qualityScore}/100</p>
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-bold text-green-600">₹{product.pricePerKg}/kg</span>
                <span className="text-gray-500">Base price</span>
              </div>

              {/* AI Price Recommendation */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-purple-800 mb-2">🤖 AI Price Recommendation</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-purple-600">
                    ₹{pricingRecommendation.recommendedPrice}/kg
                  </span>
                  <span className="text-sm text-purple-600">
                    Range: ₹{pricingRecommendation.priceRange.min} - ₹{pricingRecommendation.priceRange.max}
                  </span>
                </div>
                <p className="text-sm text-purple-700 mb-2">
                  Confidence: {(pricingRecommendation.confidence * 100).toFixed(0)}%
                </p>
                <ul className="text-sm text-purple-700 space-y-1">
                  {pricingRecommendation.explanation.map((exp, i) => (
                    <li key={i}>• {exp}</li>
                  ))}
                </ul>
                <p className="text-xs text-purple-500 mt-2">
                  ℹ️ {pricingRecommendation.isSimulated ? 'Simulated recommendation - rule-based pricing engine' : 'ML model prediction'}
                </p>
              </div>

              {/* Price Tiers */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-800 mb-2">📊 Bulk Price Tiers</h3>
                <div className="space-y-2">
                  {priceTiers.map((tier, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{tier.minQuantity}-{tier.maxQuantity} kg:</span>
                      <span className="font-bold">₹{tier.pricePerKg}/kg ({tier.discount} off)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="border-t pt-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (kg)</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 10))}
                  className="w-10 h-10 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-24 border rounded-lg px-3 py-2 text-center"
                />
                <button
                  onClick={() => setQuantity(quantity + 10)}
                  className="w-10 h-10 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Cost Calculation */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Total Cost:</span>
                <span className="text-2xl font-bold text-green-600">₹{costCalculation.totalCost.toLocaleString()}</span>
              </div>
              {costCalculation.savings > 0 && (
                <div className="text-sm text-green-700">
                  You save: ₹{costCalculation.savings.toLocaleString()} ({costCalculation.savingsPercentage}%)
                </div>
              )}
            </div>

            <button
              onClick={handleAddToCart}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors"
            >
              Add to Cart 🛒
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
