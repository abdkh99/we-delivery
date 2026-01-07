/**
 * Session Management Utility
 * Handles automatic session refresh and validation
 */

import { createClient } from "@/lib/supabase/client";

interface SessionState {
  isValid: boolean;
  expiresAt: number | null;
  refreshTimer: NodeJS.Timeout | null;
}

class SessionManager {
  private sessionState: SessionState = {
    isValid: false,
    expiresAt: null,
    refreshTimer: null,
  };

  private refreshCallbacks: Set<() => void> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize session manager
   */
  async initialize() {
    await this.checkSession();
    this.startPeriodicCheck();
  }

  /**
   * Check current session and refresh if needed
   */
  async checkSession(): Promise<boolean> {
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        this.sessionState.isValid = false;
        this.sessionState.expiresAt = null;
        this.clearRefreshTimer();
        return false;
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      const now = Date.now();

      // If session expires in less than 5 minutes, refresh it
      if (expiresAt && expiresAt - now < 5 * 60 * 1000) {
        return await this.refreshSession();
      }

      this.sessionState.isValid = true;
      this.sessionState.expiresAt = expiresAt;
      this.scheduleRefresh(expiresAt, now);

      return true;
    } catch (error) {
      console.error("Session check error:", error);
      this.sessionState.isValid = false;
      return false;
    }
  }

  /**
   * Refresh the session
   */
  async refreshSession(): Promise<boolean> {
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.refreshSession();

      if (error || !session) {
        this.sessionState.isValid = false;
        this.clearRefreshTimer();
        
        // Notify callbacks
        this.refreshCallbacks.forEach(callback => {
          try {
            callback();
          } catch (e) {
            console.error("Session refresh callback error:", e);
          }
        });

        return false;
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
      const now = Date.now();

      this.sessionState.isValid = true;
      this.sessionState.expiresAt = expiresAt;
      this.scheduleRefresh(expiresAt, now);

      return true;
    } catch (error) {
      console.error("Session refresh error:", error);
      this.sessionState.isValid = false;
      this.clearRefreshTimer();
      return false;
    }
  }

  /**
   * Schedule automatic refresh before session expires
   */
  private scheduleRefresh(expiresAt: number | null, now: number) {
    this.clearRefreshTimer();

    if (!expiresAt) return;

    // Refresh 5 minutes before expiration
    const refreshTime = expiresAt - now - 5 * 60 * 1000;

    if (refreshTime > 0) {
      this.sessionState.refreshTimer = setTimeout(() => {
        this.refreshSession();
      }, refreshTime);
    }
  }

  /**
   * Start periodic session check (every 5 minutes)
   */
  private startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkSession();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Clear refresh timer
   */
  private clearRefreshTimer() {
    if (this.sessionState.refreshTimer) {
      clearTimeout(this.sessionState.refreshTimer);
      this.sessionState.refreshTimer = null;
    }
  }

  /**
   * Register callback for session expiration
   */
  onSessionExpired(callback: () => void) {
    this.refreshCallbacks.add(callback);
    return () => {
      this.refreshCallbacks.delete(callback);
    };
  }

  /**
   * Check if session is valid
   */
  isSessionValid(): boolean {
    if (!this.sessionState.isValid || !this.sessionState.expiresAt) {
      return false;
    }

    return Date.now() < this.sessionState.expiresAt;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.clearRefreshTimer();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.refreshCallbacks.clear();
  }
}

// Singleton instance
export const sessionManager = new SessionManager();
