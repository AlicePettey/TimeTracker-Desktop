import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Project } from '@/types';
import { formatDuration, formatTime, generateId } from '@/utils/timeUtils';
import { XIcon, SaveIcon, SplitIcon, PlusIcon, TrashIcon, ClockIcon } from '@/components/ui/Icons';

interface SplitEntry {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  description: string;
  projectId: string;
  taskId: string;
}

interface EditActivityModalProps {
  activity: Activity;
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (activityId: string, updates: Partial<Activity>) => void;
  onSplit: (originalActivityId: string, newActivities: Omit<Activity, 'id'>[]) => void;
}

const EditActivityModal: React.FC<EditActivityModalProps> = ({
  activity,
  projects,
  isOpen,
  onClose,
  onSave,
  onSplit
}) => {
  const [mode, setMode] = useState<'edit' | 'split'>('edit');
  const [description, setDescription] = useState(activity.windowTitle);
  const [applicationName, setApplicationName] = useState(activity.applicationName);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [projectId, setProjectId] = useState(activity.projectId || '');
  const [taskId, setTaskId] = useState(activity.taskId || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Split mode state
  const [splitEntries, setSplitEntries] = useState<SplitEntry[]>([]);

  // Initialize form values when activity changes
  useEffect(() => {
    if (activity && isOpen) {
      setDescription(activity.windowTitle);
      setApplicationName(activity.applicationName);
      setProjectId(activity.projectId || '');
      setTaskId(activity.taskId || '');
      
      const start = new Date(activity.startTime);
      const end = new Date(activity.endTime);
      
      setStartDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().slice(0, 5));
      setEndTime(end.toTimeString().slice(0, 5));
      
      // Initialize split entries with the full activity
      setSplitEntries([{
        id: generateId(),
        startTime: start,
        endTime: end,
        duration: activity.duration,
        description: activity.windowTitle,
        projectId: activity.projectId || '',
        taskId: activity.taskId || ''
      }]);
      
      setMode('edit');
      setErrors({});
    }
  }, [activity, isOpen]);

  // Calculate duration from times
  const calculatedDuration = useMemo(() => {
    if (!startTime || !endTime || !startDate) return 0;
    
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${startDate}T${endTime}`);
    
    // Handle overnight activities
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }, [startTime, endTime, startDate]);

  // Get available tasks for selected project
  const availableTasks = useMemo(() => {
    return projects.find(p => p.id === projectId)?.tasks || [];
  }, [projects, projectId]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!applicationName.trim()) {
      newErrors.applicationName = 'Application name is required';
    }
    
    if (calculatedDuration <= 0) {
      newErrors.time = 'End time must be after start time';
    }
    
    if (calculatedDuration > 24 * 60 * 60) {
      newErrors.time = 'Duration cannot exceed 24 hours';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate split entries
  const validateSplit = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (splitEntries.length < 2) {
      newErrors.split = 'Add at least 2 entries to split';
    }
    
    // Check for overlapping times
    const sorted = [...splitEntries].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].endTime > sorted[i + 1].startTime) {
        newErrors.split = 'Split entries cannot overlap';
        break;
      }
    }
    
    // Check each entry has valid duration
    for (const entry of splitEntries) {
      if (entry.duration <= 0) {
        newErrors.split = 'All entries must have positive duration';
        break;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    
    const start = new Date(`${startDate}T${startTime}`);
    let end = new Date(`${startDate}T${endTime}`);
    
    // Handle overnight
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const updates: Partial<Activity> = {
      windowTitle: description,
      applicationName,
      startTime: start,
      endTime: end,
      duration: calculatedDuration,
      projectId: projectId || undefined,
      taskId: taskId || undefined,
      isCoded: !!(projectId && taskId)
    };
    
    onSave(activity.id, updates);
    onClose();
  };

  const handleSplit = () => {
    if (!validateSplit()) return;
    
    const newActivities: Omit<Activity, 'id'>[] = splitEntries.map(entry => ({
      applicationName: activity.applicationName,
      windowTitle: entry.description,
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration,
      projectId: entry.projectId || undefined,
      taskId: entry.taskId || undefined,
      isCoded: !!(entry.projectId && entry.taskId),
      isIdle: false
    }));
    
    onSplit(activity.id, newActivities);
    onClose();
  };

  const addSplitEntry = () => {
    const lastEntry = splitEntries[splitEntries.length - 1];
    const newStart = lastEntry ? new Date(lastEntry.endTime) : new Date(activity.startTime);
    const newEnd = new Date(activity.endTime);
    
    // If last entry ends at activity end, split the last entry in half
    if (lastEntry && lastEntry.endTime.getTime() === new Date(activity.endTime).getTime()) {
      const midpoint = new Date(lastEntry.startTime.getTime() + (lastEntry.duration * 500));
      
      setSplitEntries(prev => [
        ...prev.slice(0, -1),
        {
          ...lastEntry,
          endTime: midpoint,
          duration: Math.floor((midpoint.getTime() - lastEntry.startTime.getTime()) / 1000)
        },
        {
          id: generateId(),
          startTime: midpoint,
          endTime: newEnd,
          duration: Math.floor((newEnd.getTime() - midpoint.getTime()) / 1000),
          description: activity.windowTitle,
          projectId: '',
          taskId: ''
        }
      ]);
    } else {
      setSplitEntries(prev => [
        ...prev,
        {
          id: generateId(),
          startTime: newStart,
          endTime: newEnd,
          duration: Math.floor((newEnd.getTime() - newStart.getTime()) / 1000),
          description: activity.windowTitle,
          projectId: '',
          taskId: ''
        }
      ]);
    }
  };

  const removeSplitEntry = (id: string) => {
    if (splitEntries.length <= 1) return;
    setSplitEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateSplitEntry = (id: string, updates: Partial<SplitEntry>) => {
    setSplitEntries(prev => prev.map(entry => {
      if (entry.id !== id) return entry;
      
      const updated = { ...entry, ...updates };
      
      // Recalculate duration if times changed
      if (updates.startTime || updates.endTime) {
        updated.duration = Math.floor((updated.endTime.getTime() - updated.startTime.getTime()) / 1000);
      }
      
      return updated;
    }));
  };

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId);
    setTaskId('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Activity
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Modify time, description, or split into multiple entries
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XIcon size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setMode('edit')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              mode === 'edit'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Edit Details
          </button>
          <button
            onClick={() => setMode('split')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === 'split'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <SplitIcon size={16} />
            Split Activity
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
          {mode === 'edit' ? (
            <div className="space-y-5">
              {/* Application Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Application
                </label>
                <input
                  type="text"
                  value={applicationName}
                  onChange={(e) => setApplicationName(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.applicationName ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                  }`}
                  placeholder="e.g., Chrome, VS Code"
                />
                {errors.applicationName && (
                  <p className="mt-1 text-sm text-red-500">{errors.applicationName}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description / Window Title
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    errors.description ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                  }`}
                  placeholder="What were you working on?"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                )}
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {errors.time && (
                <p className="text-sm text-red-500">{errors.time}</p>
              )}

              {/* Duration Display */}
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <ClockIcon size={20} className="text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Duration: <span className="font-semibold">{formatDuration(calculatedDuration)}</span>
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {formatTime(new Date(`${startDate}T${startTime}`))} - {formatTime(new Date(`${startDate}T${endTime}`))}
                  </p>
                </div>
              </div>

              {/* Project & Task Assignment */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">No project</option>
                    {projects.filter(p => !p.isArchived).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Task
                  </label>
                  <select
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    disabled={!projectId}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="">Select task...</option>
                    {availableTasks.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Split Entries</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Divide this activity into multiple time entries
                  </p>
                </div>
                <button
                  onClick={addSplitEntry}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <PlusIcon size={16} />
                  Add Entry
                </button>
              </div>

              {errors.split && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.split}</p>
                </div>
              )}

              {/* Original Activity Reference */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original Activity</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatTime(new Date(activity.startTime))} - {formatTime(new Date(activity.endTime))} ({formatDuration(activity.duration)})
                </p>
              </div>

              {/* Split Entries */}
              <div className="space-y-3">
                {splitEntries.map((entry, index) => {
                  const entryTasks = projects.find(p => p.id === entry.projectId)?.tasks || [];
                  
                  return (
                    <div 
                      key={entry.id}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Entry {index + 1}
                        </span>
                        {splitEntries.length > 1 && (
                          <button
                            onClick={() => removeSplitEntry(entry.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <TrashIcon size={16} />
                          </button>
                        )}
                      </div>

                      {/* Time Range */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start</label>
                          <input
                            type="time"
                            value={entry.startTime.toTimeString().slice(0, 5)}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':');
                              const newStart = new Date(entry.startTime);
                              newStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                              updateSplitEntry(entry.id, { startTime: newStart });
                            }}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End</label>
                          <input
                            type="time"
                            value={entry.endTime.toTimeString().slice(0, 5)}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':');
                              const newEnd = new Date(entry.endTime);
                              newEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                              updateSplitEntry(entry.id, { endTime: newEnd });
                            }}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      {/* Duration Badge */}
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded">
                          {formatDuration(entry.duration)}
                        </span>
                      </div>

                      {/* Description */}
                      <input
                        type="text"
                        value={entry.description}
                        onChange={(e) => updateSplitEntry(entry.id, { description: e.target.value })}
                        placeholder="Description"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                      />

                      {/* Project & Task */}
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={entry.projectId}
                          onChange={(e) => updateSplitEntry(entry.id, { projectId: e.target.value, taskId: '' })}
                          className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                        >
                          <option value="">No project</option>
                          {projects.filter(p => !p.isArchived).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <select
                          value={entry.taskId}
                          onChange={(e) => updateSplitEntry(entry.id, { taskId: e.target.value })}
                          disabled={!entry.projectId}
                          className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50"
                        >
                          <option value="">Select task...</option>
                          {entryTasks.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Duration Check */}
              {splitEntries.length > 1 && (
                <div className={`p-3 rounded-lg ${
                  splitEntries.reduce((sum, e) => sum + e.duration, 0) === activity.duration
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                }`}>
                  <p className={`text-sm ${
                    splitEntries.reduce((sum, e) => sum + e.duration, 0) === activity.duration
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    Total split duration: <span className="font-semibold">{formatDuration(splitEntries.reduce((sum, e) => sum + e.duration, 0))}</span>
                    {' '}(Original: {formatDuration(activity.duration)})
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          {mode === 'edit' ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <SaveIcon size={18} />
              Save Changes
            </button>
          ) : (
            <button
              onClick={handleSplit}
              disabled={splitEntries.length < 2}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <SplitIcon size={18} />
              Split Activity
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditActivityModal;
