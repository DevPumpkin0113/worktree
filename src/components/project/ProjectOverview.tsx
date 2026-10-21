import { STATUS_NAMES, TYPE_NAMES, type WorkModel } from '../../app/types';
export function ProjectOverview({ model, path }: { model: WorkModel; path: string | null }) {
  const facts = [
    ['프로젝트 이름', model.title],
    ['원본 문서', path ?? '—'],
    ['ID 접두어', model.idPrefix],
    ['공수 사용', model.useEffort ? '사용' : '사용 안 함'],
  ];
  return (
    <div className="project-overview">
      <p className="project-management-notice">
        현재 열린 WBS를 기준으로 표시합니다. 변경은 원본 문서에서 진행해 주세요.
      </p>
      <section className="project-management-section">
        <h3>기본 정보</h3>
        <dl>
          {facts.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="project-management-section">
        <h3>작업 규칙</h3>
        <dl>
          <div>
            <dt>작업 유형</dt>
            <dd>{Object.values(TYPE_NAMES).join(' · ')}</dd>
          </div>
          <div>
            <dt>작업 상태</dt>
            <dd>{Object.values(STATUS_NAMES).join(' · ')}</dd>
          </div>
        </dl>
        <p className="project-rule-note">작업 유형과 상태는 현재 공통 규격을 사용합니다.</p>
      </section>
    </div>
  );
}
