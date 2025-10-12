// Backend base URL
const API_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:8080"
    : "https://webshop-backend-production-5952.up.railway.app";

// Popup Helpers
function ensurePopupElement() {
  let el = document.getElementById("global-popup");
  if (!el) {
    el = document.createElement("div");
    el.id = "global-popup";
    el.className = "popup";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  return el;
}
function showPopup(message, { duration = 3000, focus = false } = {}) {
  const el = ensurePopupElement();
  el.style.display = "none";
  void el.offsetWidth;
  el.textContent = message;
  el.style.display = "block";
  if (focus) {
    el.setAttribute("tabindex", "-1");
    el.focus();
  }
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.style.display = "none";
  }, duration);
}

// CART LOGIC
let cart = {};

// Cart management functions
function getCurrentUserId() {
  const authManager = window.authManager;
  if (authManager && authManager.getCurrentUser()) {
    return (
      authManager.getCurrentUser().id || authManager.getCurrentUser().email
    );
  }
  return "guest"; // Default for non-authenticated users
}

function loadUserCart() {
  const userId = getCurrentUserId();
  const allCarts = JSON.parse(localStorage.getItem("userCarts")) || {};
  cart = allCarts[userId] || {};
  updateCartCount();
}

function saveUserCart() {
  const userId = getCurrentUserId();
  const allCarts = JSON.parse(localStorage.getItem("userCarts")) || {};
  allCarts[userId] = cart;
  localStorage.setItem("userCarts", JSON.stringify(allCarts));
}

// Migrate old cart data (for backward compatibility)
function migrateOldCart() {
  const oldCart = JSON.parse(localStorage.getItem("cart"));
  if (oldCart && Object.keys(oldCart).length > 0) {
    const userId = getCurrentUserId();
    const allCarts = JSON.parse(localStorage.getItem("userCarts")) || {};
    if (!allCarts[userId]) {
      allCarts[userId] = oldCart;
      localStorage.setItem("userCarts", JSON.stringify(allCarts));
    }
    localStorage.removeItem("cart"); // Remove old cart
  }
}

function updateCartCount() {
  const totalItems = Object.values(cart).reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const cartCountElement = document.getElementById("cart-count"); // Get fresh reference
  if (cartCountElement) cartCountElement.textContent = totalItems;
}

// Updated save function to use user-specific cart
function saveCart() {
  saveUserCart();
}

// Function to clear current user's cart
function clearUserCart() {
  cart = {};
  saveUserCart();
  updateCartCount();
}

// Make cart functions global
window.updateCartCount = updateCartCount;
window.loadUserCart = loadUserCart;
window.clearUserCart = clearUserCart;
function renderCartMenu() {
  const cartItemsDiv = document.getElementById("cart-items"); // Get fresh reference
  const cartTotalDiv = document.getElementById("cart-total"); // Get fresh reference
  const removeAllBtn = document.getElementById("remove-all-btn"); // Get fresh reference

  if (!cartItemsDiv || !cartTotalDiv) return;
  cartItemsDiv.innerHTML = "";
  if (Object.keys(cart).length === 0) {
    cartItemsDiv.innerHTML = "<em>Your cart is empty.</em>";
    cartTotalDiv.textContent = "";
    if (removeAllBtn) removeAllBtn.style.display = "none";
    return;
  }
  if (removeAllBtn) removeAllBtn.style.display = "block";
  let totalPrice = 0;
  Object.entries(cart).forEach(([name, data]) => {
    totalPrice += data.price * data.quantity;
    const row = document.createElement("div");
    row.className = "cart-item-row";
    row.innerHTML = `
      <span>${name} x${data.quantity}</span>
      <span>
        $${(data.price * data.quantity).toFixed(2)}
        <button class="remove-item-btn" data-name="${name}">Remove</button>
      </span>
    `;
    cartItemsDiv.appendChild(row);
  });
  cartTotalDiv.textContent = `Total: $${totalPrice.toFixed(2)}`;
  cartItemsDiv.querySelectorAll(".remove-item-btn").forEach((btn) => {
    btn.onclick = () => {
      const itemName = btn.getAttribute("data-name");
      delete cart[itemName];
      saveCart();
      updateCartCount();
      renderCartMenu();
    };
  });
}

