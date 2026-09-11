'use strict';

const TAGS = {
  interests: ['Sports','Music','Gaming','Art','Movies & TV','Outdoors','Cooking','Reading','Fashion','Fitness','Dance','Tech'],
  vibes: ['Funny','Chill','Adventurous','Romantic','Mysterious','Sweet','Confident'],
  dateTypes: ['Fancy Dinner','Arcade/Games','Movie Night','Outdoor Adventure','Chill Hangout','Dancing'],
  music: ['Pop','Hip-Hop/Rap','Country','Rock','EDM/Dance','R&B/Soul'],
  activities: ['Varsity/JV Sports','Band/Choir/Orchestra','Drama/Theater','Student Government','Honor Society','FFA/4-H','Art Club','Part-time Job']
};
const EMOJI = {
  interests:{'Sports':'⚽','Music':'🎵','Gaming':'🎮','Art':'🎨','Movies & TV':'🎬','Outdoors':'🌲','Cooking':'🍳','Reading':'📚','Fashion':'👗','Fitness':'🏋️','Dance':'💃','Tech':'💻'},
  vibes:{'Funny':'😂','Chill':'😌','Adventurous':'🧗','Romantic':'🌹','Mysterious':'🕵️','Sweet':'🍯','Confident':'😎'},
  dateTypes:{'Fancy Dinner':'🍽️','Arcade/Games':'🕹️','Movie Night':'🎥','Outdoor Adventure':'🏕️','Chill Hangout':'🛋️','Dancing':'💃'},
  music:{'Pop':'🎤','Hip-Hop/Rap':'🎧','Country':'🤠','Rock':'🎸','EDM/Dance':'🪩','R&B/Soul':'🎶'},
  activities:{'Varsity/JV Sports':'🏅','Band/Choir/Orchestra':'🎺','Drama/Theater':'🎭','Student Government':'🏛️','Honor Society':'🎓','FFA/4-H':'🌾','Art Club':'🖌️','Part-time Job':'💼'}
};
const IDENTITY_LABEL = {guy:'Guy', girl:'Girl'};
const GRADES = ['9','10','11','12'];
const GRADE_LABEL = {'9':'9th (Freshman)','10':'10th (Sophomore)','11':'11th (Junior)','12':'12th (Senior)'};
const HEIGHT_PREF = ['Taller than me','Shorter than me','About the same height','No preference'];
const HEIGHT_OPTIONS = [];
for(let inches=60; inches<=76; inches++){ HEIGHT_OPTIONS.push({ value: inches, label: `${Math.floor(inches/12)}'${inches%12}"` }); }
HEIGHT_OPTIONS.push({ value: 77, label: `6'5"+` });
const COMM_STYLE = ['Big texter','Prefers calling','Better in person'];
const COMM_STYLE_EMOJI = {'Big texter':'📱','Prefers calling':'📞','Better in person':'🧑‍🤝‍🧑'};
// Category weights apply to a 0-1 overlap-coefficient similarity (see similarity()),
// so a category with more checkbox options never scores higher just by chance.
const WEIGHTS = {interests:3, vibes:2.5, dateTypes:2, music:1.5, activities:2, sameGrade:1};
const HEIGHT_BONUS = {mutual:2, partial:0.8};
const PERSONALITY_BONUS = {comm:0.8};

// ---------- Server API ----------
// Everything the owner sees/changes lives in the shared Postgres database
// behind these endpoints, gated by a real signed-in session (see /api and
// /lib). Only /api/join is public — that's how students add themselves.
async function api(path, options){
  const res = await fetch(path, Object.assign({ headers: {'Content-Type':'application/json'} }, options));
  let data = null;
  try{ data = await res.json(); }catch(e){}
  if(!res.ok){ throw new Error((data && data.error) || `Request failed (${res.status})`); }
  return data;
}

let ownerRoster = [];
let ownerState = { lockedPairs: [], results: null, revealIndex: 0, revealFlipped: false };
async function loadOwnerData(){
  const rosterData = await api('/api/roster');
  const stateData = await api('/api/state');
  ownerRoster = rosterData.islanders;
  ownerState = stateData;
}

// ---------- Navigation ----------
const tabButtons = document.querySelectorAll('nav.tabs button');
tabButtons.forEach(b => b.addEventListener('click', () => {
  if(b.dataset.view === 'owner'){ goOwner(); }
  else{ showView(b.dataset.view); }
}));
document.getElementById('owner-login-bottom').addEventListener('click', goOwner);
function showView(name){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  tabButtons.forEach(b => b.classList.toggle('active', b.dataset.view === name || (name==='owner-gate' && b.dataset.view==='owner') || (name==='reveal' && b.dataset.view==='owner')));
}
async function goOwner(){
  try{
    await loadOwnerData();
    showView('owner');
    renderOwner();
  }catch(e){
    renderGate();
    showView('owner-gate');
  }
}
function renderGate(){
  document.getElementById('gate-title').textContent = 'Owner Passcode';
  document.getElementById('gate-desc').textContent = 'Enter the shared owner passcode to access the roster and matching tools.';
  document.getElementById('gate-submit').textContent = 'Unlock';
  document.getElementById('gate-input').value = '';
  document.getElementById('gate-banner').innerHTML = '';
}
document.getElementById('gate-submit').addEventListener('click', async () => {
  const val = document.getElementById('gate-input').value;
  const banner = document.getElementById('gate-banner');
  banner.innerHTML = '';
  try{
    await api('/api/login', { method:'POST', body: JSON.stringify({ passcode: val }) });
    await loadOwnerData();
    showView('owner');
    renderOwner();
  }catch(e){
    banner.innerHTML = `<div class="banner err">${escapeHtml(e.message)}</div>`;
  }
});
document.getElementById('owner-lock').addEventListener('click', async () => {
  try{ await api('/api/logout', { method:'POST' }); }catch(e){}
  showView('join');
});

