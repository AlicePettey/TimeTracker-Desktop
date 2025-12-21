import React, { useState, useMemo } from 'react';
import { Activity } from '@/types';
import { ProductivityStats, Category } from '@/types/categories';
import { getCategorizationEngine, formatDuration } from '@/utils/categorization';
import { useCategorySync } from '@/hooks/useCategorySync';

interface ProductivityInsightsProps {
  activities: Activity[];
}

type TimeRange = 'today' | 'week' | 'month';

const ProductivityInsights: React.FC<ProductivityInsightsProps> = ({ activities }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Use synced categories and rules
  const { categories: syncedCategories, rules: syncedRules } = useCategorySync();

  const { stats, categories } = useMemo(() => {
    // Create engine with synced categories and rules
    const engine = getCategorizationEngine(
      syncedCategories.filter(c => !c.isDefault),
      syncedRules.filter(r => !r.isDefault)
    );
    const cats = engine.getCategories();
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const productivityStats = engine.calculateProductivityStats(activities, startDate, now);
    
    return { stats: productivityStats, categories: cats };
  }, [activities, timeRange, syncedCategories, syncedRules]);

  const getProductivityColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getProductivityBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const maxHourlyValue = Math.max(
    ...stats.hourlyBreakdown.map(h => h.productiveSeconds + h.distractingSeconds + h.uncategorizedSeconds)
  );

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Productivity Insights</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Analyze your time and improve productivity
            </p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['today', 'week', 'month'] as TimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <p className="text-sm opacity-80">Total Time</p>
            <p className="text-2xl font-bold mt-1">{formatDuration(stats.totalTime)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <p className="text-sm opacity-80">Productive</p>
            <p className="text-2xl font-bold mt-1">{formatDuration(stats.productiveTime)}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
            <p className="text-sm opacity-80">Distracting</p>
            <p className="text-2xl font-bold mt-1">{formatDuration(stats.distractingTime)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <p className="text-sm opacity-80">Productivity Score</p>
            <p className="text-2xl font-bold mt-1">{stats.productivityScore}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productivity Gauge */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Productivity Score
          </h3>
          <div className="flex items-center justify-center py-8">
            <div className="relative w-48 h-48">
              {/* Background circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-gray-200 dark:text-gray-700"
                />
                {/* Progress circle */}
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={`${(stats.productivityScore / 100) * 553} 553`}
                  strokeLinecap="round"
                  className={getProductivityColor(stats.productivityScore)}
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${getProductivityColor(stats.productivityScore)}`}>
                  {stats.productivityScore}%
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">Productive</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Productive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Distracting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Uncategorized</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Time by Category
          </h3>
          <div className="space-y-3">
            {stats.categoryBreakdown.slice(0, 8).map(cat => (
              <div key={cat.categoryId} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {cat.categoryName}
                    </span>
                    {!cat.isProductivity && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                        Distracting
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDuration(cat.totalSeconds)} ({cat.percentage}%)
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all"
                    style={{ 
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Activity by Hour
          </h3>
          <div className="flex items-end gap-1 h-40">
            {stats.hourlyBreakdown.map(hour => {
              const total = hour.productiveSeconds + hour.distractingSeconds + hour.uncategorizedSeconds;
              const height = maxHourlyValue > 0 ? (total / maxHourlyValue) * 100 : 0;
              const productiveHeight = total > 0 ? (hour.productiveSeconds / total) * 100 : 0;
              const distractingHeight = total > 0 ? (hour.distractingSeconds / total) * 100 : 0;
              
              return (
                <div 
                  key={hour.hour} 
                  className="flex-1 flex flex-col justify-end group relative"
                >
                  <div 
                    className="w-full rounded-t transition-all hover:opacity-80 overflow-hidden"
                    style={{ height: `${height}%` }}
                  >
                    <div 
                      className="w-full bg-green-500"
                      style={{ height: `${productiveHeight}%` }}
                    />
                    <div 
                      className="w-full bg-red-500"
                      style={{ height: `${distractingHeight}%` }}
                    />
                    <div 
                      className="w-full bg-gray-400"
                      style={{ height: `${100 - productiveHeight - distractingHeight}%` }}
                    />
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {hour.hour}:00 - {formatDuration(total)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>12am</span>
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>12am</span>
          </div>
        </div>

        {/* Top Applications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Applications
          </h3>
          <div className="space-y-3">
            {stats.topApps.slice(0, 8).map((app, index) => {
              const category = categories.find(c => c.id === app.categoryId);
              return (
                <div key={app.appName} className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-600 dark:text-gray-300">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {app.appName}
                      </span>
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category?.color || '#9CA3AF' }}
                      />
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                      <div 
                        className="h-1.5 rounded-full"
                        style={{ 
                          width: `${app.percentage}%`,
                          backgroundColor: category?.color || '#9CA3AF'
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {formatDuration(app.totalSeconds)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Trend */}
      {timeRange !== 'today' && stats.dailyTrend.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Productivity Trend
          </h3>
          <div className="h-48">
            <div className="flex items-end h-full gap-2">
              {stats.dailyTrend.map((day, index) => (
                <div 
                  key={day.date} 
                  className="flex-1 flex flex-col items-center group"
                >
                  <div 
                    className={`w-full rounded-t transition-all hover:opacity-80 ${getProductivityBgColor(day.productivityScore)}`}
                    style={{ height: `${day.productivityScore}%` }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 truncate w-full text-center">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {day.productivityScore}% - {formatDuration(day.totalSeconds)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tips Section */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Productivity Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="font-medium">Peak Hours</span>
            </div>
            <p className="text-sm opacity-80">
              {stats.hourlyBreakdown.length > 0 
                ? `Your most productive hour is around ${
                    stats.hourlyBreakdown.reduce((max, h) => 
                      h.productiveSeconds > max.productiveSeconds ? h : max
                    ).hour
                  }:00`
                : 'Track more activities to see your peak hours'
              }
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span className="font-medium">Focus Goal</span>
            </div>
            <p className="text-sm opacity-80">
              {stats.productivityScore >= 70 
                ? 'Great job! You\'re meeting your productivity goals.'
                : 'Try to reduce distracting activities to improve focus.'
              }
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span className="font-medium">Top Category</span>
            </div>
            <p className="text-sm opacity-80">
              {stats.categoryBreakdown[0]
                ? `You spend the most time on ${stats.categoryBreakdown[0].categoryName}`
                : 'Track more activities to see your top category'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductivityInsights;
