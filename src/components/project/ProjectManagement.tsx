import { ProjectOverview } from './ProjectOverview';
import type { WorkModel } from '../../app/types';
export function ProjectManagement({ model, path }: { model: WorkModel; path: string | null }) {
  return (
    <section
      id="projectManagement"
      className="project-management"
      aria-labelledby="workspacePageTitle"
    >
      <ProjectOverview model={model} path={path} />
    </section>
  );
}
