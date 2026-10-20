export function splitTableCells(line){
 return line.trim().replace(/^\||\|$/g,'').split('|').map(value=>value.trim().replaceAll('&#124;','|'));
}

// Retain source positions so parsing and error details use the same table boundary.
export function findWorkTable(markdown){
 const lines=markdown.replace(/^\uFEFF/,'').split(/\r?\n/);
 const sectionStart=lines.findIndex(line=>/^## 작업 목록\s*$/.test(line));
 if(sectionStart<0)return {sectionFound:false,table:[]};
 let sectionEnd=lines.findIndex((line,index)=>index>sectionStart&&/^##(?:\s|$)/.test(line));
 if(sectionEnd<0)sectionEnd=lines.length;
 const start=lines.findIndex((line,index)=>index>sectionStart&&index<sectionEnd&&line.trim().startsWith('|'));
 const table=[];
 if(start>=0){
  for(let index=start;index<sectionEnd&&lines[index].trim().startsWith('|');index++){
   table.push({raw:lines[index],line:index+1,cells:splitTableCells(lines[index])});
  }
 }
 return {sectionFound:true,table};
}

export function isTableSeparator(cells,columnCount){
 return cells?.length===columnCount&&cells.every(value=>/^:?-{3,}:?$/.test(value));
}
