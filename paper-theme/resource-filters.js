/* User-requested subject and textbook filters; original runtime and application plaza remain intact. */
(() => {
  'use strict';
  const subjects = ['推荐','语文','数学','英语','物理','化学','信息科技','其他'];
  const editions = ['全部','人教版','北师大版','苏教版','未标注'];
  // Retain the original subject classification. No textbook edition is inferred from a title.
  const metadata = {
    A45760493DA8ECA44A316EA2BB54A041:{subject:'其他',edition:null},
    '314B268E642DBAE685F47391A9CCDDC4':{subject:'数学',edition:null},
    '2D1E52CBB465EE8981405653A46D4C37':{subject:'其他',edition:null},
    '66FEA6B38E058EDAB62E4117D0F43DE7':{subject:'数学',edition:null},
    '8A7E82D22F0DF49599F56674103EC2ED':{subject:'数学',edition:null},
    A99596AA4DC295A7B8EA5548673DFCEB:{subject:'数学',edition:null},
  };
  let mounted, pending=false;
  const attached = node => Object.keys(node).some(key=>key.startsWith('__reactProps$'));
  function group(label, values, kind, onChange) {
    const row=document.createElement('div');row.className='rw-filter-row rw-filter-'+kind;
    row.setAttribute('role','group');row.setAttribute('aria-label',label);
    const caption=document.createElement('span');caption.className='rw-filter-label';caption.textContent=label;row.append(caption);
    for(const value of values){const button=document.createElement('button');button.type='button';button.textContent=value;button.dataset.value=value;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>onChange(value));row.append(button);}
    return row;
  }
  function update() {
    pending=false;
    if(location.pathname!=='/plaza/resource'){mounted=null;return;}
    const heading=[...document.querySelectorAll('h1')].find(n=>n.textContent==='教学资源');
    const scroll=heading?.parentElement?.parentElement;
    if(!scroll||!attached(heading))return;
    if(!mounted||mounted.scroll!==scroll||!mounted.subjectRow.isConnected){
      const children=[...scroll.children];
      const nativeSubjects=children.find(n=>n.classList.contains('mt-7'));
      const grades=children.find(n=>n.firstElementChild?.textContent==='年级');
      const results=children.find(n=>n.classList.contains('mt-6'));
      if(!nativeSubjects||!grades||!results)return;
      nativeSubjects.dataset.rwNativeSubjects='';
      const state={scroll,nativeSubjects,grades,results,subject:'推荐',edition:'全部'};
      state.subjectRow=group('学科',subjects,'subjects',v=>{state.subject=v;apply(state);});
      state.editionRow=group('教材版本',editions,'editions',v=>{state.edition=v;apply(state);});
      state.empty=document.createElement('div');state.empty.className='rw-filter-empty';state.empty.setAttribute('role','status');
      const message=document.createElement('p');message.textContent='暂无符合条件的资源';
      const note=document.createElement('p');note.className='rw-filter-note';
      const reset=document.createElement('button');reset.type='button';reset.textContent='清空筛选';
      reset.addEventListener('click',()=>{state.subject='推荐';state.edition='全部';[...grades.querySelectorAll('button')].find(b=>b.textContent==='全部')?.click();apply(state);});
      state.empty.append(message,note,reset);state.note=note;
      nativeSubjects.before(state.subjectRow);grades.after(state.editionRow);results.after(state.empty);
      mounted=state;
    }
    apply(mounted);
  }
  function apply(state){
    if(!state.subjectRow.isConnected)return;
    for(const [row,value] of [[state.subjectRow,state.subject],[state.editionRow,state.edition]])for(const b of row.querySelectorAll('button')){const next=String(b.dataset.value===value);if(b.getAttribute('aria-pressed')!==next)b.setAttribute('aria-pressed',next);}
    let count=0;
    for(const card of state.results.querySelectorAll('a[href*="/share/"]')){
      const id=new URL(card.href,location.href).pathname.split('/').pop();const info=metadata[id]||{subject:'其他',edition:null};
      const visible=(state.subject==='推荐'||state.subject===info.subject)&&(state.edition==='全部'||state.edition===(info.edition||'未标注'));
      if(visible){card.removeAttribute('data-rw-filter-hidden');count++;}else card.setAttribute('data-rw-filter-hidden','');
    }
    state.results.toggleAttribute('data-rw-filter-no-results',count===0);
    state.empty.hidden=count!==0;
    const note=state.edition!=='全部'&&state.edition!=='未标注'?'当前资源尚未标注教材版本，可切换“全部”或“未标注”查看。':'试试其他学科、年级或教材版本。';
    if(state.note.textContent!==note)state.note.textContent=note;
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href']});
  addEventListener('popstate',schedule);addEventListener('pageshow',schedule);
  let url=location.href;setInterval(()=>{if(location.href!==url||(!mounted&&location.pathname==='/plaza/resource')){url=location.href;schedule();}},200);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
})();
