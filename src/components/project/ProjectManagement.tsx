import { ProjectOverview } from './ProjectOverview';
import type { WorkModel, OpenProject } from '../../app/types';
export function ProjectManagement({
  model,
  project,
}: {
  model: WorkModel | null;
  project: OpenProject;
}) {
  return (
    <section
      id="projectManagement"
      className="project-management"
      aria-labelledby="workspacePageTitle"
    >
      <ProjectOverview model={model} project={project} />
    </section>
  );
}
