// Sample menu data, used in demo mode or when the backend connection is unavailable.

// Same format as the data returned by the backend from GET /api/menu

export const categories = [
  { id: 'antipasti', label: 'Antipasti', note: 'Appetizers' },

  { id: 'primi', label: 'Primi', note: 'Fresh pasta and risotto made every morning' },

  { id: 'pizze', label: 'Pizze', note: 'Wood-fired pizza with 48-hour fermented dough' },

  { id: 'secondi', label: 'Secondi', note: 'Main courses featuring meat and seafood' },

  { id: 'dolci', label: 'Dolci', note: 'Desserts' },

  { id: 'bevande', label: 'Bevande', note: 'Wine and beverages' },
];

export const menuItems = [
  // Antipasti

  {
    id: 'a1',
    category: 'antipasti',
    name: 'Burrata e Pomodori',
    description:
      'Creamy burrata, ripe tomatoes, extra virgin olive oil, and fresh basil',
    price: 360,
    vegetarian: true
  },

  {
    id: 'a2',
    category: 'antipasti',
    name: 'Carpaccio di Manzo',
    description:
      'Thinly sliced beef tenderloin, Parmesan cheese, rocket, and lemon',
    price: 420,
    vegetarian: false
  },

  {
    id: 'a3',
    category: 'antipasti',
    name: 'Bruschetta Classica',
    description:
      'Toasted bread topped with tomatoes, garlic, and fresh basil',
    price: 220,
    vegetarian: true
  },

  {
    id: 'a4',
    category: 'antipasti',
    name: 'Prosciutto e Melone',
    description:
      '18-month aged Parma prosciutto served with chilled sweet melon',
    price: 390,
    vegetarian: false
  },

  // Primi

  {
    id: 'p1',
    category: 'primi',
    name: 'Spaghetti alla Carbonara',
    description:
      'Egg yolk, guanciale, Pecorino Romano, and black pepper, without cream',
    price: 380,
    vegetarian: false
  },

  {
    id: 'p2',
    category: 'primi',
    name: 'Tagliatelle al Ragù',
    description:
      'Fresh tagliatelle pasta with slow-cooked beef ragù simmered for 6 hours',
    price: 410,
    vegetarian: false
  },

  {
    id: 'p3',
    category: 'primi',
    name: 'Risotto ai Funghi',
    description:
      'Arborio rice, wild mushrooms sautéed in butter, and grated Parmesan',
    price: 390,
    vegetarian: true
  },

  {
    id: 'p4',
    category: 'primi',
    name: 'Linguine alle Vongole',
    description:
      'Fresh clams sautéed with white wine, garlic, and parsley',
    price: 450,
    vegetarian: false
  },

  {
    id: 'p5',
    category: 'primi',
    name: 'Gnocchi al Gorgonzola',
    description:
      'Handmade potato gnocchi with Gorgonzola sauce and walnuts',
    price: 380,
    vegetarian: true
  },

  // Pizze

  {
    id: 'z1',
    category: 'pizze',
    name: 'Margherita',
    description:
      'Tomato sauce, fior di latte, fresh basil, and extra virgin olive oil',
    price: 320,
    vegetarian: true
  },

  {
    id: 'z2',
    category: 'pizze',
    name: 'Diavola',
    description:
      'Spicy salami, mozzarella, and Italian dried chili',
    price: 380,
    vegetarian: false
  },

  {
    id: 'z3',
    category: 'pizze',
    name: 'Quattro Formaggi',
    description:
      'Mozzarella, Gorgonzola, Parmesan, and Fontina cheese',
    price: 390,
    vegetarian: true
  },

  {
    id: 'z4',
    category: 'pizze',
    name: 'Prosciutto e Rucola',
    description:
      'Prosciutto, rocket, and Parmesan added after baking',
    price: 420,
    vegetarian: false
  },

  // Secondi

  {
    id: 's1',
    category: 'secondi',
    name: 'Ossobuco alla Milanese',
    description:
      'Braised veal shank in white wine, served with saffron risotto',
    price: 780,
    vegetarian: false
  },

  {
    id: 's2',
    category: 'secondi',
    name: 'Branzino al Forno',
    description:
      'Oven-baked sea bass served with lemon, capers, and roasted potatoes',
    price: 690,
    vegetarian: false
  },

  {
    id: 's3',
    category: 'secondi',
    name: 'Pollo alla Cacciatora',
    description:
      'Chicken braised in tomato sauce with olives and rosemary',
    price: 520,
    vegetarian: false
  },

  {
    id: 's4',
    category: 'secondi',
    name: 'Bistecca alla Griglia',
    description:
      '300g ribeye steak grilled over charcoal with sea salt and rosemary',
    price: 950,
    vegetarian: false
  },

  // Dolci

  {
    id: 'd1',
    category: 'dolci',
    name: 'Tiramisù',
    description:
      'Mascarpone cream, espresso-soaked ladyfingers, and cocoa powder',
    price: 240,
    vegetarian: true
  },

  {
    id: 'd2',
    category: 'dolci',
    name: 'Panna Cotta',
    description:
      'Vanilla panna cotta served with fresh berry sauce',
    price: 220,
    vegetarian: true
  },

  {
    id: 'd3',
    category: 'dolci',
    name: 'Affogato',
    description:
      'Vanilla ice cream topped with hot espresso when served',
    price: 190,
    vegetarian: true
  },

  // Bevande

  {
    id: 'b1',
    category: 'bevande',
    name: 'Chianti Classico (Glass)',
    description:
      'Tuscan red wine with cherry notes and soft tannins',
    price: 360,
    vegetarian: true
  },

  {
    id: 'b2',
    category: 'bevande',
    name: 'Pinot Grigio (Glass)',
    description:
      'Dry and refreshing white wine with citrus fruit notes',
    price: 340,
    vegetarian: true
  },

  {
    id: 'b3',
    category: 'bevande',
    name: 'Aperol Spritz',
    description:
      'Aperol, Prosecco, soda water, and orange',
    price: 320,
    vegetarian: true
  },

  {
    id: 'b4',
    category: 'bevande',
    name: 'Espresso',
    description:
      'Dark-roasted coffee beans in the traditional Italian style',
    price: 90,
    vegetarian: true
  },
];

// Signature dishes displayed on the Home page (referenced by ID)

export const signatureIds = ['p2', 'z1', 'd1'];