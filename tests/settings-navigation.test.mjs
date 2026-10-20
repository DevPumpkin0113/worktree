import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setupSettingsNavigation} from '../src/interactions/settings-navigation.mjs';

test('설정 메뉴는 한 본문만 표시하며 키보드 이동·포커스와 초기화를 지원한다',()=>{
 const elements=new Map();
 const root={getElementById(id){if(!elements.has(id))elements.set(id,{hidden:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},classList:{toggle(){}},focus(){focused=id;}});return elements.get(id);}};
 let focused='',prevented=false;
 const nav=setupSettingsNavigation(root),display=root.getElementById('settingsDisplayTab'),about=root.getElementById('settingsAboutTab');
 assert.equal(root.getElementById('settingsDisplayPage').hidden,false);assert.equal(root.getElementById('settingsAboutPage').hidden,true);assert.equal(about.tabIndex,-1);
 display.onkeydown({key:'ArrowDown',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(focused,'settingsAboutTab');assert.equal(about.attributes['aria-selected'],'true');assert.equal(root.getElementById('settingsDisplayPage').hidden,true);
 about.onkeydown({key:'ArrowDown',preventDefault(){}});assert.equal(focused,'settingsDisplayTab');
 display.onkeydown({key:'End',preventDefault(){}});assert.equal(focused,'settingsAboutTab');about.onkeydown({key:'Home',preventDefault(){}});assert.equal(focused,'settingsDisplayTab');
 about.onclick();assert.equal(root.getElementById('settingsAboutPage').hidden,false);nav.activate('display');assert.equal(root.getElementById('settingsAboutPage').hidden,true);assert.equal(display.attributes['aria-selected'],'true');
});