// ---------- Person form ----------
const OTHER_PLACEHOLDER = {
  interests: 'Type your own interest…', vibes: 'Type your own word…',
  dateTypes: 'Describe your dream date…', music: 'Your favorite song or artist…',
  activities: 'Type your own activity/club…'
};
function tagEmoji(groupKey, t){ return (EMOJI[groupKey] && EMOJI[groupKey][t]) ? EMOJI[groupKey][t] : '⭐'; }
function chipGroup(prefix, groupKey, max){
  const items = TAGS[groupKey];
  const emoji = EMOJI[groupKey];
  const otherId = `${prefix}-${groupKey}-other`;
  return `<div class="chips" data-group="${prefix}-${groupKey}" data-max="${max||0}">` +
    items.map(t => `<label class="chip"><input type="checkbox" value="${t}" data-name="${prefix}-${groupKey}"/> ${emoji[t]||''} ${t}</label>`).join('') +
    `<label class="chip"><input type="checkbox" value="Other" data-name="${prefix}-${groupKey}" data-other-toggle="${otherId}"/> ✏️ Other</label>` +
    `</div>` +
    `<input type="text" id="${otherId}" class="other-input hidden" maxlength="60" placeholder="${OTHER_PLACEHOLDER[groupKey]||'Type your own…'}" />` +
    (max ? `<div class="hint">Choose up to ${max} (Other counts as one).</div>` : '');
}
const WIZARD_STEPS = 5;
function stepNav(idx){
  return `<div class="row wizard-nav justify-between">
    ${idx>1 ? `<button type="button" class="btn ghost" data-step-prev>← Back</button>` : `<span></span>`}
    ${idx<WIZARD_STEPS ? `<button type="button" class="btn primary" data-step-next>Next →</button>` : `<span></span>`}
  </div>`;
}
function personFormHTML(prefix){
  return `
    <div class="wizard-progress" id="${prefix}-wizard-progress"></div>
    <div class="step" data-step="1">
      <h4>The Basics</h4>
      <label class="field"><span>Name</span><input type="text" id="${prefix}-name" placeholder="First & last name" /></label>
      <label class="field"><span>I am a:</span>
        <div class="radio-row">
          <label><input type="radio" name="${prefix}-identity" value="guy"> Guy</label>
          <label><input type="radio" name="${prefix}-identity" value="girl"> Girl</label>
        </div>
      </label>
      <label class="field"><span>Interested in:</span>
        <div class="radio-row">
          <label><input type="checkbox" data-name="${prefix}-lookingfor" value="guys"> Guys</label>
          <label><input type="checkbox" data-name="${prefix}-lookingfor" value="girls"> Girls</label>
        </div>
      </label>
      <label class="field"><span>Grade</span>
        <div class="radio-row">
          ${GRADES.map(g => `<label><input type="radio" name="${prefix}-grade" value="${g}"> ${GRADE_LABEL[g]}</label>`).join('')}
        </div>
      </label>
      <label class="field"><span>Grades you're open to dating</span>
        <div class="radio-row">
          ${GRADES.map(g => `<label><input type="checkbox" data-name="${prefix}-gradeopento" value="${g}"> ${GRADE_LABEL[g]}</label>`).join('')}
        </div>
      </label>
      ${stepNav(1)}
    </div>
    <div class="step" data-step="2">
      <h4>Height</h4>
      <label class="field"><span>Height</span>
        <select id="${prefix}-height">
          <option value="">Choose height</option>
          ${HEIGHT_OPTIONS.map(h => `<option value="${h.value}">${h.label}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>Preferred height in a match (optional)</span>
        <div class="chips" data-group="${prefix}-heightpref" data-max="0">
          ${HEIGHT_PREF.map(h => `<label class="chip"><input type="checkbox" value="${h}" data-name="${prefix}-heightpref"/> ${h}</label>`).join('')}
        </div>
      </label>
      ${stepNav(2)}
    </div>
    <div class="step" data-step="3">
      <h4>What You're Into</h4>
      <label class="field"><span>Interests</span>${chipGroup(prefix,'interests')}</label>
      <label class="field"><span>Activities &amp; clubs</span>${chipGroup(prefix,'activities')}</label>
      ${stepNav(3)}
    </div>
    <div class="step" data-step="4">
      <h4>Vibe &amp; Style</h4>
      <label class="field"><span>Your vibe</span>${chipGroup(prefix,'vibes',3)}</label>
      <label class="field"><span>Dream date</span>${chipGroup(prefix,'dateTypes',3)}</label>
      <label class="field"><span>Music</span>${chipGroup(prefix,'music')}</label>
      <label class="field"><span>Texting/calling style</span>
        <div class="radio-row">
          ${COMM_STYLE.map(s => `<label><input type="radio" name="${prefix}-comm" value="${s}"> ${COMM_STYLE_EMOJI[s]} ${s}</label>`).join('')}
        </div>
      </label>
      ${stepNav(4)}
    </div>
    <div class="step" data-step="5">
      <h4>Last Thing</h4>
      <label class="field"><span>Anyone in mind? (optional)</span>
        <textarea id="${prefix}-bio" maxlength="140" placeholder="Describe your ideal person…"></textarea>
      </label>
      ${stepNav(5)}
    </div>
  `;
}
function wireChipHighlighting(container){
  container.querySelectorAll('.chip').forEach(chip => {
    const input = chip.querySelector('input');
    const sync = () => chip.classList.toggle('checked', input.checked);
    input.addEventListener('change', () => {
      const group = input.closest('.chips');
      const max = parseInt(group.dataset.max || '0', 10);
      if(max && input.checked){
        const checked = [...group.querySelectorAll('input:checked')];
        if(checked.length > max){ input.checked = false; }
      }
      sync();
      if(input.dataset.otherToggle){
        const otherInput = document.getElementById(input.dataset.otherToggle);
        if(otherInput){
          otherInput.classList.toggle('hidden', !input.checked);
          if(input.checked) otherInput.focus();
          else otherInput.value = '';
        }
      }
    });
    sync();
  });
}
function wizardShow(prefix, n){
  const container = document.getElementById(prefix+'-form-container');
  if(!container) return;
  const steps = [...container.querySelectorAll('.step')];
  if(!steps.length) return;
  n = Math.max(1, Math.min(steps.length, n));
  steps.forEach(s => s.classList.toggle('active', parseInt(s.dataset.step,10)===n));
  container.dataset.currentStep = n;
  const progressEl = document.getElementById(prefix+'-wizard-progress');
  if(progressEl) progressEl.textContent = `Step ${n} of ${steps.length}`;
  const submitBtn = document.getElementById(prefix+'-submit');
  if(submitBtn) submitBtn.style.display = (n===steps.length) ? '' : 'none';
  container.scrollIntoView({behavior:'smooth', block:'start'});
}
function initWizard(prefix){
  const container = document.getElementById(prefix+'-form-container');
  container.querySelectorAll('[data-step-next]').forEach(btn => btn.addEventListener('click', () => {
    wizardShow(prefix, parseInt(container.dataset.currentStep||'1',10)+1);
  }));
  container.querySelectorAll('[data-step-prev]').forEach(btn => btn.addEventListener('click', () => {
    wizardShow(prefix, parseInt(container.dataset.currentStep||'1',10)-1);
  }));
  wizardShow(prefix, 1);
}
function resolveOther(prefix, groupKey, values){
  const idx = values.indexOf('Other');
  if(idx === -1) return values;
  const el = document.getElementById(`${prefix}-${groupKey}-other`);
  const text = el ? (el.value || '').trim() : '';
  const copy = values.slice();
  if(text) copy[idx] = text; else copy.splice(idx,1);
  return copy;
}
function fillChipGroupWithOther(prefix, groupKey, values){
  values = values || [];
  const known = TAGS[groupKey];
  const customVal = values.find(v => !known.includes(v));
  document.querySelectorAll(`input[data-name="${prefix}-${groupKey}"]`).forEach(i => {
    const checked = i.value === 'Other' ? !!customVal : values.includes(i.value);
    i.checked = checked;
    i.closest('.chip').classList.toggle('checked', checked);
  });
  const otherInput = document.getElementById(`${prefix}-${groupKey}-other`);
  if(otherInput){ otherInput.value = customVal || ''; otherInput.classList.toggle('hidden', !customVal); }
}
function readPersonForm(prefix){
  const name = (document.getElementById(prefix+'-name').value || '').trim();
  const identityEl = document.querySelector(`input[name="${prefix}-identity"]:checked`);
  const identity = identityEl ? identityEl.value : null;
  const lookingFor = [...document.querySelectorAll(`input[data-name="${prefix}-lookingfor"]:checked`)].map(i=>i.value);
  const gradeEl = document.querySelector(`input[name="${prefix}-grade"]:checked`);
  const grade = gradeEl ? gradeEl.value : null;
  const gradeOpenTo = [...document.querySelectorAll(`input[data-name="${prefix}-gradeopento"]:checked`)].map(i=>i.value);
  const heightVal = document.getElementById(prefix+'-height').value;
  const heightIn = heightVal!=='' ? parseInt(heightVal,10) : null;
  const heightPref = [...document.querySelectorAll(`input[data-name="${prefix}-heightpref"]:checked`)].map(i=>i.value);
  const interests = resolveOther(prefix,'interests', [...document.querySelectorAll(`input[data-name="${prefix}-interests"]:checked`)].map(i=>i.value));
  const vibes = resolveOther(prefix,'vibes', [...document.querySelectorAll(`input[data-name="${prefix}-vibes"]:checked`)].map(i=>i.value));
  const dateTypes = resolveOther(prefix,'dateTypes', [...document.querySelectorAll(`input[data-name="${prefix}-dateTypes"]:checked`)].map(i=>i.value));
  const music = resolveOther(prefix,'music', [...document.querySelectorAll(`input[data-name="${prefix}-music"]:checked`)].map(i=>i.value));
  const activities = resolveOther(prefix,'activities', [...document.querySelectorAll(`input[data-name="${prefix}-activities"]:checked`)].map(i=>i.value));
  const commEl = document.querySelector(`input[name="${prefix}-comm"]:checked`);
  const comm = commEl ? commEl.value : null;
  const bio = (document.getElementById(prefix+'-bio').value || '').trim();
  return { name, identity, lookingFor, grade, gradeOpenTo, heightIn, heightPref, interests, vibes, dateTypes, music, activities, comm, bio };
}
function validatePerson(p){
  if(!p.name) return 'Please enter a name.';
  if(!p.identity) return 'Please choose an identity.';
  if(!p.lookingFor.length) return 'Please choose at least one "open to matching with" option.';
  if(!p.grade) return 'Please choose a grade.';
  if(!p.gradeOpenTo.length) return 'Please choose at least one grade you\'re open to matching with.';
  if(p.heightIn==null) return 'Please choose your height.';
  if(!p.interests.length) return 'Please pick at least one interest.';
  return null;
}
function fillPersonForm(prefix, p){
  document.getElementById(prefix+'-name').value = p.name;
  const idEl = document.querySelector(`input[name="${prefix}-identity"][value="${p.identity}"]`);
  if(idEl) idEl.checked = true;
  document.querySelectorAll(`input[data-name="${prefix}-lookingfor"]`).forEach(i => i.checked = p.lookingFor.includes(i.value));
  const gradeEl = document.querySelector(`input[name="${prefix}-grade"][value="${p.grade}"]`);
  if(gradeEl) gradeEl.checked = true;
  document.querySelectorAll(`input[data-name="${prefix}-gradeopento"]`).forEach(i => i.checked = (p.gradeOpenTo||[]).includes(i.value));
  document.getElementById(prefix+'-height').value = p.heightIn!=null ? Math.min(p.heightIn,77) : '';
  document.querySelectorAll(`input[data-name="${prefix}-heightpref"]`).forEach(i => { i.checked = (p.heightPref||[]).includes(i.value); i.closest('.chip').classList.toggle('checked', i.checked); });
  fillChipGroupWithOther(prefix, 'interests', p.interests);
  fillChipGroupWithOther(prefix, 'vibes', p.vibes);
  fillChipGroupWithOther(prefix, 'dateTypes', p.dateTypes);
  fillChipGroupWithOther(prefix, 'music', p.music);
  fillChipGroupWithOther(prefix, 'activities', p.activities);
  const commEl = document.querySelector(`input[name="${prefix}-comm"][value="${p.comm}"]`);
  if(commEl) commEl.checked = true;
  document.getElementById(prefix+'-bio').value = p.bio || '';
}
function clearPersonForm(prefix){
  document.getElementById(prefix+'-name').value = '';
  document.querySelectorAll(`input[name="${prefix}-identity"]`).forEach(i=>i.checked=false);
  document.querySelectorAll(`input[name="${prefix}-grade"]`).forEach(i=>i.checked=false);
  document.querySelectorAll(`input[name="${prefix}-comm"]`).forEach(i=>i.checked=false);
  document.getElementById(prefix+'-height').value = '';
  document.querySelectorAll(`input[data-name^="${prefix}-"]`).forEach(i=>{ i.checked=false; if(i.closest('.chip')) i.closest('.chip').classList.remove('checked'); });
  ['interests','vibes','dateTypes','music','activities'].forEach(g => {
    const el = document.getElementById(`${prefix}-${g}-other`);
    if(el){ el.value=''; el.classList.add('hidden'); }
  });
  document.getElementById(prefix+'-bio').value = '';
}

// ---------- Join view ----------
const joinContainer = document.getElementById('join-form-container');
joinContainer.innerHTML = personFormHTML('join');
wireChipHighlighting(joinContainer);
initWizard('join');
document.getElementById('join-submit').addEventListener('click', async () => {
  const p = readPersonForm('join');
  const err = validatePerson(p);
  const banner = document.getElementById('join-banner');
  if(err){ banner.innerHTML = `<div class="banner err">${err}</div>`; return; }
  const btn = document.getElementById('join-submit');
  btn.disabled = true;
  banner.innerHTML = '';
  try{
    await api('/api/join', { method:'POST', body: JSON.stringify(p) });
    clearPersonForm('join');
    wizardShow('join', 1);
    banner.innerHTML = `<div class="banner ok">You're in the villa, ${escapeHtml(p.name)}! 💕 About a week before homecoming, you'll get an email to your school email letting you know who you've been matched with — you can accept or decline from there.</div>`;
  }catch(e){
    banner.innerHTML = `<div class="banner err">${escapeHtml(e.message)}</div>`;
  }finally{
    btn.disabled = false;
  }
});

