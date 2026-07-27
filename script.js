/* =============================================================
   DriveNow — script.js  (Optimized)
   ============================================================= */


function getApiUrl(path) {
    if (
        window.location.protocol === 'file:' ||
        window.location.port === '8000'
    ) {
        return 'http://127.0.0.1:8000' + path;
    }
    return path;
}

// ─────────────────────────────────────────────────────────────
//  AUTH HELPER
//  Single source of truth for "is this user logged in?"
//  Checks both the Django-rendered template variable AND
//  the localStorage fallback (for file:// access).
// ─────────────────────────────────────────────────────────────
function isAuthenticated() {
    const serverAuth = window.isUserAuthenticated === true || window.isUserAuthenticated === 'true';
    const localAuth = localStorage.getItem('isUserAuthenticated') === 'true';
    return serverAuth || localAuth;
}

function getUsername() {
    const serverName = (typeof window.userName === 'string' &&
        !window.userName.startsWith('{') &&
        window.userName.trim() !== '')
        ? window.userName : null;
    return serverName || localStorage.getItem('userName') || '';
}

function isStaff() {
    return localStorage.getItem('isStaff') === 'true';
}

// ─────────────────────────────────────────────────────────────
//  FETCH INTERCEPTOR (Fallback Auth)
//  Injects X-Authenticated-User so file:// users stay logged in
//  even if browsers block cross-origin cookies.
// ─────────────────────────────────────────────────────────────
const originalFetch = window.fetch;
window.fetch = function(resource, config) {
    if (typeof resource === 'string' && resource.includes('/api/')) {
        config = config || {};
        config.headers = config.headers || {};
        const un = getUsername();
        if (un && !config.headers['X-Authenticated-User']) {
            // Keep Content-Type if it's there
            if (config.headers instanceof Headers) {
                config.headers.append('X-Authenticated-User', un);
            } else {
                config.headers['X-Authenticated-User'] = un;
            }
        }
    }
    return originalFetch.apply(this, [resource, config]);
};

// ─────────────────────────────────────────────────────────────
//  HTML ESCAPING  — prevent XSS when inserting user content
// ─────────────────────────────────────────────────────────────
function escHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str ?? '')));
    return div.innerHTML;
}

// ─────────────────────────────────────────────────────────────
//  DOMContentLoaded — Main entry point
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // 1. Inject Modal HTML ──────────────────────────────────────
    injectModals();

    // 2. Inject Scroll-To-Top button ───────────────────────────
    injectScrollTop();

    // 3. Update Navbar based on auth state ─────────────────────
    updateNavbar();

    // 3b. Inject Mini Chatbot ──────────────────────────────────
    injectChatbot();

    // 4. Bind form submission handlers ─────────────────────────
    document.getElementById('dnLoginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('dnSignupForm')?.addEventListener('submit', handleSignup);
    document.getElementById('dnBookForm')?.addEventListener('submit', handleBooking);
    document.getElementById('contactForm')?.addEventListener('submit', handleContact);

    // 5. Wire homepage buttons ─────────────────────────────────
    wireHomepageButtons();

    // 6. Car filter tabs ───────────────────────────────────────
    initCarFilter();

    // 7. Hero background slider ────────────────────────────────
    initHeroSlider();

    // 8. Scroll-reveal animation ───────────────────────────────
    initScrollReveal();

    // 8.5 Initialize counters ───────────────────────────────────
    initCounters();

    // 9. Close modal on overlay click ─────────────────────────
    document.querySelectorAll('.dn-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeModal();
        });
    });

    // 10. Close modal on Escape key ───────────────────────────
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });
});

