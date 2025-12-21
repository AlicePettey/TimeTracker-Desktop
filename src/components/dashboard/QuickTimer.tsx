import React, { useState, useEffect, useRef } from 'react';
import { Project } from '@/types';
import { PlayIcon, PauseIcon, CheckIcon, XIcon } from '@/components/ui/Icons';

interface QuickTimerProps {
  projects: Project[];
  onSaveTimer: (projectId: string, taskId: string, duration: number, description: string) => void;
}

const QuickTimer: React.FC<QuickTimerProps> = ({ projects, onSaveTimer }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [description, setDescription] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    setIsRunning(!isRunning);
  };

  const handleSave = () => {
    if (selectedProject && selectedTask && elapsedSeconds > 0) {
      onSaveTimer(selectedProject, selectedTask, elapsedSeconds, description);
      handleReset();
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    setSelectedProject('');
    setSelectedTask('');
    setDescription('');
  };

  const availableTasks = projects.find(p => p.id === selectedProject)?.tasks || [];
  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Timer</h3>
      
      {/* Timer Display */}
      <div className="text-center mb-6">
        <div 
          className={`text-5xl font-mono font-bold mb-2 ${
            isRunning ? 'text-green-500' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {formatTime(elapsedSeconds)}
        </div>
        {selectedProjectData && (
          <div 
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
            style={{ backgroundColor: `${selectedProjectData.color}20`, color: selectedProjectData.color }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedProjectData.color }} />
            {selectedProjectData.name}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 mb-6">
        <button
          onClick={handleToggle}
          className={`p-4 rounded-full transition-colors ${
            isRunning 
              ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400'
              : 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400'
          }`}
        >
          {isRunning ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
        </button>
        
        {elapsedSeconds > 0 && (
          <>
            <button
              onClick={handleSave}
              disabled={!selectedProject || !selectedTask}
              className="p-4 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Save timer"
            >
              <CheckIcon size={24} />
            </button>
            
            <button
              onClick={handleReset}
              className="p-4 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 transition-colors"
              title="Reset timer"
            >
              <XIcon size={24} />
            </button>
          </>
        )}
      </div>

      {/* Project/Task Selection */}
      <div className="space-y-3">
        <select
          value={selectedProject}
          onChange={(e) => { setSelectedProject(e.target.value); setSelectedTask(''); }}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select project...</option>
          {projects.filter(p => !p.isArchived).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        
        <select
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
          disabled={!selectedProject}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        >
          <option value="">Select task...</option>
          {availableTasks.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you working on?"
          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default QuickTimer;
