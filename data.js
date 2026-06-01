// Default seed list used before the user connects a Google Sheet.
// Each item: { category, item, brand, quantity, unit }
const DEFAULT_LIST = (function () {
  const groups = {
    'Pantry & Dry Goods': [
      'Rice', 'Flour', 'Rice flour', 'Rathi/Anchor flour', 'Atta flour', 'Kadala flour',
      'White raw rice', 'Sugar', 'Salt', 'Macaroni', 'Noodles', 'Maggie', 'Dhal',
      'Kadala dhal', 'Grams', 'Kaupre (brown/white)', 'Green grams', 'Ulundu', 'Rava/Sago',
      'Papadam', 'Bread crumbs', 'Yeast', 'Samaposha', 'Soya meat'
    ],
    'Spices, Oils & Condiments': [
      'Salt powder', 'Pepper powder', 'Curry powder', 'Turmeric', 'Cardamom', 'Cinnamon',
      'Mustard powder/paste', 'Cloves', 'Tamarind', 'Goraka', 'Sesame seeds',
      'Maldive fish powder', 'Dhil seeds', 'Red chillies', 'Chillie pieces', 'Coconut oil',
      'Vegetable oil', 'Olive oil', 'Ghee', 'Astra', 'Pastry margarine',
      'Coconut milk powder', 'Mayonnaise', 'Soya sauce', 'Sauce', 'Tea leaves'
    ],
    'Meat, Seafood & Dairy': [
      'Sprats', 'Karuvaadu', 'Isso', 'Beef', 'Chicken', 'Sausages', 'Fish', 'Salmon',
      'Eggs', 'Fresh milk', 'Curd/Yogurt', 'Cheese', 'Ice cream'
    ],
    'Produce & Fruits': [
      'Onions', 'Potatoes', 'Ginger', 'Garlic', 'Tomatoes', 'Lime', 'Chillies', 'Coconuts'
    ],
    'Dessert & Baking': [
      'Colouring', 'Vanilla essence', 'Glycerin', 'Gelatin', 'Jelly', 'Chocolate powder',
      'Cooking chocolate', 'China grass', 'Corn flour', 'Custard powder', 'Choco syrup',
      'Biscuits', 'Dates', 'Cup cake moulds', 'Chocolate chips', 'Vermicelles',
      'Candied peel', 'Jaggery', 'Karupathi', 'Baking powder', 'Kithul paani'
    ],
    'Household & Personal Care': [
      'Sponge', 'Harpic', 'Shampoo', 'Lysol', 'Surf Excel', 'Glass cleaner', 'Pynol',
      'Vim soap', 'Vim liquid', 'Hand wash', 'Baby soap', 'Toothbrush', 'Toothpaste',
      'Match box', 'Toilet seat sanitizer', 'Dettol', 'Paper rolls', 'Tissue papers',
      'Lunch sheets', 'Garbage bags', 'Scrubs', 'Batteries', 'Sunlight powder', 'Cream',
      'Cologne', 'Deodorant', 'Body spray'
    ],
    'Pharmacy': [
      'Panadol', 'Vitamin C', 'Samahan', 'Paspanguwa', 'Asamodaram', 'Batu thel',
      'Plasters', 'Pengiri thel', 'Peringiram', 'Natchiram'
    ]
  };

  const list = [];
  Object.keys(groups).forEach(category => {
    groups[category].forEach(item => {
      list.push({ category, item, brand: '', quantity: '', unit: '' });
    });
  });
  return list;
})();