// ─────────────────────────────────────────────────────────────
//  INJECT MODALS
// ─────────────────────────────────────────────────────────────
function injectModals() {
    if (document.getElementById('dnLoginModal')) return; // already injected

    const modalHTML = `
        <!-- LOGIN MODAL -->
        <div id="dnLoginModal" class="dn-overlay" role="dialog" aria-modal="true" aria-label="Login">
            <div class="dn-modal dn-modal-sm">
                <button class="dn-modal-close" onclick="closeModal()" aria-label="Close">&times;</button>
                <div class="dn-modal-head text-center">
                    <span>Welcome Back</span>
                    <h2>Login to DriveNow</h2>
                    <p>Access your bookings and dashboard.</p>
                </div>
                <form id="dnLoginForm" novalidate>
                    <div class="dn-field">
                        <label for="lgEmail">Email</label>
                        <input type="email" id="lgEmail" name="lgEmail" placeholder="you@example.com" required autocomplete="email">
                    </div>
                    <div class="dn-field">
                        <label for="lgPass">Password</label>
                        <input type="password" id="lgPass" name="lgPass" placeholder="Your password" required autocomplete="current-password">
                    </div>
                    <div class="dn-login-row">
                        <label class="dn-remember">
                            <input type="checkbox" id="lgRemember"> Remember me
                        </label>
                    </div>
                    <button type="submit" class="dn-modal-btn">Login Securely</button>
                    <div class="dn-signup-txt">Don't have an account? <a href="#" id="signupLink">Sign Up</a></div>
                </form>
            </div>
        </div>

        <!-- SIGNUP MODAL -->
        <div id="dnSignupModal" class="dn-overlay" role="dialog" aria-modal="true" aria-label="Sign Up">
            <div class="dn-modal dn-modal-sm">
                <button class="dn-modal-close" onclick="closeModal()" aria-label="Close">&times;</button>
                <div class="dn-modal-head text-center">
                    <span>Create Account</span>
                    <h2>Join DriveNow</h2>
                    <p>Get access to premium cars.</p>
                </div>
                <form id="dnSignupForm" novalidate>
                    <div class="dn-field">
                        <label for="sgUser">Username</label>
                        <input type="text" id="sgUser" name="sgUser" placeholder="Choose a username" required autocomplete="username" minlength="3">
                    </div>
                    <div class="dn-field">
                        <label for="sgEmail">Email</label>
                        <input type="email" id="sgEmail" name="sgEmail" placeholder="you@example.com" required autocomplete="email">
                    </div>
                    <div class="dn-field">
                        <label for="sgPass">Password <small style="color:#94a3b8">(min 8 characters)</small></label>
                        <input type="password" id="sgPass" name="sgPass" placeholder="Create a strong password" required autocomplete="new-password" minlength="8">
                    </div>
                    <button type="submit" class="dn-modal-btn">Create Account</button>
                    <div class="dn-signup-txt">Already have an account? <a href="#" id="loginLink">Login</a></div>
                </form>
            </div>
        </div>

        <!-- BOOKING MODAL -->
        <div id="dnBookModal" class="dn-overlay" role="dialog" aria-modal="true" aria-label="Book a Car">
            <div class="dn-modal">
                <button class="dn-modal-close" onclick="closeModal()" aria-label="Close">&times;</button>
                <div class="dn-modal-head">
                    <span>Reserve Your Car</span>
                    <h2>Booking Form</h2>
                    <p>Complete the details below to confirm your reservation.</p>
                </div>
                <form id="dnBookForm" novalidate>
                    <div class="dn-modal-grid">
                        <div class="dn-field">
                            <label for="bkName">Full Name</label>
                            <input type="text" id="bkName" name="bkName" placeholder="John Doe" required>
                        </div>
                        <div class="dn-field">
                            <label for="bkPhone">Phone Number</label>
                            <input type="tel" id="bkPhone" name="bkPhone" placeholder="+92 300 0000000" required>
                        </div>
                        <div class="dn-field">
                            <label for="bkCity">Pickup Location</label>
                            <input type="text" id="bkCity" name="bkCity" placeholder="City name" required>
                        </div>
                        <div class="dn-field">
                            <label for="bkType">Car Type</label>
                            <select id="bkType" name="bkType">
                                <option value="Sedan">Sedan</option>
                                <option value="SUV">SUV</option>
                                <option value="Sports">Sports</option>
                                <option value="Luxury">Luxury</option>
                                <option value="Electric">Electric</option>
                            </select>
                        </div>
                        <div class="dn-field">
                            <label for="bkFrom">Pickup Date</label>
                            <input type="date" id="bkFrom" name="bkFrom" required>
                        </div>
                        <div class="dn-field">
                            <label for="bkTo">Return Date</label>
                            <input type="date" id="bkTo" name="bkTo" required>
                        </div>
                    </div>
                    <div class="dn-field">
                        <label for="bkCar">Specific Car</label>
                        <select id="bkCar" name="bkCar">
                            <option value="">Select a car...</option>
                        </select>
                    </div>
                    <div class="dn-field" id="bkHoursField" style="display: none;">
                        <label for="bkHours">Number of Hours <small>(for same-day booking)</small></label>
                        <input type="number" id="bkHours" name="bkHours" min="1" max="24" value="1">
                    </div>
                    <div class="dn-field mt-3 mb-3 p-3 bg-light rounded text-center">
                        <strong>Estimated Total: </strong> <span id="bkTotalDisplay" class="text-primary fs-5">Rs 0</span>
                    </div>
                    <button type="submit" class="dn-modal-btn">Confirm Reservation</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Set min date to today for date pickers
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bkFrom')?.setAttribute('min', today);
    document.getElementById('bkTo')?.setAttribute('min', today);

    // Bind modal-switch links
    document.getElementById('loginLink')?.addEventListener('click', e => {
        e.preventDefault();
        openModal('dnLoginModal');
    });
    document.getElementById('signupLink')?.addEventListener('click', e => {
        e.preventDefault();
        openModal('dnSignupModal');
    });

    // Enforce return >= pickup date
    document.getElementById('bkFrom')?.addEventListener('change', () => {
        const fromVal = document.getElementById('bkFrom').value;
        const toInput = document.getElementById('bkTo');
        if (fromVal) {
            toInput.setAttribute('min', fromVal);
            if (toInput.value && toInput.value < fromVal) {
                toInput.value = fromVal;
            }
        }
        calculateBookingTotal();
    });
    document.getElementById('bkTo')?.addEventListener('change', calculateBookingTotal);
    document.getElementById('bkCar')?.addEventListener('change', calculateBookingTotal);
    document.getElementById('bkHours')?.addEventListener('input', calculateBookingTotal);
    
    // Dynamic car dropdown based on type
    const CARS_BY_TYPE = {
        'Sedan': ['Mercedes-Benz C-Class', 'Mercedes Grand Sudan', 'Mercedes Benz C'],
        'SUV': ['Jeep Wrangler Rubicon', 'Toyota Fortuner', 'Range Rover', 'Chevrolet SUV'],
        'Sports': ['BMW M4', 'Audi R8', 'Ford Mustang GT'],
        'Luxury': ['Ferrari Spider', 'Mercedes-Benz SLK', 'Ferrari 488'],
        'Electric': []
    };

    const bkTypeSelect = document.getElementById('bkType');
    const bkCarSelect = document.getElementById('bkCar');
    
    if (bkTypeSelect && bkCarSelect) {
        bkTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            const cars = CARS_BY_TYPE[type] || [];
            
            bkCarSelect.innerHTML = '<option value="">Select a car...</option>';
            cars.forEach(car => {
                const opt = document.createElement('option');
                opt.value = car;
                opt.textContent = car;
                bkCarSelect.appendChild(opt);
            });
            calculateBookingTotal();
        });
        
        // Trigger once to populate initially
        bkTypeSelect.dispatchEvent(new Event('change'));
    }

    // Auto-fill Remembered Credentials
    const savedEmail = localStorage.getItem('dn_remember_email');
    const savedPass = localStorage.getItem('dn_remember_pass');
    if (savedEmail && savedPass) {
        const emailInput = document.getElementById('lgEmail');
        const passInput = document.getElementById('lgPass');
        const rememberCheck = document.getElementById('lgRemember');
        if (emailInput) emailInput.value = savedEmail;
        if (passInput) passInput.value = savedPass;
        if (rememberCheck) rememberCheck.checked = true;
    }
}

// ─────────────────────────────────────────────────────────────
//  INJECT SCROLL-TO-TOP BUTTON
// ─────────────────────────────────────────────────────────────
function injectScrollTop() {
    if (document.getElementById('dnScrollTop')) return;
    const btn = document.createElement('button');
    btn.id = 'dnScrollTop';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.innerHTML = '&#8679;';
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 350) {
            btn.classList.add('dn-show');
        } else {
            btn.classList.remove('dn-show');
        }
    }, { passive: true });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ─────────────────────────────────────────────────────────────
//  UPDATE NAVBAR  (swap Login/Book buttons for user info)
// ─────────────────────────────────────────────────────────────
function updateNavbar() {
    const auth = isAuthenticated();
    const username = getUsername();
    const staff = isStaff();

    document.querySelectorAll('.custom-navbar .d-flex, .navbar .d-flex').forEach(container => {
        if (auth && username) {
            let linksHTML = '';
            if (staff) {
                linksHTML += `<a href="admin_panel.html" class="text-white fw-semibold me-2 text-decoration-none" style="opacity:0.9">Admin</a>`;
            }
            linksHTML += `<a href="dashboard.html" class="text-white fw-semibold me-2 text-decoration-none" style="opacity:0.9">My Bookings</a>`;

            container.innerHTML = `
                ${linksHTML}
                <span class="text-white fw-semibold me-2" style="opacity:0.85">Hi, ${escHtml(username)}!</span>
                <button class="login-btn btn-logout" style="cursor:pointer">Logout</button>
                <button class="book-btn" onclick="openBookModal()" style="cursor:pointer">Book Now</button>
            `;
        } else {
            // Ensure event listeners on pre-existing buttons
            container.querySelectorAll('.login-btn').forEach(btn => {
                btn.style.cursor = 'pointer';
                btn.addEventListener('click', () => openModal('dnLoginModal'));
            });
            container.querySelectorAll('.book-btn').forEach(btn => {
                btn.style.cursor = 'pointer';
                btn.addEventListener('click', () => openBookModal());
            });
        }
    });
}

// ─────────────────────────────────────────────────────────────
//  WIRE HOMEPAGE-SPECIFIC BUTTONS
// ─────────────────────────────────────────────────────────────
function wireHomepageButtons() {
    // "Browse Cars" hero button
    const heroBrowseBtn = document.querySelector('.hero-content button');
    if (heroBrowseBtn && !heroBrowseBtn.hasAttribute('data-wired')) {
        heroBrowseBtn.setAttribute('data-wired', '1');
        heroBrowseBtn.style.cursor = 'pointer';
        heroBrowseBtn.addEventListener('click', () => {
            window.location.href = 'cars.html';
        });
    }

    // Featured cars "Book Now" buttons — pass car name to modal
    document.querySelectorAll('.car-card').forEach(card => {
        const btn = card.querySelector('.car-info button');
        const carName = card.querySelector('.car-info h3')?.textContent?.trim() || '';
        if (btn && !btn.hasAttribute('data-wired')) {
            btn.setAttribute('data-wired', '1');
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => openBookModal(carName));
        }
    });

    // Homepage search/booking form → navigate to cars page
    const searchForm = document.querySelector('.booking-section form');
    if (searchForm && !searchForm.hasAttribute('data-wired')) {
        searchForm.setAttribute('data-wired', '1');
        searchForm.addEventListener('submit', e => {
            e.preventDefault();
            const inputs = searchForm.querySelectorAll('input, select');
            const city = inputs[0]?.value?.trim() || '';
            const pickup = inputs[1]?.value || '';
            const ret = inputs[2]?.value || '';
            const type = inputs[3]?.value || '';
            const params = new URLSearchParams({ city, pickup, ret, type }).toString();
            window.location.href = `cars.html?${params}`;
        });
    }
}

// ─────────────────────────────────────────────────────────────
//  CAR FILTER TABS
// ─────────────────────────────────────────────────────────────
function initCarFilter() {
    const tabs = document.querySelectorAll('.filter-tab');
    const cards = document.querySelectorAll('.car-card');
    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.dataset.filter;

            cards.forEach(card => {
                // Support both lowercase (static HTML) and capitalized (API) categories
                const category = (card.dataset.category || '').toLowerCase();
                const match = filter === 'all' || category === filter.toLowerCase();
                const wrapper = card.closest('[class*="col-"]') || card.parentElement;
                wrapper.style.display = match ? '' : 'none';
            });
        });
    });
}

// ─────────────────────────────────────────────────────────────
//  HERO BACKGROUND SLIDER
// ─────────────────────────────────────────────────────────────
function initHeroSlider() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const images = [
        'images/bg_3.jpg',
        'images/image_6.jpg',
        'images/car-11.jpg',
        'images/bg_2.jpg',
    ];

    // Preload images to prevent flashing on transition
    images.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });

    let current = 0;

    function setBackground(index) {
        hero.style.backgroundImage =
            `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("${images[index]}")`;
    }

    // Set first image immediately — no delay
    setBackground(current);

    setInterval(() => {
        current = (current + 1) % images.length;
        setBackground(current);
    }, 3500);
}

// ─────────────────────────────────────────────────────────────
//  SCROLL REVEAL
// ─────────────────────────────────────────────────────────────
function initScrollReveal() {
    const targets = document.querySelectorAll(
        '.car-card, .service-box, .testimonial-card, .contact-info-card, .stat-box, .mission-card, .booking-form'
    );
    if (!targets.length || !('IntersectionObserver' in window)) return;

    targets.forEach(el => el.classList.add('dn-hidden'));

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('dn-revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    targets.forEach(el => observer.observe(el));
}

// ─────────────────────────────────────────────────────────────
//  COUNTERS
// ─────────────────────────────────────────────────────────────
function initCounters() {
    const counters = document.querySelectorAll('.stat-number');
    if (!counters.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = +el.getAttribute('data-count');
                const suffix = el.getAttribute('data-suffix') || '';
                const duration = 2000;
                const increment = target / (duration / 16);
                let current = 0;

                const updateCounter = () => {
                    current += increment;
                    if (current < target) {
                        el.innerText = Math.ceil(current) + suffix;
                        requestAnimationFrame(updateCounter);
                    } else {
                        el.innerText = target + suffix;
                    }
                };
                
                updateCounter();
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.1 });

    counters.forEach(counter => observer.observe(counter));
}

// ─────────────────────────────────────────────────────────────
//  FORM HANDLERS
// ─────────────────────────────────────────────────────────────

function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const email = form.lgEmail.value.trim();
    const pass = form.lgPass.value;

    if (!email || !pass) {
        showToast('Please fill in all fields.', 'error');
        return;
    }

    setButtonLoading(btn, true, 'Logging in…');

    fetch(getApiUrl('/api/login/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
        credentials: 'include',
    })
        .then(res => {
            const status = res.status;
            return res.text().then(text => {
                let data;
                try { data = JSON.parse(text); }
                catch {
                    // Server returned a non-JSON page (HTML 500 — usually MySQL is down)
                    throw new Error(`SERVER_${status}`);
                }
                return { status, data };
            });
        })
        .then(({ status, data }) => {
            if (data.status === 'success') {
                localStorage.setItem('isUserAuthenticated', 'true');
                localStorage.setItem('userName', data.username);
                localStorage.setItem('isStaff', String(data.is_staff));

                // Handle Remember Me
                const rememberMe = document.getElementById('lgRemember')?.checked;
                if (rememberMe) {
                    localStorage.setItem('dn_remember_email', email);
                    localStorage.setItem('dn_remember_pass', pass);
                } else {
                    localStorage.removeItem('dn_remember_email');
                    localStorage.removeItem('dn_remember_pass');
                }

                showToast(data.message || 'Welcome back!');
                setTimeout(() => window.location.reload(), 900);
            } else {
                showToast(data.message || 'Login failed.', 'error');
            }
        })
        .catch(err => {
            console.error('[Login Error]', err);
            if (err.message && err.message.startsWith('SERVER_')) {
                const code = err.message.replace('SERVER_', '');
                showToast(`Server error (${code}). Make sure XAMPP MySQL is running, then try again.`, 'error');
            } else {
                showToast('Cannot reach server. Is the Django server running? (python manage.py runserver)', 'error');
            }
        })
        .finally(() => setButtonLoading(btn, false, 'Login Securely'));
}


function handleSignup(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const username = form.sgUser.value.trim();
    const email = form.sgEmail.value.trim();
    const password = form.sgPass.value;

    if (!username || !email || !password) {
        showToast('Please fill in all fields.', 'error');
        return;
    }
    if (password.length < 8) {
        showToast('Password must be at least 8 characters.', 'error');
        return;
    }

    setButtonLoading(btn, true, 'Creating account…');

    fetch(getApiUrl('/api/signup/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
        credentials: 'include',
    })
        .then(res => {
            const status = res.status;
            return res.text().then(text => {
                let data;
                try { data = JSON.parse(text); }
                catch {
                    throw new Error(`SERVER_${status}`);
                }
                return { status, data };
            });
        })
        .then(({ status, data }) => {
            if (data.status === 'success') {
                localStorage.setItem('isUserAuthenticated', 'true');
                localStorage.setItem('userName', data.username);
                localStorage.setItem('isStaff', String(data.is_staff));
                showToast('Welcome to DriveNow! 🎉');
                setTimeout(() => window.location.reload(), 900);
            } else {
                showToast(data.message || 'Signup failed.', 'error');
            }
        })
        .catch(err => {
            console.error('[Signup Error]', err);
            if (err.message && err.message.startsWith('SERVER_')) {
                const code = err.message.replace('SERVER_', '');
                showToast(`Server error (${code}). Make sure XAMPP MySQL is running, then try again.`, 'error');
            } else {
                showToast('Cannot reach server. Is the Django server running? (python manage.py runserver)', 'error');
            }
        })
        .finally(() => setButtonLoading(btn, false, 'Create Account'));
}


function handleBooking(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');

    const name = form.bkName.value.trim();
    const phone = form.bkPhone.value.trim();
    const city = form.bkCity.value.trim();
    const type = form.bkType.value;
    const from = form.bkFrom.value;
    const to = form.bkTo.value;
    const carName = form.bkCar.value.trim();
    const totalPrice = window._currentBookingTotal || 0;

    // Client-side validation
    if (!name || !phone || !city || !from || !to) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }
    if (from > to) {
        showToast('Return date must be on or after pickup date.', 'error');
        return;
    }
    if (!/^\+?[\d\s\-]{7,20}$/.test(phone)) {
        showToast('Please enter a valid phone number.', 'error');
        return;
    }

    setButtonLoading(btn, true, 'Confirming…');

    fetch(getApiUrl('/api/book/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name,
            phone,
            pickup_location: city,
            car_type: type,
            pickup_date: from,
            return_date: to,
            preferred_car: carName,
            total_price: totalPrice,
        }),
        credentials: 'include',
    })
        .then(res => {
            // Parse JSON for all responses; status is handled below
            return res.json().then(data => ({ status: res.status, data }));
        })
        .then(({ status, data }) => {
            if (status === 401) {
                // Session expired or not logged in
                showToast('Please login to book a car! 🔒', 'error');
                setTimeout(() => {
                    closeModal();
                    openModal('dnLoginModal');
                }, 800);
                return;
            }
            if (data.status === 'success') {
                showToast('🎉 Booking Confirmed! Redirecting to your dashboard…');
                closeModal();
                form.reset();
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 1800);
            } else {
                showToast(data.message || 'Booking failed. Please try again.', 'error');
            }
        })
        .catch(err => {
            console.error('[Booking Error]', err);
            showToast('Connection error. Make sure the server is running and try again.', 'error');
        })
        .finally(() => setButtonLoading(btn, false, 'Confirm Reservation'));
}


function handleContact(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const name = form.contactName?.value.trim() || '';
    const email = form.contactEmail?.value.trim() || '';
    const phone = form.contactPhone?.value.trim() || '';
    const subject = form.contactSubject?.value.trim() || '';
    const message = form.contactMessage?.value.trim() || '';

    if (!name || !email || !subject || !message) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }

    setButtonLoading(btn, true, 'Sending…');

    fetch(getApiUrl('/api/contact/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
        credentials: 'include',
    })
        .then(res => {
            if (!res.ok && res.status !== 400 && res.status !== 500) throw new Error(`Server error: ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (data.status === 'success') {
                showToast('✅ Message sent! We\'ll reply within 1 hour.');
                form.reset();
            } else {
                showToast(data.message || 'Could not send message.', 'error');
            }
        })
        .catch(err => {
            console.error('[Contact Error]', err);
            showToast('Connection error. Please try again.', 'error');
        })
        .finally(() => setButtonLoading(btn, false, 'Send Message'));
}

