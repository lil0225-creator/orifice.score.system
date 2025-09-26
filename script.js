let people = [], teams = [];
let teamStates = {}; // { teamName: { status:"normal"|"win", lastSumM:number } }
const $ = id => document.getElementById(id);

// ===== LocalStorage =====
function saveData(){
  localStorage.setItem("orificeData", JSON.stringify({ people, teams }));
}
function loadData(){
  const raw = localStorage.getItem("orificeData");
  if(raw){
    try{
      const data = JSON.parse(raw);
      people = data.people || [];
      teams  = data.teams  || [];
    }catch(e){}
  }
}

// ===== People / Teams =====
function addPerson(){
  const name = $("nameInput").value.trim();
  if(!name) return;
  people.push({ name, maru:0, batsu:0, team:"", status:"normal", _lastMaru:0, _lastBatsu:0 });
  $("nameInput").value = "";
  saveData(); render();
}
function deletePerson(i){
  people.splice(i,1);
  saveData(); render();
}
function addTeam(){
  const t = $("teamInput").value.trim();
  if(!t) return;
  if(!teams.includes(t)) teams.push(t);
  $("teamInput").value = "";
  saveData(); render();
}
function deleteAllPeople(){ people = []; saveData(); render(); }
function deleteAllTeams(){ teams = []; people.forEach(p => p.team=""); teamStates={}; saveData(); render(); }
function deleteTeam(teamName){
  teams = teams.filter(t => t !== teamName);
  people.forEach(p => { if(p.team === teamName) p.team = ""; });
  delete teamStates[teamName];
  saveData(); render();
}

// ===== Scores =====
function changeScore(i, key, d){
  const p = people[i];
  p[key] += d;

  if(key === 'maru' && $("teamMode").checked && $("limitToggle")?.checked){
    const lim = +$("limit").value || 0;
    if(p[key] > lim) p[key] = lim;
  }
  if(p[key] < 0) p[key] = 0;
  saveData(); render();
}
function saveName(i, v){
  people[i].name = (v || '').trim() || people[i].name;
  saveData(); render();
}
function resetScores(){
  people.forEach(p => { 
    p.maru = 0; 
    p.batsu = 0; 
    p.status = "normal"; 
    p._lastMaru = 0; 
    p._lastBatsu = 0;
  });
  teamStates = {};
  saveData(); render();
}

// ===== Dice =====
function roll(btn){
  const sides = +btn.dataset.sides;
  btn.classList.add('shake');
  setTimeout(() => {
    btn.classList.remove('shake');
    const val = Math.floor(Math.random()*sides) + 1;
    (sides===6 ? $("d6") : $("d100")).textContent = val;
  }, 500);
}

// ===== DnD =====
function onDragStart(e, index){
  e.dataTransfer.setData("personIndex", index);
  e.target.classList.add("dragging");
}
function onDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}
function onDropReorder(e, dropIndex){
  e.preventDefault();
  const dragIndex = parseInt(e.dataTransfer.getData("personIndex"));
  if(isNaN(dragIndex)) return;
  if(dragIndex === dropIndex) return;

  const moved = people.splice(dragIndex, 1)[0];
  people.splice(dropIndex, 0, moved);
  saveData(); render();
}
function onDragEnd(e){
  e.target.classList.remove("dragging");
}
function onDropToTeam(e, team){
  e.preventDefault();
  const dragIndex = e.dataTransfer.getData("personIndex");
  if(dragIndex === "") return;
  people[dragIndex].team = team;
  saveData(); render();
}

// ===== カットイン =====
function showCutin(text){
  const el = $("cutin");
  const span = $("cutinText");
  if(!el || !span) return;
  span.textContent = text;
  el.classList.remove("show"); void el.offsetWidth;
  el.classList.add("show");
  setTimeout(()=> el.classList.remove("show"), 2000);
}
function showCutinLose(text){
  const el = $("cutinLose");
  const span = $("cutinLoseText");
  if(!el || !span) return;
  span.textContent = text;
  el.classList.remove("show"); void el.offsetWidth;
  el.classList.add("show");
  setTimeout(()=> el.classList.remove("show"), 2000);
}
function showCutinReach(text){
  const el = $("cutinReach");
  const span = $("cutinReachText");
  if(!el || !span) return;
  span.textContent = text;
  el.classList.remove("show"); void el.offsetWidth;
  el.classList.add("show");
  setTimeout(()=> el.classList.remove("show"), 2000);
}
function showCutinDanger(text){
  const el = $("cutinDanger");
  const span = $("cutinDangerText");
  if(!el || !span) return;
  span.textContent = text;
  el.classList.remove("show"); void el.offsetWidth;
  el.classList.add("show");
  setTimeout(()=> el.classList.remove("show"), 2000);
}

