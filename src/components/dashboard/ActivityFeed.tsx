import React, { useState, useMemo } from 'react';
import { Activity, Project } from '@/types';
import { formatDate, isWithinDays } from '@/utils/timeUtils';
import ActivityItem from './ActivityItem';
import { SearchIcon, FilterIcon, CheckIcon, TrashIcon } from '@/components/ui/Icons';

interface ActivityFeedProps {
  activities: Activity[];
  projects: Project[];
  onCode: (activityId: string, projectId: string, taskId: string) => void;
  onUncode: (activityId: string) => void;
  onDelete?: (activityId: string) => void;
  onBulkCode: (activityIds: string[], projectId: string, taskId: string) => void;
  onBulkDelete?: (activityIds: string[]) => void;
  title?: string;
  showUncodedOnly?: boolean;
  maxDays?: number;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  projects,
  onCode,
  onUncode,
  onDelete,
  onBulkCode,
  onBulkDelete,
  title = 'Activity Feed',
  showUncodedOnly = false,
  maxDays = 30
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterApp, setFilterApp] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProject, setBulkProject] = useState('');
  const [bulkTask, setBulkTask] = useState('');
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      if (!isWithinDays(a.startTime, maxDays)) return false;
      if (showUncodedOnly && a.isCoded) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!a.applicationName.toLowerCase().includes(query) && 
            !a.windowTitle.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (filterApp && a.applicationName !== filterApp) return false;
      return true;
    });
  }, [activities, searchQuery, filterApp, showUncodedOnly, maxDays]);

  // Group by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    filteredActivities.forEach(activity => {
      const dateKey = new Date(activity.startTime).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(activity);
    });
    return groups;
  }, [filteredActivities]);

  // Get unique apps for filter
  const uniqueApps = useMemo(() => {
    const apps = new Set(activities.map(a => a.applicationName));
    return Array.from(apps).sort();
  }, [activities]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredActivities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredActivities.map(a => a.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAssign = () => {
    if (bulkProject && bulkTask && selectedIds.size > 0) {
      onBulkCode(Array.from(selectedIds), bulkProject, bulkTask);
      setSelectedIds(new Set());
      setBulkProject('');
      setBulkTask('');
    }
  };

  const handleBulkDelete = () => {
    if (showBulkDeleteConfirm && selectedIds.size > 0) {
      if (onBulkDelete) {
        onBulkDelete(Array.from(selectedIds));
      } else if (onDelete) {
        // Fall back to individual deletes if no bulk delete provided
        Array.from(selectedIds).forEach(id => onDelete(id));
      }
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
    } else {
      setShowBulkDeleteConfirm(true);
      setTimeout(() => setShowBulkDeleteConfirm(false), 3000);
    }
  };

  const bulkTasks = projects.find(p => p.id === bulkProject)?.tasks || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredActivities.length} activities
          </span>
        </div>
        
        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <FilterIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterApp}
              onChange={(e) => setFilterApp(e.target.value)}
              className="pl-10 pr-8 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">All Apps</option>
              {uniqueApps.map(app => (
                <option key={app} value={app}>{app}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {showUncodedOnly && filteredActivities.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredActivities.length && filteredActivities.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Select All ({selectedIds.size} selected)
            </label>
            
            {selectedIds.size > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <select
                    value={bulkProject}
                    onChange={(e) => { setBulkProject(e.target.value); setBulkTask(''); }}
                    className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                  >
                    <option value="">Project...</option>
                    {projects.filter(p => !p.isArchived).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  
                  <select
                    value={bulkTask}
                    onChange={(e) => setBulkTask(e.target.value)}
                    disabled={!bulkProject}
                    className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50"
                  >
                    <option value="">Task...</option>
                    {bulkTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={handleBulkAssign}
                    disabled={!bulkProject || !bulkTask}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <CheckIcon size={16} />
                    Assign Selected
                  </button>
                </div>

                {/* Bulk Delete Button */}
                {(onDelete || onBulkDelete) && (
                  <button
                    onClick={handleBulkDelete}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      showBulkDeleteConfirm
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                    }`}
                  >
                    <TrashIcon size={16} />
                    {showBulkDeleteConfirm ? 'Confirm Delete' : `Delete ${selectedIds.size} Selected`}
                  </button>
                )}
              </>
            )}
          </div>
          
          {/* Bulk Delete Warning */}
          {showBulkDeleteConfirm && selectedIds.size > 0 && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                You are about to permanently delete {selectedIds.size} activities. This action cannot be undone. Click "Confirm Delete" to proceed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Activity List */}
      <div className="max-h-[600px] overflow-y-auto">
        {Object.keys(groupedActivities).length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>No activities found</p>
          </div>
        ) : (
          Object.entries(groupedActivities).map(([date, dayActivities]) => (
            <div key={date}>
              <div className="sticky top-0 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-y border-gray-100 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {formatDate(new Date(date))}
                </span>
              </div>
              {dayActivities.map(activity => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  projects={projects}
                  onCode={onCode}
                  onUncode={onUncode}
                  onDelete={onDelete}
                  isSelected={selectedIds.has(activity.id)}
                  onSelect={showUncodedOnly ? handleSelect : undefined}
                  showCheckbox={showUncodedOnly}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