// ─────────────────────────────────────────────────────────────
//  MODAL CONTROLS
// ─────────────────────────────────────────────────────────────
function openModal(id) {
    closeModal();
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('dn-open');
        // Compensate for scrollbar width so content doesn't shift,
        // and prevent the scrollbar from being hidden behind the navbar.
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.paddingRight = scrollbarWidth + 'px';
        document.body.style.overflow = 'hidden';
        // Focus first input for accessibility
        setTimeout(() => {
            const firstInput = modal.querySelector('input');
            if (firstInput) firstInput.focus();
        }, 150);
    }
}

function closeModal() {
    document.querySelectorAll('.dn-overlay.dn-open').forEach(m => m.classList.remove('dn-open'));
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
}

// openBookModal — requires authentication before showing the booking form
function openBookModal(carName = '') {
    if (!isAuthenticated()) {
        showToast('Please login first to book a car! 🔒', 'error');
        setTimeout(() => openModal('dnLoginModal'), 400);
        return;
    }
    openModal('dnBookModal');
    
    if (carName) {
        // Find type of this car and select it first
        const CARS_BY_TYPE = {
            'Sedan': ['Mercedes-Benz C-Class', 'Mercedes Grand Sudan', 'Mercedes Benz C'],
            'SUV': ['Jeep Wrangler Rubicon', 'Toyota Fortuner', 'Range Rover', 'Chevrolet SUV'],
            'Sports': ['BMW M4', 'Audi R8', 'Ford Mustang GT'],
            'Luxury': ['Ferrari Spider', 'Mercedes-Benz SLK', 'Ferrari 488'],
            'Electric': []
        };
        let foundType = '';
        for (const [type, cars] of Object.entries(CARS_BY_TYPE)) {
            if (cars.includes(carName)) {
                foundType = type;
                break;
            }
        }
        
        const typeSelect = document.getElementById('bkType');
        if (typeSelect && foundType) {
            typeSelect.value = foundType;
            typeSelect.dispatchEvent(new Event('change')); // Populates cars
        }
        
        const carSelect = document.getElementById('bkCar');
        if (carSelect) {
            // Need a slight delay if DOM hasn't updated yet, but dispatchEvent is synchronous
            carSelect.value = carName;
        }
    }
    calculateBookingTotal();
}

