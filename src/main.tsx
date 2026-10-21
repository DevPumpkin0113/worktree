import { createRoot } from 'react-dom/client';
import { App } from './App';
import { WorkspaceStore } from './app/workspace-store';
import { createNativePlatform } from './platform/native';
import './styles/theme.css';
import './styles/main.css';
import './styles/focus.css';
import './styles/schedule-views.css';
import './styles/task-detail.css';
import './styles/settings.css';
import './styles/workspace.css';
const store = new WorkspaceStore(createNativePlatform());
createRoot(document.getElementById('root')!).render(<App store={store} />);

import './styles/filters.css';

import './styles/project.css';
