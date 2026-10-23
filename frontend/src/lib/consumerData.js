// Consumer Portal Data Structures
// This file contains demo data for the consumer marketplace

// Produce Categories and Classifications
export const PRODUCE_CATEGORIES = {
  TOMATO: { name: 'Tomato', varieties: ['Roma', 'Cherry', 'Beefsteak', 'Heirloom'], icon: '🍅', iconKey: 'sprout', image: '/images/tomato-roma.jpg' },
  ONION: { name: 'Onion', varieties: ['Red', 'White', 'Yellow', 'Shallot'], icon: '🧅', iconKey: 'sprout', image: '/images/onion-red.jpg' },
  POTATO: { name: 'Potato', varieties: ['Russet', 'Yukon Gold', 'Red', 'Sweet'], icon: '🥔', iconKey: 'sprout', image: '/images/potato-russet.jpg' },
  BANANA: { name: 'Banana', varieties: ['Cavendish', 'Plantain', 'Red', 'Lady Finger'], icon: '🍌', iconKey: 'tree', image: '/images/banana-cavendish.jpg' },
  MANGO: { name: 'Mango', varieties: ['Alphonso', 'Kesar', 'Dasheri', 'Totapuri'], icon: '🥭', iconKey: 'tree', image: '/images/mango-alphonso.jpg' },
  CARROT: { name: 'Carrot', varieties: ['Orange', 'Purple', 'Baby', 'Nantes'], icon: '🥕', iconKey: 'sprout', image: '/images/carrot.jpg' },
  CABBAGE: { name: 'Cabbage', varieties: ['Green', 'Red', 'Napa', 'Savoy'], icon: '🥬', iconKey: 'leaf', image: '/images/cabbage.jpg' },
  CAULIFLOWER: { name: 'Cauliflower', varieties: ['White', 'Purple', 'Romanesco', 'Green'], icon: '🥦', iconKey: 'sprout', image: '/images/cauliflower.jpg' },
}

export const GRADE_CLASSIFICATIONS = {
  PREMIUM_FRESH: {
    id: 'premium_fresh',
    name: 'Premium Fresh',
    description: 'High-quality produce suitable for retail and premium buyers',
    icon: '⭐',
    iconKey: 'award',
    priceMultiplier: 1.2,
  },
  STANDARD_GRADE: {
    id: 'standard_grade',
    name: 'Standard Grade',
    description: 'Produce suitable for everyday consumption and commercial use',
    icon: '✓',
    iconKey: 'check',
    priceMultiplier: 1.0,
  },
  PROCESSING_GRADE: {
    id: 'processing_grade',
    name: 'Processing Grade',
    description: 'Produce suitable for food processing based on actual condition',
    icon: '⚙️',
    iconKey: 'settings',
    priceMultiplier: 0.7,
  },
  RIPE_PRODUCE: {
    id: 'ripe_produce',
    name: 'Ripe Produce',
    description: 'Produce at appropriate ripeness for immediate consumption or processing',
    icon: '🌟',
    iconKey: 'sparkles',
    priceMultiplier: 0.85,
  },
  SURPLUS_SHORT_DATED: {
    id: 'surplus_short_dated',
    name: 'Surplus / Short-Dated',
    description: 'Produce that needs quicker sale due to limited remaining shelf life',
    icon: '⏰',
    iconKey: 'clock',
    priceMultiplier: 0.6,
  },
}

export const RIPENESS_STAGES = {
  UNRIPE: { id: 'unripe', name: 'Unripe', daysToRipe: '5-10', icon: '🟢', iconKey: 'circle', color: 'text-emerald-500' },
  SEMI_RIPE: { id: 'semi_ripe', name: 'Semi-Ripe', daysToRipe: '2-5', icon: '🟡', iconKey: 'circle', color: 'text-yellow-500' },
  RIPE: { id: 'ripe', name: 'Ripe', daysToRipe: '0-2', icon: '🟠', iconKey: 'circle', color: 'text-orange-500' },
  OVERRIPE: { id: 'overripe', name: 'Overripe', daysToRipe: '-1 to 0', icon: '🔴', iconKey: 'circle', color: 'text-rose-500' },
}

export const INTENDED_USES = [
  { id: 'retail_sale', name: 'Retail Sale', description: 'For direct consumer sales' },
  { id: 'ketchup_production', name: 'Ketchup Production', description: 'For tomato-based products' },
  { id: 'juice_production', name: 'Juice Production', description: 'For fruit juices and beverages' },
  { id: 'pulp_production', name: 'Pulp Production', description: 'For purees and pulps' },
  { id: 'pickle_production', name: 'Pickle Production', description: 'For pickling and preservation' },
  { id: 'restaurant_use', name: 'Restaurant Use', description: 'For food service establishments' },
  { id: 'other_processing', name: 'Other Processing', description: 'For other food processing applications' },
]

