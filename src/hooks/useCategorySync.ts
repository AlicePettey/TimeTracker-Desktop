// Hook for syncing categories and rules with Supabase
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { Category, CategoryRule, CategorySettings, DEFAULT_CATEGORIES, DEFAULT_RULES } from '@/types/categories';

interface SyncState {
  categories: Category[];
  rules: CategoryRule[];
  settings: CategorySettings;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastSyncedAt: string | null;
}

const DEFAULT_SETTINGS: CategorySettings = {
  autoCategorizationEnabled: true,
  showProductivityNotifications: true,
  productivityGoal: 70,
  focusTimeGoal: 21600, // 6 hours
  breakReminders: true,
  breakInterval: 60
};

const LOCAL_STORAGE_KEYS = {
  categories: 'timetracker_custom_categories',
  rules: 'timetracker_custom_rules',
  settings: 'timetracker_category_settings'
};

export const useCategorySync = () => {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<SyncState>({
    categories: [...DEFAULT_CATEGORIES],
    rules: [...DEFAULT_RULES],
    settings: DEFAULT_SETTINGS,
    isLoading: true,
    isSyncing: false,
    error: null,
    lastSyncedAt: null
  });

  // Load from local storage (for non-authenticated users or initial load)
  const loadFromLocalStorage = useCallback(() => {
    try {
      const storedCategories = localStorage.getItem(LOCAL_STORAGE_KEYS.categories);
      const storedRules = localStorage.getItem(LOCAL_STORAGE_KEYS.rules);
      const storedSettings = localStorage.getItem(LOCAL_STORAGE_KEYS.settings);

      const customCategories: Category[] = storedCategories ? JSON.parse(storedCategories) : [];
      const customRules: CategoryRule[] = storedRules ? JSON.parse(storedRules) : [];
      const settings: CategorySettings = storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS;

      // Merge with defaults
      const mergedCategories = mergeCategories(DEFAULT_CATEGORIES, customCategories);
      const mergedRules = mergeRules(DEFAULT_RULES, customRules);

      setState(prev => ({
        ...prev,
        categories: mergedCategories,
        rules: mergedRules,
        settings,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error loading from local storage:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load local data'
      }));
    }
  }, []);

  // Save to local storage
  const saveToLocalStorage = useCallback((categories: Category[], rules: CategoryRule[], settings: CategorySettings) => {
    try {
      const customCategories = categories.filter(c => !c.isDefault);
      const customRules = rules.filter(r => !r.isDefault);

      localStorage.setItem(LOCAL_STORAGE_KEYS.categories, JSON.stringify(customCategories));
      localStorage.setItem(LOCAL_STORAGE_KEYS.rules, JSON.stringify(customRules));
      localStorage.setItem(LOCAL_STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }, []);

  // Load from Supabase
  const loadFromDatabase = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch categories
      const { data: dbCategories, error: catError } = await supabase
        .from('user_categories')
        .select('*')
        .eq('user_id', user.id);

      if (catError) throw catError;

      // Fetch rules
      const { data: dbRules, error: rulesError } = await supabase
        .from('user_rules')
        .select('*')
        .eq('user_id', user.id);

      if (rulesError) throw rulesError;

      // Fetch settings
      const { data: dbSettings, error: settingsError } = await supabase
        .from('user_category_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Convert database format to app format
      const customCategories: Category[] = (dbCategories || []).map(dbCat => ({
        id: dbCat.category_id,
        name: dbCat.name,
        color: dbCat.color,
        icon: dbCat.icon,
        isProductivity: dbCat.is_productivity,
        productivityScore: dbCat.productivity_score,
        isDefault: false,
        order: dbCat.sort_order
      }));

      const customRules: CategoryRule[] = (dbRules || []).map(dbRule => ({
        id: dbRule.rule_id,
        categoryId: dbRule.category_id,
        type: dbRule.rule_type as CategoryRule['type'],
        matchType: dbRule.match_type as CategoryRule['matchType'],
        appPattern: dbRule.app_pattern || undefined,
        titlePattern: dbRule.title_pattern || undefined,
        urlPattern: dbRule.url_pattern || undefined,
        priority: dbRule.priority,
        isEnabled: dbRule.is_enabled,
        isDefault: false,
        createdAt: dbRule.created_at
      }));

      const settings: CategorySettings = dbSettings ? {
        autoCategorizationEnabled: dbSettings.auto_categorization_enabled,
        showProductivityNotifications: dbSettings.show_productivity_notifications,
        productivityGoal: dbSettings.productivity_goal,
        focusTimeGoal: dbSettings.focus_time_goal,
        breakReminders: dbSettings.break_reminders,
        breakInterval: dbSettings.break_interval
      } : DEFAULT_SETTINGS;

      // Merge with defaults
      const mergedCategories = mergeCategories(DEFAULT_CATEGORIES, customCategories);
      const mergedRules = mergeRules(DEFAULT_RULES, customRules);

      // Also save to local storage for offline access
      saveToLocalStorage(mergedCategories, mergedRules, settings);

      setState(prev => ({
        ...prev,
        categories: mergedCategories,
        rules: mergedRules,
        settings,
        isLoading: false,
        lastSyncedAt: new Date().toISOString()
      }));
    } catch (error: any) {
      console.error('Error loading from database:', error);
      // Fall back to local storage
      loadFromLocalStorage();
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to sync with server'
      }));
    }
  }, [user, loadFromLocalStorage, saveToLocalStorage]);

  // Save category to database
  const saveCategory = useCallback(async (category: Category): Promise<{ success: boolean; error?: string }> => {
    // Update local state immediately
    setState(prev => {
      const existingIndex = prev.categories.findIndex(c => c.id === category.id);
      const newCategories = existingIndex >= 0
        ? prev.categories.map(c => c.id === category.id ? category : c)
        : [...prev.categories, category];
      
      saveToLocalStorage(newCategories, prev.rules, prev.settings);
      return { ...prev, categories: newCategories };
    });

    // If authenticated, sync to database
    if (isAuthenticated && user) {
      setState(prev => ({ ...prev, isSyncing: true }));

      try {
        const { error } = await supabase
          .from('user_categories')
          .upsert({
            user_id: user.id,
            category_id: category.id,
            name: category.name,
            color: category.color,
            icon: category.icon,
            is_productivity: category.isProductivity,
            productivity_score: category.productivityScore,
            sort_order: category.order,
            is_active: true
          }, {
            onConflict: 'user_id,category_id'
          });

        if (error) throw error;

        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: new Date().toISOString()
        }));

        return { success: true };
      } catch (error: any) {
        console.error('Error saving category:', error);
        setState(prev => ({
          ...prev,
          isSyncing: false,
          error: error.message
        }));
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  }, [isAuthenticated, user, saveToLocalStorage]);

  // Delete category from database
  const deleteCategory = useCallback(async (categoryId: string): Promise<{ success: boolean; error?: string }> => {
    const category = state.categories.find(c => c.id === categoryId);
    if (!category || category.isDefault) {
      return { success: false, error: 'Cannot delete default category' };
    }

    // Update local state immediately
    setState(prev => {
      const newCategories = prev.categories.filter(c => c.id !== categoryId);
      const newRules = prev.rules.map(r => 
        r.categoryId === categoryId ? { ...r, categoryId: 'uncategorized' } : r
      );
      saveToLocalStorage(newCategories, newRules, prev.settings);
      return { ...prev, categories: newCategories, rules: newRules };
    });

    // If authenticated, sync to database
    if (isAuthenticated && user) {
      setState(prev => ({ ...prev, isSyncing: true }));

      try {
        const { error } = await supabase
          .from('user_categories')
          .delete()
          .eq('user_id', user.id)
          .eq('category_id', categoryId);

        if (error) throw error;

        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: new Date().toISOString()
        }));

        return { success: true };
      } catch (error: any) {
        console.error('Error deleting category:', error);
        setState(prev => ({
          ...prev,
          isSyncing: false,
          error: error.message
        }));
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  }, [state.categories, isAuthenticated, user, saveToLocalStorage]);

  // Save rule to database
  const saveRule = useCallback(async (rule: CategoryRule): Promise<{ success: boolean; error?: string }> => {
    // Update local state immediately
    setState(prev => {
      const existingIndex = prev.rules.findIndex(r => r.id === rule.id);
      const newRules = existingIndex >= 0
        ? prev.rules.map(r => r.id === rule.id ? rule : r)
        : [...prev.rules, rule];
      
      // Sort by priority
      newRules.sort((a, b) => b.priority - a.priority);
      
      saveToLocalStorage(prev.categories, newRules, prev.settings);
      return { ...prev, rules: newRules };
    });

    // If authenticated, sync to database
    if (isAuthenticated && user) {
      setState(prev => ({ ...prev, isSyncing: true }));

      try {
        const { error } = await supabase
          .from('user_rules')
          .upsert({
            user_id: user.id,
            rule_id: rule.id,
            category_id: rule.categoryId,
            rule_type: rule.type,
            match_type: rule.matchType,
            app_pattern: rule.appPattern || null,
            title_pattern: rule.titlePattern || null,
            url_pattern: rule.urlPattern || null,
            priority: rule.priority,
            is_enabled: rule.isEnabled
          }, {
            onConflict: 'user_id,rule_id'
          });

        if (error) throw error;

        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: new Date().toISOString()
        }));

        return { success: true };
      } catch (error: any) {
        console.error('Error saving rule:', error);
        setState(prev => ({
          ...prev,
          isSyncing: false,
          error: error.message
        }));
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  }, [isAuthenticated, user, saveToLocalStorage]);

  // Delete rule from database
  const deleteRule = useCallback(async (ruleId: string): Promise<{ success: boolean; error?: string }> => {
    const rule = state.rules.find(r => r.id === ruleId);
    if (!rule || rule.isDefault) {
      return { success: false, error: 'Cannot delete default rule' };
    }

    // Update local state immediately
    setState(prev => {
      const newRules = prev.rules.filter(r => r.id !== ruleId);
      saveToLocalStorage(prev.categories, newRules, prev.settings);
      return { ...prev, rules: newRules };
    });

    // If authenticated, sync to database
    if (isAuthenticated && user) {
      setState(prev => ({ ...prev, isSyncing: true }));

      try {
        const { error } = await supabase
          .from('user_rules')
          .delete()
          .eq('user_id', user.id)
          .eq('rule_id', ruleId);

        if (error) throw error;

        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: new Date().toISOString()
        }));

        return { success: true };
      } catch (error: any) {
        console.error('Error deleting rule:', error);
        setState(prev => ({
          ...prev,
          isSyncing: false,
          error: error.message
        }));
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  }, [state.rules, isAuthenticated, user, saveToLocalStorage]);

  // Toggle rule enabled state
  const toggleRule = useCallback(async (ruleId: string): Promise<{ success: boolean; error?: string }> => {
    const rule = state.rules.find(r => r.id === ruleId);
    if (!rule) {
      return { success: false, error: 'Rule not found' };
    }

    const updatedRule = { ...rule, isEnabled: !rule.isEnabled };
    return saveRule(updatedRule);
  }, [state.rules, saveRule]);

  // Save settings
  const saveSettings = useCallback(async (settings: CategorySettings): Promise<{ success: boolean; error?: string }> => {
    // Update local state immediately
    setState(prev => {
      saveToLocalStorage(prev.categories, prev.rules, settings);
      return { ...prev, settings };
    });

    // If authenticated, sync to database
    if (isAuthenticated && user) {
      setState(prev => ({ ...prev, isSyncing: true }));

      try {
        const { error } = await supabase
          .from('user_category_settings')
          .upsert({
            user_id: user.id,
            auto_categorization_enabled: settings.autoCategorizationEnabled,
            show_productivity_notifications: settings.showProductivityNotifications,
            productivity_goal: settings.productivityGoal,
            focus_time_goal: settings.focusTimeGoal,
            break_reminders: settings.breakReminders,
            break_interval: settings.breakInterval
          }, {
            onConflict: 'user_id'
          });

        if (error) throw error;

        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: new Date().toISOString()
        }));

        return { success: true };
      } catch (error: any) {
        console.error('Error saving settings:', error);
        setState(prev => ({
          ...prev,
          isSyncing: false,
          error: error.message
        }));
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  }, [isAuthenticated, user, saveToLocalStorage]);

  // Force sync with database
  const forceSync = useCallback(async () => {
    if (isAuthenticated) {
      await loadFromDatabase();
    }
  }, [isAuthenticated, loadFromDatabase]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadFromDatabase();
    } else {
      loadFromLocalStorage();
    }
  }, [isAuthenticated, loadFromDatabase, loadFromLocalStorage]);

  return {
    categories: state.categories,
    rules: state.rules,
    settings: state.settings,
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
    error: state.error,
    lastSyncedAt: state.lastSyncedAt,
    isAuthenticated,
    saveCategory,
    deleteCategory,
    saveRule,
    deleteRule,
    toggleRule,
    saveSettings,
    forceSync,
    clearError
  };
};

// Helper function to merge default and custom categories
function mergeCategories(defaults: Category[], custom: Category[]): Category[] {
  const merged = [...defaults];
  
  custom.forEach(customCat => {
    const existingIndex = merged.findIndex(c => c.id === customCat.id);
    if (existingIndex >= 0) {
      // Override default with custom settings but keep isDefault flag
      merged[existingIndex] = { ...customCat, isDefault: merged[existingIndex].isDefault };
    } else {
      merged.push(customCat);
    }
  });

  return merged.sort((a, b) => a.order - b.order);
}

// Helper function to merge default and custom rules
function mergeRules(defaults: CategoryRule[], custom: CategoryRule[]): CategoryRule[] {
  const merged = [...defaults];
  
  custom.forEach(customRule => {
    const existingIndex = merged.findIndex(r => r.id === customRule.id);
    if (existingIndex >= 0) {
      // Override default with custom settings but keep isDefault flag
      merged[existingIndex] = { ...customRule, isDefault: merged[existingIndex].isDefault };
    } else {
      merged.push(customRule);
    }
  });

  return merged.sort((a, b) => b.priority - a.priority);
}
