import { createRoot } from 'react-dom/client';
import { App } from './App';
import { WorkspaceStore } from './app/workspace-store';
import { createNativePlatform } from './platform/native';
import './styles/theme.css';
import './styles/main.css';
import './styles/schedule-views.css';
import './styles/task-detail.css';
import './styles/task-tabs.css';
import './styles/settings.css';
import './styles/workspace.css';
import './styles/insights.css';
import './styles/tree-view.css';
import './styles/kanban-view.css';
import './styles/network-view.css';
const store = new WorkspaceStore(createNativePlatform());
createRoot(document.getElementById('root')!).render(<App store={store} />);

import './styles/filters.css';

import './styles/project.css';

import './styles/task-editor.css';
import './styles/markdown.css';
import './styles/epics.css';
import './styles/delete-dialog.css';

import './styles/focus.css';
import './styles/buttons.css';
