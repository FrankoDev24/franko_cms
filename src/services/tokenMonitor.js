// src/services/tokenMonitor.js
import { isTokenExpired } from '../Redux/Slice/AxiosInstance';

class TokenMonitor {
  constructor() {
    this.tokenCheckInterval = null;
    this.inactivityCheckInterval = null;
    this.dispatch = null;
    this.isRefreshing = false;
    this.lastActivityUpdate = Date.now();
    
    // Constants
    this.TOKEN_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
    this.INACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute
    this.INACTIVITY_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours
    this.ACTIVITY_THROTTLE = 30 * 1000; // 30 seconds
  }

  /**
   * Initialize the token monitor
   */
  init(dispatch, refreshCallback, logoutCallback) {
    this.dispatch = dispatch;
    this.refreshCallback = refreshCallback;
    this.logoutCallback = logoutCallback;
    
    this.startTokenMonitoring();
    this.startInactivityMonitoring();
    this.setupActivityListeners();
    
    console.log('🔐 Token monitor initialized');
  }

  /**
   * Start monitoring token expiry
   */
  startTokenMonitoring() {
    this.tokenCheckInterval = setInterval(() => {
      this.checkAndRefreshToken();
    }, this.TOKEN_CHECK_INTERVAL);
  }

  /**
   * Start monitoring user inactivity
   */
  startInactivityMonitoring() {
    this.inactivityCheckInterval = setInterval(() => {
      this.checkInactivity();
    }, this.INACTIVITY_CHECK_INTERVAL);
  }

  /**
   * Setup activity listeners
   */
  setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    
    const updateActivity = () => {
      const now = Date.now();
      
      // Throttle updates
      if (now - this.lastActivityUpdate > this.ACTIVITY_THROTTLE) {
        this.lastActivityUpdate = now;
        this.updateLastActivity();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity() {
    try {
      localStorage.setItem('lastActivity', Date.now().toString());
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  /**
   * Check token expiry and refresh if needed
   */
  async checkAndRefreshToken() {
    if (this.isRefreshing) {
      console.log('Token refresh already in progress...');
      return;
    }

    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      let user;
      try {
        user = typeof userStr === 'object' ? userStr : JSON.parse(userStr);
      } catch {
        console.warn('Invalid user data in localStorage');
        return;
      }

      const token = user?.accessToken;
      if (!token) return;

      // Check if token is expired or about to expire
      if (isTokenExpired(token)) {
        console.log('🔄 Token expired/expiring, refreshing...');
        this.isRefreshing = true;
        
        if (this.refreshCallback) {
          await this.refreshCallback();
        }
        
        this.isRefreshing = false;
      }
    } catch (error) {
      console.error('Error in token check:', error);
      this.isRefreshing = false;
    }
  }

  /**
   * Check for user inactivity
   */
  checkInactivity() {
    try {
      const lastActivity = localStorage.getItem('lastActivity');
      const loginTime = localStorage.getItem('loginTime');
      
      if (!loginTime) return;

      const lastActiveTime = lastActivity ? Number(lastActivity) : Number(loginTime);
      const inactiveTime = Date.now() - lastActiveTime;

      if (inactiveTime > this.INACTIVITY_TIMEOUT) {
        console.log('⏱️ User inactive for 3 hours, logging out...');
        this.handleInactivityLogout();
      }
    } catch (error) {
      console.error('Error checking inactivity:', error);
    }
  }

  /**
   * Handle logout due to inactivity
   */
  handleInactivityLogout() {
    if (this.logoutCallback) {
      this.logoutCallback();
    }
    
    this.cleanup();
    
    // Redirect to login if not already there
    if (window.location.pathname !== '/admin/login') {
      window.location.href = '/admin/login';
    }
  }

  /**
   * Cleanup intervals and listeners
   */
  cleanup() {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }
    
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }
    
    console.log('🔐 Token monitor cleaned up');
  }

  /**
   * Manually trigger token refresh
   */
  async manualRefresh() {
    await this.checkAndRefreshToken();
  }
}

// Export singleton instance
export const tokenMonitor = new TokenMonitor();