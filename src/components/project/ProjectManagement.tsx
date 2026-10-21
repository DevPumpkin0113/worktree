import { ProjectOverview } from './ProjectOverview';
import type { WorkModel, OpenProject } from '../../app/types';
export function ProjectManagement({
  model,
  path,
  project,
}: {
  model: WorkModel | null;
  path: string | null;
  project: OpenProject;
}) {
  return (
    <section
      id="projectManagement"
      className="project-management"
      aria-labelledby="workspacePageTitle"
    >
      <ProjectOverview model={model} path={path} project={project} />
    </section>
  );
}
