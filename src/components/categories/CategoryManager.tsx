import React, { useState, useEffect } from 'react';
import { Category, CategoryRule } from '@/types/categories';
import { useCategorySync } from '@/hooks/useCategorySync';
import { useToast } from '@/hooks/use-toast';

interface CategoryManagerProps {
  onCategoriesChange?: (categories: Category[]) => void;
  onRulesChange?: (rules: CategoryRule[]) => void;
}

const CATEGORY_ICONS = [
  { id: 'code', label: 'Code' },
  { id: 'message-circle', label: 'Message' },
  { id: 'palette', label: 'Design' },
  { id: 'users', label: 'People' },
  { id: 'file-text', label: 'Document' },
  { id: 'search', label: 'Search' },
  { id: 'play-circle', label: 'Media' },
  { id: 'share-2', label: 'Social' },
  { id: 'settings', label: 'Settings' },
  { id: 'briefcase', label: 'Work' },
  { id: 'book', label: 'Learning' },
  { id: 'shopping-cart', label: 'Shopping' },
  { id: 'heart', label: 'Health' },
  { id: 'dollar-sign', label: 'Finance' },
];

const COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
  '#06B6D4', '#EF4444', '#F97316', '#6B7280', '#84CC16',
  '#14B8A6', '#A855F7', '#F43F5E', '#0EA5E9', '#22C55E'
];

const CategoryIcon: React.FC<{ iconId: string; className?: string; style?: React.CSSProperties }> = ({ iconId, className = '', style }) => {
  const icons: Record<string, React.ReactNode> = {
    'code': <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
    'message-circle': <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></>,
    'palette': <><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" /></>,
    'users': <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></>,
    'search': <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    'play-circle': <><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></>,
    'share-2': <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>,
    'settings': <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    'help-circle': <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
    'briefcase': <><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
    'book': <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
    'shopping-cart': <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></>,
    'heart': <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
    'dollar-sign': <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  };

  return (
    <svg 
      className={className} 
      style={style}
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {icons[iconId] || icons['help-circle']}
    </svg>
  );
};

// Sync status indicator component
const SyncStatus: React.FC<{ 
  isAuthenticated: boolean; 
  isSyncing: boolean; 
  lastSyncedAt: string | null;
  error: string | null;
  onSync: () => void;
}> = ({ isAuthenticated, isSyncing, lastSyncedAt, error, onSync }) => {
  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>Sign in to sync across devices</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span>Sync error</span>
        <button onClick={onSync} className="underline hover:no-underline">Retry</button>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span>Syncing...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <span>Synced</span>
      {lastSyncedAt && (
        <span className="text-xs opacity-70">
          {new Date(lastSyncedAt).toLocaleTimeString()}
        </span>
      )}
      <button 
        onClick={onSync} 
        className="ml-1 p-1 hover:bg-green-100 dark:hover:bg-green-800/30 rounded transition-colors"
        title="Force sync"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </button>
    </div>
  );
};