// ─────────────────────────────────────────────────────────────
//  BOOKING TOTAL CALCULATION
// ─────────────────────────────────────────────────────────────
const CAR_PRICES_PKR = {
    'BMW M4': 33500,
    'Audi R8': 42000,
    'Ferrari Spider': 55800,
    'Mercedes-Benz SLK': 50000,
    'Jeep Wrangler Rubicon': 39000,
    'Ford Mustang GT': 47500,
    'Ferrari 488': 61500,
    'Toyota Fortuner': 43000,
    'Mercedes-Benz C-Class': 46000,
    'Mercedes Grand Sudan': 42000,
    'Range Rover': 36000,
    'Mercedes Benz C': 39000,
    'Chevrolet SUV': 30600
};

function calculateBookingTotal() {
    const fromVal = document.getElementById('bkFrom')?.value;
    const toVal = document.getElementById('bkTo')?.value;
    const carName = document.getElementById('bkCar')?.value?.trim() || '';
    const hoursInput = document.getElementById('bkHours')?.value || 1;
    const hoursField = document.getElementById('bkHoursField');
    const displayEl = document.getElementById('bkTotalDisplay');
    
    if (!fromVal || !toVal || !carName || !displayEl) {
        if (displayEl) displayEl.innerText = 'Rs 0';
        if (hoursField) hoursField.style.display = 'none';
        window._currentBookingTotal = 0;
        return;
    }
    
    let rate = CAR_PRICES_PKR[carName];
    if (!rate) {
        // Fallback average rate if exact name not typed
        rate = 40000;
    }
    
    let total = 0;
    
    if (fromVal === toVal) {
        // Same day booking - use hourly rate
        if (hoursField) hoursField.style.display = 'block';
        const hours = parseInt(hoursInput, 10) || 1;
        const hourlyRate = Math.ceil(rate / 10); // Matches pricing logic
        total = hours * hourlyRate;
    } else {
        // Multi-day booking - hide hours field
        if (hoursField) hoursField.style.display = 'none';
        const fromDate = new Date(fromVal);
        const toDate = new Date(toVal);
        const timeDiff = toDate.getTime() - fromDate.getTime();
        let days = Math.ceil(timeDiff / (1000 * 3600 * 24));
        if (days < 1) days = 1;
        total = days * rate;
    }
    
    window._currentBookingTotal = total;
    displayEl.innerText = 'Rs ' + total.toLocaleString();
}
// ─────────────────────────────────────────────────────────────
//  LOGOUT  (delegated click on any .btn-logout element)
// ─────────────────────────────────────────────────────────────
document.addEventListener('click', e => {
    if (!e.target.closest('.btn-logout')) return;
    e.preventDefault();

    // Clear local storage first
    localStorage.removeItem('isUserAuthenticated');
    localStorage.removeItem('userName');
    localStorage.removeItem('isStaff');
    localStorage.removeItem('dn_remember_email');
    localStorage.removeItem('dn_remember_pass');

    // Reset login form fields to ensure fresh state
    const loginForm = document.getElementById('dnLoginForm');
    if (loginForm) loginForm.reset();

    // Call Django logout endpoint — POST is preferred, but our view
    // handles GET too. We still use GET for simplicity since this
    // is a session-based app with CORS middleware handling CSRF.
    fetch(getApiUrl('/logout/'), {
        method: 'GET',
        credentials: 'include',
    })
        .then(() => { window.location.href = 'index.html'; })
        .catch(() => { window.location.href = 'index.html'; }); // Always redirect
});

