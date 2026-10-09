/**
 * CINERED - Movie Ticket Booking Application
 * Core Application Engine & State Controller
 */

// Application State
const AppState = {
  movies: MOVIE_DATA,
  theatres: THEATRES_DATA,
  currentHeroIndex: 0,
  
  // Active Booking Flow
  booking: {
    movie: null,
    theatre: null,
    date: null,
    showtime: null,
    selectedSeats: [], // Array of { id: "B6", row: "B", number: 6, tier: "RECLINER", price: 350 }
    selectedFood: [],  // Array of food items
    promoDiscount: 0,
    promoCode: "",
    occupiedSeats: new Set()
  },

  // User Profile & History
  user: null,
  bookingsHistory: []
};

// Initialize State from LocalStorage or Backend API (AWS RDS via EC2)
async function initAppState() {
  const savedUser = localStorage.getItem('cinered_user');
  if (savedUser) {
    AppState.user = JSON.parse(savedUser);
  } else {
    AppState.user = { ...INITIAL_USER_PROFILE };
    localStorage.setItem('cinered_user', JSON.stringify(AppState.user));
  }

  const savedHistory = localStorage.getItem('cinered_bookings');
  if (savedHistory) {
    AppState.bookingsHistory = JSON.parse(savedHistory);
  } else {
    AppState.bookingsHistory = [...INITIAL_BOOKINGS];
    localStorage.setItem('cinered_bookings', JSON.stringify(AppState.bookingsHistory));
  }

  // Attempt sync with AWS EC2 + RDS Backend if configured
  const apiUrl = window.CONFIG && window.CONFIG.API_URL ? window.CONFIG.API_URL.replace(/\/$/, '') : null;
  if (apiUrl) {
    try {
      const [profRes, bookRes] = await Promise.all([
        fetch(`${apiUrl}/api/profile`, { signal: AbortSignal.timeout(3000) }),
        fetch(`${apiUrl}/api/bookings`, { signal: AbortSignal.timeout(3000) })
      ]);
      if (profRes.ok) {
        const remoteUser = await profRes.json();
        if (remoteUser && remoteUser.name) {
          AppState.user = { ...AppState.user, ...remoteUser };
          localStorage.setItem('cinered_user', JSON.stringify(AppState.user));
        }
      }
      if (bookRes.ok) {
        const remoteBookings = await bookRes.json();
        if (Array.isArray(remoteBookings) && remoteBookings.length > 0) {
          AppState.bookingsHistory = remoteBookings;
          localStorage.setItem('cinered_bookings', JSON.stringify(AppState.bookingsHistory));
        }
      }
      renderUserProfile();
    } catch (err) {
      console.warn("Backend API not reachable, running in resilient local mode:", err);
    }
  }
}

// Save User Profile to LocalStorage and AWS RDS
async function saveUserProfile(updatedData) {
  AppState.user = { ...AppState.user, ...updatedData };
  localStorage.setItem('cinered_user', JSON.stringify(AppState.user));
  renderUserProfile();

  const apiUrl = window.CONFIG && window.CONFIG.API_URL ? window.CONFIG.API_URL.replace(/\/$/, '') : null;
  if (apiUrl) {
    try {
      await fetch(`${apiUrl}/api/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
    } catch (e) {
      console.warn("Failed to sync profile with RDS:", e);
    }
  }
  showToast("Profile details updated successfully!", "fa-check-circle");
}

// Save New Booking to LocalStorage and AWS RDS
async function saveNewBooking(bookingRecord) {
  AppState.bookingsHistory.unshift(bookingRecord);
  AppState.user.points = (AppState.user.points || 1000) + 120;
  localStorage.setItem('cinered_user', JSON.stringify(AppState.user));
  localStorage.setItem('cinered_bookings', JSON.stringify(AppState.bookingsHistory));
  renderUserProfile();

  const apiUrl = window.CONFIG && window.CONFIG.API_URL ? window.CONFIG.API_URL.replace(/\/$/, '') : null;
  if (apiUrl) {
    try {
      await fetch(`${apiUrl}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingRecord)
      });
      showToast("Booking synced with AWS RDS Database!", "fa-database");
    } catch (e) {
      console.warn("Failed to sync booking with RDS:", e);
    }
  }
}

// Document Ready Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  initAppState();
  setupHeroSlider();
  renderMovieCards();
  renderUserProfile();
  setupLiveFillingTicker();
  setupEventListeners();
  setupSearchAndFilters();
});

/* ==========================================================================
   HERO BANNER & SLIDER
   ========================================================================== */
