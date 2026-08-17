export const categories = [
  { id: 'all', name: 'Все', icon: 'Home' },
  { id: 'cottages', name: 'Котеджы', icon: 'Warehouse' },
  { id: 'villas', name: 'Виллы', icon: 'Palace' },
  { id: 'dachas', name: 'Дачи', icon: 'Trees' },
];

export const properties = [
  {
    id: 1,
    title: "Горная Дача в Чимгане",
    location: "Чимган, Ташкентская обл.",
    price: 1500000,
    priceUnit: "день",
    image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=400",
    beds: 3,
    baths: 2,
    rating: 4.8,
    category: 'dachas',
    lat: 41.5173,
    lng: 70.0210,
    owner: {
      name: "Асилбек Р.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Asilbek",
      isVerified: true,
      phone: "+998 90 123 45 67"
    }
  },
  {
    id: 2,
    title: "Современная Вилла с Бассейном",
    location: "Чарвак, Ташкентская обл.",
    price: 35000000,
    priceUnit: "месяц",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=400",
    beds: 5,
    baths: 4,
    rating: 4.9,
    category: 'villas',
    lat: 41.6212,
    lng: 70.0076,
    owner: {
      name: "DachaGo Realty",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Realty",
      isVerified: true,
      phone: "+998 71 200 00 00"
    }
  },
  {
    id: 3,
    title: "Лесная Хижина в Замине",
    location: "Замин, Джизак",
    price: 1200000,
    priceUnit: "день",
    image: "https://images.unsplash.com/photo-1449156001437-3a16b1adbb70?auto=format&fit=crop&q=80&w=400",
    beds: 2,
    baths: 1,
    rating: 4.7,
    category: 'cottages',
    lat: 39.9575,
    lng: 68.4385,
    owner: {
      name: "Шерзод К.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sherzod",
      isVerified: true,
      phone: "+998 93 321 00 11"
    }
  },
  {
    id: 4,
    title: "Традиционный Самаркандский Дом",
    location: "Самарканд",
    price: 2000000,
    priceUnit: "день",
    image: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&q=80&w=400",
    beds: 4,
    baths: 2,
    rating: 4.9,
    category: 'cottages',
    lat: 39.6270,
    lng: 66.9750,
    owner: {
      name: "Гульнара А.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gulnara",
      isVerified: true,
      phone: "+998 94 444 55 66"
    }
  }
];
