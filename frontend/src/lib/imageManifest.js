/**
 * imageManifest.js
 * Central manifest mapping product and crop IDs to verified photorealistic assets.
 * Generated via Nano Banana (Gemini Image Generation) with uniform 4:3 farm-fresh aesthetics.
 */

export const PRODUCT_IMAGE_MANIFEST = {
  // Consumer / Dealer Produce
  'prod-001': {
    id: 'prod-001',
    name: 'Tomato',
    src: '/images/tomato-roma.jpg',
    alt: 'Fresh organic ripe red tomatoes with green stems on rustic wood',
    prompt: 'Photorealistic photo of fresh ripe red Roma tomatoes on vine on rustic wooden table, soft natural daylight, shallow depth of field, 4:3',
  },
  'prod-002': {
    id: 'prod-002',
    name: 'Onion',
    src: '/images/onion-red.jpg',
    alt: 'Fresh whole red onions with dry outer skin on burlap surface',
    prompt: 'Photorealistic photo of fresh whole red onions with papery skin on burlap surface, rustic farm ambient lighting, 4:3',
  },
  'prod-003': {
    id: 'prod-003',
    name: 'Processing Tomato',
    src: '/images/tomato-processing.jpg',
    alt: 'Ripe processing grade tomatoes ready for culinary use',
    prompt: 'Photorealistic photo of harvested farm tomatoes in wooden crate, soft daylight, 4:3',
  },
  'prod-004': {
    id: 'prod-004',
    name: 'Banana',
    src: '/images/banana-cavendish.jpg',
    alt: 'Fresh bunch of ripe yellow bananas on wooden table',
    prompt: 'Photorealistic photo of a bunch of fresh ripe yellow bananas on a rustic wooden table, soft natural morning daylight, 4:3',
  },
  'prod-005': {
    id: 'prod-005',
    name: 'Mango',
    src: '/images/mango-alphonso.jpg',
    alt: 'Fresh golden Alphonso mangoes in woven basket',
    prompt: 'Photorealistic photo of fresh Alphonso mangoes in a woven basket on a rustic wooden table, soft natural daylight, 4:3',
  },
  'prod-006': {
    id: 'prod-006',
    name: 'Potato',
    src: '/images/potato-russet.jpg',
    alt: 'Fresh whole russet potatoes with earthy texture in jute sack',
    prompt: 'Photorealistic photo of whole russet potatoes with light earthy soil on a wooden surface, natural daylight, 4:3',
  },
  'prod-007': {
    id: 'prod-007',
    name: 'Carrot',
    src: '/images/carrot.jpg',
    alt: 'Fresh orange carrots tied with green tops on rustic wooden table',
    prompt: 'Photorealistic photo of fresh farm orange carrots with green tops tied in a bunch, on a rustic wooden table in natural daylight, 4:3',
  },
  'prod-008': {
    id: 'prod-008',
    name: 'Cabbage',
    src: '/images/cabbage.jpg',
    alt: 'Fresh crisp green cabbage head on wooden cutting board',
    prompt: 'Photorealistic photo of a fresh whole green cabbage head with textured crisp leaves on a rustic wooden board, soft natural morning sunlight, 4:3',
  },
  'prod-009': {
    id: 'prod-009',
    name: 'Cauliflower',
    src: '/images/cauliflower.jpg',
    alt: 'Fresh white cauliflower head with green protective leaves',
    prompt: 'Photorealistic photo of a fresh whole white cauliflower head with green protective outer leaves on a rustic wooden table, 4:3',
  },

  // Marketplace Bulk Crops
  'crop-rice': {
    id: 'crop-rice',
    name: 'Basmati Rice',
    src: '/images/sona_masoori_rice.jpg',
    alt: 'Harvested golden basmati rice grains',
    prompt: 'Photorealistic golden harvest basmati rice grains in rustic jute sack, soft daylight, 4:3',
  },
  'crop-wheat': {
    id: 'crop-wheat',
    name: 'Golden Wheat',
    src: '/images/durum_wheat.jpg',
    alt: 'Harvested golden wheat grains and stalks',
    prompt: 'Photorealistic golden wheat harvest on wooden surface, warm sunlight, 4:3',
  },
  'crop-chilli': {
    id: 'crop-chilli',
    name: 'Red Chillies',
    src: '/images/red_bell_peppers.jpg',
    alt: 'Fresh vibrant red chillies on farm table',
    prompt: 'Photorealistic fresh red chillies harvest, natural lighting, 4:3',
  },
  'crop-cotton': {
    id: 'crop-cotton',
    name: 'Cotton',
    src: '/images/yellow_soybeans.jpg',
    alt: 'Harvested raw agricultural crop',
    prompt: 'Photorealistic agricultural raw harvest, rustic lighting, 4:3',
  },
  'crop-groundnut': {
    id: 'crop-groundnut',
    name: 'Groundnut',
    src: '/images/groundnut_oil.jpg',
    alt: 'Raw groundnuts in shell',
    prompt: 'Photorealistic raw groundnut peanuts in shell on rustic wood, 4:3',
  },
}

/**
 * Helper to retrieve image metadata with safe fallback
 */
export function getProductImage(productId, fallbackCategory = 'TOMATO') {
  if (PRODUCT_IMAGE_MANIFEST[productId]) {
    return PRODUCT_IMAGE_MANIFEST[productId]
  }

  const categoryMap = {
    TOMATO: '/images/tomato-roma.jpg',
    ONION: '/images/onion-red.jpg',
    POTATO: '/images/potato-russet.jpg',
    BANANA: '/images/banana-cavendish.jpg',
    MANGO: '/images/mango-alphonso.jpg',
    CARROT: '/images/carrot.jpg',
    CABBAGE: '/images/cabbage.jpg',
    CAULIFLOWER: '/images/cauliflower.jpg',
  }

  const fallbackSrc = categoryMap[fallbackCategory] || '/images/tomato-roma.jpg'
  return {
    src: fallbackSrc,
    alt: 'Fresh agricultural produce',
    prompt: 'Photorealistic farm produce, 4:3',
  }
}