// ---------- Owner: roster form ----------
const ownerContainer = document.getElementById('owner-form-container');
ownerContainer.innerHTML = personFormHTML('owner');
wireChipHighlighting(ownerContainer);
initWizard('owner');
let editingId = null;
document.getElementById('owner-submit').addEventListener('click', async () => {
  const p = readPersonForm('owner');
  const err = validatePerson(p);
  const banner = document.getElementById('owner-form-banner');
  if(err){ banner.innerHTML = `<div class="banner err">${err}</div>`; return; }
  banner.innerHTML = '';
  try{
    if(editingId){
      await api('/api/roster', { method:'PATCH', body: JSON.stringify(Object.assign({ id: editingId }, p)) });
      editingId = null;
      document.getElementById('owner-submit').textContent = 'Add islander';
      document.getElementById('owner-cancel-edit').classList.add('hidden');
      banner.innerHTML = `<div class="banner ok">Updated ${escapeHtml(p.name)}.</div>`;
    } else {
      await api('/api/roster', { method:'POST', body: JSON.stringify(p) });
      banner.innerHTML = `<div class="banner ok">Added ${escapeHtml(p.name)}.</div>`;
    }
    clearPersonForm('owner'); wizardShow('owner', 1);
    await loadOwnerData(); renderOwner();
  }catch(e){
    banner.innerHTML = `<div class="banner err">${escapeHtml(e.message)}</div>`;
  }
});
document.getElementById('owner-cancel-edit').addEventListener('click', () => {
  editingId = null; clearPersonForm('owner'); wizardShow('owner', 1);
  document.getElementById('owner-submit').textContent = 'Add islander';
  document.getElementById('owner-cancel-edit').classList.add('hidden');
});