// Demo Products Data — Simplified names per requirements
export const DEMO_PRODUCTS = [
  {
    id: 'prod-001',
    name: 'Tomato',
    category: 'TOMATO',
    variety: 'Roma',
    grade: 'premium_fresh',
    ripeness: 'ripe',
    pricePerKg: 45,
    availableQuantity: 500,
    unit: 'kg',
    farmerId: 'farmer-001',
    farmerName: 'Rajesh Kumar',
    location: 'Salem, Tamil Nadu',
    harvestDate: '2025-10-08',
    shelfLifeDays: 7,
    imageUrl: '/images/tomato-roma.jpg',
    description: 'Fresh farm tomatoes, hand-picked at peak ripeness for retail quality.',
    qualityScore: 95,
    isOrganic: true,
    certifications: ['Organic India', 'FSSAI'],
  },
  {
    id: 'prod-002',
    name: 'Onion',
    category: 'ONION',
    variety: 'Red',
    grade: 'standard_grade',
    ripeness: 'ripe',
    pricePerKg: 25,
    availableQuantity: 1000,
    unit: 'kg',
    farmerId: 'farmer-002',
    farmerName: 'Priya Devi',
    location: 'Trichy, Tamil Nadu',
    harvestDate: '2025-10-05',
    shelfLifeDays: 14,
    imageUrl: '/images/onion-red.jpg',
    description: 'High quality red onions suitable for everyday use and commercial kitchens.',
    qualityScore: 85,
    isOrganic: false,
    certifications: ['FSSAI'],
  },
  {
    id: 'prod-003',
    name: 'Processing Tomato',
    category: 'TOMATO',
    variety: 'Mixed',
    grade: 'processing_grade',
    ripeness: 'ripe',
    pricePerKg: 18,
    availableQuantity: 2000,
    unit: 'kg',
    farmerId: 'farmer-003',
    farmerName: 'Muthuvel',
    location: 'Madurai, Tamil Nadu',
    harvestDate: '2025-10-03',
    shelfLifeDays: 5,
    imageUrl: '/images/tomato-processing.jpg',
    description: 'Tomatoes suitable for ketchup, puree, and food processing applications.',
    qualityScore: 70,
    isOrganic: false,
    certifications: ['FSSAI'],
    processingSuitability: ['ketchup_production', 'juice_production', 'pulp_production'],
  },
  {
    id: 'prod-004',
    name: 'Banana',
    category: 'BANANA',
    variety: 'Cavendish',
    grade: 'ripe_produce',
    ripeness: 'ripe',
    pricePerKg: 32,
    availableQuantity: 800,
    unit: 'kg',
    farmerId: 'farmer-004',
    farmerName: 'Kamala Devi',
    location: 'Coimbatore, Tamil Nadu',
    harvestDate: '2025-10-07',
    shelfLifeDays: 3,
    imageUrl: '/images/banana-cavendish.jpg',
    description: 'Perfectly ripe bananas ready for immediate consumption or bulk fruit sales.',
    qualityScore: 88,
    isOrganic: true,
    certifications: ['Organic India'],
  },
  {
    id: 'prod-005',
    name: 'Mango',
    category: 'MANGO',
    variety: 'Alphonso',
    grade: 'premium_fresh',
    ripeness: 'semi_ripe',
    pricePerKg: 180,
    availableQuantity: 300,
    unit: 'kg',
    farmerId: 'farmer-005',
    farmerName: 'Sundaram',
    location: 'Krishnagiri, Tamil Nadu',
    harvestDate: '2025-10-09',
    shelfLifeDays: 10,
    imageUrl: '/images/mango-alphonso.jpg',
    description: 'Golden Alphonso mangoes from renowned orchards with exquisite aroma.',
    qualityScore: 98,
    isOrganic: true,
    certifications: ['Geographical Indication', 'FSSAI'],
  },
  {
    id: 'prod-006',
    name: 'Potato',
    category: 'POTATO',
    variety: 'Russet',
    grade: 'surplus_short_dated',
    ripeness: 'ripe',
    pricePerKg: 15,
    availableQuantity: 1500,
    unit: 'kg',
    farmerId: 'farmer-006',
    farmerName: 'Velumani',
    location: 'Ooty, Tamil Nadu',
    harvestDate: '2025-09-28',
    shelfLifeDays: 2,
    imageUrl: '/images/potato-russet.jpg',
    description: 'Quality russet potatoes available at discounted wholesale price for immediate use.',
    qualityScore: 75,
    isOrganic: false,
    certifications: ['FSSAI'],
    processingSuitability: ['restaurant_use', 'other_processing'],
  },
  {
    id: 'prod-007',
    name: 'Carrot',
    category: 'CARROT',
    variety: 'Nantes',
    grade: 'premium_fresh',
    ripeness: 'ripe',
    pricePerKg: 35,
    availableQuantity: 600,
    unit: 'kg',
    farmerId: 'farmer-001',
    farmerName: 'Rajesh Kumar',
    location: 'Ooty, Tamil Nadu',
    harvestDate: '2025-10-10',
    shelfLifeDays: 12,
    imageUrl: '/images/carrot.jpg',
    description: 'Fresh crisp orange carrots with sweet crunch, harvested from hill farm beds.',
    qualityScore: 94,
    isOrganic: true,
    certifications: ['Organic India', 'FSSAI'],
  },
  {
    id: 'prod-008',
    name: 'Cabbage',
    category: 'CABBAGE',
    variety: 'Green',
    grade: 'standard_grade',
    ripeness: 'ripe',
    pricePerKg: 20,
    availableQuantity: 900,
    unit: 'kg',
    farmerId: 'farmer-002',
    farmerName: 'Priya Devi',
    location: 'Hosur, Tamil Nadu',
    harvestDate: '2025-10-09',
    shelfLifeDays: 14,
    imageUrl: '/images/cabbage.jpg',
    description: 'Fresh compact heads of green cabbage with crisp textured leaves.',
    qualityScore: 89,
    isOrganic: false,
    certifications: ['FSSAI'],
  },
  {
    id: 'prod-009',
    name: 'Cauliflower',
    category: 'CAULIFLOWER',
    variety: 'White Snowball',
    grade: 'premium_fresh',
    ripeness: 'ripe',
    pricePerKg: 40,
    availableQuantity: 450,
    unit: 'kg',
    farmerId: 'farmer-005',
    farmerName: 'Sundaram',
    location: 'Dindigul, Tamil Nadu',
    harvestDate: '2025-10-11',
    shelfLifeDays: 8,
    imageUrl: '/images/cauliflower.jpg',
    description: 'Tightly packed white curd cauliflower heads surrounded by fresh outer leaves.',
    qualityScore: 96,
    isOrganic: true,
    certifications: ['FSSAI', 'Organic India'],
  },
]

