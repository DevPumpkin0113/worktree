const AUTO_CHECK_KEY='worktree.autoCheckUpdates';

export function setupAppInfo({document,storage,invoke,makeChannel,now=()=>new Date()}){
 const $=id=>document.getElementById(id);
 let busy=false,available=false,auto=true;
 try{auto=storage.getItem(AUTO_CHECK_KEY)!=='false';}catch{}
 $('autoCheckUpdates').checked=auto;
 const message=(title,description)=>{$('updateTitle').textContent=title;$('updateDescription').textContent=description;};
 const setBusy=value=>{busy=value;$('checkUpdates').disabled=value;$('installUpdate').disabled=value||!available;$('updateStatus').setAttribute('aria-busy',String(value));};
 async function check(){
  if(busy)return;
  available=false;setBusy(true);$('updateNotes').hidden=true;$('updateNotesSection').hidden=true;$('updateProgress').hidden=true;$('releasePage').hidden=true;
  message('업데이트 확인 중','GitHub 정식 릴리즈를 확인하고 있습니다.');
  try{
   const result=await invoke('check_app_update');
   const messages={
    latest:['최신 버전입니다',`현재 버전 ${result.version}을 사용 중입니다.`],
    ahead:['개발 버전을 사용 중입니다',`현재 앱은 최신 정식 버전 ${result.version}보다 앞서 있습니다.`],
    'no-release':['공개된 릴리즈가 없습니다','정식 릴리즈가 등록되면 안내합니다.'],
    manual:[`새 버전 ${result.version}이 있습니다`,'이 릴리즈는 앱 내 설치를 지원하지 않습니다. 릴리즈에서 설치 파일을 받아주세요.'],
    available:[`새 버전 ${result.version}이 있습니다`,'다운로드 후 서명을 검증합니다. 설치를 시작하면 앱이 종료됩니다.'],
   };
   if(!messages[result.kind])throw new Error('올바르지 않은 업데이트 응답입니다.');
   available=result.kind==='available';message(...messages[result.kind]);
   $('releasePage').hidden=result.kind!=='manual';
   $('updateNotes').textContent=result.notes||'';$('updateNotes').hidden=!result.notes;$('updateNotesSection').hidden=!result.notes;
   $('updateCheckedAt').textContent='마지막 확인: '+now().toLocaleString('ko-KR');
  }catch(error){message('업데이트 확인에 실패했습니다',String(error.message||error));}
  finally{setBusy(false);}
 }
 async function install(){
  if(busy||!available)return;
  setBusy(true);message('설치 확인 대기','확인 창에서 설치 여부를 선택하세요.');
  const progress=$('updateProgress');
  try{
   const channel=makeChannel(event=>{
    progress.hidden=false;
    if(event.phase==='installing'){
     progress.value=100;message('설치 시작 중','서명 검증을 마쳤습니다. 설치 프로그램이 실행되면 앱이 종료됩니다.');
    }else{
     const percent=event.total?Math.min(100,Math.round(event.downloaded/event.total*100)):null;
     if(percent===null)progress.removeAttribute('value');else progress.value=percent;
     message('업데이트 다운로드 중',percent===null?`${(event.downloaded/1048576).toFixed(1)} MB 다운로드됨`:`${percent}% · 다운로드 후 서명을 검증합니다.`);
    }
   });
   const installed=await invoke('install_app_update',{onProgress:channel});
   if(!installed){progress.hidden=true;message('설치를 취소했습니다','다운로드 및 설치 버튼으로 다시 시작할 수 있습니다.');}
  }catch(error){progress.hidden=true;message('업데이트를 설치하지 못했습니다',String(error.message||error));}
  finally{setBusy(false);}
 }
 $('checkUpdates').onclick=check;$('installUpdate').onclick=install;
 $('autoCheckUpdates').onchange=async()=>{
  $('autoCheckUpdates').disabled=true;
  try{await storage.setItem(AUTO_CHECK_KEY,String($('autoCheckUpdates').checked));auto=$('autoCheckUpdates').checked;$('updatePreferenceError').textContent='';}
  catch{$('autoCheckUpdates').checked=auto;$('updatePreferenceError').textContent='자동 확인 설정을 저장하지 못했습니다.';}
  finally{$('autoCheckUpdates').disabled=false;}
 };
 $('reportIssue').onclick=async()=>{
  $('reportIssue').disabled=true;$('issueFeedback').textContent='';
  try{await invoke('open_issue_report');$('issueFeedback').textContent='브라우저에서 내용을 작성한 후 제출하세요.';}
  catch(error){$('issueFeedback').textContent=String(error.message||error);}
  finally{$('reportIssue').disabled=false;}
 };
 $('releasePage').onclick=async()=>{try{await invoke('open_releases');}catch(error){message('브라우저를 열지 못했습니다',String(error.message||error));}};
 const ready=(async()=>{
  try{
   const info=await invoke('get_build_info');
   $('appVersion').textContent='버전 '+info.version;
   $('buildChannel').textContent=info.channel==='release'?'정식 배포':'개발용';
   const date=new Date(Number(info.builtAt)*1000);
   $('buildTime').textContent=Number.isNaN(date.valueOf())?'확인 불가':date.toLocaleString('ko-KR');
   $('buildCommit').textContent=info.commit;$('buildPlatform').textContent=info.platform;
  }catch{$('buildTime').textContent='빌드 정보를 불러오지 못했습니다.';}
  if(auto)await check();
 })();
 return {check,install,ready};
}