function setupHeroSlider() {
  const sliderWrap = document.getElementById('heroSliderWrap');
  if (!sliderWrap) return;

  sliderWrap.innerHTML = AppState.movies.map((movie, index) => `
    <div class="hero-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
      <img src="${movie.backdrop}" onerror="this.src='${movie.backdropFallback}'" alt="${movie.title}" class="hero-bg-img">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-tag"><i class="fa-solid fa-fire"></i> Trending #1 Blockbuster</div>
        <h1 class="hero-title">${movie.title}</h1>
        <div class="hero-meta">
          <span class="rating-badge"><i class="fa-solid fa-star"></i> ${movie.rating}/10 (${movie.voteCount})</span>
          <span><i class="fa-solid fa-clock"></i> ${movie.duration}</span>
          <span><i class="fa-solid fa-shield-halved"></i> ${movie.certificate}</span>
          <span><i class="fa-solid fa-film"></i> ${movie.formats.join(', ')}</span>
        </div>
        <p class="hero-synopsis">${movie.synopsis}</p>
        <div class="hero-actions">
          <button class="btn-primary" onclick="startBookingFlow('${movie.id}')">
            <i class="fa-solid fa-ticket"></i> Book Tickets Now
          </button>
          <button class="btn-secondary" onclick="openTrailerModal('${movie.id}')">
            <i class="fa-solid fa-play"></i> Watch Trailer
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Auto slide every 6 seconds
  setInterval(() => {
    switchHeroSlide((AppState.currentHeroIndex + 1) % AppState.movies.length);
  }, 6500);
}

function switchHeroSlide(targetIndex) {
  const slides = document.querySelectorAll('.hero-slide');
  slides.forEach((slide, idx) => {
    slide.classList.toggle('active', idx === targetIndex);
  });
  AppState.currentHeroIndex = targetIndex;
}

/* ==========================================================================
   RENDER FEATURED MOVIES WITH LIVE SEAT FILLING RATE
   Requirement 2 & Requirement 5
   ========================================================================== */
function renderMovieCards() {
  const container = document.getElementById('moviesContainer');
  if (!container) return;

  container.innerHTML = AppState.movies.map(movie => {
    const fill = movie.fillingRate;
    return `
      <article class="movie-card" id="card-${movie.id}">
        <div class="movie-card-inner">
          <div class="movie-poster-box">
            <img src="${movie.poster}" onerror="this.src='${movie.posterFallback}'" alt="${movie.title} Poster" class="movie-poster-img">
            <span class="poster-badge-top">${movie.certificate}</span>
            
            <!-- REQUIREMENT 5: LIVE SEAT FILLING INDICATOR NEAR MOVIE POSTER/LOGO -->
            <div class="seat-filling-indicator" title="Live booking velocity for ${movie.title}">
              <div class="filling-header">
                <span class="filling-badge">
                  <i class="fa-solid fa-fire"></i> ${fill.speedLabel}
                </span>
                <span class="filling-percent" id="fill-percent-${movie.id}">${fill.percent}% BOOKED</span>
              </div>
              <div class="filling-progress-track">
                <div class="filling-progress-bar" id="fill-bar-${movie.id}" style="width: ${fill.percent}%"></div>
              </div>
              <div class="filling-status-text">
                <i class="fa-solid fa-bolt"></i>
                <span id="fill-note-${movie.id}">${fill.paceNote}</span>
              </div>
            </div>
          </div>

          <div class="movie-details-box">
            <div>
              <div class="movie-genre-tags">
                ${movie.genre.map(g => `<span class="genre-tag">${g}</span>`).join('')}
              </div>
              <h2 class="movie-card-title">${movie.title}</h2>
              <div class="movie-telugu-name">${movie.teluguTitle}</div>
              
              <div class="movie-stats-row">
                <span class="movie-rating"><i class="fa-solid fa-star"></i> ${movie.rating}/10</span>
                <span><i class="fa-regular fa-clock"></i> ${movie.duration}</span>
                <span><i class="fa-solid fa-language"></i> Telugu, Hindi</span>
              </div>

              <p class="movie-synopsis-snippet">${movie.synopsis}</p>

              <div class="movie-specs-list">
                <div><strong>Starring:</strong> ${movie.cast.map(c => c.name).slice(0, 3).join(', ')}</div>
                <div><strong>Director:</strong> ${movie.director} &bull; <strong>Music:</strong> ${movie.music}</div>
                <div><strong>Formats:</strong> ${movie.formats.join(', ')}</div>
              </div>
            </div>

            <div class="movie-card-actions">
              <button class="btn-book-now" onclick="startBookingFlow('${movie.id}')">
                <i class="fa-solid fa-couch"></i> Select Seats
              </button>
              <button class="btn-trailer" title="Watch Official Trailer" onclick="openTrailerModal('${movie.id}')">
                <i class="fa-solid fa-play"></i>
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Live Seat Filling Ticker Simulation (Simulates real-time seats filling up)
function setupLiveFillingTicker() {
  const cities = ["Hyderabad", "Vizag", "Vijayawada", "Bengaluru", "Tirupati"];
  const names = ["Kiran", "Suresh", "Sai Teja", "Sneha", "Rahul", "Pooja", "Vikram"];
  
  setInterval(() => {
    // Randomly pick a movie and simulate 1-3 seats booked
    const movie = AppState.movies[Math.floor(Math.random() * AppState.movies.length)];
    if (movie.fillingRate.percent < 98) {
      movie.fillingRate.percent = Math.min(99, movie.fillingRate.percent + 1);
      movie.fillingRate.seatsLeft = Math.max(2, movie.fillingRate.seatsLeft - 1);
      
      const percentEl = document.getElementById(`fill-percent-${movie.id}`);
      const barEl = document.getElementById(`fill-bar-${movie.id}`);
      const noteEl = document.getElementById(`fill-note-${movie.id}`);
      
      if (percentEl) percentEl.textContent = `${movie.fillingRate.percent}% BOOKED`;
      if (barEl) barEl.style.width = `${movie.fillingRate.percent}%`;
      
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      if (noteEl) {
        noteEl.innerHTML = `⚡ ${randomName} from ${randomCity} just booked 2 seats!`;
      }
    }
  }, 12000);
}

/* ==========================================================================
   BOOKING WORKFLOW: STEP 1 - SHOWTIME & THEATRE MODAL
   ========================================================================== */
function startBookingFlow(movieId) {
  const movie = AppState.movies.find(m => m.id === movieId);
  if (!movie) return;

  AppState.booking = {
    movie: movie,
    theatre: AppState.theatres[0],
    date: generateNextDays()[0],
    showtime: "06:45 PM",
    selectedSeats: [],
    selectedFood: [],
    promoDiscount: 0,
    promoCode: "",
    occupiedSeats: generateDeterministicOccupiedSeats(movieId, "06:45 PM")
  };

  renderShowtimeModal();
  openModal('bookingModal');
}

// Generate next 5 calendar dates
function generateNextDays() {
  const days = [];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      label: i === 0 ? 'Today' : (i === 1 ? 'Tomorrow' : dayNames[d.getDay()]),
      dayNumber: d.getDate(),
      month: monthNames[d.getMonth()],
      fullDateStr: `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`
    });
  }
  return days;
}