// Make renderCartMenu global
window.renderCartMenu = renderCartMenu;

// Add to cart functionality is now handled in initializeCartFunctionality()

// Original cart event bindings are now handled by initializeCartFunctionality()
updateCartCount();

// CONTACT FORM
const contactForm = document.getElementById("contact-form");
if (contactForm) {
  const contactStatus = document.getElementById("contact-status");
  const contactSubmitBtn = document.getElementById("contact-submit");
  function setContactStatus(msg, type) {
    if (!contactStatus) return;
    contactStatus.textContent = msg;
    contactStatus.className = "form-status " + (type || "");
  }
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = contactForm.querySelector("#name").value.trim();
    const email = contactForm.querySelector("#email").value.trim();
    const message = contactForm.querySelector("#message").value.trim();
    if (!name || !email || !message) {
      setContactStatus("All fields required.", "error");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setContactStatus("Invalid email format.", "error");
      return;
    }
    contactSubmitBtn.disabled = true;
    contactSubmitBtn.textContent = "Sending...";
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setContactStatus(data.message || "Message sent!", "success");
        contactForm.reset();
        // POPUP HERE
        showPopup("Your message has been sent to admin, Thanks!");
      } else {
        setContactStatus(data.error || "Error sending message.", "error");
      }
    } catch (err) {
      setContactStatus("Network error: " + err.message, "error");
    } finally {
      contactSubmitBtn.disabled = false;
      contactSubmitBtn.textContent = "Send Message";
    }
  });
}

// REVIEWS
const reviewForm = document.getElementById("review-form");
const reviewsListDiv = document.getElementById("reviews-list");
const reviewStatus = document.getElementById("review-status");
const reviewSubmitBtn = document.getElementById("review-submit");
const NEWEST_FIRST = true;
let reviewsCache = [];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function reviewItemTemplate(r) {
  return `<div class="review-item">
    <strong>${escapeHtml(r.name)}</strong><br>
    <span>${escapeHtml(r.message)}</span>
  </div>`;
}
function renderReviews(list) {
  if (!reviewsListDiv) return;
  if (!list.length) {
    reviewsListDiv.innerHTML = "<em>No reviews yet.</em>";
    return;
  }
  reviewsListDiv.innerHTML =
    "<h3>Recent Reviews:</h3>" + list.map(reviewItemTemplate).join("");
}
async function loadReviews() {
  if (!reviewsListDiv) return;
  reviewsListDiv.innerHTML = "<em>Loading reviews...</em>";
  try {
    const res = await fetch(`${API_BASE}/api/review`);
    if (!res.ok) {
      reviewsListDiv.innerHTML = "<em>Failed to load reviews.</em>";
      return;
    }
    let reviews = await res.json();
    if (!Array.isArray(reviews)) {
      reviewsListDiv.innerHTML = "<em>Unexpected response.</em>";
      return;
    }
    if (!NEWEST_FIRST) reviews = reviews.slice().reverse();
    reviewsCache = reviews;
    renderReviews(reviewsCache);
  } catch (err) {
    reviewsListDiv.innerHTML = "<em>Error loading reviews.</em>";
  }
}
function setReviewStatus(msg, type) {
  if (!reviewStatus) return;
  reviewStatus.textContent = msg;
  reviewStatus.className = "form-status " + (type || "");
}

