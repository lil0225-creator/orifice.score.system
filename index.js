let people=[],teams=[];
const $=id=>document.getElementById(id);

// ===== LocalStorage =====
function saveData(){localStorage.setItem("orificeData",JSON.stringify({people,teams}));}
function loadData(){
  const raw=localStorage.getItem("orificeData");
  if(raw){try{const data=JSON.parse(raw);people=data.people||[];teams=data.teams||[];}catch(e){}}
}

function updateSummary(){
  const w=+$("win").value||0,l=+$("lose").value||0,r=+$("rest").value||0;
  let s=`現在のルール: 勝ち抜け${w} / 失格${l} / 誤答休${r}`;
  if($("teamMode").checked && $("limitToggle").checked){s+=` / 個人◯上限${+$("limit").value||0}`;}
  $("ruleSummary").textContent=s;
}

function addPerson(){const name=$("nameInput").value.trim();if(!name)return;people.push({name,maru:0,batsu:0,team:""});$("nameInput").value="";saveData();render();}
function deletePerson(i){people.splice(i,1);saveData();render();}
function addTeam(){const t=$("teamInput").value.trim();if(!t)return;if(!teams.includes(t))teams.push(t);$("teamInput").value="";saveData();render();}
function deleteAllPeople(){people=[];saveData();render();}
function deleteAllTeams(){teams=[];people.forEach(p=>p.team="");saveData();render();}
function changeScore(i,key,d){
  const p=people[i];p[key]+=d;
  if(key==='maru' && $("teamMode").checked && $("limitToggle").checked){const lim=+$("limit").value||0;if(p[key]>lim)p[key]=lim;}
  if(p[key]<0)p[key]=0;saveData();render();}
function saveName(i,v){people[i].name=(v||'').trim()||people[i].name;saveData();render();}

// ===== ドラッグ&ドロップ =====
function onDragStart(e,index){e.dataTransfer.setData("personIndex",index);}
function onDragOver(e){e.preventDefault();}
function onDropReorder(e,dropIndex){
  e.preventDefault();const dragIndex=e.dataTransfer.getData("personIndex");if(dragIndex==="")return;
  const moved=people.splice(dragIndex,1)[0];people.splice(dropIndex,0,moved);saveData();render();}
function onDropToTeam(e,team){
  e.preventDefault();const dragIndex=e.dataTransfer.getData("personIndex");if(dragIndex==="")return;
  people[dragIndex].team=team;saveData();render();}

function resetScores(){people.forEach(p=>{p.maru=0;p.batsu=0});saveData();render();}

function roll(btn){
  const sides=+btn.dataset.sides;btn.classList.add('shake');
  setTimeout(()=>{btn.classList.remove('shake');const val=Math.floor(Math.random()*sides)+1;(sides===6?$("d6"):$("d100")).textContent=val;},500);
}

