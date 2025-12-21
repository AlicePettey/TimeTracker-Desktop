import { useState, useEffect, useCallback } from 'react';
import { Project, Activity, Task, ReportPeriod, TimesheetEntry } from '@/types';
import { sampleProjects, generateSampleActivities, projectColors } from '@/utils/sampleData';
import { generateId, getDateRange, getDaysBetween, isWithinDays } from '@/utils/timeUtils';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

const STORAGE_KEY_PROJECTS = 'timetracker_projects';
const STORAGE_KEY_ACTIVITIES = 'timetracker_activities';

interface DbProject {
  id: string;
  user_id: string;
  name: string;
  color: string;
  hourly_rate: number | null;
  is_archived: boolean;
  created_at: string;
}

interface DbTask {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

interface DbActivity {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  application_name: string;
  window_title: string;
  start_time: string;
  end_time: string;
  duration: number;
  is_coded: boolean;
  is_idle: boolean;
  created_at: string;
}

export const useTimeTracker = (user: User | null = null) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isTracking, setIsTracking] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load data - from database if authenticated, otherwise localStorage
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      if (user) {
        // Load from database
        await loadFromDatabase();
      } else {
        // Load from localStorage
        loadFromLocalStorage();
      }
      
      setIsLoading(false);
    };
    
    loadData();
  }, [user]);

  const loadFromLocalStorage = () => {
    try {
      const storedProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
      const storedActivities = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
      
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      } else {
        setProjects(sampleProjects);
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(sampleProjects));
      }
      
      if (storedActivities) {
        const parsed = JSON.parse(storedActivities);
        setActivities(parsed.map((a: Activity) => ({
          ...a,
          startTime: new Date(a.startTime),
          endTime: new Date(a.endTime)
        })));
      } else {
        const sampleActivities = generateSampleActivities();
        setActivities(sampleActivities);
        localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(sampleActivities));
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      setProjects(sampleProjects);
      setActivities(generateSampleActivities());
    }
  };

  const loadFromDatabase = async () => {
    try {
      // Load projects with tasks
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*');

      if (tasksError) throw tasksError;

      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .order('start_time', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Transform database data to app format
      const transformedProjects: Project[] = (projectsData || []).map((p: DbProject) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        hourlyRate: p.hourly_rate || undefined,
        isArchived: p.is_archived,
        createdAt: new Date(p.created_at),
        tasks: (tasksData || [])
          .filter((t: DbTask) => t.project_id === p.id)
          .map((t: DbTask) => ({
            id: t.id,
            projectId: t.project_id,
            name: t.name,
            subtasks: []
          }))
      }));

      const transformedActivities: Activity[] = (activitiesData || []).map((a: DbActivity) => ({
        id: a.id,
        applicationName: a.application_name,
        windowTitle: a.window_title,
        startTime: new Date(a.start_time),
        endTime: new Date(a.end_time),
        duration: a.duration,
        projectId: a.project_id || undefined,
        taskId: a.task_id || undefined,
        isCoded: a.is_coded,
        isIdle: a.is_idle
      }));

      setProjects(transformedProjects);
      setActivities(transformedActivities);

      // If no data exists, check if there's localStorage data to migrate
      if (transformedProjects.length === 0 && transformedActivities.length === 0) {
        const localProjects = localStorage.getItem(STORAGE_KEY_PROJECTS);
        const localActivities = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
        
        if (localProjects || localActivities) {
          // Offer to migrate data
          await migrateLocalDataToDatabase();
        }
      }
    } catch (error) {
      console.error('Error loading from database:', error);
      // Fall back to localStorage
      loadFromLocalStorage();
    }
  };

  // Migrate localStorage data to database
  const migrateLocalDataToDatabase = async () => {
    if (!user) return;
    
    setIsSyncing(true);
    
    try {
      const localProjectsStr = localStorage.getItem(STORAGE_KEY_PROJECTS);
      const localActivitiesStr = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
      
      if (localProjectsStr) {
        const localProjects: Project[] = JSON.parse(localProjectsStr);
        
        // Create a mapping from old IDs to new IDs
        const projectIdMap: Record<string, string> = {};
        const taskIdMap: Record<string, string> = {};
        
        for (const project of localProjects) {
          // Insert project
          const { data: newProject, error: projectError } = await supabase
            .from('projects')
            .insert({
              user_id: user.id,
              name: project.name,
              color: project.color,
              hourly_rate: project.hourlyRate || null,
              is_archived: project.isArchived
            })
            .select()
            .single();
          
          if (projectError) {
            console.error('Error migrating project:', projectError);
            continue;
          }
          
          projectIdMap[project.id] = newProject.id;
          
          // Insert tasks
          for (const task of project.tasks) {
            const { data: newTask, error: taskError } = await supabase
              .from('tasks')
              .insert({
                project_id: newProject.id,
                name: task.name
              })
              .select()
              .single();
            
            if (taskError) {
              console.error('Error migrating task:', taskError);
              continue;
            }
            
            taskIdMap[task.id] = newTask.id;
          }
        }
        
        // Migrate activities
        if (localActivitiesStr) {
          const localActivities: Activity[] = JSON.parse(localActivitiesStr).map((a: any) => ({
            ...a,
            startTime: new Date(a.startTime),
            endTime: new Date(a.endTime)
          }));
          
          const activitiesToInsert = localActivities.map(activity => ({
            user_id: user.id,
            project_id: activity.projectId ? projectIdMap[activity.projectId] || null : null,
            task_id: activity.taskId ? taskIdMap[activity.taskId] || null : null,
            application_name: activity.applicationName,
            window_title: activity.windowTitle,
            start_time: activity.startTime.toISOString(),
            end_time: activity.endTime.toISOString(),
            duration: activity.duration,
            is_coded: activity.isCoded,
            is_idle: activity.isIdle
          }));
          
          // Insert in batches
          const batchSize = 100;
          for (let i = 0; i < activitiesToInsert.length; i += batchSize) {
            const batch = activitiesToInsert.slice(i, i + batchSize);
            const { error: activityError } = await supabase
              .from('activities')
              .insert(batch);
            
            if (activityError) {
              console.error('Error migrating activities batch:', activityError);
            }
          }
        }
        
        // Clear localStorage after successful migration
        localStorage.removeItem(STORAGE_KEY_PROJECTS);
        localStorage.removeItem(STORAGE_KEY_ACTIVITIES);
        
        // Reload from database
        await loadFromDatabase();
      }
    } catch (error) {
      console.error('Error during migration:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save to localStorage when not authenticated
  useEffect(() => {
    if (!isLoading && !user && projects.length > 0) {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    }
  }, [projects, isLoading, user]);

  useEffect(() => {
    if (!isLoading && !user && activities.length > 0) {
      localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(activities));
    }
  }, [activities, isLoading, user]);

  // Project management
  const addProject = useCallback(async (name: string, color?: string, hourlyRate?: number) => {
    const projectColor = color || projectColors[projects.length % projectColors.length];
    
    if (user) {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name,
          color: projectColor,
          hourly_rate: hourlyRate || null,
          is_archived: false
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding project:', error);
        return null;
      }
      
      const newProject: Project = {
        id: data.id,
        name: data.name,
        color: data.color,
        hourlyRate: data.hourly_rate || undefined,
        tasks: [],
        createdAt: new Date(data.created_at),
        isArchived: data.is_archived
      };
      
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } else {
      const newProject: Project = {
        id: generateId(),
        name,
        color: projectColor,
        hourlyRate,
        tasks: [],
        createdAt: new Date(),
        isArchived: false
      };
      setProjects(prev => [...prev, newProject]);
      return newProject;
    }
  }, [projects.length, user]);

  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    if (user) {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.hourlyRate !== undefined) dbUpdates.hourly_rate = updates.hourlyRate;
      if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived;
      
      const { error } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', projectId);
      
      if (error) {
        console.error('Error updating project:', error);
        return;
      }
    }
    
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, ...updates } : p
    ));
  }, [user]);

  const deleteProject = useCallback(async (projectId: string) => {
    if (user) {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) {
        console.error('Error deleting project:', error);
        return;
      }
    }
    
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setActivities(prev => prev.map(a => 
      a.projectId === projectId 
        ? { ...a, projectId: undefined, taskId: undefined, subtaskId: undefined, isCoded: false }
        : a
    ));
  }, [user]);

  const addTask = useCallback(async (projectId: string, taskName: string) => {
    if (user) {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          name: taskName
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding task:', error);
        return null;
      }
      
      const newTask: Task = {
        id: data.id,
        projectId: data.project_id,
        name: data.name,
        subtasks: []
      };
      
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, tasks: [...p.tasks, newTask] }
          : p
      ));
      return newTask;
    } else {
      const newTask: Task = {
        id: generateId(),
        projectId,
        name: taskName,
        subtasks: []
      };
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, tasks: [...p.tasks, newTask] }
          : p
      ));
      return newTask;
    }
  }, [user]);

  const deleteTask = useCallback(async (projectId: string, taskId: string) => {
    if (user) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) {
        console.error('Error deleting task:', error);
        return;
      }
    }
    
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) }
        : p
    ));
    setActivities(prev => prev.map(a => 
      a.taskId === taskId 
        ? { ...a, taskId: undefined, subtaskId: undefined, isCoded: false }
        : a
    ));
  }, [user]);

  // Activity management
  const codeActivity = useCallback(async (activityId: string, projectId: string, taskId: string, subtaskId?: string) => {
    if (user) {
      const { error } = await supabase
        .from('activities')
        .update({
          project_id: projectId,
          task_id: taskId,
          is_coded: true
        })
        .eq('id', activityId);
      
      if (error) {
        console.error('Error coding activity:', error);
        return;
      }
    }
    
    setActivities(prev => prev.map(a => 
      a.id === activityId 
        ? { ...a, projectId, taskId, subtaskId, isCoded: true }
        : a
    ));
  }, [user]);

  const uncodeActivity = useCallback(async (activityId: string) => {
    if (user) {
      const { error } = await supabase
        .from('activities')
        .update({
          project_id: null,
          task_id: null,
          is_coded: false
        })
        .eq('id', activityId);
      
      if (error) {
        console.error('Error uncoding activity:', error);
        return;
      }
    }
    
    setActivities(prev => prev.map(a => 
      a.id === activityId 
        ? { ...a, projectId: undefined, taskId: undefined, subtaskId: undefined, isCoded: false }
        : a
    ));
  }, [user]);

  const bulkCodeActivities = useCallback(async (activityIds: string[], projectId: string, taskId: string) => {
    if (user) {
      const { error } = await supabase
        .from('activities')
        .update({
          project_id: projectId,
          task_id: taskId,
          is_coded: true
        })
        .in('id', activityIds);
      
      if (error) {
        console.error('Error bulk coding activities:', error);
        return;
      }
    }
    
    setActivities(prev => prev.map(a => 
      activityIds.includes(a.id) 
        ? { ...a, projectId, taskId, isCoded: true }
        : a
    ));
  }, [user]);

  const deleteActivity = useCallback(async (activityId: string) => {
    if (user) {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);
      
      if (error) {
        console.error('Error deleting activity:', error);
        return;
      }
    }
    
    setActivities(prev => prev.filter(a => a.id !== activityId));
  }, [user]);

  const bulkDeleteActivities = useCallback(async (activityIds: string[]) => {
    if (activityIds.length === 0) return;
    
    if (user) {
      const { error } = await supabase
        .from('activities')
        .delete()
        .in('id', activityIds);
      
      if (error) {
        console.error('Error bulk deleting activities:', error);
        return;
      }
    }
    
    setActivities(prev => prev.filter(a => !activityIds.includes(a.id)));
  }, [user]);


  // Add manual activity entry
  const addManualEntry = useCallback(async (projectId: string, taskId: string, duration: number, description: string) => {
    const now = new Date();
    const startTime = new Date(now.getTime() - duration * 1000);
    
    if (user) {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          project_id: projectId,
          task_id: taskId,
          application_name: 'Manual Entry',
          window_title: description || 'Manual time entry',
          start_time: startTime.toISOString(),
          end_time: now.toISOString(),
          duration,
          is_coded: true,
          is_idle: false
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding manual entry:', error);
        return;
      }
      
      const newActivity: Activity = {
        id: data.id,
        applicationName: data.application_name,
        windowTitle: data.window_title,
        startTime: new Date(data.start_time),
        endTime: new Date(data.end_time),
        duration: data.duration,
        projectId: data.project_id,
        taskId: data.task_id,
        isCoded: data.is_coded,
        isIdle: data.is_idle
      };
      
      setActivities(prev => [newActivity, ...prev]);
    } else {
      const newActivity: Activity = {
        id: generateId(),
        applicationName: 'Manual Entry',
        windowTitle: description || 'Manual time entry',
        startTime,
        endTime: now,
        duration,
        projectId,
        taskId,
        isCoded: true,
        isIdle: false
      };
      
      setActivities(prev => [newActivity, ...prev]);
    }
  }, [user]);

  // Add auto-tracked activity from tab tracker
  const addAutoTrackedActivity = useCallback(async (activity: Activity) => {
    if (user) {
      const { data, error } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          project_id: activity.projectId || null,
          task_id: activity.taskId || null,
          application_name: activity.applicationName,
          window_title: activity.windowTitle,
          start_time: activity.startTime.toISOString(),
          end_time: activity.endTime.toISOString(),
          duration: activity.duration,
          is_coded: activity.isCoded,
          is_idle: activity.isIdle
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding auto-tracked activity:', error);
        // Still add to local state even if DB fails
        setActivities(prev => [activity, ...prev]);
        return;
      }
      
      const newActivity: Activity = {
        id: data.id,
        applicationName: data.application_name,
        windowTitle: data.window_title,
        startTime: new Date(data.start_time),
        endTime: new Date(data.end_time),
        duration: data.duration,
        projectId: data.project_id || undefined,
        taskId: data.task_id || undefined,
        isCoded: data.is_coded,
        isIdle: data.is_idle
      };
      
      setActivities(prev => [newActivity, ...prev]);
    } else {
      setActivities(prev => [activity, ...prev]);
    }
  }, [user]);


  // Get uncoded activities (within 30 days)
  const getUncodedActivities = useCallback(() => {
    return activities.filter(a => !a.isCoded && isWithinDays(a.startTime, 30));
  }, [activities]);

  // Get activities for today
  const getTodayActivities = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return activities.filter(a => {
      const actDate = new Date(a.startTime);
      return actDate >= today && actDate < tomorrow;
    });
  }, [activities]);

  // Generate timesheet report
  const generateTimesheet = useCallback((period: ReportPeriod): TimesheetEntry[] => {
    const { start, end } = getDateRange(period);
    const days = getDaysBetween(start, end);
    
    const relevantActivities = activities.filter(a => {
      const actDate = new Date(a.startTime);
      return a.isCoded && actDate >= start && actDate <= end;
    });

    const totalSeconds = relevantActivities.reduce((sum, a) => sum + a.duration, 0);
    
    const grouped: Record<string, TimesheetEntry> = {};
    
    relevantActivities.forEach(activity => {
      const project = projects.find(p => p.id === activity.projectId);
      const task = project?.tasks.find(t => t.id === activity.taskId);
      
      if (!project || !task) return;
      
      const key = `${activity.projectId}-${activity.taskId}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          projectName: project.name,
          projectColor: project.color,
          taskName: task.name,
          totalSeconds: 0,
          dailyBreakdown: days.map(d => ({ 
            date: d.toISOString().split('T')[0], 
            seconds: 0 
          })),
          percentage: 0
        };
      }
      
      grouped[key].totalSeconds += activity.duration;
      
      const actDate = new Date(activity.startTime).toISOString().split('T')[0];
      const dayEntry = grouped[key].dailyBreakdown.find(d => d.date === actDate);
      if (dayEntry) {
        dayEntry.seconds += activity.duration;
      }
    });

    return Object.values(grouped).map(entry => ({
      ...entry,
      percentage: totalSeconds > 0 ? Math.round((entry.totalSeconds / totalSeconds) * 100) : 0
    })).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [activities, projects]);

  // Get summary stats
  const getSummaryStats = useCallback(() => {
    const todayActivities = getTodayActivities();
    const uncodedActivities = getUncodedActivities();
    
    const todayTotal = todayActivities.reduce((sum, a) => sum + a.duration, 0);
    const todayCoded = todayActivities.filter(a => a.isCoded).reduce((sum, a) => sum + a.duration, 0);
    const weekTotal = activities
      .filter(a => isWithinDays(a.startTime, 7))
      .reduce((sum, a) => sum + a.duration, 0);
    
    return {
      todayTotal,
      todayCoded,
      todayUncoded: todayTotal - todayCoded,
      weekTotal,
      uncodedCount: uncodedActivities.length,
      uncodedTotal: uncodedActivities.reduce((sum, a) => sum + a.duration, 0),
      projectCount: projects.filter(p => !p.isArchived).length
    };
  }, [activities, projects, getTodayActivities, getUncodedActivities]);

  // Export to CSV
  const exportToCSV = useCallback((period: ReportPeriod): string => {
    const entries = generateTimesheet(period);
    const { start, end } = getDateRange(period);
    const days = getDaysBetween(start, end);
    
    const headers = ['Project', 'Task', 'Total Hours', ...days.map(d => d.toISOString().split('T')[0]), 'Percentage'];
    const rows = entries.map(entry => [
      entry.projectName,
      entry.taskName,
      (entry.totalSeconds / 3600).toFixed(2),
      ...entry.dailyBreakdown.map(d => (d.seconds / 3600).toFixed(2)),
      `${entry.percentage}%`
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }, [generateTimesheet]);

  const toggleTracking = useCallback(() => {
    setIsTracking(prev => !prev);
  }, []);

  return {
    projects,
    activities,
    isTracking,
    isLoading,
    isSyncing,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    deleteTask,
    codeActivity,
    uncodeActivity,
    bulkCodeActivities,
    deleteActivity,
    bulkDeleteActivities,
    addManualEntry,
    addAutoTrackedActivity,
    getUncodedActivities,
    getTodayActivities,
    generateTimesheet,
    getSummaryStats,
    exportToCSV,
    toggleTracking,
    migrateLocalDataToDatabase
  };
};

