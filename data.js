// Default seed list used before the user connects a Google Sheet.
// Each item: { category, item, brand, quantity, unit }
const DEFAULT_LIST = (function () {
  const groups = {
    'Pantry & Dry Goods': [
      'Rice', 'Flour', 'Rice flour', 'Rathi/Anchor flour', 'Atta flour', 'Kadala flour',
      'White raw rice', 'Sugar', 'Salt', 'Macaroni', 'Noodles', 'Maggie', 'Grams',
      'Kadala dhal', 'Dhal', 'Kaupre (brown/white)', 'Green grams', 'Ulundu', 'Rava/Sago',
      'Papadam', 'Bread crumbs', 'Yeast', 'Samaposha', 'Soya meat', 'Astra',
      'Pastry margarine', 'Ghee', 'Natchirami', 'Peringiram', 'Natchiram'
    ],
    'Spices, Oils & Condiments': [
      'Salt powder', 'Pepper powder', 'Curry powder', 'Turmeric', 'Cardamom', 'Cinnamon',
      'Mustard powder/paste', 'Cloves', 'Tamarind', 'Goraka', 'Sesame seeds',
      'Maldive fish powder', 'Dhil seeds', 'Coconut oil', 'Vegetable oil', 'Olive oil',
      'Coconut milk powder', 'Mayonnaise', 'Soya sauce', 'Sauce', 'Tea leaves'
    ],
    'Meat, Seafood & Dairy': [
      'Sprats', 'Karuvaadu', 'Isso', 'Beef', 'Chicken', 'Sausages', 'Fish', 'Salmon',
      'Eggs', 'Fresh milk', 'Curd/Yogurt', 'Kithul paani', 'Cheese', 'Ice cream'
    ],
    'Produce & Fruits': [
      'Onions', 'Potatoes', 'Ginger', 'Garlic', 'Tomatoes', 'Lime', 'Chillies',
      'Chillie pieces', 'Coconuts'
    ],
    'Dessert & Baking': [
      'Colouring', 'Vanilla essence', 'Glycerin', 'Gelatin', 'Jelly', 'Chocolate powder',
      'Cooking chocolate', 'China grass', 'Corn flour', 'Custard powder', 'Choco syrup',
      'Biscuits', 'Dates', 'Cup cake moulds', 'Chocolate chips', 'Vermicelles',
      'Candied peel', 'Jaggery', 'Baking powder'
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
      'Plasters', 'Pengiri thel'
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