// ===== Render =====
function render(){
  const w = +$("win").value  || 0;
  const l = +$("lose").value || 0;
  const teamMode = $("teamMode").checked;

  if($("limitWrap")) $("limitWrap").classList.toggle('hidden', !teamMode);
  if($("teamAddBtn")) $("teamAddBtn").classList.toggle('hidden', !teamMode);
  if($("teamInput"))  $("teamInput").classList.toggle('hidden', !teamMode);
  if($("diceWrap")) $("diceWrap").style.display = $("diceToggle").checked ? 'block' : 'none';

  const main = $("main");
  if(!main) return;
  main.innerHTML = '';

  // === 個人戦 ===
  if(!teamMode){
    const panel = document.createElement('section');
    panel.className = 'panel';

    if($("editMode").checked){
      const delAllBtn = document.createElement('button');
      delAllBtn.textContent = "全削除";
      delAllBtn.className = "btn del-btn";
      delAllBtn.onclick = deleteAllPeople;
      panel.appendChild(delAllBtn);
    }

    const wrap = document.createElement('div');
    wrap.className = 'cards';

    people.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute("draggable", "true");
      card.setAttribute("ondragstart", `onDragStart(event, ${i})`);
      card.setAttribute("ondrop",      `onDropReorder(event, ${i})`);
      card.setAttribute("ondragover",  "onDragOver(event)");
      card.setAttribute("ondragend",   "onDragEnd(event)");

      // --- 状態判定 ---
      let newStatus = "normal";
      if(p.maru >= w) newStatus = "win";
      else if(l > 0 && p.batsu >= l) newStatus = "lose";

      card.classList.remove("win-state", "lose-state");
      if(newStatus === "win") card.classList.add("win-state");
      if(newStatus === "lose") card.classList.add("lose-state");

      if(newStatus !== p.status){
        if(newStatus === "win"){
          requestAnimationFrame(()=>{
            card.classList.add("win-animate");
            setTimeout(()=>card.classList.remove("win-animate"),1200);
            showCutin(`${p.name} 勝ち抜け！`);
          });
        } else if(newStatus === "lose"){
          requestAnimationFrame(()=>{
            card.classList.add("lose-animate");
            setTimeout(()=>card.classList.remove("lose-animate"),800);
            showCutinLose(`${p.name} 失格…`);
          });
        }
      }

      // リーチ／ピンチ判定
      const reach = (newStatus === "normal" && w > 0 && p.maru === w - 1);
      const danger = (newStatus === "normal" && l > 0 && p.batsu === l - 1);

      if(reach && p._lastMaru !== p.maru) showCutinReach(`${p.name} リーチ！`);
      if(danger && p._lastBatsu !== p.batsu) showCutinDanger(`${p.name} ピンチ！`);

      // 前回スコア記録
      p._lastMaru = p.maru;
      p._lastBatsu = p.batsu;
      p.status = newStatus;

      // 名前
      if($("editMode").checked){
        card.innerHTML += `<input value="${p.name}" onblur="saveName(${i}, this.value)" title="${p.name}" />`;
      }else{
        card.innerHTML += `<h3 class="name" title="${p.name}">${p.name}</h3>`;
      }

      // スコア表示
      card.innerHTML += `<div class="scores"><span class="maru">${p.maru}</span> - <span class="batsu">${p.batsu}</span></div>`;

      // リーチ／ピンチラベル
      if(newStatus === "normal"){
        if(reach && danger){
          card.innerHTML += `<div class="status-label status-double">ダブルリーチ</div>`;
        } else if(reach){
          card.innerHTML += `<div class="status-label status-reach">リーチ</div>`;
        } else if(danger){
          card.innerHTML += `<div class="status-label status-danger">ピンチ</div>`;
        }
      }

      // 操作ボタン
      const ops = document.createElement('div');
      ops.className = 'ops';
      ops.innerHTML = `
        <button class="btn plus-m"  onclick="changeScore(${i}, 'maru', 1)">+</button>
        <button class="btn minus-m" onclick="changeScore(${i}, 'maru', -1)">-</button>
        <button class="btn plus-b"  onclick="changeScore(${i}, 'batsu', 1)">+</button>
        <button class="btn minus-b" onclick="changeScore(${i}, 'batsu', -1)">-</button>
        ${$("editMode").checked ? `<button class='btn del-btn' onclick='deletePerson(${i})'>削除</button>` : ''}
      `;
      card.appendChild(ops);
      wrap.appendChild(card);
    });

    panel.appendChild(wrap);
    main.appendChild(panel);

  // === チーム戦 ===
  }else{
    const panel = document.createElement('section');
    panel.className = 'panel';
    const container = document.createElement('div');
    container.className = 'team-container';

    [...teams, '未所属'].forEach(t => {
      const members = people.filter(p => (p.team || '未所属') === t);
      if(t === '未所属' && members.length === 0) return;

      const sumM = members.reduce((a, p) => a + p.maru, 0);
      const sumB = members.reduce((a, p) => a + p.batsu, 0);

      // === 先に box を作成 ===
      const box = document.createElement('div');
      box.className = 'team-box';
      box.setAttribute("ondrop",    `onDropToTeam(event, '${t}')`);
      box.setAttribute("ondragover","onDragOver(event)");

      // チーム状態管理
      if(!teamStates[t]) teamStates[t] = { status:"normal", lastSumM:0 };
      const prevStatus = teamStates[t].status;
      let newTeamStatus = "normal";
      if(sumM >= w) newTeamStatus = "win";

      // 勝利カットイン（初回のみ）
      if(newTeamStatus === "win" && prevStatus !== "win"){
        box.classList.add("team-win-state");
        requestAnimationFrame(()=>{
          box.classList.add("team-win-animate");
          setTimeout(()=> box.classList.remove("team-win-animate"), 1500);
          showCutin(`${t} チーム勝利！`);
        });
      }

      // ✅ 再描画時に勝利済みなら色を維持
      if(newTeamStatus === "win") {
        box.classList.add("team-win-state");
      }

      // リーチカットイン（あと1点）
      if(newTeamStatus === "normal" && w > 0 && sumM === w - 1 && teamStates[t].lastSumM !== sumM){
        showCutinReach(`${t} チーム リーチ！`);
      }

      teamStates[t].status = newTeamStatus;
      teamStates[t].lastSumM = sumM;

      const header = document.createElement('div');
      header.className = 'team-header';
      const winMark = sumM >= w ? `<span class='team-win'>WIN!</span>` : '';

      let delTeamBtn = "";
      if($("editMode").checked && t !== "未所属"){
        delTeamBtn = `<button class="btn del-btn" onclick="deleteTeam('${t}')">削除</button>`;
      }

      header.innerHTML = `<span>${t}</span><span>${sumM} - ${sumB} ${winMark} ${delTeamBtn}</span>`;
      box.appendChild(header);

      const table = document.createElement('table');
      table.innerHTML = `<thead><tr><th>名前</th><th>◯</th><th>✕</th><th>操作</th></tr></thead>`;
      const tbody = document.createElement('tbody');

      members.forEach(p => {
        const i = people.indexOf(p);
        const tr = document.createElement('tr');
        tr.setAttribute("draggable","true");
        tr.setAttribute("ondragstart", `onDragStart(event, ${i})`);
        tr.setAttribute("ondragend",   "onDragEnd(event)");

        let nameCell = "";
        if($("editMode").checked){
          nameCell = `<td><input value="${p.name}" onblur="saveName(${i}, this.value)" title="${p.name}" /></td>`;
        } else {
          nameCell = `<td title="${p.name}">${p.name}`;
          if($("limitToggle")?.checked && $("limit") && p.maru >= +$("limit").value){
            nameCell += ` <span class="limit-inline">上限</span>`;
          }
          nameCell += `</td>`;
        }

        let opsCell = "";
        if($("editMode").checked){
          opsCell = `<td><button class="btn del-btn" onclick="deletePerson(${i})">削除</button></td>`;
        } else {
          opsCell = `<td>
            <button class="btn plus-m"  onclick="changeScore(${i}, 'maru', 1)">+</button>
            <button class="btn minus-m" onclick="changeScore(${i}, 'maru', -1)">-</button>
            <button class="btn plus-b"  onclick="changeScore(${i}, 'batsu', 1)">+</button>
            <button class="btn minus-b" onclick="changeScore(${i}, 'batsu', -1)">-</button>
          </td>`;
        }

        tr.innerHTML = `
          ${nameCell}
          <td style="color:#ff1744;font-size:18px;">${p.maru}</td>
          <td style="color:#2979ff;font-size:18px;">${p.batsu}</td>
          ${opsCell}
        `;
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      box.appendChild(table);
      container.appendChild(box);
    });

    panel.appendChild(container);
    main.appendChild(panel);
  }
}

// ===== Events =====
window.onload = () => {
  loadData();
  if($("diceWrap")) $("diceWrap").style.display = $("diceToggle")?.checked ? 'block' : 'none';

  if($("nameInput")){
    let imeActive = false;
    $("nameInput").addEventListener("compositionstart", ()=> imeActive = true);
    $("nameInput").addEventListener("compositionend",   ()=> imeActive = false);
    $("nameInput").addEventListener("keydown", e => { if(e.key==="Enter" && !imeActive) addPerson(); });
  }
  if($("teamInput")){
    let imeActive = false;
    $("teamInput").addEventListener("compositionstart", ()=> imeActive = true);
    $("teamInput").addEventListener("compositionend",   ()=> imeActive = false);
    $("teamInput").addEventListener("keydown", e => { if(e.key==="Enter" && !imeActive) addTeam(); });
  }

  if($("addBtn"))     $("addBtn").onclick     = addPerson;
  if($("teamAddBtn")) $("teamAddBtn").onclick = addTeam;
  if($("resetBtn"))   $("resetBtn").onclick   = resetScores;

  if($("teamMode"))   $("teamMode").onchange  = render;
  if($("editMode"))   $("editMode").onchange  = render;
  if($("diceToggle")) $("diceToggle").onchange= render;

  document.addEventListener('click', e => { if(e.target.classList.contains('die')) roll(e.target); });

  render();
};
