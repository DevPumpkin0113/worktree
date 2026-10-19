const KEY='worktree.detail-mode';
export function readDetailMode(storage){try{return storage.getItem(KEY)==='modal'?'modal':'sidebar';}catch{return 'sidebar';}}
export function saveDetailMode(storage,value){if(!['modal','sidebar'].includes(value))throw Error('잘못된 상세 표시 방식입니다.');storage.setItem(KEY,value);}
