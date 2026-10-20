import {escapeHtml as esc} from '../views/html.mjs';

const AUTHOR_LIMIT=40,COMMENT_LIMIT=2000;
const sampleComments=[
 {author:'박대호',text:'이 작업은 구현 결과를 먼저 보고 완료 여부를 확인하면 좋겠습니다.',time:'예시',sample:true},
 {author:'codex',text:'확인할 수 있는 화면과 검증 결과를 함께 정리하겠습니다.',time:'예시',sample:true}
];

// 임시 확인용: 문서나 사용자 설정을 변경하지 않고 창을 연 동안만 보관한다.
export function createCommentsPreview(){
 const threads=new Map();let current=null,author='박대호';
 const thread=(path,id)=>{const key=JSON.stringify([path,id]);if(!threads.has(key))threads.set(key,{tab:'info',draft:'',comments:sampleComments.map(comment=>({...comment}))});return threads.get(key);};
 const commentsHtml=state=>state.comments.map(comment=>`<article class="preview-comment"><div class="preview-comment-avatar" aria-hidden="true">${esc(comment.author.slice(0,1))}</div><div class="preview-comment-content"><header><strong>${esc(comment.author)}</strong>${comment.sample?'<span class="preview-sample">예시</span>':''}<time>${esc(comment.time)}</time></header><p>${esc(comment.text)}</p></div></article>`).join('');
 const controls=state=>`<div class="detail-preview-tabs" role="tablist" aria-label="작업 상세 보기"><button id="previewInfoTab" type="button" role="tab" data-preview-tab="info" aria-selected="${state.tab==='info'}" aria-controls="previewInfoPanel" tabindex="${state.tab==='info'?0:-1}">작업 정보</button><button id="previewCommentsTab" type="button" role="tab" data-preview-tab="comments" aria-selected="${state.tab==='comments'}" aria-controls="previewCommentsPanel" tabindex="${state.tab==='comments'?0:-1}">댓글 <span>${state.comments.length}</span></button></div>`;
 return {
  render(path,id,body){
   const state=thread(path,id);current={state};
   return controls(state)+`<section id="previewInfoPanel" role="tabpanel" aria-labelledby="previewInfoTab"${state.tab==='info'?'':' hidden'}>${body}</section><section id="previewCommentsPanel" role="tabpanel" aria-labelledby="previewCommentsTab"${state.tab==='comments'?'':' hidden'}><div class="comments-preview-notice"><strong>댓글 UI 미리보기</strong><p>예시 대화가 포함되어 있습니다. 작성한 댓글은 현재 창에서만 유지되며 파일에 저장되지 않습니다.</p></div><div class="preview-thread" aria-label="댓글 목록">${commentsHtml(state)}</div><form class="preview-comment-form"><div class="preview-composer-heading"><h3>댓글 작성</h3><span>이 작업에 의견 남기기</span></div><label for="previewAuthor">작성자 이름</label><input id="previewAuthor" name="author" maxlength="${AUTHOR_LIMIT}" value="${esc(author)}" required autocomplete="off"><label for="previewComment">내용</label><textarea id="previewComment" name="comment" rows="4" maxlength="${COMMENT_LIMIT}" required placeholder="질문, 검토 의견이나 결정 내용을 남겨 주세요.">${esc(state.draft)}</textarea><div class="preview-composer-actions"><small>Ctrl+Enter로 등록 · 임시 보관</small><button type="submit">댓글 등록</button></div><p class="preview-comment-feedback" role="status" aria-live="polite"></p></form></section>`;
  },
  click(event,root){
   const button=event.target.closest('[data-preview-tab]');if(!button||!current)return false;
   current.state.tab=button.dataset.previewTab;
   for(const tab of root.querySelectorAll('[data-preview-tab]')){const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
   root.querySelector('#previewInfoPanel').hidden=current.state.tab!=='info';root.querySelector('#previewCommentsPanel').hidden=current.state.tab!=='comments';return true;
  },
  input(event){if(!current)return;if(event.target.name==='comment')current.state.draft=event.target.value;if(event.target.name==='author')author=event.target.value;},
  keydown(event,root){
   const tab=event.target.closest('[data-preview-tab]');
   if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();const buttons=[...root.querySelectorAll('[data-preview-tab]')];const index=event.key==='Home'?0:event.key==='End'?1:(buttons.indexOf(tab)+1)%2;buttons[index].click();buttons[index].focus();
   }else if(event.ctrlKey&&event.key==='Enter'&&event.target.name==='comment'){event.preventDefault();event.target.form.requestSubmit();}
  },
  submit(event,root){
   if(!event.target.matches('.preview-comment-form')||!current)return;event.preventDefault();
   const form=event.target,name=form.elements.namedItem('author').value.trim(),text=form.elements.namedItem('comment').value.trim();
   const feedback=form.querySelector('[role="status"]');
   if(!name||!text||name.length>AUTHOR_LIMIT||text.length>COMMENT_LIMIT){feedback.textContent='작성자 이름과 댓글 내용을 입력해 주세요.';return;}
   author=name;current.state.comments.push({author:name,text,time:new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date()),sample:false});current.state.draft='';
   root.querySelector('.preview-thread').innerHTML=commentsHtml(current.state);root.querySelector('#previewCommentsTab span').textContent=String(current.state.comments.length);form.elements.namedItem('comment').value='';feedback.textContent='댓글을 임시로 등록했습니다. 파일에는 저장되지 않습니다.';
  }
 };
}