const CategoryManager: React.FC<CategoryManagerProps> = ({ onCategoriesChange, onRulesChange }) => {
  const { toast } = useToast();
  const {
    categories,
    rules,
    isLoading,
    isSyncing,
    error,
    lastSyncedAt,
    isAuthenticated,
    saveCategory,
    deleteCategory,
    saveRule,
    deleteRule,
    toggleRule,
    forceSync,
    clearError
  } = useCategorySync();

  const [activeTab, setActiveTab] = useState<'categories' | 'rules'>('categories');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingRule, setEditingRule] = useState<CategoryRule | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New category form state
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: '',
    color: COLORS[0],
    icon: 'code',
    isProductivity: true,
    productivityScore: 80
  });

  // New rule form state
  const [newRule, setNewRule] = useState<Partial<CategoryRule>>({
    categoryId: '',
    type: 'app',
    matchType: 'contains',
    appPattern: '',
    titlePattern: '',
    priority: 50,
    isEnabled: true
  });

  // Notify parent components when categories/rules change
  useEffect(() => {
    onCategoriesChange?.(categories);
  }, [categories, onCategoriesChange]);

  useEffect(() => {
    onRulesChange?.(rules);
  }, [rules, onRulesChange]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast({
        title: 'Sync Error',
        description: error,
        variant: 'destructive'
      });
      clearError();
    }
  }, [error, toast, clearError]);

  const handleSaveCategory = async () => {
    if (!newCategory.name) return;

    const category: Category = {
      id: editingCategory?.id || `custom-${Date.now()}`,
      name: newCategory.name || '',
      color: newCategory.color || COLORS[0],
      icon: newCategory.icon || 'code',
      isProductivity: newCategory.isProductivity ?? true,
      productivityScore: newCategory.productivityScore ?? 80,
      isDefault: false,
      order: editingCategory?.order || categories.length + 1
    };

    const result = await saveCategory(category);
    
    if (result.success) {
      toast({
        title: editingCategory ? 'Category Updated' : 'Category Created',
        description: `"${category.name}" has been ${editingCategory ? 'updated' : 'created'} successfully.`
      });
      
      setIsAddingCategory(false);
      setEditingCategory(null);
      setNewCategory({
        name: '',
        color: COLORS[0],
        icon: 'code',
        isProductivity: true,
        productivityScore: 80
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to save category',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const result = await deleteCategory(categoryId);
    
    if (result.success) {
      toast({
        title: 'Category Deleted',
        description: `"${category.name}" has been deleted.`
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete category',
        variant: 'destructive'
      });
    }
  };

  const handleSaveRule = async () => {
    if (!newRule.categoryId || (!newRule.appPattern && !newRule.titlePattern)) return;

    const rule: CategoryRule = {
      id: editingRule?.id || `rule-${Date.now()}`,
      categoryId: newRule.categoryId || '',
      type: newRule.type || 'app',
      matchType: newRule.matchType || 'contains',
      appPattern: newRule.appPattern,
      titlePattern: newRule.titlePattern,
      priority: newRule.priority ?? 50,
      isEnabled: newRule.isEnabled ?? true,
      isDefault: false,
      createdAt: editingRule?.createdAt || new Date().toISOString()
    };

    const result = await saveRule(rule);
    
    if (result.success) {
      toast({
        title: editingRule ? 'Rule Updated' : 'Rule Created',
        description: `Rule has been ${editingRule ? 'updated' : 'created'} successfully.`
      });
      
      setIsAddingRule(false);
      setEditingRule(null);
      setNewRule({
        categoryId: '',
        type: 'app',
        matchType: 'contains',
        appPattern: '',
        titlePattern: '',
        priority: 50,
        isEnabled: true
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to save rule',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const result = await deleteRule(ruleId);
    
    if (result.success) {
      toast({
        title: 'Rule Deleted',
        description: 'Rule has been deleted.'
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete rule',
        variant: 'destructive'
      });
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    await toggleRule(ruleId);
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRules = rules.filter(r => {
    const category = categories.find(c => c.id === r.categoryId);
    return (
      (r.appPattern?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (r.titlePattern?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (category?.name.toLowerCase().includes(searchQuery.toLowerCase()) || false)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-8 h-8 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Activity Categories</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage categories and rules for automatic activity classification
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SyncStatus 
              isAuthenticated={isAuthenticated}
              isSyncing={isSyncing}
              lastSyncedAt={lastSyncedAt}
              error={error}
              onSync={forceSync}
            />
            <div className="relative">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Rules ({rules.length})
          </button>
        </div>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {/* Add Category Button */}
          {!isAddingCategory && !editingCategory && (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Custom Category
            </button>
          )}

          {/* Category Form */}
          {(isAddingCategory || editingCategory) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="e.g., Project Management"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Icon
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_ICONS.map(icon => (
                      <button
                        key={icon.id}
                        onClick={() => setNewCategory({ ...newCategory, icon: icon.id })}
                        className={`p-2 rounded-lg border transition-colors ${
                          newCategory.icon === icon.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                        title={icon.label}
                      >
                        <CategoryIcon iconId={icon.id} className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewCategory({ ...newCategory, color })}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          newCategory.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Productivity Score ({newCategory.productivityScore}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newCategory.productivityScore}
                    onChange={(e) => setNewCategory({ ...newCategory, productivityScore: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Distracting</span>
                    <span>Productive</span>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCategory.isProductivity}
                      onChange={(e) => setNewCategory({ ...newCategory, isProductivity: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Count as productive time
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsAddingCategory(false);
                    setEditingCategory(null);
                    setNewCategory({
                      name: '',
                      color: COLORS[0],
                      icon: 'code',
                      isProductivity: true,
                      productivityScore: 80
                    });
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={!newCategory.name || isSyncing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSyncing && (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map(category => (
              <div
                key={category.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <CategoryIcon 
                        iconId={category.icon} 
                        className="w-5 h-5"
                        style={{ color: category.color }}
                      />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{category.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          category.isProductivity 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {category.isProductivity ? 'Productive' : 'Distracting'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {category.productivityScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                  {!category.isDefault && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setNewCategory(category);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {rules.filter(r => r.categoryId === category.id).length} rules
                    {category.isDefault && (
                      <span className="ml-2 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                        Default
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Add Rule Button */}
          {!isAddingRule && !editingRule && (
            <button
              onClick={() => setIsAddingRule(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Custom Rule
            </button>
          )}

          {/* Rule Form */}
          {(isAddingRule || editingRule) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingRule ? 'Edit Rule' : 'New Rule'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newRule.categoryId}
                    onChange={(e) => setNewRule({ ...newRule, categoryId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Match Type
                  </label>
                  <select
                    value={newRule.type}
                    onChange={(e) => setNewRule({ ...newRule, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="app">Application Name</option>
                    <option value="title">Window Title</option>
                    <option value="combined">Both (App + Title)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pattern Type
                  </label>
                  <select
                    value={newRule.matchType}
                    onChange={(e) => setNewRule({ ...newRule, matchType: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="contains">Contains</option>
                    <option value="exact">Exact Match</option>
                    <option value="startsWith">Starts With</option>
                    <option value="endsWith">Ends With</option>
                    <option value="regex">Regular Expression</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority (1-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newRule.priority}
                    onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 50 })}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {(newRule.type === 'app' || newRule.type === 'combined') && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Application Pattern
                    </label>
                    <input
                      type="text"
                      value={newRule.appPattern || ''}
                      onChange={(e) => setNewRule({ ...newRule, appPattern: e.target.value })}
                      placeholder="e.g., Visual Studio Code"
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {(newRule.type === 'title' || newRule.type === 'combined') && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title Pattern
                    </label>
                    <input
                      type="text"
                      value={newRule.titlePattern || ''}
                      onChange={(e) => setNewRule({ ...newRule, titlePattern: e.target.value })}
                      placeholder="e.g., GitHub"
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsAddingRule(false);
                    setEditingRule(null);
                    setNewRule({
                      categoryId: '',
                      type: 'app',
                      matchType: 'contains',
                      appPattern: '',
                      titlePattern: '',
                      priority: 50,
                      isEnabled: true
                    });
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRule}
                  disabled={!newRule.categoryId || (!newRule.appPattern && !newRule.titlePattern) || isSyncing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSyncing && (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                  {editingRule ? 'Save Changes' : 'Create Rule'}
                </button>
              </div>
            </div>
          )}

          {/* Rules List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Enabled
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Pattern
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredRules.slice(0, 50).map(rule => {
                    const category = categories.find(c => c.id === rule.categoryId);
                    return (
                      <tr key={rule.id} className={`${!rule.isEnabled ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleRule(rule.id)}
                            className={`w-10 h-6 rounded-full transition-colors relative ${
                              rule.isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              rule.isEnabled ? 'left-5' : 'left-1'
                            }`} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category?.color || '#9CA3AF' }}
                            />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {category?.name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            {rule.type} / {rule.matchType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                            {rule.appPattern && <span className="font-mono">App: {rule.appPattern}</span>}
                            {rule.appPattern && rule.titlePattern && <span className="mx-1">|</span>}
                            {rule.titlePattern && <span className="font-mono">Title: {rule.titlePattern}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{rule.priority}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!rule.isDefault ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingRule(rule);
                                  setNewRule(rule);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                              Default
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredRules.length > 50 && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 text-center text-sm text-gray-500">
                Showing 50 of {filteredRules.length} rules
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
