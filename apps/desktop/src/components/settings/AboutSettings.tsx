import type { useAppInfo } from '../../hooks/use-app-info';
import { BuildInformation } from './BuildInformation';
import { UpdateSettings } from './UpdateSettings';
import { IssueReport } from './IssueReport';
export function AboutSettings({
  app,
  settingsReady,
}: {
  app: ReturnType<typeof useAppInfo>;
  settingsReady: boolean;
}) {
  return (
    <>
      <BuildInformation build={app.build} error={app.buildError} />
      <UpdateSettings app={app} settingsReady={settingsReady} />
      <IssueReport app={app} />
    </>
  );
}