function formatHeight(inches){
  if(inches==null) return '—';
  if(inches>=77) return `6'5"+`;
  return `${Math.floor(inches/12)}'${inches%12}"`;
}
function renderRoster(){
  const tbody = document.querySelector('#roster-table tbody');
  tbody.innerHTML = '';
  ownerRoster.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(p.name)}</td>
      <td>${GRADE_LABEL[p.grade]||'—'}</td>
      <td>${IDENTITY_LABEL[p.identity]||'—'}</td>
      <td>${p.lookingFor.map(l=>IDENTITY_LABEL[l==='guys'?'guy':'girl']).join(', ')}</td>
      <td>${formatHeight(p.heightIn)}</td>
      <td>${p.interests.map(t=>`<span class="tag-mini">${tagEmoji('interests',t)} ${t}</span>`).join('')}</td>
      <td>${p.vibes.map(t=>`<span class="tag-mini">${tagEmoji('vibes',t)} ${t}</span>`).join('')}</td>
      <td class="roster-actions">
        <button class="btn ghost" data-edit="${p.id}">Edit</button>
        <button class="btn danger" data-del="${p.id}">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('roster-count').textContent = ownerRoster.length;
  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
    const p = ownerRoster.find(x=>x.id===b.dataset.edit);
    if(!p) return;
    editingId = p.id;
    fillPersonForm('owner', p);
    wizardShow('owner', 1);
    document.getElementById('owner-submit').textContent = 'Save changes';
    document.getElementById('owner-cancel-edit').classList.remove('hidden');
    document.getElementById('owner-form-container').scrollIntoView({behavior:'smooth'});
  }));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    if(!confirm('Remove this islander?')) return;
    try{
      await api('/api/roster', { method:'DELETE', body: JSON.stringify({ id: b.dataset.del }) });
      await loadOwnerData(); renderOwner();
    }catch(e){
      alert(e.message);
    }
  }));
}

