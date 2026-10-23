import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCart, removeFromCart, updateCartQuantity, clearCart, getCartTotal } from '../../lib/consumerData.js'
import PortalNavbar from '../../components/common/PortalNavbar.jsx'

export default function CartPage() {
  const navigate = useNavigate()
  const cart = getCart()
  const total = getCartTotal()

  const handleQuantityChange = (productId, newQuantity) => {
    updateCartQuantity(productId, newQuantity)
    window.location.reload()
  }

  const handleRemove = (productId) => {
    removeFromCart(productId)
    window.location.reload()
  }

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Your cart is empty')
      return
    }
    navigate('/consumer/checkout')
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <PortalNavbar portal="consumer" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
            <Link to="/consumer/products" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNavbar portal="consumer" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                      <img
                        src={item.imageUrl || '/images/products/durum_wheat.jpg'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/images/products/durum_wheat.jpg';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">{item.name}</h3>
                      <p className="text-sm text-gray-500">{item.variety} • {item.location}</p>
                      <p className="text-sm text-gray-500">₹{item.pricePerKg}/kg</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 10)}
                        className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 10)}
                        className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">₹{(item.pricePerKg * item.quantity).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(item.productId)}
                      className="text-red-500 hover:text-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:w-96">
            <div className="bg-white rounded-xl shadow p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-bold">₹{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery</span>
                  <span className="font-bold">₹200</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-lg font-bold text-gray-800">Total</span>
                  <span className="text-lg font-bold text-green-600">₹{(total + 200).toLocaleString()}</span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors mb-2"
              >
                Proceed to Checkout →
              </button>
              <button
                onClick={() => { clearCart(); window.location.reload() }}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
