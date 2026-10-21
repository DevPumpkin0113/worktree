import { Metrics } from './Metrics';
import type { WorkModel } from '../../app/types';
export function Analytics({ model }: { model: WorkModel | null }) {
  return (
    <>
      <section className="analytics-intro">
        <span className="workspace-eyebrow">PROJECT INSIGHTS</span>
        <h2>진행 상황을 한눈에</h2>
        <p>현재 문서의 작업 완료 현황을 확인하세요.</p>
      </section>
      {model ? (
        <Metrics rows={model.rows} useEffort={model.useEffort} />
      ) : (
        <p className="empty">WBS 문서를 열면 진행 현황이 표시됩니다.</p>
      )}
      <div className="analytics-grid">
        {[
          ['진행 추이', '시간에 따른 작업 완료 흐름'],
          ['작업 현황', '상태별 작업과 병목 파악'],
          ['팀 작업 분포', '담당자별 진행 상황'],
        ].map(([title, description]) => (
          <section className="analytics-card" key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
            <div className="analytics-placeholder" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <i key={index} />
              ))}
            </div>
            <small>분석 데이터가 연결되면 이곳에 표시됩니다.</small>
          </section>
        ))}
      </div>
    </>
  );
}
