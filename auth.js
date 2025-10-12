// Authentication Management
class AuthManager {
  constructor() {
    // Check both localStorage and sessionStorage for current user (for backward compatibility)
    this.currentUser =
      JSON.parse(localStorage.getItem("currentUser")) ||
      JSON.parse(sessionStorage.getItem("currentUser")) ||
      null;
    this.users = JSON.parse(localStorage.getItem("users")) || [];

    // If user was found in sessionStorage, move to localStorage for persistence
    if (
      !localStorage.getItem("currentUser") &&
      sessionStorage.getItem("currentUser")
    ) {
      localStorage.setItem(
        "currentUser",
        sessionStorage.getItem("currentUser")
      );
      sessionStorage.removeItem("currentUser");
    }

    this.init();
  }

  init() {
    // Load user-specific cart if cart functions are available
    setTimeout(() => {
      if (typeof window.loadUserCart === "function") {
        window.loadUserCart();
      }
    }, 50);

    // Update header based on authentication status
    this.updateHeader();

    // Check URL parameters for auth mode
    this.checkAuthMode();

    // Bind authentication form events
    this.bindEvents();
  }

  checkAuthMode() {
    // Only run on auth.html page
    if (!window.location.pathname.includes("auth.html")) return;

    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get("mode");

    if (mode === "signup") {
      // Switch to sign-up mode
      setTimeout(() => {
        const signinForm = document.getElementById("signin-form");
        const signupForm = document.getElementById("signup-form");
        if (
          signinForm &&
          signupForm &&
          !signinForm.classList.contains("hidden")
        ) {
          this.switchToSignUp();
        }
      }, 100);
    }
    // signin is the default mode, no action needed
  }

  switchToSignUp() {
    const signinForm = document.getElementById("signin-form");
    const signupForm = document.getElementById("signup-form");
    const authTitle = document.getElementById("auth-title");
    const authSubtitle = document.getElementById("auth-subtitle");
    const switchText = document.getElementById("switch-text");

    if (signinForm && signupForm) {
      signinForm.classList.add("hidden");
      signupForm.classList.remove("hidden");
      authTitle.textContent = "Create your account";
      authSubtitle.textContent = "Join WebShop today and start shopping!";
      switchText.innerHTML =
        'Already have an account? <a href="#" id="switch-link">Sign in</a>';

      // Re-bind the switch link event
      document
        .getElementById("switch-link")
        .addEventListener("click", (e) => this.switchAuthMode(e));
    }
  }

  bindEvents() {
    const signinForm = document.getElementById("signin-form");
    const signupForm = document.getElementById("signup-form");
    const switchLink = document.getElementById("switch-link");

    if (signinForm) {
      signinForm.addEventListener("submit", (e) => this.handleSignIn(e));
    }

    if (signupForm) {
      signupForm.addEventListener("submit", (e) => this.handleSignUp(e));
    }

    if (switchLink) {
      switchLink.addEventListener("click", (e) => this.switchAuthMode(e));
    }

    // Social authentication buttons
    const googleBtn = document.querySelector(".google-btn");
    const facebookBtn = document.querySelector(".facebook-btn");

    if (googleBtn) {
      googleBtn.addEventListener("click", () =>
        this.handleSocialAuth("google")
      );
    }

    if (facebookBtn) {
      facebookBtn.addEventListener("click", () =>
        this.handleSocialAuth("facebook")
      );
    }

    // Logout functionality (fallback for old logout buttons)
    document.addEventListener("click", (e) => {
      if (
        e.target.classList.contains("logout-btn") &&
        !e.target.closest(".dropdown-menu")
      ) {
        this.logout();
      }
    });
  }

  initializeUserDropdown() {
    const userAvatarBtn = document.getElementById("user-avatar-btn");
    const dropdownMenu = document.getElementById("user-dropdown-menu");
    const logoutBtn = document.getElementById("logout-btn");

    if (userAvatarBtn && dropdownMenu) {
      // Toggle dropdown on avatar click
      userAvatarBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle("show");
      });

      // Close dropdown when clicking outside
      document.addEventListener("click", (e) => {
        if (
          !userAvatarBtn.contains(e.target) &&
          !dropdownMenu.contains(e.target)
        ) {
          dropdownMenu.classList.remove("show");
        }
      });

