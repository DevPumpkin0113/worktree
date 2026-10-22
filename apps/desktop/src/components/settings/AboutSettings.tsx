import { messages } from '../../i18n/messages';
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
      <div className="settings-page-heading">
        <h3>{messages.aboutApp}</h3>
      </div>
      <BuildInformation build={app.build} error={app.buildError} />
      <UpdateSettings app={app} settingsReady={settingsReady} />
      <IssueReport app={app} />
    </>
  );
}