function renderShowtimeModal() {
  const movie = AppState.booking.movie;
  const days = generateNextDays();
  
  const body = document.getElementById('bookingModalContent');
  if (!body) return;

  body.innerHTML = `
    <!-- Stepper Navigation -->
    <div class="booking-stepper">
      <div class="step-item active">
        <div class="step-circle"><i class="fa-solid fa-clock"></i></div>
        <span class="step-name">1. Shows</span>
      </div>
      <div class="step-item">
        <div class="step-circle"><i class="fa-solid fa-couch"></i></div>
        <span class="step-name">2. Seats</span>
      </div>
      <div class="step-item">
        <div class="step-circle"><i class="fa-solid fa-credit-card"></i></div>
        <span class="step-name">3. Pay</span>
      </div>
      <div class="step-item">
        <div class="step-circle"><i class="fa-solid fa-ticket"></i></div>
        <span class="step-name">4. Ticket</span>
      </div>
    </div>

    <!-- Date Pills -->
    <div class="date-selector-row">
      ${days.map((d, idx) => `
        <div class="date-pill ${idx === 0 ? 'active' : ''}" onclick="selectBookingDate(this, '${d.fullDateStr}')">
          <div class="day-name">${d.label}</div>
          <div class="day-number">${d.dayNumber}</div>
        </div>
      `).join('')}
    </div>

    <!-- Theatres & Shows List -->
    <div class="theatre-list">
      ${AppState.theatres.map(th => `
        <div class="theatre-card">
          <div class="theatre-meta">
            <div>
              <h3 class="theatre-name">${th.name}</h3>
              <div class="theatre-location"><i class="fa-solid fa-location-dot"></i> ${th.location} &bull; ${th.distance}</div>
            </div>
            <div class="theatre-tags">
              ${th.features.slice(0, 2).map(f => `<span class="theatre-tag">${f}</span>`).join('')}
            </div>
          </div>
          <div class="showtime-chips">
            <button class="showtime-btn" onclick="chooseShowtimeAndProceed('${th.id}', '10:30 AM')">
              <span class="show-hour">10:30 AM</span>
              <span class="show-format">DOLBY 7.1</span>
            </button>
            <button class="showtime-btn" onclick="chooseShowtimeAndProceed('${th.id}', '02:15 PM')">
              <span class="show-hour">02:15 PM</span>
              <span class="show-format">IMAX 2D</span>
              <span class="show-status filling-fast">Fast Filling</span>
            </button>
            <button class="showtime-btn" onclick="chooseShowtimeAndProceed('${th.id}', '06:45 PM')">
              <span class="show-hour">06:45 PM</span>
              <span class="show-format">4K LASER</span>
              <span class="show-status almost-full">Almost Full</span>
            </button>
            <button class="showtime-btn" onclick="chooseShowtimeAndProceed('${th.id}', '10:15 PM')">
              <span class="show-hour">10:15 PM</span>
              <span class="show-format">DOLBY ATMOS</span>
              <span class="show-status almost-full">Fan Show</span>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Update Modal Header
  document.getElementById('modalMovieTitle').textContent = movie.title;
  document.getElementById('modalMovieSub').textContent = `${movie.certificate} • ${movie.duration} • ${movie.languages[0]}`;
  document.getElementById('modalHeaderThumb').src = movie.poster;
}

function selectBookingDate(pillEl, dateStr) {
  document.querySelectorAll('.date-pill').forEach(el => el.classList.remove('active'));
  pillEl.classList.add('active');
  AppState.booking.date = dateStr;
}

function chooseShowtimeAndProceed(theatreId, timeStr) {
  const theatre = AppState.theatres.find(t => t.id === theatreId);
  AppState.booking.theatre = theatre;
  AppState.booking.showtime = timeStr;
  AppState.booking.occupiedSeats = generateDeterministicOccupiedSeats(AppState.booking.movie.id, timeStr);
  
  // Transition directly to Requirement 3: SEAT SELECTION BEFORE PAYMENT
  renderSeatSelectionView();
}

/* ==========================================================================
   REQUIREMENT 3: SEAT SELECTION SCREEN (STRICTLY BEFORE PAYMENT OPTION)
   ========================================================================== */
function generateDeterministicOccupiedSeats(movieId, showtime) {
  // Generates realistic pattern of occupied seats based on movie and time
  const occupied = new Set();
  const seed = (movieId.length * 7 + showtime.length * 3) % 10;
  
  // Top recliners fast filling
  ['A1', 'A2', 'A3', 'A4', 'A7', 'A8', 'A9', 'A10', 'A13', 'A14', 'B1', 'B2', 'B3', 'B4', 'B11', 'B12'].forEach(s => occupied.add(s));
  
  // Prime rows mostly occupied
  ['C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11',
   'E1', 'E2', 'E5', 'E6', 'E7', 'E8', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'
  ].forEach(s => occupied.add(s));

  // Silver rows partially occupied
  ['G5', 'G6', 'G7', 'G8', 'H6', 'H7', 'H8', 'H9', 'J3', 'J4', 'K7', 'K8'].forEach(s => occupied.add(s));

  return occupied;
}