// ─────────────────────────────────────────────────────────────
//  TOAST NOTIFICATION
// ─────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    // Remove existing toasts gracefully
    document.querySelectorAll('.dn-toast').forEach(t => {
        t.classList.remove('dn-toast-show');
        setTimeout(() => t.remove(), 300);
    });

    const toast = document.createElement('div');
    toast.className = `dn-toast dn-toast-${type}`;
    toast.textContent = msg;
    toast.setAttribute('role', 'alert');
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('dn-toast-show'));
    });

    setTimeout(() => {
        toast.classList.remove('dn-toast-show');
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

// ─────────────────────────────────────────────────────────────
//  BUTTON LOADING STATE HELPER
// ─────────────────────────────────────────────────────────────
function setButtonLoading(btn, loading, label) {
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = label;
    btn.style.opacity = loading ? '0.7' : '1';
}

// ─────────────────────────────────────────────────────────────
//  MINI CHATBOT
// ─────────────────────────────────────────────────────────────
function injectChatbot() {
    const chatbotHTML = `
        <div id="dnChatbot" class="dn-chatbot">
            <button id="dnChatbotToggle" class="dn-chatbot-toggle" aria-label="Open Chat">💬</button>
            <div id="dnChatbotWindow" class="dn-chatbot-window">
                <div class="dn-chatbot-header">
                    <h4>DriveNow Support</h4>
                    <button id="dnChatbotClose" aria-label="Close Chat">&times;</button>
                </div>
                <div id="dnChatbotBody" class="dn-chatbot-body">
                    <div class="chat-msg bot-msg">Hello! How can we help you today? Choose a question below:</div>
                    <div class="faq-options">
                        <button class="faq-btn" data-answer="Our operating hours are 24/7 for online booking. Physical pickup is available from 8 AM to 10 PM.">What are your operating hours?</button>
                        <button class="faq-btn" data-answer="Yes, a fully refundable security deposit is required for all luxury and sports cars.">Do you require a deposit?</button>
                        <button class="faq-btn" data-answer="You will need a valid driver's license, an ID/Passport, and a valid credit card.">What documents do I need?</button>
                        <button class="faq-btn" data-answer="Yes! Free cancellation up to 48 hours before pickup. After that, a 20% fee applies.">Can I cancel my booking?</button>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .dn-chatbot { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: 'Inter', sans-serif; }
            .dn-chatbot-toggle { width: 60px; height: 60px; border-radius: 50%; background: #e11d48; color: #fff; font-size: 24px; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(225,29,72,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.3s ease; }
            .dn-chatbot-toggle:hover { transform: scale(1.1); }
            .dn-chatbot-window { display: none; width: 320px; height: 450px; background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); flex-direction: column; overflow: hidden; position: absolute; bottom: 80px; right: 0; transform-origin: bottom right; animation: scaleIn 0.3s ease forwards; }
            .dn-chatbot-header { background: #0f172a; color: #fff; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; }
            .dn-chatbot-header h4 { margin: 0; font-size: 16px; font-weight: 600; }
            .dn-chatbot-header button { background: transparent; border: none; color: #fff; font-size: 24px; cursor: pointer; line-height: 1; }
            .dn-chatbot-body { padding: 15px; flex: 1; overflow-y: auto; background: #f8fafc; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }
            .chat-msg { padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.4; max-width: 85%; animation: fadeIn 0.3s ease; }
            .bot-msg { background: #e2e8f0; color: #1e293b; align-self: flex-start; border-bottom-left-radius: 4px; }
            .user-msg { background: #e11d48; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
            .faq-options { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
            .faq-btn { background: #fff; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 20px; font-size: 13px; color: #334155; cursor: pointer; text-align: left; transition: all 0.2s; }
            .faq-btn:hover { background: #f1f5f9; border-color: #94a3b8; }
            @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);

    const toggle = document.getElementById('dnChatbotToggle');
    const close = document.getElementById('dnChatbotClose');
    const windowEl = document.getElementById('dnChatbotWindow');
    const body = document.getElementById('dnChatbotBody');
    const faqBtns = document.querySelectorAll('.faq-btn');

    toggle.addEventListener('click', () => {
        windowEl.style.display = windowEl.style.display === 'flex' ? 'none' : 'flex';
    });

    close.addEventListener('click', () => {
        windowEl.style.display = 'none';
    });

    faqBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const question = btn.textContent;
            const answer = btn.getAttribute('data-answer');
            
            // Hide FAQ options
            document.querySelector('.faq-options').style.display = 'none';

            // Add User Question
            body.insertAdjacentHTML('beforeend', `<div class="chat-msg user-msg">${question}</div>`);
            
            // Add Bot Typing / Answer (simulate delay)
            setTimeout(() => {
                body.insertAdjacentHTML('beforeend', `<div class="chat-msg bot-msg">${answer}</div>`);
                body.scrollTop = body.scrollHeight;

                // Show FAQs again after a short delay
                setTimeout(() => {
                    document.querySelector('.faq-options').style.display = 'flex';
                    body.scrollTop = body.scrollHeight;
                }, 1000);
            }, 600);
        });
    });
}
