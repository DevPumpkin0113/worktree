import {escapeHtml as escape} from './html.mjs';
import {problemLocation} from '../domain/document-errors.mjs';

export function renderDocumentErrors(problems){
 return problems.map((problem,index)=>`<article class="problem-card"><div class="problem-card-heading"><div><div class="problem-kind">${escape(problem.kind)} · ${escape(problemLocation(problem))}</div><h3>${escape(problem.id?problem.id+' · '+problem.name:problem.kind)}</h3></div><button type="button" class="problem-copy" data-copy-problem="${index}">오류 복사</button></div>${problem.source?`<p class="problem-source">${escape(problem.source)}</p>`:''}<dl><dt>원인</dt><dd>${escape(problem.reason)}</dd>${problem.field?`<dt>문제 필드</dt><dd>${escape(problem.field)}</dd><dt>입력된 값</dt><dd><code>${escape(problem.value)}</code></dd>`:''}<dt>수정 안내</dt><dd>${escape(problem.hint)}</dd></dl>${problem.raw?`<details class="problem-original"><summary>관련 원문 보기 · ${escape(problemLocation(problem))}</summary><div class="problem-source-actions"><button type="button" class="problem-copy" data-copy-source="${index}">원문 복사</button></div><pre>${escape(problem.raw)}</pre></details>`:''}</article>`).join('');
}