function renderSeatSelectionView() {
  const booking = AppState.booking;
  const body = document.getElementById('bookingModalContent');
  if (!body) return;

  body.innerHTML = `
    <!-- Stepper Navigation -->
    <div class="booking-stepper">
      <div class="step-item completed">
        <div class="step-circle"><i class="fa-solid fa-check"></i></div>
        <span class="step-name">1. Shows</span>
      </div>
      <div class="step-item active">
        <div class="step-circle"><i class="fa-solid fa-couch"></i></div>
        <span class="step-name">2. Seat Selection</span>
      </div>
      <div class="step-item">
        <div class="step-circle"><i class="fa-solid fa-credit-card"></i></div>
        <span class="step-name">3. Payment</span>
      </div>
      <div class="step-item">
        <div class="step-circle"><i class="fa-solid fa-ticket"></i></div>
        <span class="step-name">4. Ticket</span>
      </div>
    </div>

    <!-- Active Booking Context Banner -->
    <div style="background: #14141d; padding: 12px 18px; border-radius: var(--radius-sm); border: 1px solid #232332; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <div>
        <strong style="color: #fff;">${booking.theatre.name}</strong>
        <div style="font-size: 0.8rem; color: var(--text-muted);">${booking.date ? booking.date.fullDateStr || booking.date : 'Today'} &bull; ${booking.showtime}</div>
      </div>
      <button class="btn-secondary" style="padding: 6px 14px; font-size: 0.8rem;" onclick="renderShowtimeModal()">
        <i class="fa-solid fa-arrow-left"></i> Change Time
      </button>
    </div>

    <!-- Curved Cinema Screen -->
    <div class="cinema-screen-box">
      <div class="screen-curve"></div>
      <div class="screen-label"><i class="fa-solid fa-eye"></i> ALL EYES THIS WAY • CINEMA SCREEN</div>
    </div>

    <!-- Legend -->
    <div class="seat-legend">
      <div class="legend-item">
        <div class="seat-sample avail"></div>
        <span>Available</span>
      </div>
      <div class="legend-item">
        <div class="seat-sample selected"></div>
        <span>Selected</span>
      </div>
      <div class="legend-item">
        <div class="seat-sample occupied"></div>
        <span>Sold Out</span>
      </div>
      <div class="legend-item">
        <div class="seat-sample recliner"></div>
        <span>VIP Recliner</span>
      </div>
    </div>

    <!-- Interactive Seat Grid -->
    <div class="seat-grid-container" id="seatGridContainer">
      ${renderSeatGridHtml()}
    </div>

    <!-- Optional Food & Beverages Section -->
    <div class="food-section">
      <div class="food-title"><i class="fa-solid fa-popcorn"></i> Add Grab & Bite Snacks (Optional)</div>
      <div class="food-grid">
        ${FOOD_ITEMS.map(food => {
          const isAdded = booking.selectedFood.some(f => f.id === food.id);
          return `
            <div class="food-card">
              <div class="food-card-top">
                <i class="${food.icon}"></i>
                <div>
                  <div class="food-name">${food.name}</div>
                  <div class="food-price">₹${food.price}</div>
                </div>
              </div>
              <button class="food-btn-toggle ${isAdded ? 'added' : ''}" onclick="toggleFoodItem('${food.id}')">
                ${isAdded ? '✓ Added' : '+ Add'}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Bottom Action Bar: Selected Seats & Next Step to Payment -->
    <div class="seat-summary-bar">
      <div class="selected-seats-info">
        <div style="font-size: 0.8rem; color: var(--text-muted);">Selected Seats:</div>
        <div class="selected-seats-tags" id="selectedSeatsTags">
          ${booking.selectedSeats.length === 0 ? '<span style="color: var(--text-dim); font-size: 0.82rem;">Please pick your seats from the layout above</span>' : ''}
          ${booking.selectedSeats.map(s => `<span class="seat-tag">${s.id} (₹${s.price})</span>`).join('')}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 20px;">
        <div class="selected-seats-price" id="selectedSeatsTotal">
          ₹${calculateCurrentSeatTotal()}
          <span>(${booking.selectedSeats.length} seats)</span>
        </div>
        <!-- PROCEED BUTTON LEADS TO PAYMENT -->
        <button class="btn-proceed-pay" id="btnProceedToPay" ${booking.selectedSeats.length === 0 ? 'disabled' : ''} onclick="renderPaymentView()">
          Proceed to Payment <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </div>
  `;
}

// Generate the HTML for the tiered seats (Recliner, Gold, Silver)
function renderSeatGridHtml() {
  const booking = AppState.booking;
  let html = '';

  const tiers = [
    { key: 'RECLINER', name: 'Platinum Recliner', price: 350, rows: ['A', 'B'], isRecliner: true },
    { key: 'GOLD', name: 'Gold Prime', price: 250, rows: ['C', 'D', 'E', 'F'], isRecliner: false },
    { key: 'SILVER', name: 'Silver Classic', price: 150, rows: ['G', 'H', 'J', 'K'], isRecliner: false }
  ];

  tiers.forEach(tier => {
    html += `
      <div class="seat-tier-header">
        <span>${tier.name}</span>
        <span class="price">₹${tier.price}</span>
      </div>
      <div class="seat-tier-rows">
    `;

    tier.rows.forEach(rowLetter => {
      html += `
        <div class="seat-row">
          <div class="row-label">${rowLetter}</div>
      `;

      // 14 seats per row with aisles
      for (let num = 1; num <= 14; num++) {
        const seatId = `${rowLetter}${num}`;
        const isOccupied = booking.occupiedSeats.has(seatId);
        const isSelected = booking.selectedSeats.some(s => s.id === seatId);
        const reclinerClass = tier.isRecliner ? 'recliner' : '';
        const stateClass = isOccupied ? 'occupied' : (isSelected ? 'selected' : '');

        html += `
          <div class="seat-unit ${reclinerClass} ${stateClass}" 
               data-seat-id="${seatId}" 
               data-tier="${tier.key}" 
               data-price="${tier.price}"
               onclick="handleSeatClick('${seatId}', '${rowLetter}', ${num}, '${tier.key}', ${tier.price})">
            ${num}
          </div>
        `;

        // Aisle gaps after seat 4 and seat 10
        if (num === 4 || num === 10) {
          html += `<div class="seat-aisle"></div>`;
        }
      }

      html += `
          <div class="row-label">${rowLetter}</div>
        </div>
      `;
    });

    html += `</div>`;
  });

  return html;
}

// Seat Selection Logic
function handleSeatClick(seatId, row, number, tier, price) {
  const booking = AppState.booking;
  if (booking.occupiedSeats.has(seatId)) {
    showToast(`Seat ${seatId} is already booked! Please select another seat.`, 'fa-circle-xmark');
    return;
  }

  const existingIndex = booking.selectedSeats.findIndex(s => s.id === seatId);
  if (existingIndex > -1) {
    // Unselect
    booking.selectedSeats.splice(existingIndex, 1);
  } else {
    // Max 8 seats limit per booking
    if (booking.selectedSeats.length >= 8) {
      showToast('Maximum 8 seats allowed per single transaction!', 'fa-circle-exclamation');
      return;
    }
    booking.selectedSeats.push({ id: seatId, row, number, tier, price });
  }

  // Update DOM state cleanly
  updateSeatSelectionUI();
}

function updateSeatSelectionUI() {
  const booking = AppState.booking;
  
  // Update Seat Elements
  document.querySelectorAll('.seat-unit').forEach(el => {
    const seatId = el.getAttribute('data-seat-id');
    if (!booking.occupiedSeats.has(seatId)) {
      const isSelected = booking.selectedSeats.some(s => s.id === seatId);
      el.classList.toggle('selected', isSelected);
    }
  });

  // Update Tags Bar
  const tagsContainer = document.getElementById('selectedSeatsTags');
  if (tagsContainer) {
    if (booking.selectedSeats.length === 0) {
      tagsContainer.innerHTML = '<span style="color: var(--text-dim); font-size: 0.82rem;">Please pick your seats from the layout above</span>';
    } else {
      tagsContainer.innerHTML = booking.selectedSeats.map(s => `
        <span class="seat-tag">${s.id} (₹${s.price})</span>
      `).join('');
    }
  }

  // Update Total Price
  const totalEl = document.getElementById('selectedSeatsTotal');
  if (totalEl) {
    totalEl.innerHTML = `₹${calculateCurrentSeatTotal()} <span>(${booking.selectedSeats.length} seats)</span>`;
  }

  // Toggle Proceed Button
  const btnPay = document.getElementById('btnProceedToPay');
  if (btnPay) {
    btnPay.disabled = booking.selectedSeats.length === 0;
  }
}

function calculateCurrentSeatTotal() {
  const seatSum = AppState.booking.selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const foodSum = AppState.booking.selectedFood.reduce((sum, f) => sum + f.price, 0);
  return seatSum + foodSum;
}

function toggleFoodItem(foodId) {
  const item = FOOD_ITEMS.find(f => f.id === foodId);
  if (!item) return;

  const idx = AppState.booking.selectedFood.findIndex(f => f.id === foodId);
  if (idx > -1) {
    AppState.booking.selectedFood.splice(idx, 1);
  } else {
    AppState.booking.selectedFood.push(item);
  }
  renderSeatSelectionView();
}

/* ==========================================================================
   REQUIREMENT 3: PAYMENT SCREEN (Strictly After Seat Selection)
   ========================================================================== */
function renderPaymentView() {
  const booking = AppState.booking;
  if (booking.selectedSeats.length === 0) {
    showToast("Please select at least 1 seat before payment!", "fa-circle-exclamation");
    return;
  }

  const basePrice = booking.selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const convFee = booking.selectedSeats.length * 30; // ₹30 per ticket
  const gst = Math.round((basePrice + convFee) * 0.18); // 18% GST
  const foodAmount = booking.selectedFood.reduce((sum, f) => sum + f.price, 0);
  const discount = booking.promoDiscount || 0;
  const grandTotal = Math.max(0, (basePrice + convFee + gst + foodAmount - discount));

  const body = document.getElementById('bookingModalContent');
  if (!body) return;

  body.innerHTML = `
    <!-- Stepper Navigation -->
    <div class="booking-stepper">
      <div class="step-item completed">
        <div class="step-circle"><i class="fa-solid fa-check"></i></div>
        <span class="step-name">1. Shows</span>
      </div>
      <div class="step-item completed">
        <div class="step-circle"><i class="fa-solid fa-check"></i></div>
        <span class="step-name">2. Seats</span>
      </div>
      <div class="step-item active">
        <div class="step-circle"><i class="fa-solid fa-credit-card"></i></div>
        <span class="step-name">3. Payment</span>
      </div>
      <div class="step-item">
        <div class="step-circle"><i class="fa-solid fa-ticket"></i></div>
        <span class="step-name">4. Ticket</span>
      </div>
    </div>

    <div class="payment-grid">
      <!-- Left: Payment Methods -->
      <div class="payment-options-box">
        <div class="payment-tab-group">
          <button class="pay-tab-btn active" id="tabBtnUpi" onclick="switchPayTab('upi')">
            <i class="fa-solid fa-qrcode"></i> UPI / QR Code
          </button>
          <button class="pay-tab-btn" id="tabBtnCard" onclick="switchPayTab('card')">
            <i class="fa-solid fa-credit-card"></i> Debit / Credit Card
          </button>
          <button class="pay-tab-btn" id="tabBtnNet" onclick="switchPayTab('net')">
            <i class="fa-solid fa-building-columns"></i> Net Banking
          </button>
        </div>

        <!-- UPI Tab Content -->
        <div class="pay-tab-content" id="payContentUpi">
          <div class="upi-qr-view">
            <div style="font-size: 0.92rem; color: #fff; font-weight: 700;">Scan QR using any UPI App</div>
            <div class="qr-frame">
              <canvas id="upiQrCanvas" width="160" height="160"></canvas>
            </div>
            <div class="upi-timer-badge">
              <i class="fa-regular fa-clock"></i> QR Expires in <span id="upiTimer">04:59</span>
            </div>
            <div class="upi-apps-icons">
              <span>Google Pay</span> &bull; <span>PhonePe</span> &bull; <span>Paytm</span> &bull; <span>Cred UPI</span>
            </div>
            <button class="btn-primary" style="width: 100%; justify-content: center; margin-top: 10px;" onclick="processPaymentSuccess('UPI QR')">
              <i class="fa-solid fa-shield-check"></i> Simulated Instant UPI Payment (Pay ₹${grandTotal})
            </button>
          </div>
        </div>

        <!-- Card Tab Content -->
        <div class="pay-tab-content" id="payContentCard" style="display: none;">
          <form class="card-form-grid" onsubmit="event.preventDefault(); processPaymentSuccess('Credit/Debit Card');">
            <div class="form-group">
              <label>Cardholder Name</label>
              <input type="text" class="form-input" required value="${AppState.user.name}" placeholder="e.g. Arjun Reddy">
            </div>
            <div class="form-group">
              <label>Card Number</label>
              <input type="text" class="form-input" required maxlength="19" value="4532 •••• •••• 9128" placeholder="XXXX XXXX XXXX XXXX">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Expiry Date</label>
                <input type="text" class="form-input" required value="08/29" placeholder="MM/YY">
              </div>
              <div class="form-group">
                <label>CVV / CVC</label>
                <input type="password" class="form-input" required maxlength="3" value="782" placeholder="•••">
              </div>
            </div>
            <button type="submit" class="btn-primary" style="justify-content: center; margin-top: 8px;">
              <i class="fa-solid fa-lock"></i> Pay ₹${grandTotal} Securely
            </button>
          </form>
        </div>

        <!-- Net Banking Tab Content -->
        <div class="pay-tab-content" id="payContentNet" style="display: none;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
            <button class="btn-secondary" style="font-size: 0.85rem;" onclick="processPaymentSuccess('HDFC NetBanking')">HDFC Bank</button>
            <button class="btn-secondary" style="font-size: 0.85rem;" onclick="processPaymentSuccess('State Bank of India')">State Bank of India</button>
            <button class="btn-secondary" style="font-size: 0.85rem;" onclick="processPaymentSuccess('ICICI Bank')">ICICI Bank</button>
            <button class="btn-secondary" style="font-size: 0.85rem;" onclick="processPaymentSuccess('Axis Bank')">Axis Bank</button>
          </div>
          <button class="btn-primary" style="width: 100%; justify-content: center;" onclick="processPaymentSuccess('Net Banking')">
            Pay ₹${grandTotal} via Net Banking
          </button>
        </div>

        <button class="btn-secondary" style="width: fit-content;" onclick="renderSeatSelectionView()">
          <i class="fa-solid fa-arrow-left"></i> Back to Seat Selection
        </button>
      </div>

      <!-- Right: Order Summary Breakdown -->
      <div class="order-summary-panel">
        <h3 class="order-summary-title">Booking Summary</h3>
        
        <div class="order-movie-preview">
          <img src="${booking.movie.poster}" onerror="this.src='${booking.movie.posterFallback}'" class="order-movie-thumb" alt="${booking.movie.title}">
          <div class="order-movie-details">
            <h4>${booking.movie.title}</h4>
            <p>${booking.theatre.name}</p>
            <p>${booking.date ? booking.date.fullDateStr || booking.date : 'Today'} &bull; ${booking.showtime}</p>
          </div>
        </div>

        <div class="summary-breakdown">
          <div class="summary-row">
            <span>Seats (${booking.selectedSeats.map(s => s.id).join(', ')})</span>
            <span>₹${basePrice}</span>
          </div>
          <div class="summary-row">
            <span>Convenience Fee (₹30/seat)</span>
            <span>₹${convFee}</span>
          </div>
          <div class="summary-row">
            <span>Integrated GST (18%)</span>
            <span>₹${gst}</span>
          </div>
          ${foodAmount > 0 ? `
            <div class="summary-row">
              <span>Snacks & F&B (${booking.selectedFood.length} items)</span>
              <span>₹${foodAmount}</span>
            </div>
          ` : ''}
          ${discount > 0 ? `
            <div class="summary-row" style="color: #10b981;">
              <span>Promo Discount (${booking.promoCode})</span>
              <span>- ₹${discount}</span>
            </div>
          ` : ''}
          <div class="summary-row total-row">
            <span>Amount Payable</span>
            <span>₹${grandTotal}</span>
          </div>
        </div>

        <!-- Promo Code Input -->
        <div class="promo-box">
          <input type="text" id="promoInput" placeholder="Enter coupon (e.g. DEVARA50)" value="${booking.promoCode || ''}">
          <button type="button" onclick="applyPromoCode()">Apply</button>
        </div>
        <div style="font-size: 0.72rem; color: var(--text-dim);">
          Tip: Use <strong>DEVARA50</strong> for ₹100 instant off or <strong>NTRFANS</strong> for ₹150 off!
        </div>
      </div>
    </div>
  `;

  // Draw simulated QR code on canvas
  drawSimulatedQrCode('upiQrCanvas', `upi://pay?pa=cinered@axisbank&pn=CineRed&am=${grandTotal}&cu=INR`);
  startUpiTimer();
}

