import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCart, clearCart, saveOrder } from '../../lib/consumerData.js'
import PortalNavbar from '../../components/common/PortalNavbar.jsx'

export default function DealerCheckoutPage() {
  const navigate = useNavigate()
  const cart = getCart()
  const total = cart.reduce((sum, item) => sum + (item.pricePerKg * item.quantity), 0)
  const deliveryCharge = 200

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    businessName: '',
    gstNumber: '',
    address: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    deliveryDate: '',
    paymentMethod: 'cod',
  })

  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsProcessing(true)

    setTimeout(() => {
      const order = {
        items: cart,
        subtotal: total,
        deliveryCharge,
        total: total + deliveryCharge,
        customerDetails: formData,
        paymentMethod: formData.paymentMethod,
      }

      saveOrder(order)
      clearCart()
      setIsProcessing(false)
      navigate('/dealer/orders')
    }, 2000)
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
          <button onClick={() => navigate('/dealer/products')} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            Browse Products
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNavbar portal="dealer" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Checkout Form */}
          <div className="flex-1">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Business Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                    <input
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows="3"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code *</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Delivery Date</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="cod">Cash on Delivery</option>
                    <option value="upi">UPI</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Place Order'}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:w-96">
            <div className="bg-white rounded-xl shadow p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span>{item.name} ({item.quantity} kg)</span>
                    <span>₹{(item.pricePerKg * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-bold">₹{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery</span>
                  <span className="font-bold">₹{deliveryCharge}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-lg font-bold text-gray-800">Total</span>
                  <span className="text-lg font-bold text-blue-600">₹{(total + deliveryCharge).toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-800">
                  ℹ️ Demo Order: This is a simulated checkout process. No actual payment will be processed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