// Initialize reviews
function initializeReviews() {
  // Load reviews if reviews list exists
  loadReviews();
  
  // Set up form submission if form exists
  if (reviewForm) {
    reviewForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setReviewStatus("", "");
      const name = reviewForm.querySelector("#reviewer-name").value.trim();
      const message = reviewForm.querySelector("#review-message").value.trim();
      if (!name || !message) {
        setReviewStatus("All fields required.", "error");
        return;
      }
      reviewSubmitBtn.disabled = true;
      const original = reviewSubmitBtn.textContent;
      reviewSubmitBtn.textContent = "Submitting...";
      try {
        const res = await fetch(`${API_BASE}/api/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, message }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const newReview = { name, message };
          if (NEWEST_FIRST) reviewsCache.unshift(newReview);
          else reviewsCache.push(newReview);
          renderReviews(reviewsCache);
          reviewForm.reset();
          setReviewStatus("Review submitted!", "success");
          // POPUP HERE
          showPopup("Thanks for the review!");
        } else {
          setReviewStatus(data.error || "Error submitting.", "error");
        }
      } catch (err) {
        setReviewStatus("Network error: " + err.message, "error");
      } finally {
        reviewSubmitBtn.disabled = false;
        reviewSubmitBtn.textContent = original;
      }
    });
  }
}

// PRODUCT SEARC
const productSearch = document.getElementById("product-search");
const searchBtn = document.getElementById("search-btn");
const productCards = document.querySelectorAll(".product-card");
function filterProducts() {
  if (!productSearch) return;
  const query = productSearch.value.toLowerCase();
  productCards.forEach((card) => {
    const productName = card.querySelector("h3").textContent.toLowerCase();
    card.style.display = productName.includes(query) ? "" : "none";
  });
}
if (productSearch) productSearch.addEventListener("input", filterProducts);
if (searchBtn) searchBtn.addEventListener("click", filterProducts);

// HAMBURGER NAV
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("nav-links");
if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    hamburger.classList.toggle("is-active", isOpen);
    hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
  navLinks.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      if (window.innerWidth <= 768 && navLinks.classList.contains("open")) {
        navLinks.classList.remove("open");
        hamburger.classList.remove("is-active");
        hamburger.setAttribute("aria-expanded", "false");
      }
    });
  });
  document.addEventListener("click", (e) => {
    if (window.innerWidth > 768) return;
    if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
      if (navLinks.classList.contains("open")) {
        navLinks.classList.remove("open");
        hamburger.classList.remove("is-active");
        hamburger.setAttribute("aria-expanded", "false");
      }
    }
  });
}

// Function to initialize cart functionality (can be called after header updates)
function initializeCartFunctionality() {
  const cartBtn = document.getElementById("cart-btn");
  const cartMenu = document.getElementById("cart-menu");
  const closeCartMenuBtn = document.getElementById("close-cart-menu");
  const removeAllBtn = document.getElementById("remove-all-btn");

  // Migrate old cart data if needed
  migrateOldCart();

  // Load user-specific cart
  loadUserCart();

  // Update cart count
  updateCartCount();

  // Bind add to cart buttons (only those in product cards)
  const productCards = document.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    const addToCartBtn = card.querySelector(".buy-btn");
    if (!addToCartBtn || addToCartBtn.tagName.toLowerCase() !== "button") return;
    
    // Skip if already has event listener
    if (addToCartBtn.dataset.cartBound === "true") return;
    
    addToCartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      
      const name = card.querySelector("h3").textContent.trim();
      const priceText = card.querySelector("p")
        ? card.querySelector("p").textContent.trim()
        : "0";
      const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;
      
      if (!cart[name]) cart[name] = { quantity: 1, price };
      else cart[name].quantity += 1;
      
      saveCart();
      updateCartCount();
      
      showPopup(`${name} added to cart!`, { duration: 2000 });
    });
    
    // Mark as bound to prevent duplicate bindings
    addToCartBtn.dataset.cartBound = "true";
  });

  // Cart button click
  if (cartBtn && cartMenu) {
    cartBtn.addEventListener("click", () => {
      renderCartMenu();
      cartMenu.style.display = "block";
    });
  }

  // Close cart menu
  if (closeCartMenuBtn && cartMenu) {
    closeCartMenuBtn.addEventListener("click", () => {
      cartMenu.style.display = "none";
    });
  }

  // Remove all items
  if (removeAllBtn) {
    removeAllBtn.onclick = () => {
      clearUserCart();
      renderCartMenu();
    };
  }
}

// Make cart initialization function global
window.initializeCartFunctionality = initializeCartFunctionality;

// Initialize cart functionality on page load
document.addEventListener("DOMContentLoaded", () => {
  // Small delay to ensure all scripts are loaded
  setTimeout(() => {
    // Wait for authManager to be available
    if (window.authManager) {
      initializeCartFunctionality();
    } else {
      // Fallback: try again after a bit more time
      setTimeout(initializeCartFunctionality, 200);
    }
    initializeReviews();
  }, 100);
});
