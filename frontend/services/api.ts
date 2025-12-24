
import { PlotRecord, SummaryData, User } from '../types';

const API_BASE = 'http://localhost:8083/api';

export const ApiService = {
  // --- Auth ---
  async login(username: string, password: string): Promise<{ user: User | null; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const err = await res.json();
        return { user: null, error: err.error || 'Login failed' };
      }
      return { user: await res.json() };
    } catch (e) {
      console.error("Login connection error:", e);
      return { user: null, error: 'Cannot connect to authentication server.' };
    }
  },

  async addUser(userData: Partial<User> & { password: string }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/users/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Failed to create user' };
      }
      return { success: true, message: data.message || 'User added successfully' };
    } catch (e) {
      console.error("Add user connection error:", e);
      return { success: false, message: 'Network error: Backend server might be offline.' };
    }
  },

  async updatePassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/users/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword })
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Update failed' };
      return { success: true, message: 'Password updated successfully' };
    } catch (e) {
      return { success: false, message: 'Network error' };
    }
  },

  async forgotPassword(identifier: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.error };
    } catch (e) {
      return { success: false, message: 'Network error' };
    }
  },

  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.error };
    } catch (e) {
      return { success: false, message: 'Network error' };
    }
  },

  // --- Data Fetching ---

  async getRegions(): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE}/regions`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getNodes(region?: string): Promise<string[]> {
    try {
      let url = `${API_BASE}/nodes`;
      if (region) url += `?region=${encodeURIComponent(region)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getSectors(node: string, region?: string): Promise<string[]> {
    try {
      let url = `${API_BASE}/sectors?node=${encodeURIComponent(node)}`;
      if (region) url += `&region=${encodeURIComponent(region)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getBlocks(node: string, sector: string, region?: string): Promise<string[]> {
    try {
      let url = `${API_BASE}/blocks?node=${encodeURIComponent(node)}&sector=${encodeURIComponent(sector)}`;
      if (region) url += `&region=${encodeURIComponent(region)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getPlots(node: string, sector: string, region?: string): Promise<string[]> {
    try {
      let url = `${API_BASE}/plots?node=${encodeURIComponent(node)}&sector=${encodeURIComponent(sector)}`;
      if (region) url += `&region=${encodeURIComponent(region)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async searchRecords(node: string, sector: string, region?: string, block?: string, plot?: string): Promise<PlotRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node, sector, region, block, plot })
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getRecordById(id: string): Promise<PlotRecord | undefined> {
    try {
      const res = await fetch(`${API_BASE}/record/${id}`);
      if (!res.ok) return undefined;
      return await res.json();
    } catch {
      return undefined;
    }
  },

  async updateRecord(id: string, updates: Record<string, any>): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/record/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ID: id, ...updates })
      });
      return res.ok;
    } catch (e) {
      console.error("Update record error:", e);
      return false;
    }
  },

  async getDashboardSummary(region?: string, node?: string, sector?: string): Promise<SummaryData[]> {
    try {
      let url = `${API_BASE}/summary`;
      const params = new URLSearchParams();
      if (region) params.append('region', region);
      if (node) params.append('node', node);
      if (sector) params.append('sector', sector);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getDepartmentSummary(region?: string, node?: string, sector?: string): Promise<SummaryData[]> {
    try {
      let url = `${API_BASE}/summary/department`;
      const params = new URLSearchParams();
      if (region) params.append('region', region);
      if (node) params.append('node', node);
      if (sector) params.append('sector', sector);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }
};
