import React, { useMemo } from 'react';
import { Activity, Project } from '@/types';
import { formatDuration, secondsToHours } from '@/utils/timeUtils';
import StatCard from './StatCard';
import ActivityItem from './ActivityItem';
import { 
  ClockIcon, 
  CheckIcon, 
  AlertCircleIcon, 
  FolderIcon,
  BarChartIcon
} from '@/components/ui/Icons';

interface DashboardViewProps {
  activities: Activity[];
  projects: Project[];
  stats: {
    todayTotal: number;
    todayCoded: number;
    todayUncoded: number;
    weekTotal: number;
    uncodedCount: number;
    uncodedTotal: number;
    projectCount: number;
  };
  onCode: (activityId: string, projectId: string, taskId: string) => void;
  onUncode: (activityId: string) => void;
  onDelete?: (activityId: string) => void;
  todayActivities: Activity[];
}

const DashboardView: React.FC<DashboardViewProps> = ({
  activities,
  projects,
  stats,
  onCode,
  onUncode,
  onDelete,
  todayActivities
}) => {
  // Calculate project breakdown for today
  const projectBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    todayActivities.forEach(activity => {
      if (activity.projectId) {
        breakdown[activity.projectId] = (breakdown[activity.projectId] || 0) + activity.duration;
      }
    });
    return Object.entries(breakdown)
      .map(([projectId, seconds]) => {
        const project = projects.find(p => p.id === projectId);
        return { project, seconds };
      })
      .filter(item => item.project)
      .sort((a, b) => b.seconds - a.seconds);
  }, [todayActivities, projects]);

  const codingRate = stats.todayTotal > 0 
    ? Math.round((stats.todayCoded / stats.todayTotal) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Total"
          value={formatDuration(stats.todayTotal)}
          subtitle="Time tracked today"
          icon={<ClockIcon size={24} />}
          color="#3B82F6"
        />
        <StatCard
          title="Coded Time"
          value={formatDuration(stats.todayCoded)}
          subtitle={`${codingRate}% coding rate`}
          icon={<CheckIcon size={24} />}
          color="#10B981"
        />
        <StatCard
          title="Uncoded Activities"
          value={stats.uncodedCount.toString()}
          subtitle={formatDuration(stats.uncodedTotal) + ' total'}
          icon={<AlertCircleIcon size={24} />}
          color="#F59E0B"
        />
        <StatCard
          title="This Week"
          value={secondsToHours(stats.weekTotal).toFixed(1) + 'h'}
          subtitle={`${stats.projectCount} active projects`}
          icon={<BarChartIcon size={24} />}
          color="#8B5CF6"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Project Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FolderIcon size={20} className="text-blue-500" />
            Today's Projects
          </h3>
          
          {projectBreakdown.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No coded activities today
            </p>
          ) : (
            <div className="space-y-4">
              {projectBreakdown.slice(0, 5).map(({ project, seconds }) => (
                <div key={project!.id} className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project!.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {project!.name}
                    </p>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                      <div 
                        className="h-1.5 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min((seconds / stats.todayTotal) * 100, 100)}%`,
                          backgroundColor: project!.color
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {formatDuration(seconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ClockIcon size={20} className="text-green-500" />
              Recent Activity
            </h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {todayActivities.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <ClockIcon size={40} className="mx-auto mb-2 opacity-50" />
                <p>No activities recorded today</p>
              </div>
            ) : (
              todayActivities.slice(0, 8).map(activity => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  projects={projects}
                  onCode={onCode}
                  onUncode={onUncode}
                  onDelete={onDelete}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Weekly Overview Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChartIcon size={20} className="text-purple-500" />
          Weekly Overview
        </h3>
        
        <div className="flex items-end gap-2 h-40">
          {Array.from({ length: 7 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dayActivities = activities.filter(a => {
              const actDate = new Date(a.startTime);
              return actDate.toDateString() === date.toDateString();
            });
            const dayTotal = dayActivities.reduce((sum, a) => sum + a.duration, 0);
            const dayCoded = dayActivities.filter(a => a.isCoded).reduce((sum, a) => sum + a.duration, 0);
            const maxHeight = 8 * 3600; // 8 hours max
            const totalHeight = Math.min((dayTotal / maxHeight) * 100, 100);
            const codedHeight = Math.min((dayCoded / maxHeight) * 100, 100);
            
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center justify-end h-32 relative">
                  <div 
                    className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-sm absolute bottom-0"
                    style={{ height: `${totalHeight}%` }}
                  />
                  <div 
                    className="w-full bg-blue-500 rounded-t-sm absolute bottom-0"
                    style={{ height: `${codedHeight}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Coded</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Uncoded</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
