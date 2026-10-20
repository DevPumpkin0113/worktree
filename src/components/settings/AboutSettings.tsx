import { useAppInfo } from '../../hooks/use-app-info';
import { BuildInformation } from './BuildInformation';
import { UpdateSettings } from './UpdateSettings';
import { IssueReport } from './IssueReport';
import type { WorkspaceStore } from '../../app/workspace-store';
export function AboutSettings({ store }: { store: WorkspaceStore }) {
  const app = useAppInfo(store.platform, store.storage);
  return (
    <>
      <div className="settings-page-heading">
        <h3>앱 정보</h3>
      </div>
      <BuildInformation build={app.build} error={app.buildError} />
      <UpdateSettings app={app} settingsReady={store.getSnapshot().settings.ready} />
      <IssueReport app={app} />
    </>
  );
}
