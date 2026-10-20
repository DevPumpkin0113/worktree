import { summarizeGroups } from '../../domain/group-summary';
import { groupEffort, groupProgress, groupSchedule } from '../../views/group-summary';
import { STATUS_NAMES, type WorkModel, type WorkRow } from '../../app/types';
export function TaskInfo({
  row,
  model,
  label,
  onSelect,
}: {
  row: WorkRow;
  model: WorkModel;
  label: (id: string) => string;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(model.rows.map((item) => [item.id, item]));
  const ancestors: WorkRow[] = [];
  let parent = byId.get(row.parent);
  while (parent) {
    ancestors.unshift(parent);
    parent = byId.get(parent.parent);
  }
  const children = model.rows.filter((item) => item.parent === row.id),
    previous = row.deps.map((id) => byId.get(id)!).filter(Boolean),
    next = model.rows.filter((item) => item.deps.includes(row.id));
  const group = row.type === 'group' ? summarizeGroups(model.rows).get(row.id) : null;
  const facts = group
    ? [
        ['집계 일정', groupSchedule(group)],
        ['집계 공수', groupEffort(group)],
        ['하위 작업', group.completedTasks + ' / ' + group.taskCount + ' 완료'],
        ['마일스톤', group.completedMilestones + ' / ' + group.milestoneCount + ' 완료'],
        ['진척도', groupProgress(group)],
      ]
    : [
        ['담당자', row.owner === '-' ? '미정' : row.owner],
        ['예상 공수', row.effort === '-' ? '미정' : row.effort + ' h'],
        ['시작일', row.start === '-' ? '미정' : row.start],
        ['종료일', row.end === '-' ? '미정' : row.end],
      ];
  const links = (items: WorkRow[]) =>
    items.length ? (
      items.map((item) => (
        <button
          className="detail-link"
          key={item.id}
          data-detail={item.id}
          onClick={() => onSelect(item.id)}
        >
          <span className="detail-link-id">{label(item.id)}</span>
          <span className="detail-link-name">{item.name}</span>
          <span className={'detail-status ' + item.status}>{STATUS_NAMES[item.status]}</span>
          <span aria-hidden="true">›</span>
        </button>
      ))
    ) : (
      <p className="detail-empty">연결된 작업이 없습니다.</p>
    );
  return (
    <>
      <nav className="detail-breadcrumb" aria-label="상위 작업">
        {ancestors.length ? (
          ancestors.map((item) => (
            <button key={item.id} data-detail={item.id} onClick={() => onSelect(item.id)}>
              {item.name}
            </button>
          ))
        ) : (
          <span>최상위 작업</span>
        )}
      </nav>
      <div className="detail-facts">
        {facts
          .filter(
            ([name]) => model.useEffort || !['집계 공수', '예상 공수', '진척도'].includes(name),
          )
          .map(([name, value]) => (
            <div className="detail-fact" key={name}>
              <span>{name}</span>
              <strong>{value}</strong>
            </div>
          ))}
      </div>
      <section className="detail-section criteria-section">
        <div className="detail-section-heading">
          <h3>산출물 / 완료 기준</h3>
          {row.status === 'done' ? <span className="detail-complete">✓ 완료로 기록됨</span> : null}
        </div>
        <p className="detail-criteria">{row.criteria || '완료 기준이 없습니다.'}</p>
        {row.status === 'blocked' ? (
          <p className="detail-blocked">
            진행이 막힌 작업입니다. 원본 문서의 이슈 및 결정 사항에서 원인과 해소 조건을 확인하세요.
          </p>
        ) : null}
      </section>
      {children.length ? (
        <section className="detail-section">
          <h3>
            하위 작업 <span>{children.length}</span>
          </h3>
          {links(children)}
        </section>
      ) : null}
      <div className="detail-relations">
        {[
          ['선행 작업', previous],
          ['후속 작업', next],
        ].map(([name, items]) => (
          <section className="detail-section" key={name as string}>
            <h3>
              {name as string} <span>{(items as WorkRow[]).length}</span>
            </h3>
            <p className="detail-section-note">
              {name === '선행 작업'
                ? '이 작업보다 먼저 끝나야 하는 작업'
                : '이 작업이 끝난 뒤 이어지는 작업'}
            </p>
            {links(items as WorkRow[])}
          </section>
        ))}
      </div>
      <details className="detail-identifiers">
        <summary>식별 정보</summary>
        <dl>
          <dt>표시 ID</dt>
          <dd>{label(row.id)}</dd>
          <dt>원본 ID</dt>
          <dd>{row.id}</dd>
          <dt>상위 ID</dt>
          <dd>{row.parent === '-' ? '없음' : row.parent}</dd>
        </dl>
      </details>
    </>
  );
}
