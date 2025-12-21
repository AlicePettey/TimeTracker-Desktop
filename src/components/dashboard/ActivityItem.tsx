import React, { useState } from 'react';
import { Activity, Project, Task } from '@/types';
import { formatDuration, formatTime } from '@/utils/timeUtils';
import { getAppIcon, CheckIcon, XIcon, ChevronDownIcon, TrashIcon } from '@/components/ui/Icons';
import { getCategorizationEngine } from '@/utils/categorization';
import { useCategorySync } from '@/hooks/useCategorySync';

interface ActivityItemProps {
  activity: Activity;
  projects: Project[];
  onCode: (activityId: string, projectId: string, taskId: string) => void;
  onUncode: (activityId: string) => void;
  onDelete?: (activityId: string) => void;
  isSelected?: boolean;
  onSelect?: (activityId: string) => void;
  showCheckbox?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  projects,
  onCode,
  onUncode,
  onDelete,
  isSelected = false,
  onSelect,
  showCheckbox = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>(activity.projectId || '');
  const [selectedTask, setSelectedTask] = useState<string>(activity.taskId || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Use synced categories and rules
  const { categories: syncedCategories, rules: syncedRules } = useCategorySync();

  const AppIcon = getAppIcon(activity.applicationName);
  const project = projects.find(p => p.id === activity.projectId);
  const task = project?.tasks.find(t => t.id === activity.taskId);

  // Get category for this activity using synced categories/rules
  const engine = getCategorizationEngine(
    syncedCategories.filter(c => !c.isDefault),
    syncedRules.filter(r => !r.isDefault)
  );
  const categorization = engine.categorize(activity);
  const category = engine.getCategoryById(categorization.categoryId);

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setSelectedTask('');
  };

  const handleAssign = () => {
    if (selectedProject && selectedTask) {
      onCode(activity.id, selectedProject, selectedTask);
      setIsExpanded(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDeleteConfirm) {
      onDelete?.(activity.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const availableTasks = projects.find(p => p.id === selectedProject)?.tasks || [];

  return (
    <div className={`border-b border-gray-100 dark:border-gray-700 last:border-0 ${activity.isIdle ? 'opacity-50' : ''}`}>
      <div 
        className={`flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {showCheckbox && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect?.(activity.id);
            }}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        )}
        
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <AppIcon size={20} className="text-gray-600 dark:text-gray-300" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white truncate">
              {activity.applicationName}
            </span>
            {activity.isIdle && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                Idle
              </span>
            )}
            {/* Category Badge */}
            {category && !activity.isIdle && (
              <span 
                className="px-2 py-0.5 text-xs rounded font-medium"
                style={{ 
                  backgroundColor: `${category.color}20`, 
                  color: category.color,
                  border: `1px solid ${category.color}40`
                }}
              >
                {category.name}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {activity.windowTitle}
          </p>
        </div>
        
        <div className="text-right">
          <p className="font-medium text-gray-900 dark:text-white">
            {formatDuration(activity.duration)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
          </p>
        </div>
        
        {activity.isCoded && project ? (
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
            style={{ backgroundColor: `${project.color}20`, color: project.color }}
          >
            <span className="font-medium">{project.name}</span>
            {task && <span className="opacity-70">/ {task.name}</span>}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUncode(activity.id);
              }}
              className="ml-1 p-0.5 hover:bg-white/20 rounded"
              title="Remove assignment"
            >
              <XIcon size={14} />
            </button>
          </div>
        ) : (
          <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm">
            Uncoded
          </span>
        )}

        {/* Delete Button */}
        {onDelete && (
          <button
            onClick={handleDelete}
            className={`p-2 rounded-lg transition-colors ${
              showDeleteConfirm 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400'
            }`}
            title={showDeleteConfirm ? 'Click again to confirm delete' : 'Delete activity'}
          >
            <TrashIcon size={16} />
          </button>
        )}
        
        <ChevronDownIcon 
          size={20} 
          className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
        />
      </div>

      {/* Delete Confirmation Banner */}
      {showDeleteConfirm && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">
            Click the delete button again to confirm deletion. This cannot be undone.
          </p>
        </div>
      )}
      
      {isExpanded && !activity.isCoded && (
        <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-end gap-3 pt-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select project...</option>
                {projects.filter(p => !p.isArchived).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Task
              </label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                disabled={!selectedProject}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="">Select task...</option>
                {availableTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleAssign}
              disabled={!selectedProject || !selectedTask}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <CheckIcon size={16} />
              Assign
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityItem;
