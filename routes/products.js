const express = require('express');
const router  = express.Router();

const products = [
  { id:1,  name:'MacBook Pro 16"',        category:'Electronics', price:2499.99, originalPrice:2799.99, stock:6,  emoji:'💻', rating:4.8, reviews:2847, badge:'Deal',    bg:'#D4E4F7', description:'M3 Pro chip, 18GB RAM, Liquid Retina XDR display. The professional\'s machine.', tags:['bestseller'], variants:{ Color:['Space Black','Silver','Space Grey'] } },
  { id:2,  name:'Sony WH-1000XM5',        category:'Electronics', price:249.99,  originalPrice:299.99,  stock:18, emoji:'🎧', rating:4.7, reviews:5621, badge:'Sale',    bg:'#E8D4F7', description:'Industry-leading noise cancellation, 30-hour battery life, pristine call clarity.', tags:['top-rated'], variants:{ Color:['Black','Midnight Blue','Silver'] } },
  { id:3,  name:'Nike Air Max 270',        category:'Footwear',    price:149.99,  originalPrice:null,    stock:32, emoji:'👟', rating:4.5, reviews:9341, badge:null,       bg:'#F7EDD4', description:'Max Air unit in the heel for all-day comfort on any terrain.', tags:[], variants:{ Size:['UK 6','UK 7','UK 8','UK 9','UK 10','UK 11'], Color:['White/Black','Triple Black','Solar Red'] } },
  { id:4,  name:'Nespresso Vertuo Pop',    category:'Kitchen',     price:79.99,   originalPrice:99.99,   stock:22, emoji:'☕', rating:4.6, reviews:3102, badge:'Sale',    bg:'#D4F0E8', description:'Barista-quality coffee at home. Rich crema, every single cup.', tags:[], variants:{ Color:['Mango Yellow','Coconut White','Aqua Mint','Midnight Black'] } },
  { id:5,  name:'Herman Miller Aeron',     category:'Furniture',   price:1495.00, originalPrice:null,    stock:4,  emoji:'🪑', rating:4.9, reviews:1284, badge:'Premium', bg:'#F7D4D4', description:'The gold standard in ergonomic seating. Your back will thank you.', tags:['top-rated'], variants:{ Size:['Size A (Petite)','Size B (Standard)','Size C (Large)'], Color:['Carbon','Graphite','Mineral'] } },
  { id:6,  name:'iPad Pro 13"',            category:'Electronics', price:1099.99, originalPrice:1299.99, stock:10, emoji:'📱', rating:4.8, reviews:4192, badge:'Deal',    bg:'#D4E4F7', description:'M4 chip, Ultra Retina XDR, Apple Pencil Pro. A computer disguised as a tablet.', tags:['bestseller'], variants:{ Storage:['256GB','512GB','1TB','2TB'], Color:['Space Black','Silver'] } },
  { id:7,  name:'Adidas Ultraboost 23',    category:'Footwear',    price:159.99,  originalPrice:189.99,  stock:27, emoji:'🏃', rating:4.6, reviews:6738, badge:'Sale',    bg:'#EAF7D4', description:'Boost midsole returns energy with every stride. Built for distance.', tags:[], variants:{ Size:['UK 6','UK 7','UK 8','UK 9','UK 10','UK 11'], Color:['Core Black','Cloud White','Legacy Indigo'] } },
  { id:8,  name:'KitchenAid Stand Mixer',  category:'Kitchen',     price:449.99,  originalPrice:null,    stock:9,  emoji:'🥘', rating:4.9, reviews:2015, badge:'Premium', bg:'#F7EDD4', description:'10-speed motor, iconic tilt-head. Over 15 attachments available.', tags:['top-rated'], variants:{ Color:['Empire Red','Onyx Black','Ice Blue','Pistachio','Almond Cream'] } },
  { id:9,  name:'LG C3 OLED 55"',         category:'Electronics', price:999.99,  originalPrice:1299.99, stock:7,  emoji:'📺', rating:4.8, reviews:3874, badge:'Deal',    bg:'#E8D4F7', description:'Evo OLED, perfect blacks, infinite contrast, 120Hz for gaming.', tags:['bestseller'], variants:{ Size:['55"','65"','77"','83"'] } },
  { id:10, name:'Dyson V15 Detect',        category:'Appliances',  price:599.99,  originalPrice:699.99,  stock:14, emoji:'🌀', rating:4.7, reviews:4521, badge:'Sale',    bg:'#D4F0E8', description:'Laser reveals hidden dust. HEPA captures 99.99% of particles.', tags:[], variants:{ Type:['V15 Detect','V15 Detect Absolute','V15 Detect Extra'] } },
  { id:11, name:'Kindle Paperwhite',       category:'Electronics', price:129.99,  originalPrice:159.99,  stock:35, emoji:'📖', rating:4.7, reviews:12084,badge:'Sale',    bg:'#F7EDD4', description:'6.8" glare-free display, adjustable warm light, waterproof rated.', tags:['bestseller'], variants:{ Storage:['8GB','16GB','32GB'], Color:['Black','Agave Green','Denim','Rose'] } },
  { id:12, name:'Instant Pot Duo 7-in-1',  category:'Kitchen',     price:89.99,   originalPrice:99.99,   stock:19, emoji:'🍲', rating:4.8, reviews:8741, badge:'Deal',    bg:'#F7D4D4', description:'Seven appliances in one. Pressure cook, slow cook, air fry and more.', tags:['bestseller'], variants:{ Size:['3 Quart','6 Quart','8 Quart'] } },
  { id:13, name:'Apple Watch Ultra 2',     category:'Electronics', price:799.99,  originalPrice:null,    stock:12, emoji:'⌚', rating:4.8, reviews:2341, badge:'New',     bg:'#D4E4F7', description:'Titanium case, 60hr battery, precision GPS. Built for extremes.', tags:[], variants:{ Band:['Alpine Loop','Trail Loop','Ocean Band'], Color:['Natural Titanium','Black Titanium','White Titanium'] } },
  { id:14, name:"Levi's 501 Original",     category:'Clothing',    price:69.99,   originalPrice:89.99,   stock:50, emoji:'👖', rating:4.4, reviews:15623,badge:'Sale',    bg:'#EAF7D4', description:'The original straight fit since 1873. An icon that never goes out of style.', tags:['bestseller'], variants:{ Size:['28×30','30×30','32×30','32×32','34×30','34×32','36×32'], Wash:['Medium Stonewash','Dark Stonewash','Light Wash','Black'] } },
  { id:15, name:'Weber Spirit II E-310',   category:'Outdoor',     price:499.99,  originalPrice:549.99,  stock:8,  emoji:'🔥', rating:4.7, reviews:3128, badge:'Deal',    bg:'#F7D4D4', description:'3-burner gas grill, 529 sq in of cooking space. GS4 grilling system.', tags:[], variants:{ Color:['Black','Ivory'] } },
  { id:16, name:'Ray-Ban Aviator Classic', category:'Accessories', price:161.00,  originalPrice:null,    stock:23, emoji:'🕶️', rating:4.6, reviews:7402, badge:null,       bg:'#F7EDD4', description:'Crystal lenses, metal frame. Timeless since 1937. UV protection.', tags:[], variants:{ Lens:['Green Classic G-15','Blue Classic','Brown Gradient'], Size:['Small (55mm)','Large (62mm)'] } },
  { id:17, name:'Fitbit Charge 6',         category:'Electronics', price:149.99,  originalPrice:179.99,  stock:31, emoji:'📊', rating:4.5, reviews:4892, badge:'Sale',    bg:'#E8D4F7', description:'GPS, 40+ exercise modes, heart rate, sleep tracking, Google services.', tags:[], variants:{ Color:['Obsidian/Black','Coral/Champagne Gold','Porcelain/Platinum'] } },
  { id:18, name:'Ninja Foodi Air Fryer',   category:'Kitchen',     price:119.99,  originalPrice:149.99,  stock:17, emoji:'🍟', rating:4.7, reviews:6234, badge:'Deal',    bg:'#D4F0E8', description:'6-in-1: air fry, roast, reheat, dehydrate, bake, broil. 5.5Qt.', tags:[], variants:{ Size:['4Qt','5.5Qt','8Qt'] } },
  { id:19, name:'Patagonia Nano Puff',     category:'Clothing',    price:279.00,  originalPrice:null,    stock:14, emoji:'🧥', rating:4.8, reviews:2187, badge:'Premium', bg:'#EAF7D4', description:'PrimaLoft Gold insulation, windproof, stuffs into its own pocket.', tags:['top-rated'], variants:{ Size:['XS','S','M','L','XL','XXL'], Color:['Black','Forge Grey','Superior Blue','Cabin Gold'] } },
  { id:20, name:'Theragun Pro',            category:'Appliances',  price:399.99,  originalPrice:499.99,  stock:11, emoji:'💆', rating:4.6, reviews:3841, badge:'Sale',    bg:'#D4E4F7', description:'Percussive therapy, OLED screen, 6 attachments, 300-min battery.', tags:[], variants:{ Color:['Black','White'] } },
];

router.get('/', (req, res) => {
  const { category, search, sort } = req.query;
  let list = [...products];
  if (category && category !== 'All') list = list.filter(p => p.category === category);
  if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));
  if (sort === 'price-asc')  list.sort((a,b) => a.price - b.price);
  if (sort === 'price-desc') list.sort((a,b) => b.price - a.price);
  if (sort === 'rating')     list.sort((a,b) => b.rating - a.rating);
  if (sort === 'reviews')    list.sort((a,b) => b.reviews - a.reviews);
  res.json({ count: list.length, products: list });
});

router.get('/deals', (req, res) => {
  res.json({ products: products.filter(p => p.originalPrice && p.originalPrice > p.price).slice(0, 8) });
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Product ID must be a number' });
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: `Product with ID ${id} not found` });
  const related = products.filter(p => p.category === product.category && p.id !== id).slice(0, 4);
  res.json({ ...product, relatedProducts: related });
});

module.exports = router;
module.exports.products = products;