// Market Price Data (Demo)
export const MARKET_PRICES = {
  'TOMATO': {
    basePrice: 40,
    premiumPrice: 50,
    standardPrice: 38,
    processingPrice: 22,
    locations: {
      'Chennai': 42,
      'Coimbatore': 38,
      'Madurai': 35,
      'Salem': 40,
      'Trichy': 37,
    },
    trend: 'stable',
    lastUpdated: '2025-10-10T10:00:00Z',
    source: 'APMC Market Data',
  },
  'ONION': {
    basePrice: 28,
    premiumPrice: 35,
    standardPrice: 26,
    processingPrice: 18,
    locations: {
      'Chennai': 30,
      'Coimbatore': 27,
      'Madurai': 25,
      'Salem': 28,
      'Trichy': 26,
    },
    trend: 'increasing',
    lastUpdated: '2025-10-10T10:00:00Z',
    source: 'APMC Market Data',
  },
  'POTATO': {
    basePrice: 20,
    premiumPrice: 28,
    standardPrice: 18,
    processingPrice: 12,
    locations: {
      'Chennai': 22,
      'Coimbatore': 19,
      'Madurai': 18,
      'Salem': 20,
      'Trichy': 19,
    },
    trend: 'stable',
    lastUpdated: '2025-10-10T10:00:00Z',
    source: 'APMC Market Data',
  },
  'BANANA': {
    basePrice: 35,
    premiumPrice: 45,
    standardPrice: 32,
    processingPrice: 25,
    locations: {
      'Chennai': 38,
      'Coimbatore': 34,
      'Madurai': 32,
      'Salem': 35,
      'Trichy': 33,
    },
    trend: 'decreasing',
    lastUpdated: '2025-10-10T10:00:00Z',
    source: 'APMC Market Data',
  },
  'MANGO': {
    basePrice: 150,
    premiumPrice: 200,
    standardPrice: 140,
    processingPrice: 100,
    locations: {
      'Chennai': 160,
      'Coimbatore': 145,
      'Madurai': 140,
      'Salem': 155,
      'Trichy': 148,
    },
    trend: 'stable',
    lastUpdated: '2025-10-10T10:00:00Z',
    source: 'APMC Market Data',
  },
}

// Historical Price Trends (Demo Data)
export const HISTORICAL_PRICES = {
  'TOMATO': [
    { date: '2025-09-10', price: 35 },
    { date: '2025-09-17', price: 38 },
    { date: '2025-09-24', price: 42 },
    { date: '2025-10-01', price: 40 },
    { date: '2025-10-08', price: 41 },
  ],
  'ONION': [
    { date: '2025-09-10', price: 22 },
    { date: '2025-09-17', price: 25 },
    { date: '2025-09-24', price: 28 },
    { date: '2025-10-01', price: 27 },
    { date: '2025-10-08', price: 29 },
  ],
}

