/**
 * CineRed - Movie Ticket Booking App
 * Core Data Store & Initial State
 */

const MOVIE_DATA = [
  {
    id: "devara",
    title: "Devara: Part 1",
    teluguTitle: "దేవర: పార్ట్ 1",
    tagline: "The Fearless Champion of the Forgotten Coast",
    poster: "assets/images/devara.jpg",
    posterFallback: "https://upload.wikimedia.org/wikipedia/en/f/f0/Devara_Part_1.jpg",
    backdrop: "assets/images/devara_backdrop.webp",
    backdropFallback: "https://upload.wikimedia.org/wikipedia/en/f/f0/Devara_Part_1.jpg",
    releaseYear: "2024",
    certificate: "U/A 16+",
    duration: "2h 58m",
    rating: "9.2",
    voteCount: "248.5K",
    genre: ["Action", "Drama", "Thriller"],
    languages: ["Telugu (Original)", "Hindi", "Tamil", "Kannada", "Malayalam"],
    formats: ["IMAX 2D", "4DX", "DOLBY ATMOS 2D"],
    cast: [
      { name: "Jr. NTR", role: "Devara / Vara" },
      { name: "Janhvi Kapoor", role: "Thangam" },
      { name: "Saif Ali Khan", role: "Bhaira" },
      { name: "Prakash Raj", role: "Singappa" },
      { name: "Srikanth", role: "Rayappa" }
    ],
    director: "Koratala Siva",
    music: "Anirudh Ravichander",
    synopsis: "Set along a fierce and treacherous coastline, a fearless warrior named Devara rises to protect his people from ruthless sea pirates and an illicit smuggling cartel, igniting an explosive battle of honor and bloodline legacy.",
    trailerEmbed: "https://www.youtube-nocookie.com/embed/k_Zc-Bv_8nE",
    trailerUrl: "https://www.youtube.com/watch?v=k_Zc-Bv_8nE",
    fillingRate: {
      percent: 88,
      speedLabel: "FILLING FAST! 🔥",
      seatsLeft: 18,
      totalSeats: 154,
      paceNote: "26 seats booked in the last 15 minutes",
      badgeColor: "#e50914"
    }
  },
  {
    id: "aravinda-sametha",
    title: "Aravinda Sametha Veera Raghava",
    teluguTitle: "అరవింద సమేత వీర రాఘవ",
    tagline: "Asuran to Peacemaker: Bloodshed Must End",
    poster: "assets/images/aravinda_sametha.jpg",
    posterFallback: "https://upload.wikimedia.org/wikipedia/en/d/d7/Aravinda_Sametha_Veera_Raghava.jpg",
    backdrop: "assets/images/aravinda_backdrop.jpg",
    backdropFallback: "https://upload.wikimedia.org/wikipedia/en/d/d7/Aravinda_Sametha_Veera_Raghava.jpg",
    releaseYear: "2018 (4K Re-Release)",
    certificate: "U/A",
    duration: "2h 42m",
    rating: "8.9",
    voteCount: "192.4K",
    genre: ["Action", "Family Drama", "Romance"],
    languages: ["Telugu (Original)", "Hindi Dubbed"],
    formats: ["4K DOLBY ATMOS", "IMAX Re-Master", "2D"],
    cast: [
      { name: "Jr. NTR", role: "Veera Raghava Reddy" },
      { name: "Pooja Hegde", role: "Aravinda" },
      { name: "Jagapathi Babu", role: "Basi Reddy" },
      { name: "Eesha Rebba", role: "Sunanda" },
      { name: "Sunil", role: "Neelambari" }
    ],
    director: "Trivikram Srinivas",
    music: "Thaman S",
    synopsis: "Haunted by decades of violent faction feuds in Rayalaseema that claimed his father's life, a young prince of vengeance embarks on a journey of peace after falling in love with an idealistic documentary filmmaker.",
    trailerEmbed: "https://www.youtube-nocookie.com/embed/k0QG9wZkPcs",
    trailerUrl: "https://www.youtube.com/watch?v=k0QG9wZkPcs",
    fillingRate: {
      percent: 94,
      speedLabel: "ALMOST FULL! ⚡",
      seatsLeft: 9,
      totalSeats: 154,
      paceNote: "Only 9 seats remaining for prime night show",
      badgeColor: "#ff1e27"
    }
  }
];

