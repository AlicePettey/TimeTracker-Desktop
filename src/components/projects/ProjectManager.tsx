import React, { useState } from 'react';
import { Project, Task } from '@/types';
import { projectColors } from '@/utils/sampleData';
import { 
  FolderIcon, 
  PlusIcon, 
  TrashIcon, 
  EditIcon, 
  ChevronRightIcon,
  XIcon,
  CheckIcon
} from '@/components/ui/Icons';

interface ProjectManagerProps {
  projects: Project[];
  onAddProject: (name: string, color?: string, hourlyRate?: number) => void;
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
  onAddTask: (projectId: string, taskName: string) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onAddTask,
  onDeleteTask
}) => {
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(projectColors[0]);
  const [newProjectRate, setNewProjectRate] = useState('');
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [editingProject, setEditingProject] = useState<string | null>(null);

  const handleAddProject = () => {
    if (newProjectName.trim()) {
      onAddProject(
        newProjectName.trim(),
        newProjectColor,
        newProjectRate ? parseFloat(newProjectRate) : undefined
      );
      setNewProjectName('');
      setNewProjectRate('');
      setIsAddingProject(false);
    }
  };

  const handleAddTask = (projectId: string) => {
    if (newTaskName.trim()) {
      onAddTask(projectId, newTaskName.trim());
      setNewTaskName('');
      setAddingTaskTo(null);
    }
  };

  const activeProjects = projects.filter(p => !p.isArchived);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderIcon size={20} className="text-blue-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h2>
        </div>
        <button
          onClick={() => setIsAddingProject(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon size={16} />
          New Project
        </button>
      </div>

      {/* Add Project Form */}
      {isAddingProject && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {projectColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewProjectColor(color)}
                      className={`w-6 h-6 rounded-full transition-transform ${newProjectColor === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  value={newProjectRate}
                  onChange={(e) => setNewProjectRate(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAddingProject(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="max-h-[500px] overflow-y-auto">
        {activeProjects.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FolderIcon size={40} className="mx-auto mb-2 opacity-50" />
            <p>No projects yet</p>
            <p className="text-sm">Create your first project to start tracking time</p>
          </div>
        ) : (
          activeProjects.map(project => (
            <div key={project.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
              {/* Project Header */}
              <div 
                className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
              >
                <ChevronRightIcon 
                  size={18} 
                  className={`text-gray-400 transition-transform ${expandedProject === project.id ? 'rotate-90' : ''}`}
                />
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="flex-1 font-medium text-gray-900 dark:text-white">
                  {project.name}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {project.tasks.length} tasks
                </span>
                {project.hourlyRate && (
                  <span className="text-sm text-gray-400 dark:text-gray-500">
                    ${project.hourlyRate}/hr
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this project? Activities will become uncoded.')) {
                      onDeleteProject(project.id);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <TrashIcon size={16} />
                </button>
              </div>

              {/* Tasks */}
              {expandedProject === project.id && (
                <div className="pl-12 pr-4 pb-4 space-y-2">
                  {project.tasks.map(task => (
                    <div 
                      key={task.id}
                      className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {task.name}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm('Delete this task?')) {
                            onDeleteTask(project.id, task.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  ))}
                  
                  {/* Add Task */}
                  {addingTaskTo === project.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        placeholder="Task name..."
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTask(project.id);
                          if (e.key === 'Escape') setAddingTaskTo(null);
                        }}
                      />
                      <button
                        onClick={() => handleAddTask(project.id)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <CheckIcon size={16} />
                      </button>
                      <button
                        onClick={() => setAddingTaskTo(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <XIcon size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTaskTo(project.id)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                    >
                      <PlusIcon size={16} />
                      Add Task
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectManager;