// Cart Storage Functions
export const getCart = () => {
  const cart = localStorage.getItem('consumer_cart')
  return cart ? JSON.parse(cart) : []
}

export const saveCart = (cart) => {
  localStorage.setItem('consumer_cart', JSON.stringify(cart))
}

export const addToCart = (product, quantity) => {
  const cart = getCart()
  const existingItem = cart.find(item => item.productId === product.id)
  
  if (existingItem) {
    existingItem.quantity += quantity
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      category: product.category,
      variety: product.variety,
      grade: product.grade,
      pricePerKg: product.pricePerKg,
      quantity: quantity,
      farmerId: product.farmerId,
      farmerName: product.farmerName,
      location: product.location,
      imageUrl: product.imageUrl,
    })
  }
  
  saveCart(cart)
  return cart
}

export const removeFromCart = (productId) => {
  const cart = getCart()
  const updatedCart = cart.filter(item => item.productId !== productId)
  saveCart(updatedCart)
  return updatedCart
}

export const updateCartQuantity = (productId, quantity) => {
  const cart = getCart()
  const item = cart.find(item => item.productId === productId)
  
  if (item) {
    if (quantity <= 0) {
      return removeFromCart(productId)
    }
    item.quantity = quantity
    saveCart(cart)
  }
  
  return cart
}

export const clearCart = () => {
  localStorage.removeItem('consumer_cart')
  return []
}

export const getCartTotal = () => {
  const cart = getCart()
  return cart.reduce((total, item) => total + (item.pricePerKg * item.quantity), 0)
}

// Orders Storage Functions
export const getOrders = () => {
  const orders = localStorage.getItem('consumer_orders')
  return orders ? JSON.parse(orders) : []
}

export const saveOrder = (order) => {
  const orders = getOrders()
  const newOrder = {
    ...order,
    id: `order-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'confirmed',
  }
  orders.unshift(newOrder)
  localStorage.setItem('consumer_orders', JSON.stringify(orders))
  return newOrder
}

export const getOrderById = (orderId) => {
  const orders = getOrders()
  return orders.find(order => order.id === orderId)
}

// Support ID-based direct lookup for classifications and categories
Object.values(GRADE_CLASSIFICATIONS).forEach(g => {
  if (g && g.id) GRADE_CLASSIFICATIONS[g.id] = g
})
Object.values(RIPENESS_STAGES).forEach(r => {
  if (r && r.id) RIPENESS_STAGES[r.id] = r
})
Object.keys(PRODUCE_CATEGORIES).forEach(k => {
  const cat = PRODUCE_CATEGORIES[k]
  if (cat) {
    const id = k.toLowerCase()
    PRODUCE_CATEGORIES[id] = { id, ...cat }
  }
})

// ── Farmer Inventory Management (localStorage) ───────────────────────────────────
const FARMER_INVENTORY_KEY = 'farmxt_farmer_inventory_v1'

export function getFarmerInventory() {
  try {
    const stored = localStorage.getItem(FARMER_INVENTORY_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function addFarmerProduct(product) {
  const inventory = getFarmerInventory()
  const newProduct = {
    ...product,
    id: `farmer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }
  inventory.push(newProduct)
  localStorage.setItem(FARMER_INVENTORY_KEY, JSON.stringify(inventory))
  return newProduct
}

export function updateFarmerProduct(productId, updates) {
  const inventory = getFarmerInventory()
  const index = inventory.findIndex(p => p.id === productId)
  if (index !== -1) {
    inventory[index] = { ...inventory[index], ...updates, updatedAt: new Date().toISOString() }
    localStorage.setItem(FARMER_INVENTORY_KEY, JSON.stringify(inventory))
    return inventory[index]
  }
  return null
}

export function deleteFarmerProduct(productId) {
  const inventory = getFarmerInventory()
  const filtered = inventory.filter(p => p.id !== productId)
  localStorage.setItem(FARMER_INVENTORY_KEY, JSON.stringify(filtered))
  return filtered
}

export function getFarmerProductsByFarmer(farmerName) {
  const inventory = getFarmerInventory()
  return inventory.filter(p => p.farmerName === farmerName)
}

export function getAllProducts() {
  const demoProducts = DEMO_PRODUCTS.map(p => ({ ...p, source: 'demo' }))
  const farmerProducts = getFarmerInventory().map(p => ({ ...p, source: 'farmer' }))
  return [...demoProducts, ...farmerProducts]
}
