# AgriMap DSP — Image Generation Credits & Attribution

All produce and crop imagery in the AgriMap DSP platform is generated using **Nano Banana (Gemini Image Generation)**.
Images adhere to strict product photography guidelines: 4:3 landscape ratio, soft natural daylight, shallow depth of field, product centered on rustic/farm backdrops, with zero text, watermarks, or artificial badges.

> **Buyer Notice**: All product imagery in the Consumer and Dealer portals is illustrative. Actual farm delivery may vary slightly in natural shape, color, and size based on current harvest conditions.

---

### Product Imagery Inventory

| Product / Crop | Asset Path | Generating Model | Exact Prompt Used |
| :--- | :--- | :--- | :--- |
| **Tomato** | `/images/tomato-roma.jpg` | Nano Banana | *Photorealistic photo of fresh ripe red Roma tomatoes on vine on rustic wooden table, soft natural daylight, shallow depth of field, 4:3 landscape, no text, no people* |
| **Onion** | `/images/onion-red.jpg` | Nano Banana | *Photorealistic photo of fresh whole red onions with dry papery skin on burlap surface, rustic farm ambient lighting, shallow depth of field, 4:3 landscape, no text, no people* |
| **Banana** | `/images/banana-cavendish.jpg` | Nano Banana | *Photorealistic photo of a bunch of fresh ripe yellow bananas on a rustic wooden table, soft natural morning daylight, shallow depth of field, 4:3 landscape, no text, no people* |
| **Potato** | `/images/potato-russet.jpg` | Nano Banana | *Photorealistic photo of whole russet potatoes with light earthy soil on a wooden surface, natural daylight, shallow depth of field, 4:3 landscape, no text, no people* |
| **Mango** | `/images/mango-alphonso.jpg` | Nano Banana | *Photorealistic photo of fresh Alphonso mangoes in a woven basket on a rustic wooden table, soft natural daylight, shallow depth of field, 4:3 landscape, no text, no people* |
| **Carrot** | `/images/carrot.jpg` | Nano Banana | *Photorealistic photo of fresh farm orange carrots with green tops tied in a bunch, on a rustic wooden table in natural daylight, shallow depth of field, 4:3 landscape, no text, no people* |
| **Cabbage** | `/images/cabbage.jpg` | Nano Banana | *Photorealistic photo of a fresh whole green cabbage head with textured crisp leaves on a rustic wooden board, soft natural morning sunlight, shallow depth of field, 4:3 landscape, no text, no people* |
| **Cauliflower** | `/images/cauliflower.jpg` | Nano Banana | *Photorealistic photo of a fresh whole white cauliflower head with green protective outer leaves on a rustic wooden table, soft natural daylight, shallow depth of field, 4:3 landscape, no text, no people* |
| **Basmati Rice** | `/images/sona_masoori_rice.jpg` | Nano Banana | *Photorealistic photo of golden basmati paddy rice grains in rustic jute sack, soft natural daylight, 4:3 landscape, no text* |
| **Golden Wheat** | `/images/durum_wheat.jpg` | Nano Banana | *Photorealistic photo of golden harvested wheat grains and stalks on rustic wooden table, warm sunlight, 4:3 landscape, no text* |
| **Red Chillies** | `/images/red_bell_peppers.jpg` | Nano Banana | *Photorealistic photo of fresh harvested red chillies and peppers on farm table, natural daylight, 4:3 landscape, no text* |
| **Cotton / Soybean**| `/images/yellow_soybeans.jpg` | Nano Banana | *Photorealistic photo of harvested raw agricultural crop on rustic surface, natural daylight, 4:3 landscape, no text* |
| **Groundnut** | `/images/groundnut_oil.jpg` | Nano Banana | *Photorealistic photo of raw groundnut peanuts in shell on rustic wooden surface, 4:3 landscape, no text* |

---

### Manifest Implementation
All front-end components consume these assets through [frontend/src/lib/imageManifest.js](file:///c:/Users/ganesh/FXT/DSP--1/frontend/src/lib/imageManifest.js).
Components never use hardcoded arbitrary URLs and include standard `onError` fallbacks.