// ---------- Locked pairs ----------
function renderLockUI(){
  const a = document.getElementById('lock-a'), b = document.getElementById('lock-b');
  const opts = ownerRoster.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  a.innerHTML = `<option value="">Choose islander…</option>` + opts;
  b.innerHTML = `<option value="">Choose islander…</option>` + opts;
  const list = document.getElementById('locked-list');
  list.innerHTML = '';
  ownerState.lockedPairs.forEach((pair, idx) => {
    const pa = ownerRoster.find(x=>x.id===pair[0]);
    const pb = ownerRoster.find(x=>x.id===pair[1]);
    const li = document.createElement('li');
    li.innerHTML = `${escapeHtml(pa?pa.name:'?')} × ${escapeHtml(pb?pb.name:'?')} <button class="btn ghost btn-remove-inline" data-unlock="${idx}">remove</button>`;
    list.appendChild(li);
  });
  list.querySelectorAll('[data-unlock]').forEach(btn => btn.addEventListener('click', async () => {
    ownerState.lockedPairs.splice(parseInt(btn.dataset.unlock,10),1);
    await api('/api/state', { method:'PATCH', body: JSON.stringify({ lockedPairs: ownerState.lockedPairs }) });
    renderLockUI();
  }));
}
document.getElementById('lock-add').addEventListener('click', async () => {
  const a = document.getElementById('lock-a').value, b = document.getElementById('lock-b').value;
  const banner = document.getElementById('match-banner');
  if(!a || !b || a===b){ banner.innerHTML = '<div class="banner err">Pick two different islanders.</div>'; return; }
  const already = ownerState.lockedPairs.some(pair => pair.includes(a) || pair.includes(b));
  if(already){ banner.innerHTML = '<div class="banner err">One of these islanders is already locked into a couple.</div>'; return; }
  ownerState.lockedPairs.push([a,b]);
  await api('/api/state', { method:'PATCH', body: JSON.stringify({ lockedPairs: ownerState.lockedPairs }) });
  renderLockUI();
  banner.innerHTML = '';
});