// ===== Render =====
function render(){
  updateSummary();
  const w = +$("win").value || 0,
        l = +$("lose").value || 0;
  const teamMode = $("teamMode").checked;

  $("teamControls").classList.toggle('hidden', !teamMode);
  $("limitWrap").classList.toggle('hidden', !teamMode);
  $("diceWrap").style.display = $("diceToggle").checked ? 'block' : 'none';
  $("personDeleteControls").classList.toggle('hidden', !$("editMode").checked || teamMode);
  $("teamDeleteControls").classList.toggle('hidden', !$("editMode").checked || !teamMode);

  const main = $("main");
  main.innerHTML = '';

  if (!teamMode) {
    const wrap = document.createElement('div');
    wrap.className = 'cards';
    people.forEach((p,i)=>{
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute("draggable","true");
      card.setAttribute("ondragstart",`onDragStart(event,${i})`);
      card.setAttribute("ondrop",`onDropReorder(event,${i})`);
      card.setAttribute("ondragover","onDragOver(event)");

      if (p.maru >= w) card.innerHTML += `<div class="badge win">勝ち抜け</div>`;
      else if (l > 0 && p.batsu >= l) card.innerHTML += `<div class="badge lose">失格</div>`;

      if ($("editMode").checked) {
        card.innerHTML += `<input value="${p.name}" onblur="saveName(${i},this.value)" title="${p.name}" />`;
      } else {
        card.innerHTML += `<h3 class="name" title="${p.name}">${p.name}</h3>`;
      }

      card.innerHTML += `<div class="scores"><span class="maru">${p.maru}</span> - <span class="batsu">${p.batsu}</span></div>`;
      const ops = document.createElement('div');
      ops.className = 'ops';
      ops.innerHTML = `
        <button class="btn plus-m" onclick="changeScore(${i},'maru',1)">+</button>
        <button class="btn minus-m" onclick="changeScore(${i},'maru',-1)">-</button>
        <button class="btn plus-b" onclick="changeScore(${i},'batsu',1)">+</button>
        <button class="btn minus-b" onclick="changeScore(${i},'batsu',-1)">-</button>
        ${$("editMode").checked?`<button class='btn del-btn' onclick='deletePerson(${i})'>削除</button>`:''}
      `;
      card.appendChild(ops);
      wrap.appendChild(card);
    });
    main.appendChild(wrap);
  } else {
    const container = document.createElement('div');
    container.className = 'team-container';
    [...teams, '未所属'].forEach(t=>{
      const members = people.filter(p => (p.team || '未所属') === t);
      if (t === '未所属' && members.length === 0) return;

      const sumM = members.reduce((a,p)=>a+p.maru,0),
            sumB = members.reduce((a,p)=>a+p.batsu,0);
      const box = document.createElement('div');
      box.className = 'team-box';
      box.setAttribute("ondrop",`onDropToTeam(event,'${t}')`);
      box.setAttribute("ondragover","onDragOver(event)");

      const header = document.createElement('div');
      header.className = 'team-header';
      const winMark = sumM >= w ? `<span class='team-win'>WIN!</span>` : '';
      header.innerHTML = `<span>${t}</span><span>${sumM} - ${sumB} ${winMark}</span>`;
      box.appendChild(header);

      const table = document.createElement('table');
      table.innerHTML = `<thead><tr><th>名前</th><th>◯</th><th>✕</th><th>操作</th></tr></thead>`;
      const tbody = document.createElement('tbody');

      members.forEach(p=>{
        const i = people.indexOf(p);
        const tr = document.createElement('tr');
        tr.setAttribute("draggable","true");
        tr.setAttribute("ondragstart",`onDragStart(event,${i})`);

        let nameCell = `<td title="${p.name}">${p.name}`;
        if ($("limitToggle").checked && p.maru >= +$("limit").value) {
          nameCell += ` <span class="limit-inline">上限</span>`;
        }
        nameCell += `</td>`;

        if ($("editMode").checked) {
          tr.innerHTML = `
            <td><input value="${p.name}" onblur="saveName(${i},this.value)" title="${p.name}"></td>
            <td style="color:#ff1744;font-size:18px;">${p.maru}</td>
            <td style="color:#2979ff;font-size:18px;">${p.batsu}</td>
            <td>
              <button class="btn plus-m" onclick="changeScore(${i},'maru',1)">+</button>
              <button class="btn minus-m" onclick="changeScore(${i},'maru',-1)">-</button>
              <button class="btn plus-b" onclick="changeScore(${i},'batsu',1)">+</button>
              <button class="btn minus-b" onclick="changeScore(${i},'batsu',-1)">-</button>
              <button class="btn del-btn" onclick="deletePerson(${i})">削除</button>
            </td>`;
        } else {
          tr.innerHTML = `
            ${nameCell}
            <td style="color:#ff1744;font-size:18px;">${p.maru}</td>
            <td style="color:#2979ff;font-size:18px;">${p.batsu}</td>
            <td>
              <button class="btn plus-m" onclick="changeScore(${i},'maru',1)">+</button>
              <button class="btn minus-m" onclick="changeScore(${i},'maru',-1)">-</button>
              <button class="btn plus-b" onclick="changeScore(${i},'batsu',1)">+</button>
              <button class="btn minus-b" onclick="changeScore(${i},'batsu',-1)">-</button>
            </td>`;
        }
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      box.appendChild(table);
      container.appendChild(box);
    });
    main.appendChild(container);
  }
}

// ===== イベント登録 =====
window.onload=()=>{
  loadData();

  let imeActive=false;
  $("nameInput").addEventListener("compositionstart",()=>{imeActive=true;});
  $("nameInput").addEventListener("compositionend",()=>{imeActive=false;});
  $("nameInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!imeActive)addPerson();});
  $("teamInput").addEventListener("compositionstart",()=>{imeActive=true;});
  $("teamInput").addEventListener("compositionend",()=>{imeActive=false;});
  $("teamInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!imeActive)addTeam();});

  $("addBtn").onclick=addPerson;
  $("teamAddBtn").onclick=addTeam;
  $("resetBtn").onclick=resetScores;

  $("teamMode").onchange=render;
  $("editMode").onchange=render;
  $("diceToggle").onchange=render;

  ["win","lose","rest","limit","limitToggle"].forEach(id=>{$(id).oninput=updateSummary;});
  document.addEventListener('click',e=>{if(e.target.classList.contains('die'))roll(e.target);});

  updateSummary();
  render();
};
