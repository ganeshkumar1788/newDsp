import React, { useState } from 'react'
import Icon from '../components/common/Icon'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import farmStorage from '../lib/farmStorage'
import V2VLogo from '../components/common/V2VLogo'
import PortalNavbar from '../components/common/PortalNavbar'
import { useNavigateWithLoader } from '../contexts/NavigationLoaderContext'
import { getCart } from '../lib/consumerData'

export default function MarketplacePage() {
  const { user } = useAuth()
  const { navigateHome, navigateBackWithLoader } = useNavigateWithLoader()
  const storeCart = getCart()
  const totalStoreCartCount = storeCart.reduce((sum, item) => sum + item.quantity, 0)
  
  // Basic states for Consumer Cart
  const [cartOpen, setCartOpen] = useState(false)
  const [cartItems, setCartItems] = useState([])
  const [deliveryArea, setDeliveryArea] = useState('Anand, Gujarat')
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [orderPlaced, setOrderPlaced] = useState(false)

  // Basic states for Dealer Order
  const [dealerOrderOpen, setDealerOrderOpen] = useState(false)
  const [selectedSupply, setSelectedSupply] = useState(null)
  const [selectedFarmer, setSelectedFarmer] = useState('Ganesh V.')

  const consumerProducts = [
    { id: 1, name: 'Basmati Rice', farmer: 'Vignesh R.', location: 'Thanjavur, Tamil Nadu', khata: '8492', score: 4.9, stock: '500 Quintals', harvest: 'Oct 2026', price: 4200, unit: 'Quintal', icon: '🌾', iconKey: 'rice', image: '/images/sona_masoori_rice.jpg' },
    { id: 2, name: 'Wheat', farmer: 'Kishore S.', location: 'Karad, Satara, Maharashtra', khata: '2194', score: 4.8, stock: '300 Quintals', harvest: 'Sep 2026', price: 3100, unit: 'Quintal', icon: '🌾', iconKey: 'wheat', image: '/images/durum_wheat.jpg' },
    { id: 3, name: 'Mango', farmer: 'Ravi Kumar', location: 'Anand, Gujarat', khata: '4921', score: 5.0, stock: '50 Tons', harvest: 'May 2026', price: 1500, unit: 'Box', icon: '🥭', iconKey: 'mango', image: '/images/mango-alphonso.jpg' },
    { id: 4, name: 'Red Chillies', farmer: 'Venkatesh Rao', location: 'Guntur, AP', khata: '9421', score: 4.7, stock: '120 Quintals', harvest: 'Aug 2026', price: 18000, unit: 'Quintal', icon: '🌶️', iconKey: 'chilli', image: '/images/red_bell_peppers.jpg' },
    { id: 5, name: 'Cotton', farmer: 'Ramesh Patel', location: 'Anand, Gujarat', khata: '3941', score: 4.9, stock: '800 Quintals', harvest: 'Oct 2026', price: 7500, unit: 'Quintal', icon: '🌿', iconKey: 'cotton', image: '/images/yellow_soybeans.jpg' },
    { id: 6, name: 'Groundnut', farmer: 'Ramesh Patel', location: 'Anand, Gujarat', khata: '3941', score: 4.6, stock: '250 Quintals', harvest: 'Sep 2026', price: 6200, unit: 'Quintal', icon: '🥜', iconKey: 'groundnut', image: '/images/groundnut_oil.jpg' },
    { id: 7, name: 'Tomato', farmer: 'Ganesh V.', location: 'Pollachi, TN', khata: '1093', score: 4.9, stock: '20 Tons', harvest: 'Daily', price: 400, unit: 'Crate', icon: '🍅', iconKey: 'tomato', image: '/images/tomato-roma.jpg' },
  ]

  const dealerSupplies = [
    { id: 1, name: 'Certified Hybrid Paddy Seeds', price: 450, unit: '10kg bag', icon: '🌱' },
    { id: 2, name: 'Bio-Organic NPK & Neem Fertilizer', price: 850, unit: '50kg bag', icon: '🧪' },
    { id: 3, name: 'Automatic Drip Irrigation Pipes', price: 3200, unit: 'Bundle', icon: '💧' },
    { id: 4, name: 'IoT Soil Moisture Telemetry Sensor Nodes', price: 4500, unit: 'Unit', icon: '📡' },
    { id: 5, name: '4K Solar AI CCTV Security Cameras', price: 6800, unit: 'Unit', icon: '📹' },
  ]

  const farmersList = ['Ganesh V.', 'Kishore S.', 'Vignesh R.', 'Ravi Kumar']

  const handleAddToCart = (product) => {
    const existing = cartItems.find(item => item.id === product.id)
    if (existing) {
      setCartItems(cartItems.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item))
    } else {
      setCartItems([...cartItems, { ...product, qty: 1 }])
    }
    setCartOpen(true)
  }

  const updateQty = (id, delta) => {
    setCartItems(cartItems.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(1, item.qty + delta) }
      }
      return item
    }))
  }

  const handleCheckout = () => {
    setOrderPlaced(true)
    
    // Save to local storage for Farmer and Admin Portals
    cartItems.forEach(item => {
      farmStorage.saveMarketplaceOrder({
        type: 'consumer_order',
        buyerName: user?.full_name || 'Consumer',
        buyerEmail: user?.email || 'consumer@farmxt.com',
        buyerRole: 'consumer',
        farmerName: item.farmer,
        itemName: item.name,
        quantity: item.qty,
        unit: item.unit,
        totalPrice: item.price * item.qty,
        deliveryArea: deliveryArea,
        paymentMethod: paymentMethod,
        status: 'Order Placed with Grower'
      })
    })

    setTimeout(() => {
      setCartItems([])
      setCartOpen(false)
      setOrderPlaced(false)
      alert("Order placed successfully! Order message has been sent to the Farmer and Admin portals.")
    }, 1500)
  }

  const handleDealerDispatch = () => {
    farmStorage.saveMarketplaceOrder({
      type: 'dealer_supply_dispatch',
      buyerName: user?.full_name || 'Dealer',
      buyerEmail: user?.email || 'dealer@farmxt.com',
      buyerRole: 'dealer',
      farmerName: selectedFarmer,
      itemName: selectedSupply?.name,
      quantity: 1,
      unit: selectedSupply?.unit,
      totalPrice: selectedSupply?.price,
      status: 'Dispatched to Farmer'
    })
    setDealerOrderOpen(false)
    alert(`Dispatched ${selectedSupply?.name} to ${selectedFarmer}'s field successfully! Alert sent to Farmer and Admin portals.`)
  }

  if (user?.role === 'dealer') {
    const groupedByFarmer = consumerProducts.reduce((acc, product) => {
      if (!acc[product.farmer]) {
        acc[product.farmer] = { name: product.farmer, location: product.location, khata: product.khata, score: product.score, products: [] }
      }
      acc[product.farmer].products.push(product)
      return acc
    }, {})

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <PortalNavbar portal="dealer" />

        <div className="p-6 max-w-7xl mx-auto">
          <h1 className="text-3xl font-black text-v2v-deep dark:text-white mb-2">🏢 Dealer B2B Sourcing & Agri-Supply Hub</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">View farmers, their cultivation, and dispatch agri-supplies or propose wholesale contracts.</p>
        
        <div className="mb-8 p-6 bg-v2v-purple/10 rounded-2xl border border-v2v-purple/20">
          <h2 className="text-xl font-bold mb-4"><Icon name="award" size={20} className="inline mr-2 text-emerald-600 align-sub" /> Wholesale Harvest Contracting</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Place B2B wholesale harvest contracts directly with farmers in bulk quantities (5 Tons to 100 Tons) with custom warehouse delivery locations and payment terms.</p>
          <button className="btn-v2v-gradient px-6 py-2 rounded-xl text-white font-bold shadow-lg">Initiate Bulk Contract</button>
        </div>

        <h2 className="text-2xl font-bold mb-4"><Icon name="user" size={22} className="inline mr-2 text-emerald-600 align-sub" /> Farmers Directory & Cultivation Profiles</h2>
        <div className="space-y-6">
          {Object.values(groupedByFarmer).map(farmer => (
            <div key={farmer.name} className="card border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
              
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 md:w-1/3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center text-2xl shadow-inner">🧑‍🌾</div>
                  <div>
                    <h2 className="text-xl font-black text-emerald-900 dark:text-emerald-100">{farmer.name}</h2>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">⭐ {farmer.score} Verified Grower</div>
                  </div>
                </div>
                <div className="text-sm text-emerald-800 dark:text-emerald-300 space-y-2">
                  <p className="flex items-center gap-1.5"><Icon name="mapPin" size={14} className="text-emerald-700 dark:text-emerald-400" /> {farmer.location}</p>
                  <p className="flex items-center gap-1.5"><Icon name="file" size={14} className="text-emerald-700 dark:text-emerald-400" /> Survey Khata #{farmer.khata}</p>
                  <p className="font-bold text-v2v-purple dark:text-purple-300 mt-2">Current Cultivation:</p>
                  <ul className="list-disc pl-4 text-xs">
                    {farmer.products.map(p => <li key={p.id}>{p.name}</li>)}
                  </ul>
                </div>
              </div>

              <div className="p-6 md:w-2/3 flex flex-col">
                <h3 className="text-lg font-bold mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Supply Agri-Inputs & Equipment to {farmer.name.split(' ')[0]}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  {dealerSupplies.map(supply => (
                    <div key={supply.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                      <div>
                        <div className="text-2xl mb-1">{supply.icon}</div>
                        <h4 className="font-bold text-sm leading-tight mb-1">{supply.name}</h4>
                        <p className="text-v2v-purple font-black text-xs mb-3">₹{supply.price} / {supply.unit}</p>
                      </div>
                      <button 
                        onClick={() => { setSelectedSupply(supply); setSelectedFarmer(farmer.name); setDealerOrderOpen(true); }}
                        className="w-full py-1.5 bg-v2v-deep text-white rounded-lg font-bold text-xs hover:bg-v2v-purple transition-colors shadow-sm"
                      >
                        Dispatch Supply
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>
        </div>

        {dealerOrderOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-[#1A1A2E] p-6 rounded-2xl max-w-md w-full shadow-2xl">
              <h3 className="text-xl font-bold mb-4">Confirm Dispatch Order</h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                You are about to dispatch <strong>{selectedSupply?.name}</strong> to <strong>{selectedFarmer}</strong>'s field.
              </p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setDealerOrderOpen(false)} className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold hover:bg-gray-200">Cancel</button>
                <button onClick={handleDealerDispatch} className="flex-1 py-2 rounded-xl btn-v2v-gradient text-white font-bold shadow-lg">Confirm Dispatch</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Consumer View
  const groupedByFarmer = consumerProducts.reduce((acc, product) => {
    if (!acc[product.farmer]) {
      acc[product.farmer] = {
        name: product.farmer,
        location: product.location,
        khata: product.khata,
        score: product.score,
        products: []
      }
    }
    acc[product.farmer].products.push(product)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PortalNavbar portal="consumer" cartCountOverride={cartItems.reduce((acc, item) => acc + item.qty, 0) || totalStoreCartCount} />

      <div className="p-6 max-w-7xl mx-auto relative">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-v2v-deep dark:text-white mb-2"><Icon name="user" size={26} className="inline mr-2 text-emerald-600 align-sub" /> Verified Farmers Directory & Marketplace</h1>
            <p className="text-gray-600 dark:text-gray-400">View farmers, their cultivation, available vegetables, and place orders directly.</p>
          </div>
        <button 
          onClick={() => setCartOpen(true)}
          aria-label="View Shopping Cart"
          className="relative p-3 bg-v2v-purple text-white rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        >
          <Icon name="cart" size={20} />
          {cartItems.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
              {cartItems.reduce((acc, item) => acc + item.qty, 0)}
            </span>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {Object.values(groupedByFarmer).map(farmer => (
          <div key={farmer.name} className="card border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
            
            {/* Farmer Info Sidebar */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 md:w-1/3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center shadow-inner text-emerald-900 dark:text-emerald-100">
                  <Icon name="user" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-emerald-900 dark:text-emerald-100">{farmer.name}</h2>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">⭐ {farmer.score} Verified Grower</div>
                </div>
              </div>
              <div className="text-sm text-emerald-800 dark:text-emerald-300 space-y-2">
                <p className="flex items-center gap-1.5"><Icon name="mapPin" size={14} className="text-emerald-700 dark:text-emerald-400" /> {farmer.location}</p>
                <p className="flex items-center gap-1.5"><Icon name="file" size={14} className="text-emerald-700 dark:text-emerald-400" /> Survey Khata #{farmer.khata}</p>
                <p className="font-bold text-v2v-purple dark:text-purple-300 mt-2">Cultivation & Vegetables Available:</p>
                <ul className="list-disc pl-4 text-xs">
                  {farmer.products.map(p => <li key={p.id}>{p.name}</li>)}
                </ul>
              </div>
            </div>

            {/* Farmer's Products */}
            <div className="p-6 md:w-2/3">
              <h3 className="text-lg font-bold mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Available Produce for Order</h3>
              <div className="space-y-4">
                {farmer.products.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center shadow-sm bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 flex-shrink-0">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }} />
                        ) : null}
                        <span className="text-3xl" style={{ display: product.image ? 'none' : 'block' }}>{product.icon}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm md:text-base">{product.name}</h4>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-3">
                          <span className="flex items-center gap-1"><Icon name="package" size={12} /> Stock: {product.stock}</span>
                          <span className="flex items-center gap-1"><Icon name="calendar" size={12} /> Harvest: {product.harvest}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-v2v-purple font-black text-sm md:text-base whitespace-nowrap">
                        ₹{product.price} <span className="text-xs font-normal text-gray-500">/{product.unit}</span>
                      </div>
                      <button 
                        onClick={() => handleAddToCart(product)}
                        className="px-4 py-1.5 bg-v2v-deep text-white text-xs font-bold rounded-lg hover:bg-v2v-purple transition-colors shadow-sm whitespace-nowrap"
                      >
                        Order from {farmer.name.split(' ')[0]}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </div>
      </div>

      {/* Shopping Cart Drawer Modal */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCartOpen(false)}></div>
          <div className="w-full max-w-md bg-white dark:bg-[#120326] h-full shadow-2xl relative z-10 flex flex-col transform transition-transform border-l border-gray-200 dark:border-gray-800">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h2 className="text-xl font-bold flex items-center gap-2"><Icon name="cart" size={20} className="text-v2v-purple" /> Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="text-2xl hover:text-rose-500">×</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              {cartItems.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">Your cart is empty.</div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }} />
                        ) : null}
                        <span className="text-xl" style={{ display: item.image ? 'none' : 'block' }}>{item.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm line-clamp-1">{item.name}</div>
                        <div className="text-xs text-gray-500">₹{item.price} / {item.unit}</div>
                        <div className="text-xs text-gray-400 mt-1">From: {item.farmer}</div>
                      </div>
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-700 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center font-bold hover:bg-gray-100 dark:hover:bg-gray-600 rounded">-</button>
                        <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center font-bold hover:bg-gray-100 dark:hover:bg-gray-600 rounded">+</button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-4">
                    <div>
                      <label className="label text-xs">Delivery Area / Place</label>
                      <input type="text" value={deliveryArea} onChange={e => setDeliveryArea(e.target.value)} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="label text-xs">Payment Method</label>
                      <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input-field text-sm">
                        <option>UPI / GPay</option>
                        <option>Cash on Delivery</option>
                        <option>Direct Farmer Wallet Pay</option>
                        <option>Credit/Debit Card</option>
                      </select>
                    </div>
                    
                    <div className="p-4 bg-v2v-purple/10 rounded-xl border border-v2v-purple/20 flex justify-between items-center mt-4">
                      <span className="font-bold text-gray-700 dark:text-gray-300">Total:</span>
                      <span className="text-xl font-black text-v2v-deep dark:text-white">
                        ₹{cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#120326]">
              {orderPlaced ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-center text-sm font-bold animate-pulse">
                  <span className="inline-flex items-center gap-1.5"><Icon name="check" size={16} className="text-emerald-500" /> Processing Payment & Order...</span>
                </div>
              ) : (
                <button 
                  onClick={handleCheckout} 
                  disabled={cartItems.length === 0}
                  className={`w-full py-3 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 ${cartItems.length > 0 ? 'btn-v2v-gradient text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  Checkout & Place Order →
                </button>
              )}
            </div>
            
            {/* Live Order Receipt & Tracker Drawer (Mock preview inside cart) */}
            {cartItems.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-900/50">
                <div className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  Live Order Tracker Preview
                </div>
                <div className="flex text-[10px] text-gray-500 dark:text-gray-400 justify-between relative">
                  <div className="absolute top-2 left-0 right-0 h-0.5 bg-blue-200 dark:bg-blue-800/50 z-0"></div>
                  <div className="relative z-10 flex flex-col items-center gap-1 w-1/4">
                    <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">1</div>
                    <span className="text-center leading-tight">Order Placed with Grower</span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center gap-1 w-1/4 opacity-50">
                    <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                    <span className="text-center leading-tight">Harvested & Packed</span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center gap-1 w-1/4 opacity-50">
                    <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                    <span className="text-center leading-tight">Dispatched to Area</span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center gap-1 w-1/4 opacity-50">
                    <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                    <span className="text-center leading-tight">Delivered</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