      // Handle logout
      if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.logout();
          dropdownMenu.classList.remove("show");
        });
      }
    }
  }

  handleSignIn(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    // Validate inputs
    if (!email || !password) {
      showPopup("Please fill in all fields", { duration: 3000 });
      return;
    }

    // Check if user exists
    const user = this.users.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      this.loginUser(user);
      showPopup(`Welcome back, ${user.firstName}!`, { duration: 3000 });

      // Redirect to home page
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    } else {
      showPopup("Invalid email or password", { duration: 3000 });
    }
  }

  handleSignUp(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    const agreeTerms = document.getElementById("terms-agreement").checked;

    // Validate inputs
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      showPopup("Please fill in all fields", { duration: 3000 });
      return;
    }

    if (password !== confirmPassword) {
      showPopup("Passwords do not match", { duration: 3000 });
      return;
    }

    if (password.length < 6) {
      showPopup("Password must be at least 6 characters long", {
        duration: 3000,
      });
      return;
    }

    if (!agreeTerms) {
      showPopup("Please agree to the Terms of Service", { duration: 3000 });
      return;
    }

    // Check if user already exists
    if (this.users.find((u) => u.email === email)) {
      showPopup("An account with this email already exists", {
        duration: 3000,
      });
      return;
    }

    // Create new user
    const newUser = {
      id: Date.now(),
      firstName,
      lastName,
      email,
      password,
      createdAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    localStorage.setItem("users", JSON.stringify(this.users));

    this.loginUser(newUser);
    showPopup(`Welcome to WebShop, ${firstName}!`, { duration: 3000 });

    // Redirect to home page
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  }

  handleSocialAuth(provider) {
    // Simulate social authentication (in real app, this would integrate with OAuth)
    const mockUser = {
      id: Date.now(),
      firstName: provider === "google" ? "Google" : "Facebook",
      lastName: "User",
      email: `user@${provider}.com`,
      provider: provider,
      createdAt: new Date().toISOString(),
    };

    this.loginUser(mockUser);
    showPopup(
      `Signed in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`,
      { duration: 3000 }
    );

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  }

  switchAuthMode(e) {
    e.preventDefault();

    const signinForm = document.getElementById("signin-form");
    const signupForm = document.getElementById("signup-form");
    const authTitle = document.getElementById("auth-title");
    const authSubtitle = document.getElementById("auth-subtitle");
    const switchText = document.getElementById("switch-text");
    const switchLink = document.getElementById("switch-link");

    if (signinForm.classList.contains("hidden")) {
      // Switch to Sign In
      signinForm.classList.remove("hidden");
      signupForm.classList.add("hidden");
      authTitle.textContent = "Welcome back";
      authSubtitle.textContent = "Sign in to your account to continue shopping";
      switchText.innerHTML =
        'Don\'t have an account? <a href="#" id="switch-link">Create one</a>';
    } else {
      // Switch to Sign Up
      signinForm.classList.add("hidden");
      signupForm.classList.remove("hidden");
      authTitle.textContent = "Create your account";
      authSubtitle.textContent = "Join WebShop today and start shopping!";
      switchText.innerHTML =
        'Already have an account? <a href="#" id="switch-link">Sign in</a>';
    }

    // Re-bind the switch link event
    document
      .getElementById("switch-link")
      .addEventListener("click", (e) => this.switchAuthMode(e));
  }

  loginUser(user) {
    this.currentUser = user;

    // Always use localStorage to keep user signed in until manual logout
    localStorage.setItem("currentUser", JSON.stringify(user));

    // Load user-specific cart
    if (typeof window.loadUserCart === "function") {
      window.loadUserCart();
    }

    this.updateHeader();
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("currentUser"); // Clean up any old sessionStorage data

    // Load guest cart after logout
    if (typeof window.loadUserCart === "function") {
      window.loadUserCart();
    }

    this.updateHeader();
    showPopup("You have been logged out", { duration: 2000 });

    // Redirect to home page
    if (
      window.location.pathname !== "/index.html" &&
      window.location.pathname !== "/"
    ) {
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    }
  }

  updateHeader() {
    const headerActions = document.querySelector(".header-actions");

    if (!headerActions) return;

    if (this.currentUser) {
      // User is logged in - show user profile
      const userInitials = (
        this.currentUser.firstName[0] + (this.currentUser.lastName[0] || "")
      ).toUpperCase();

      headerActions.innerHTML = `
                <div class="user-profile">
                    <div class="user-dropdown">
                        <div class="user-avatar" id="user-avatar-btn">
                            ${userInitials}
                        </div>
                        <div class="dropdown-menu" id="user-dropdown-menu">
                            <div class="dropdown-header">
                                <div class="dropdown-user-info">
                                    <strong>${this.currentUser.firstName} ${
        this.currentUser.lastName || ""
      }</strong>
                                    <span>${this.currentUser.email}</span>
                                </div>
                            </div>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item logout-btn" id="logout-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
                <div class="cart-icon" id="cart-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H17M17 13V16.5M9 19.5C9.8 19.5 10.5 20.2 10.5 21S9.8 22.5 9 22.5 7.5 21.8 7.5 21 8.2 19.5 9 19.5ZM20 19.5C20.8 19.5 21.5 20.2 21.5 21S20.8 22.5 20 22.5 18.5 21.8 18.5 21 19.2 19.5 20 19.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="cart-count" id="cart-count">0</span>
                </div>
            `;
    } else {
      // User is not logged in - show auth buttons
      headerActions.innerHTML = `
                <a href="auth.html?mode=signin" class="sign-in-btn">Sign in</a>
                <button class="get-started-btn" onclick="window.location.href='auth.html?mode=signup'">Get started</button>
                <div class="cart-icon" id="cart-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H17M17 13V16.5M9 19.5C9.8 19.5 10.5 20.2 10.5 21S9.8 22.5 9 22.5 7.5 21.8 7.5 21 8.2 19.5 9 19.5ZM20 19.5C20.8 19.5 21.5 20.2 21.5 21S20.8 22.5 20 22.5 18.5 21.8 18.5 21 19.2 19.5 20 19.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="cart-count" id="cart-count">0</span>
                </div>
            `;
    }

    // Re-initialize cart functionality after updating header
    setTimeout(() => {
      if (typeof window.initializeCartFunctionality === "function") {
        window.initializeCartFunctionality();
      }

      // Initialize user dropdown functionality
      this.initializeUserDropdown();
    }, 100); // Small delay to ensure DOM is updated
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Initialize authentication manager
const authManager = new AuthManager();

// Make authManager available globally
window.authManager = authManager;