const THEATRES_DATA = [
  {
    id: "pvr-nexus",
    name: "PVR IMAX: Nexus Mall",
    location: "Kukatpally, Hyderabad",
    features: ["Laser IMAX", "Dolby Atmos 7.1", "Recliner Seats", "F&B Delivery to Seat"],
    distance: "3.2 km away"
  },
  {
    id: "amb-gachibowli",
    name: "AMB Cinemas: Screen 1 VIP",
    location: "Gachibowli, Hyderabad",
    features: ["Barco 4K Laser", "Dolby Atmos", "Luxury Lounger", "Valet Parking"],
    distance: "5.8 km away"
  },
  {
    id: "prasads-multiplex",
    name: "Prasads Multiplex: Large Screen",
    location: "Khairatabad, Necklace Road",
    features: ["Giant Screen (64x72 ft)", "Dual 4K Laser", "Sub-bass Immersion"],
    distance: "7.1 km away"
  },
  {
    id: "cinepolis-dsl",
    name: "Cinépolis: DSL Virtue Mall",
    location: "Uppal, Hyderabad",
    features: ["Macro XE Screen", "RealD 3D", "Premium Sound", "Gourmet Snacks"],
    distance: "9.4 km away"
  }
];

const SEAT_TIERS = {
  RECLINER: { name: "Platinum Recliner", price: 350, rows: ["A", "B"] },
  GOLD: { name: "Gold Prime", price: 250, rows: ["C", "D", "E", "F"] },
  SILVER: { name: "Silver Classic", price: 150, rows: ["G", "H", "J", "K"] }
};

const FOOD_ITEMS = [
  { id: "popcorn-caramel", name: "Jumbo Caramel Popcorn", desc: "Warm crunchy popcorn drizzled with rich butter caramel", price: 240, icon: "fa-solid fa-bowl-food" },
  { id: "combo-tub", name: "Blockbuster Twin Combo", desc: "1 Large Salted Popcorn + 2 Cold Pepsis (600ml)", price: 380, icon: "fa-solid fa-boxes-stacked" },
  { id: "nachos-cheese", name: "Mexican Jalapeño Nachos", desc: "Crispy tortilla chips served with warm melted salsa cheese dip", price: 190, icon: "fa-solid fa-pizza-slice" },
  { id: "pepsi-large", name: "Chilled Pepsi (600ml)", desc: "Ice-cold fountain soda with zero sugar option available", price: 120, icon: "fa-solid fa-glass-water" }
];

const INITIAL_USER_PROFILE = {
  name: "Arjun Reddy",
  email: "arjun.cinephile@redcinema.in",
  phone: "+91 98765 43210",
  city: "Hyderabad",
  avatar: "avatar-1",
  membership: "Ruby Red VIP Cinephile",
  points: 1850,
  tierLevel: "VIP Level 3"
};

const INITIAL_BOOKINGS = [
  {
    bookingId: "RED-DVR-98214",
    movieId: "devara",
    movieTitle: "Devara: Part 1",
    poster: "assets/images/devara.jpg",
    theatre: "AMB Cinemas: Screen 1 VIP, Gachibowli",
    format: "IMAX 2D (Telugu)",
    showDate: "Yesterday, Oct 7",
    showTime: "06:45 PM",
    seats: ["B6", "B7"],
    seatType: "Platinum Recliner",
    ticketCount: 2,
    basePrice: 700,
    convenienceFee: 60,
    taxes: 35,
    foodAmount: 240,
    totalPaid: 1035,
    paymentMethod: "UPI (Google Pay)",
    bookedOn: "Oct 7, 2026, 11:24 AM",
    status: "Completed",
    qrCodeSeed: "RED-DVR-98214-AMB-B6B7"
  },
  {
    bookingId: "RED-ASV-51208",
    movieId: "aravinda-sametha",
    movieTitle: "Aravinda Sametha Veera Raghava",
    poster: "assets/images/aravinda_sametha.jpg",
    theatre: "Prasads Multiplex: Large Screen, Khairatabad",
    format: "4K DOLBY ATMOS",
    showDate: "Oct 4, 2026",
    showTime: "10:15 PM",
    seats: ["E9", "E10", "E11"],
    seatType: "Gold Prime",
    ticketCount: 3,
    basePrice: 750,
    convenienceFee: 90,
    taxes: 42,
    foodAmount: 0,
    totalPaid: 882,
    paymentMethod: "HDFC Credit Card (•••• 4920)",
    bookedOn: "Oct 4, 2026, 04:15 PM",
    status: "Completed",
    qrCodeSeed: "RED-ASV-51208-PRASADS-E9E10E11"
  }
];