// ---------- Matching ----------
function bucketOf(p){ return p.identity === 'guy' ? 'guys' : 'girls'; }
function eligible(a,b){
  if(a.id===b.id) return false;
  if(!(a.lookingFor.includes(bucketOf(b)) && b.lookingFor.includes(bucketOf(a)))) return false;
  if(a.grade && b.grade && !((a.gradeOpenTo||[]).includes(b.grade) && (b.gradeOpenTo||[]).includes(a.grade))) return false;
  return true;
}
function overlap(a,b){ return a.filter(x => b.includes(x)); }
function similarity(a,b){
  a = a||[]; b = b||[];
  const smaller = Math.min(a.length, b.length);
  if(smaller===0) return 0;
  return overlap(a,b).length / smaller; // overlap coefficient, 0..1 regardless of how many boxes someone checked
}
function heightPrefSatisfied(prefs, selfIn, otherIn){
  if(!prefs || !prefs.length || selfIn==null || otherIn==null) return true;
  return prefs.some(pref => {
    if(pref==='Taller than me') return otherIn > selfIn;
    if(pref==='Shorter than me') return otherIn < selfIn;
    if(pref==='About the same height') return Math.abs(otherIn - selfIn) <= 2;
    return true; // 'No preference'
  });
}
function heightCompat(a,b){
  if(a.heightIn==null || b.heightIn==null) return null;
  const aSatisfied = heightPrefSatisfied(a.heightPref, a.heightIn, b.heightIn);
  const bSatisfied = heightPrefSatisfied(b.heightPref, b.heightIn, a.heightIn);
  if(aSatisfied && bSatisfied) return 'mutual';
  if(aSatisfied || bSatisfied) return 'partial';
  return 'none';
}
function computeScore(a,b){
  const shared = {
    interests: overlap(a.interests,b.interests),
    vibes: overlap(a.vibes,b.vibes),
    dateTypes: overlap(a.dateTypes,b.dateTypes),
    music: overlap(a.music,b.music),
    activities: overlap(a.activities||[],b.activities||[]),
    sameGrade: !!(a.grade && b.grade && a.grade===b.grade),
    heightCompat: heightCompat(a,b),
    sameComm: !!(a.comm && b.comm && a.comm===b.comm)
  };
  let score = similarity(a.interests,b.interests)*WEIGHTS.interests
    + similarity(a.vibes,b.vibes)*WEIGHTS.vibes
    + similarity(a.dateTypes,b.dateTypes)*WEIGHTS.dateTypes
    + similarity(a.music,b.music)*WEIGHTS.music
    + similarity(a.activities,b.activities)*WEIGHTS.activities;
  if(shared.sameGrade) score += WEIGHTS.sameGrade;
  if(shared.heightCompat==='mutual') score += HEIGHT_BONUS.mutual;
  else if(shared.heightCompat==='partial') score += HEIGHT_BONUS.partial;
  if(shared.sameComm) score += PERSONALITY_BONUS.comm;
  return { score, shared };
}
function lockedResults(){
  return ownerState.lockedPairs.map(pair => {
    const a = ownerRoster.find(x=>x.id===pair[0]), b = ownerRoster.find(x=>x.id===pair[1]);
    const { shared } = computeScore(a,b);
    return { a, b, shared, mode:'locked' };
  });
}
function greedyPair(pool, candidates){
  const results = lockedResults();
  candidates.sort((x,y) => y.sortKey - x.sortKey);
  const matched = new Set();
  candidates.forEach(c => {
    if(matched.has(c.a.id) || matched.has(c.b.id)) return;
    matched.add(c.a.id); matched.add(c.b.id);
    results.push({ a:c.a, b:c.b, shared:c.shared, mode:'score' });
  });
  const leftover = pool.filter(p => !matched.has(p.id));
  return { results, leftover };
}
// Greedy pairing (by score, highest first) is only ever an approximation of the best
// possible set of couples. This runs a local-search pass on top of it: repeatedly look
// for any swap between two couples, or between a leftover single and one half of a
// couple, that raises total compatibility, and take it. Repeats until a full pass finds
// no more improving swap (or maxPasses safety cap), which is a standard and effective
// way to get near-optimal pairings without the complexity of a full matching algorithm.
function localSearchImprove(results, leftover, maxPasses){
  maxPasses = maxPasses || 25;
  const pairScore = (x,y) => computeScore(x,y).score;
  for(let pass=0; pass<maxPasses; pass++){
    let improved = false;
    for(let i=0;i<results.length;i++){
      if(results[i].mode==='locked') continue;
      for(let j=i+1;j<results.length;j++){
        if(results[j].mode==='locked') continue;
        const c1 = results[i], c2 = results[j];
        const current = pairScore(c1.a,c1.b) + pairScore(c2.a,c2.b);
        if(eligible(c1.a,c2.a) && eligible(c1.b,c2.b)){
          const alt = pairScore(c1.a,c2.a) + pairScore(c1.b,c2.b);
          if(alt > current + 1e-9){
            results[i] = { a:c1.a, b:c2.a, shared:computeScore(c1.a,c2.a).shared, mode:c1.mode };
            results[j] = { a:c1.b, b:c2.b, shared:computeScore(c1.b,c2.b).shared, mode:c2.mode };
            improved = true; continue;
          }
        }
        if(eligible(c1.a,c2.b) && eligible(c1.b,c2.a)){
          const alt = pairScore(c1.a,c2.b) + pairScore(c1.b,c2.a);
          if(alt > current + 1e-9){
            results[i] = { a:c1.a, b:c2.b, shared:computeScore(c1.a,c2.b).shared, mode:c1.mode };
            results[j] = { a:c1.b, b:c2.a, shared:computeScore(c1.b,c2.a).shared, mode:c2.mode };
            improved = true;
          }
        }
      }
    }
    for(let li=0; li<leftover.length; li++){
      const single = leftover[li];
      let bestGain = 1e-9, bestIdx = -1, bestKeep = null, bestDisplaced = null;
      for(let i=0;i<results.length;i++){
        const c = results[i];
        if(c.mode==='locked') continue;
        if(eligible(single,c.b)){
          const gain = pairScore(single,c.b) - pairScore(c.a,c.b);
          if(gain > bestGain){ bestGain=gain; bestIdx=i; bestKeep=c.b; bestDisplaced=c.a; }
        }
        if(eligible(single,c.a)){
          const gain = pairScore(single,c.a) - pairScore(c.a,c.b);
          if(gain > bestGain){ bestGain=gain; bestIdx=i; bestKeep=c.a; bestDisplaced=c.b; }
        }
      }
      if(bestIdx>-1){
        results[bestIdx] = { a:bestKeep, b:single, shared:computeScore(bestKeep,single).shared, mode:results[bestIdx].mode };
        leftover[li] = bestDisplaced;
        improved = true;
      }
    }
    if(!improved) break;
  }
  return { results, leftover };
}
function generateMatches(){
  const lockedIds = new Set(ownerState.lockedPairs.flat());
  const pool = ownerRoster.filter(p => !lockedIds.has(p.id));
  const candidates = [];
  for(let i=0;i<pool.length;i++){
    for(let j=i+1;j<pool.length;j++){
      const a = pool[i], b = pool[j];
      if(!eligible(a,b)) continue;
      const { score, shared } = computeScore(a,b);
      candidates.push({ a, b, shared, sortKey: score + Math.random()*0.75 });
    }
  }
  const { results, leftover } = greedyPair(pool, candidates);
  return localSearchImprove(results, leftover);
}
document.getElementById('gen-matches').addEventListener('click', async () => {
  const banner = document.getElementById('match-banner');
  if(ownerRoster.length < 2){ banner.innerHTML = '<div class="banner err">Need at least 2 islanders to match.</div>'; return; }
  const { results, leftover } = generateMatches();
  const newResults = { pairs: results.map(r => ({ aId:r.a.id, bId:r.b.id, shared:r.shared, mode:r.mode })), leftoverIds: leftover.map(p=>p.id) };
  ownerState.results = newResults; ownerState.revealIndex = 0; ownerState.revealFlipped = false;
  await api('/api/state', { method:'PATCH', body: JSON.stringify({ results: newResults, revealIndex: 0, revealFlipped: false }) });
  banner.innerHTML = `<div class="banner ok">Matched ${results.length} couple(s)${leftover.length ? `, ${leftover.length} still waiting for a spark` : ''}.</div>`;
  renderResults();
});
function sharedSummary(shared){
  const bits = [];
  ['interests','vibes','dateTypes','music','activities'].forEach(k => {
    (shared[k]||[]).forEach(t => bits.push(`${tagEmoji(k,t)} ${t}`));
  });
  if(shared.sameGrade) bits.push('🎓 same grade');
  if(shared.heightCompat==='mutual') bits.push('📏 height match');
  if(shared.sameComm) bits.push('📲 same texting style');
  return bits.length ? bits.join(', ') : 'a mystery spark ✨';
}
const MODE_BADGE = { locked:'💫 teacher pick', score:'✨ villa pick' };
function renderResults(){
  const card = document.getElementById('results-card');
  const list = document.getElementById('results-list');
  if(!ownerState.results){ card.classList.add('hidden'); return; }
  card.classList.remove('hidden');
  const rows = ownerState.results.pairs.map(pr => {
    const a = ownerRoster.find(x=>x.id===pr.aId), b = ownerRoster.find(x=>x.id===pr.bId);
    if(!a||!b) return '';
    return `<div class="banner ok text-left">
      <strong>${escapeHtml(a.name)}</strong> × <strong>${escapeHtml(b.name)}</strong> ${MODE_BADGE[pr.mode]||''}
      <div class="muted">Shared: ${sharedSummary(pr.shared)}</div>
    </div>`;
  }).join('');
  const leftoverNames = ownerState.results.leftoverIds.map(id => ownerRoster.find(x=>x.id===id)).filter(Boolean).map(p=>escapeHtml(p.name));
  list.innerHTML = rows + (leftoverNames.length ? `<p class="leftover">Still finding their spark: ${leftoverNames.join(', ')}</p>` : '');
}

