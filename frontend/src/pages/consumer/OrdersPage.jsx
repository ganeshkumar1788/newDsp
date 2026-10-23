import React from 'react'
import { Link } from 'react-router-dom'
import { getOrders, getCart } from '../../lib/consumerData.js'
import PortalNavbar from '../../components/common/PortalNavbar.jsx'

export default function OrdersPage() {
  const orders = getOrders()

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNavbar portal="consumer" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No orders yet</h2>
            <p className="text-gray-600 mb-4">Start shopping to see your orders here.</p>
            <Link to="/consumer/products" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
                <div className="flex flex-col lg:flex-row justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">Order #{order.id.slice(-8)}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'delivered' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Order Date: {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Items: {order.items.length} products
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">₹{order.total.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-bold text-gray-800 mb-2">Items:</h4>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                        <span>{item.name} ({item.quantity} kg)</span>
                        <span>₹{(item.pricePerKg * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Name</p>
                      <p className="font-medium">{order.customerDetails.fullName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <p className="font-medium">{order.customerDetails.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Delivery Address</p>
                      <p className="font-medium">{order.customerDetails.city}, {order.customerDetails.state}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Payment</p>
                      <p className="font-medium">{order.paymentMethod.toUpperCase()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
