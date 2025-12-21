import { Project, Activity } from '@/types';
import { generateId } from './timeUtils';

// Sample projects with tasks
export const sampleProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Website Redesign',
    color: '#3B82F6',
    hourlyRate: 85,
    isArchived: false,
    createdAt: new Date('2024-11-01'),
    tasks: [
      { id: 'task-1-1', projectId: 'proj-1', name: 'UI Design', subtasks: [
        { id: 'sub-1-1-1', taskId: 'task-1-1', name: 'Wireframes' },
        { id: 'sub-1-1-2', taskId: 'task-1-1', name: 'Mockups' },
        { id: 'sub-1-1-3', taskId: 'task-1-1', name: 'Prototyping' }
      ]},
      { id: 'task-1-2', projectId: 'proj-1', name: 'Frontend Development', subtasks: [
        { id: 'sub-1-2-1', taskId: 'task-1-2', name: 'React Components' },
        { id: 'sub-1-2-2', taskId: 'task-1-2', name: 'Styling' }
      ]},
      { id: 'task-1-3', projectId: 'proj-1', name: 'Testing' }
    ]
  },
  {
    id: 'proj-2',
    name: 'Mobile App',
    color: '#10B981',
    hourlyRate: 95,
    isArchived: false,
    createdAt: new Date('2024-10-15'),
    tasks: [
      { id: 'task-2-1', projectId: 'proj-2', name: 'API Integration' },
      { id: 'task-2-2', projectId: 'proj-2', name: 'UI Implementation' },
      { id: 'task-2-3', projectId: 'proj-2', name: 'Bug Fixes' }
    ]
  },
  {
    id: 'proj-3',
    name: 'Client Meetings',
    color: '#8B5CF6',
    hourlyRate: 75,
    isArchived: false,
    createdAt: new Date('2024-09-01'),
    tasks: [
      { id: 'task-3-1', projectId: 'proj-3', name: 'Discovery Calls' },
      { id: 'task-3-2', projectId: 'proj-3', name: 'Progress Updates' },
      { id: 'task-3-3', projectId: 'proj-3', name: 'Presentations' }
    ]
  },
  {
    id: 'proj-4',
    name: 'Internal Tools',
    color: '#F59E0B',
    hourlyRate: 70,
    isArchived: false,
    createdAt: new Date('2024-08-20'),
    tasks: [
      { id: 'task-4-1', projectId: 'proj-4', name: 'Dashboard Development' },
      { id: 'task-4-2', projectId: 'proj-4', name: 'Automation Scripts' },
      { id: 'task-4-3', projectId: 'proj-4', name: 'Documentation' }
    ]
  },
  {
    id: 'proj-5',
    name: 'E-commerce Platform',
    color: '#EF4444',
    hourlyRate: 90,
    isArchived: false,
    createdAt: new Date('2024-11-10'),
    tasks: [
      { id: 'task-5-1', projectId: 'proj-5', name: 'Payment Integration' },
      { id: 'task-5-2', projectId: 'proj-5', name: 'Product Catalog' },
      { id: 'task-5-3', projectId: 'proj-5', name: 'Order Management' }
    ]
  },
  {
    id: 'proj-6',
    name: 'Marketing Campaign',
    color: '#EC4899',
    hourlyRate: 65,
    isArchived: false,
    createdAt: new Date('2024-11-05'),
    tasks: [
      { id: 'task-6-1', projectId: 'proj-6', name: 'Content Creation' },
      { id: 'task-6-2', projectId: 'proj-6', name: 'Social Media' },
      { id: 'task-6-3', projectId: 'proj-6', name: 'Analytics Review' }
    ]
  }
];

// Application icons mapping
export const appIcons: Record<string, string> = {
  'Visual Studio Code': 'code',
  'Chrome': 'globe',
  'Slack': 'message-square',
  'Zoom': 'video',
  'Figma': 'pen-tool',
  'Terminal': 'terminal',
  'Outlook': 'mail',
  'Excel': 'table',
  'Word': 'file-text',
  'Teams': 'users',
  'Discord': 'message-circle',
  'Notion': 'book-open',
  'GitHub Desktop': 'git-branch',
  'Postman': 'send',
  'Docker': 'box'
};

// Generate sample activities for the past 30 days
export const generateSampleActivities = (): Activity[] => {
  const activities: Activity[] = [];
  const apps = [
    { name: 'Visual Studio Code', titles: ['index.tsx - TimeTracker', 'App.tsx - MyProject', 'styles.css - Website'] },
    { name: 'Chrome', titles: ['React Documentation', 'Stack Overflow - TypeScript', 'GitHub - Pull Requests'] },
    { name: 'Slack', titles: ['#general', '#dev-team', 'Direct Message - John'] },
    { name: 'Zoom', titles: ['Team Standup', 'Client Meeting - Acme Corp', 'Design Review'] },
    { name: 'Figma', titles: ['Website Mockups', 'App UI Kit', 'Icon Design'] },
    { name: 'Terminal', titles: ['npm run dev', 'git push origin main', 'docker-compose up'] },
    { name: 'Outlook', titles: ['Inbox', 'Project Updates', 'Meeting Invites'] },
    { name: 'Notion', titles: ['Project Roadmap', 'Meeting Notes', 'Documentation'] }
  ];

  const now = new Date();
  
  // Generate activities for the past 30 days
  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    
    // Skip weekends occasionally
    if (date.getDay() === 0 || date.getDay() === 6) {
      if (Math.random() > 0.3) continue;
    }
    
    // Generate 8-15 activities per day
    const numActivities = Math.floor(Math.random() * 8) + 8;
    let currentTime = new Date(date);
    currentTime.setHours(9, 0, 0, 0);
    
    for (let i = 0; i < numActivities; i++) {
      const app = apps[Math.floor(Math.random() * apps.length)];
      const title = app.titles[Math.floor(Math.random() * app.titles.length)];
      const duration = Math.floor(Math.random() * 3600) + 300; // 5 min to 1 hour
      
      const startTime = new Date(currentTime);
      const endTime = new Date(currentTime.getTime() + duration * 1000);
      
      // 60% chance of being coded
      const isCoded = Math.random() > 0.4;
      let projectId, taskId;
      
      if (isCoded) {
        const project = sampleProjects[Math.floor(Math.random() * sampleProjects.length)];
        projectId = project.id;
        taskId = project.tasks[Math.floor(Math.random() * project.tasks.length)].id;
      }
      
      activities.push({
        id: generateId(),
        applicationName: app.name,
        windowTitle: title,
        startTime,
        endTime,
        duration,
        projectId,
        taskId,
        isCoded,
        isIdle: Math.random() > 0.95
      });
      
      // Add some gap between activities
      currentTime = new Date(endTime.getTime() + Math.floor(Math.random() * 600) * 1000);
      
      // Don't go past 6 PM
      if (currentTime.getHours() >= 18) break;
    }
  }
  
  return activities.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
};

export const projectColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#A855F7', // Violet
];