document.getElementById('reset-all').addEventListener('click', async () => {
  if(!confirm('This deletes the entire roster, locked pairs, and results (passcode stays). Continue?')) return;
  await api('/api/reset', { method:'POST' });
  await loadOwnerData(); renderOwner();
});

// ---------- CSV export ----------
function downloadCSV(filename, rows){
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
document.getElementById('export-roster').addEventListener('click', () => {
  const rows = [['Name','Grade','Open to grades','Identity','Open to','Height','Height Preference','Interests','Vibe','Date Ideas','Music','Activities/Clubs','Texting Style','Dream Match']];
  ownerRoster.forEach(p => rows.push([
    p.name, GRADE_LABEL[p.grade]||'', (p.gradeOpenTo||[]).map(g=>GRADE_LABEL[g]).join(', '),
    IDENTITY_LABEL[p.identity], p.lookingFor.join(', '), formatHeight(p.heightIn), (p.heightPref||[]).join(', '),
    p.interests.join(', '), p.vibes.join(', '), p.dateTypes.join(', '), p.music.join(', '),
    (p.activities||[]).join(', '), p.comm||'', p.bio
  ]));
  downloadCSV('villa-roster.csv', rows);
});
document.getElementById('export-matches').addEventListener('click', () => {
  if(!ownerState.results){ alert('Generate matches first.'); return; }
  const rows = [['Islander A','Islander B','Match type','Shared traits']];
  ownerState.results.pairs.forEach(pr => {
    const a = ownerRoster.find(x=>x.id===pr.aId), b = ownerRoster.find(x=>x.id===pr.bId);
    rows.push([a?a.name:'?', b?b.name:'?', pr.mode||'score', sharedSummary(pr.shared)]);
  });
  downloadCSV('villa-matches.csv', rows);
});

// ---------- Reveal ----------
document.getElementById('start-reveal').addEventListener('click', async () => {
  ownerState.revealIndex = 0; ownerState.revealFlipped = false;
  await api('/api/state', { method:'PATCH', body: JSON.stringify({ revealIndex:0, revealFlipped:false }) });
  renderReveal(); showView('reveal');
});
document.getElementById('reveal-exit').addEventListener('click', () => { showView('owner'); });
document.getElementById('reveal-flip').addEventListener('click', async () => {
  ownerState.revealFlipped = true;
  await api('/api/state', { method:'PATCH', body: JSON.stringify({ revealFlipped:true }) });
  renderReveal();
});
document.getElementById('reveal-prev').addEventListener('click', async () => {
  if(ownerState.revealIndex>0){
    ownerState.revealIndex--; ownerState.revealFlipped=false;
    await api('/api/state', { method:'PATCH', body: JSON.stringify({ revealIndex: ownerState.revealIndex, revealFlipped:false }) });
    renderReveal();
  }
});
document.getElementById('reveal-next').addEventListener('click', async () => {
  if(ownerState.results && ownerState.revealIndex < ownerState.results.pairs.length-1){
    ownerState.revealIndex++; ownerState.revealFlipped=false;
    await api('/api/state', { method:'PATCH', body: JSON.stringify({ revealIndex: ownerState.revealIndex, revealFlipped:false }) });
    renderReveal();
  }
});
function renderReveal(){
  const el = document.getElementById('reveal-card');
  if(!ownerState.results || !ownerState.results.pairs.length){ el.innerHTML = '<p>No matches generated yet.</p>'; return; }
  const pr = ownerState.results.pairs[ownerState.revealIndex];
  const a = ownerRoster.find(x=>x.id===pr.aId), b = ownerRoster.find(x=>x.id===pr.bId);
  document.getElementById('reveal-progress').textContent = `Couple ${ownerState.revealIndex+1} of ${ownerState.results.pairs.length}`;
  document.getElementById('reveal-flip').disabled = ownerState.revealFlipped;
  document.getElementById('reveal-prev').disabled = ownerState.revealIndex===0;
  document.getElementById('reveal-next').disabled = ownerState.revealIndex===ownerState.results.pairs.length-1;
  if(!ownerState.revealFlipped){
    el.innerHTML = `
      <div class="dream-match-label">💭 Their Dream Matches 💭</div>
      <div class="clue">"${escapeHtml(a.bio) || 'No description given…'}"</div>
      <div class="heart-icon">💘</div>
      <div class="clue">"${escapeHtml(b.bio) || 'No description given…'}"</div>
      <p class="muted">See who was looking for who...</p>`;
  } else {
    el.innerHTML = `
      <div class="couple-names">${escapeHtml(a.name)} <span class="x">💕</span> ${escapeHtml(b.name)}</div>
      <div>${MODE_BADGE[pr.mode]||''}</div>
      <div class="why">Matched on: ${sharedSummary(pr.shared)}</div>`;
  }
}

// ---------- Owner render ----------
function renderOwner(){
  renderRoster();
  renderLockUI();
  renderResults();
}
function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
