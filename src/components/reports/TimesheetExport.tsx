import React, { useState, useMemo } from 'react';
import { ReportPeriod, TimesheetEntry } from '@/types';
import { formatDuration, getDateRange, getDaysBetween, secondsToHours } from '@/utils/timeUtils';
import { DownloadIcon, CalendarIcon, BarChartIcon } from '@/components/ui/Icons';

interface TimesheetExportProps {
  generateTimesheet: (period: ReportPeriod) => TimesheetEntry[];
  exportToCSV: (period: ReportPeriod) => string;
}

const TimesheetExport: React.FC<TimesheetExportProps> = ({
  generateTimesheet,
  exportToCSV
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(7);
  
  const timesheet = useMemo(() => generateTimesheet(selectedPeriod), [generateTimesheet, selectedPeriod]);
  const { start, end } = getDateRange(selectedPeriod);
  const days = getDaysBetween(start, end);
  
  const totalSeconds = timesheet.reduce((sum, entry) => sum + entry.totalSeconds, 0);
  const totalHours = secondsToHours(totalSeconds);

  const handleExport = (format: 'csv' | 'json') => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      content = exportToCSV(selectedPeriod);
      filename = `timesheet-${selectedPeriod}days-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(timesheet, null, 2);
      filename = `timesheet-${selectedPeriod}days-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChartIcon size={20} className="text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Timesheet Report</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {([7, 14, 28] as ReportPeriod[]).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    selectedPeriod === period 
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {period} Days
                </button>
              ))}
            </div>
            
            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <DownloadIcon size={16} />
                CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <DownloadIcon size={16} />
                JSON
              </button>
            </div>
          </div>
        </div>
        
        {/* Date Range */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <CalendarIcon size={16} />
          <span>
            {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="mx-2">|</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Total: {totalHours.toFixed(1)} hours
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-4 grid grid-cols-3 gap-4 border-b border-gray-100 dark:border-gray-700">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Hours</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4">
          <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Projects</p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {new Set(timesheet.map(e => e.projectName)).size}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">Avg/Day</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {(totalHours / selectedPeriod).toFixed(1)}h
          </p>
        </div>
      </div>

      {/* Timesheet Table */}
      <div className="overflow-x-auto">
        {timesheet.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <BarChartIcon size={40} className="mx-auto mb-2 opacity-50" />
            <p>No coded activities in this period</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left p-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700/50">
                  Project / Task
                </th>
                <th className="text-right p-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                {days.slice(-7).map(day => (
                  <th key={day.toISOString()} className="text-center p-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[60px]">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    <br />
                    <span className="text-[10px] font-normal">{day.getDate()}</span>
                  </th>
                ))}
                <th className="text-right p-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {timesheet.map((entry, index) => (
                <tr 
                  key={index}
                  className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <td className="p-3 sticky left-0 bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: entry.projectColor }}
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {entry.projectName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {entry.taskName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right font-medium text-gray-900 dark:text-white text-sm">
                    {secondsToHours(entry.totalSeconds).toFixed(1)}h
                  </td>
                  {days.slice(-7).map(day => {
                    const dayData = entry.dailyBreakdown.find(
                      d => d.date === day.toISOString().split('T')[0]
                    );
                    const hours = dayData ? secondsToHours(dayData.seconds) : 0;
                    return (
                      <td 
                        key={day.toISOString()} 
                        className="p-3 text-center text-sm"
                      >
                        {hours > 0 ? (
                          <span 
                            className="inline-block px-2 py-1 rounded text-xs font-medium"
                            style={{ 
                              backgroundColor: `${entry.projectColor}20`,
                              color: entry.projectColor
                            }}
                          >
                            {hours.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="p-3 text-right text-sm text-gray-500 dark:text-gray-400">
                    {entry.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-200 dark:border-gray-600">
                <td className="p-3 font-semibold text-gray-900 dark:text-white sticky left-0 bg-gray-50 dark:bg-gray-700/50">
                  Total
                </td>
                <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                  {totalHours.toFixed(1)}h
                </td>
                {days.slice(-7).map(day => {
                  const dayTotal = timesheet.reduce((sum, entry) => {
                    const dayData = entry.dailyBreakdown.find(
                      d => d.date === day.toISOString().split('T')[0]
                    );
                    return sum + (dayData?.seconds || 0);
                  }, 0);
                  return (
                    <td key={day.toISOString()} className="p-3 text-center font-medium text-gray-700 dark:text-gray-300 text-sm">
                      {secondsToHours(dayTotal).toFixed(1)}
                    </td>
                  );
                })}
                <td className="p-3 text-right font-bold text-gray-900 dark:text-white">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Visual Breakdown */}
      {timesheet.length > 0 && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Time Distribution</h3>
          <div className="flex h-4 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
            {timesheet.map((entry, index) => (
              <div
                key={index}
                className="h-full transition-all hover:opacity-80"
                style={{ 
                  width: `${entry.percentage}%`,
                  backgroundColor: entry.projectColor
                }}
                title={`${entry.projectName}: ${entry.percentage}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {timesheet.map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.projectColor }}
                />
                <span className="text-gray-600 dark:text-gray-400">
                  {entry.projectName}: {entry.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetExport;