function switchPayTab(tabKey) {
  ['upi', 'card', 'net'].forEach(t => {
    const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const content = document.getElementById(`payContent${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) btn.classList.toggle('active', t === tabKey);
    if (content) content.style.display = (t === tabKey ? 'block' : 'none');
  });
}

function applyPromoCode() {
  const input = document.getElementById('promoInput');
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  
  if (code === 'DEVARA50') {
    AppState.booking.promoDiscount = 100;
    AppState.booking.promoCode = 'DEVARA50';
    showToast('Promo code DEVARA50 applied! ₹100 Saved.', 'fa-tags');
    renderPaymentView();
  } else if (code === 'NTRFANS') {
    AppState.booking.promoDiscount = 150;
    AppState.booking.promoCode = 'NTRFANS';
    showToast('NTR Fans special discount applied! ₹150 Saved.', 'fa-tags');
    renderPaymentView();
  } else {
    showToast('Invalid promo code. Try DEVARA50 or NTRFANS', 'fa-triangle-exclamation');
  }
}

function startUpiTimer() {
  let seconds = 299;
  const timerEl = document.getElementById('upiTimer');
  if (!timerEl) return;
  
  const interval = setInterval(() => {
    if (!document.getElementById('upiTimer')) {
      clearInterval(interval);
      return;
    }
    seconds--;
    if (seconds <= 0) {
      clearInterval(interval);
      timerEl.textContent = 'Expired';
    } else {
      const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
      const secs = String(seconds % 60).padStart(2, '0');
      timerEl.textContent = `${mins}:${secs}`;
    }
  }, 1000);
}

// Draw crisp visual QR Code on HTML5 Canvas
function drawSimulatedQrCode(canvasId, text) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Draw simulated QR matrix with corner finder patterns
  ctx.fillStyle = '#0a0a0f';
  
  // Outer frame & corners
  function drawCorner(x, y) {
    ctx.fillRect(x, y, 36, 36);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 6, y + 6, 24, 24);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(x + 12, y + 12, 12, 12);
  }
  
  drawCorner(8, 8);
  drawCorner(size - 44, 8);
  drawCorner(8, size - 44);

  // Seeded pseudo-random data cells
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed += text.charCodeAt(i);

  const cellSize = 6;
  const numCells = Math.floor(size / cellSize);
  for (let r = 0; r < numCells; r++) {
    for (let c = 0; c < numCells; c++) {
      // Avoid corner boxes
      if ((r < 8 && c < 8) || (r < 8 && c > numCells - 9) || (r > numCells - 9 && c < 8)) continue;
      
      seed = (seed * 9301 + 49297) % 233280;
      if (seed / 233280 > 0.48) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }

  // Small red center badge
  ctx.fillStyle = '#e50914';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 8, 0, Math.PI * 2);
  ctx.fill();
}

/* ==========================================================================
   REQUIREMENT 3: PAYMENT COMPLETION & TICKET GENERATION
   ========================================================================== */
function processPaymentSuccess(method) {
  const booking = AppState.booking;
  const bookingId = `RED-${booking.movie.id === 'devara' ? 'DVR' : 'ASV'}-${Math.floor(10000 + Math.random() * 90000)}`;

  const basePrice = booking.selectedSeats.reduce((sum, s) => sum + s.price, 0);
  const convFee = booking.selectedSeats.length * 30;
  const gst = Math.round((basePrice + convFee) * 0.18);
  const foodAmount = booking.selectedFood.reduce((sum, f) => sum + f.price, 0);
  const discount = booking.promoDiscount || 0;
  const totalPaid = Math.max(0, basePrice + convFee + gst + foodAmount - discount);

  const newRecord = {
    bookingId: bookingId,
    movieId: booking.movie.id,
    movieTitle: booking.movie.title,
    poster: booking.movie.poster,
    posterFallback: booking.movie.posterFallback,
    theatre: booking.theatre.name,
    format: "4K DOLBY ATMOS",
    showDate: booking.date ? (booking.date.fullDateStr || booking.date) : "Today",
    showTime: booking.showtime,
    seats: booking.selectedSeats.map(s => s.id),
    seatType: booking.selectedSeats[0].tier,
    ticketCount: booking.selectedSeats.length,
    basePrice: basePrice,
    convenienceFee: convFee,
    taxes: gst,
    foodAmount: foodAmount,
    totalPaid: totalPaid,
    paymentMethod: method,
    bookedOn: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    status: "Confirmed",
    qrCodeSeed: `${bookingId}-${booking.selectedSeats.map(s => s.id).join('')}`
  };

  // Save to persistent user bookings
  saveNewBooking(newRecord);

  // Render Confirmation Modal
  renderBookingConfirmationTicket(newRecord);
}

function renderBookingConfirmationTicket(record) {
  const body = document.getElementById('bookingModalContent');
  if (!body) return;

  body.innerHTML = `
    <!-- Stepper Navigation -->
    <div class="booking-stepper">
      <div class="step-item completed">
        <div class="step-circle"><i class="fa-solid fa-check"></i></div>
        <span class="step-name">1. Shows</span>
      </div>
      <div class="step-item completed">
        <div class="step-circle"><i class="fa-solid fa-check"></i></div>
        <span class="step-name">2. Seats</span>
      </div>
      <div class="step-item completed">
        <div class="step-circle"><i class="fa-solid fa-check"></i></div>
        <span class="step-name">3. Paid</span>
      </div>
      <div class="step-item active">
        <div class="step-circle"><i class="fa-solid fa-ticket"></i></div>
        <span class="step-name">4. Ticket Confirmed</span>
      </div>
    </div>

    <div class="ticket-confirmation-wrap">
      <div class="ticket-success-icon"><i class="fa-solid fa-check"></i></div>
      <h2 style="font-family: var(--font-heading); color: #fff; font-size: 1.8rem; margin-bottom: 6px;">
        Booking Confirmed!
      </h2>
      <p style="color: var(--text-muted); font-size: 0.9rem;">
        Your digital M-Ticket is ready. SMS & Email confirmation sent to <strong>${AppState.user.phone}</strong>.
      </p>

      <!-- Physical Digital Ticket Card -->
      <div class="ticket-card-physical" id="printableTicket">
        <div class="ticket-card-header">
          <div class="ticket-header-brand"><i class="fa-solid fa-film"></i> CINERED TICKET</div>
          <div class="ticket-id-badge">${record.bookingId}</div>
        </div>

        <div class="ticket-card-body">
          <img src="${record.poster}" onerror="this.src='${record.posterFallback}'" alt="${record.movieTitle}" class="ticket-poster-img">
          
          <div class="ticket-info-col">
            <h3>${record.movieTitle}</h3>
            <div class="venue"><i class="fa-solid fa-location-dot"></i> ${record.theatre}</div>
            
            <div class="ticket-grid-meta">
              <div>
                <span class="label">Date</span>
                <span class="val">${record.showDate}</span>
              </div>
              <div>
                <span class="label">Time</span>
                <span class="val">${record.showTime}</span>
              </div>
              <div>
                <span class="label">Seats (${record.ticketCount})</span>
                <span class="val" style="color: #ff3344;">${record.seats.join(', ')}</span>
              </div>
              <div>
                <span class="label">Audi / Screen</span>
                <span class="val">AUDI 02 (VIP)</span>
              </div>
            </div>
          </div>
        </div>

        <div class="ticket-rip-line">
          <div class="ticket-rip-notch-left"></div>
          <div class="ticket-rip-notch-right"></div>
        </div>

        <div class="ticket-card-footer">
          <div class="ticket-qr-box">
            <canvas id="confirmedTicketQr" width="60" height="60"></canvas>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">
            <div>Booking Ref: <strong>${record.bookingId}</strong></div>
            <div>Paid via: ${record.paymentMethod}</div>
          </div>
          <div class="ticket-amount-box">
            <div class="paid-label">Total Paid</div>
            <div class="paid-val">₹${record.totalPaid}</div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="ticket-actions-row">
        <button class="btn-primary" onclick="window.print()">
          <i class="fa-solid fa-print"></i> Print / Download Ticket
        </button>
        <button class="btn-secondary" onclick="closeModal('bookingModal'); openUserProfileModal('bookings');">
          <i class="fa-solid fa-user"></i> View in My Profile
        </button>
        <button class="btn-secondary" onclick="closeModal('bookingModal');">
          <i class="fa-solid fa-house"></i> Back to Home
        </button>
      </div>
    </div>
  `;

  // Draw ticket canvas QR code
  setTimeout(() => {
    drawSimulatedQrCode('confirmedTicketQr', record.qrCodeSeed);
  }, 100);
}

/* ==========================================================================
   REQUIREMENT 6: USER PROFILE & PREVIOUS MOVIE BOOKINGS
   ========================================================================== */
function renderUserProfile() {
  const user = AppState.user;
  if (!user) return;

  // Header Pill
  const navAvatar = document.getElementById('navUserAvatar');
  const navName = document.getElementById('navUserName');
  if (navAvatar) navAvatar.textContent = user.name.charAt(0);
  if (navName) navName.textContent = user.name.split(' ')[0];

  // Render Profile View Inside Profile Modal
  const modal = document.getElementById('userProfileModalBody');
  if (!modal) return;

  modal.innerHTML = `
    <!-- Profile Card Banner -->
    <div class="profile-card-banner">
      <div class="profile-user-left">
        <div class="profile-big-avatar">${user.name.charAt(0)}</div>
        <div class="profile-user-details">
          <h3>${user.name} <span class="tier-badge">${user.membership}</span></h3>
          <div class="profile-user-meta">
            <span><i class="fa-solid fa-envelope"></i> ${user.email}</span>
            <span><i class="fa-solid fa-phone"></i> ${user.phone}</span>
            <span><i class="fa-solid fa-location-dot"></i> ${user.city}</span>
          </div>
        </div>
      </div>
      <div class="profile-loyalty-box">
        <div class="loyalty-points"><i class="fa-solid fa-gem"></i> ${user.points}</div>
        <div class="loyalty-label">CineRed Club Points</div>
      </div>
    </div>

    <!-- Profile Tabs -->
    <div class="profile-tabs-header">
      <button class="profile-tab-btn active" id="profTabBookings" onclick="switchProfileTab('bookings')">
        <i class="fa-solid fa-ticket"></i> Previous Movie Bookings (${AppState.bookingsHistory.length})
      </button>
      <button class="profile-tab-btn" id="profTabEdit" onclick="switchProfileTab('edit')">
        <i class="fa-solid fa-user-pen"></i> Edit Profile Details
      </button>
    </div>

    <!-- Tab 1: Previous Movie Bookings History -->
    <div id="profSectionBookings">
      <div class="previous-bookings-list">
        ${AppState.bookingsHistory.length === 0 ? `
          <div style="text-align: center; padding: 40px; color: var(--text-dim);">
            <i class="fa-solid fa-ticket-simple" style="font-size: 2.5rem; margin-bottom: 12px; display: block;"></i>
            No previous bookings found. Book tickets for Devara or Aravinda Sametha today!
          </div>
        ` : AppState.bookingsHistory.map(b => `
          <div class="booking-history-card">
            <img src="${b.poster}" onerror="this.src='${b.posterFallback}'" alt="${b.movieTitle}" class="history-poster-thumb">
            
            <div class="history-info-box">
              <div class="history-booking-id"><i class="fa-solid fa-barcode"></i> ${b.bookingId} &bull; <span style="color: #10b981;">${b.status}</span></div>
              <h4>${b.movieTitle}</h4>
              <div class="history-specs-row">
                <span><i class="fa-solid fa-building"></i> ${b.theatre}</span>
                <span><i class="fa-regular fa-calendar"></i> ${b.showDate}</span>
                <span><i class="fa-regular fa-clock"></i> ${b.showTime}</span>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <span class="history-seats-tag">Seats: <strong>${Array.isArray(b.seats) ? b.seats.join(', ') : b.seats}</strong></span>
                <span style="font-size: 0.74rem; color: var(--text-dim);">Booked on: ${b.bookedOn}</span>
              </div>
            </div>

            <div class="history-action-box">
              <div class="history-amount">₹${b.totalPaid}</div>
              <button class="btn-view-ticket" onclick="viewHistoricalTicket('${b.bookingId}')">
                <i class="fa-solid fa-eye"></i> View Ticket
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Tab 2: Edit Profile Form -->
    <div id="profSectionEdit" style="display: none;">
      <form class="profile-edit-form" onsubmit="handleProfileFormSubmit(event)">
        <div class="form-row" style="margin-bottom: 16px;">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="editName" class="form-input" required value="${user.name}">
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" id="editEmail" class="form-input" required value="${user.email}">
          </div>
        </div>
        <div class="form-row" style="margin-bottom: 20px;">
          <div class="form-group">
            <label>Mobile Number</label>
            <input type="tel" id="editPhone" class="form-input" required value="${user.phone}">
          </div>
          <div class="form-group">
            <label>City / Location</label>
            <input type="text" id="editCity" class="form-input" required value="${user.city}">
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button type="button" class="btn-secondary" onclick="switchProfileTab('bookings')">Cancel</button>
          <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Profile</button>
        </div>
      </form>
    </div>
  `;
}

function switchProfileTab(tab) {
  const bookingsBtn = document.getElementById('profTabBookings');
  const editBtn = document.getElementById('profTabEdit');
  const bookingsSec = document.getElementById('profSectionBookings');
  const editSec = document.getElementById('profSectionEdit');

  if (tab === 'bookings') {
    bookingsBtn.classList.add('active');
    editBtn.classList.remove('active');
    bookingsSec.style.display = 'block';
    editSec.style.display = 'none';
  } else {
    bookingsBtn.classList.remove('active');
    editBtn.classList.add('active');
    bookingsSec.style.display = 'none';
    editSec.style.display = 'block';
  }
}

function handleProfileFormSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('editName').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const phone = document.getElementById('editPhone').value.trim();
  const city = document.getElementById('editCity').value.trim();

  saveUserProfile({ name, email, phone, city });
  switchProfileTab('bookings');
}

function viewHistoricalTicket(bookingId) {
  const record = AppState.bookingsHistory.find(b => b.bookingId === bookingId);
  if (!record) return;

  closeModal('profileModal');
  openModal('bookingModal');
  renderBookingConfirmationTicket(record);
}

function openUserProfileModal(defaultTab = 'bookings') {
  renderUserProfile();
  switchProfileTab(defaultTab);
  openModal('profileModal');
}

/* ==========================================================================
   TRAILER MODAL
   ========================================================================== */
function openTrailerModal(movieId) {
  const movie = AppState.movies.find(m => m.id === movieId);
  if (!movie) return;

  const container = document.getElementById('trailerModalContent');
  if (container) {
    container.innerHTML = `
      <div class="trailer-iframe-box">
        <iframe src="${movie.trailerEmbed}?autoplay=1" title="${movie.title} Trailer" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    `;
  }
  openModal('trailerModal');
}

function closeTrailerModal() {
  const container = document.getElementById('trailerModalContent');
  if (container) container.innerHTML = '';
  closeModal('trailerModal');
}

/* ==========================================================================
   MODAL UTILITIES & EVENT HANDLERS
   ========================================================================== */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function setupEventListeners() {
  // Close modals on overlay backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (overlay.id === 'trailerModal') closeTrailerModal();
        else closeModal(overlay.id);
      }
    });
  });

  // Navbar scroll visual effect
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (nav) {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    }
  });
}

function setupSearchAndFilters() {
  const searchInput = document.getElementById('navSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      AppState.movies.forEach(m => {
        const card = document.getElementById(`card-${m.id}`);
        if (card) {
          const match = m.title.toLowerCase().includes(q) || 
                        m.director.toLowerCase().includes(q) || 
                        m.cast.some(c => c.name.toLowerCase().includes(q));
          card.style.display = match ? 'flex' : 'none';
        }
      });
    });
  }
}

// Toast Notifications
function showToast(message, iconClass = 'fa-circle-check') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
