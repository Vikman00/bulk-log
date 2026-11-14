(() => {
  'use strict';

  const KEY = 'bulk-log-data-v1';
  const KG_PER_LB = 0.45359237;
  const root = document.getElementById('app');
  const notice = document.getElementById('notice');
  const exerciseDialog = document.getElementById('exercise-dialog');
  const muscleDialog = document.getElementById('muscle-dialog');
  const foodDialog = document.getElementById('food-dialog');
  const ZXING_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
  const FOOD_API = 'https://world.openfoodfacts.org/api/v2/product/';
  // Daily activity and sport options, factors and formula follow the ESN calorie calculator (esn.com/pages/kalorienrechner).
  const ACTIVITY = {
    sitting: { factor: 1.2, label: 'Little active (sitting only)' },
    'mostly-sitting': { factor: 1.5, label: 'Somewhat active (mostly sitting)' },
    active: { factor: 1.7, label: 'Active (lots of walking)' },
    'very-active': { factor: 2, label: 'Very active (hard physical work)' }
  };
  const SPORT_FACTORS = [0, 0.1, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35];
  const GOALS = { lose: 'Lose weight', hold: 'Maintain', gain: 'Gain (bulk)' };
  const exerciseLibrary = window.BULK_EXERCISES || [];
  const muscleArt = window.BULK_MUSCLE_ART || {};
  const emptyData = () => ({ version: 1, unit: 'kg', startDate: '', workouts: {}, weights: {} });
  let data = emptyData();
  let storageIssue = '';
  let unreadableData = false;
  let selectedDate = localDate(new Date());
  let knownDeviceDay = selectedDate;
  let followDeviceDay = true;
  let tab = 'today';
  let editingSet = null;
  let editingWeight = false;
  let weightDraft = null;
  let pickerDate = null;
  let pickerQuery = '';
  let pickerGroup = 'All';
  let pickerAddedExercise = false;
  let pickerReturnFocus = null;
  let noticeTimer;
  let editingProfile = false;
  let foodDate = null;
  let foodCurrent = null;
  let foodAdded = false;
  let foodReturnFocus = null;
  let foodScanStop = null;
  let scanToken = 0;
  let lookupToken = 0;
  let zxingPromise = null;
  let progressPeriod = 'week';
  let progressAnchor = null;
  let progressExercise = null;
  let progressPickerOpen = false;
  const COLLAPSE_KEY = 'bulk-log-collapsed-v1';
  // Which exercise cards are minimized. A per-device view preference, kept outside the log data.
  const collapsed = new Set((() => {
    try { const v = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]'); return Array.isArray(v) ? v.filter(id => typeof id === 'string') : []; } catch { return []; }
  })());
  function storeCollapsed() {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...collapsed].slice(-500))); } catch { /* view preference only */ }
  }

  const icons = {
    barbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8v8M7 6v12M17 6v12M20 8v8M2 10v4M22 10v4M7 12h10"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5h16M6.5 16V11M12 16V5M17.5 16V8"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 9a4 4 0 0 1 8 0M12 9l1.5-2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21c-3.9 0-7-2.8-7-6.6 0-3.1 2-5.4 3.9-7.3.4 1.9 1.4 3 2.6 3.6C11.2 7.2 12.6 4.6 15 3c.3 3.1 4 5.6 4 10.6 0 4.3-3.1 7.4-7 7.4Z"/><path d="M12 21c-1.7 0-3-1.3-3-3 0-1.9 1.6-3 3-4.6 1.4 1.6 3 2.7 3 4.6 0 1.7-1.3 3-3 3Z"/></svg>',
    scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7.5 9v6M10.5 9v6M13.5 9v6M16.5 9v6"/></svg>'
  };

  function localDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function deviceToday() {
    return localDate(new Date());
  }

  function deviceTime(date = new Date()) {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return localDate(date) === value;
  }

  function dateObject(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function shiftDate(value, amount) {
    const date = dateObject(value);
    date.setDate(date.getDate() + amount);
    return localDate(date);
  }

  function bulkDay(day) {
    if (!data.startDate || day < data.startDate) return null;
    const asUTC = value => {
      const [year, month, date] = value.split('-').map(Number);
      return Date.UTC(year, month - 1, date);
    };
    return Math.floor((asUTC(day) - asUTC(data.startDate)) / 86400000) + 1;
  }

  function formatDate(value, options = { weekday: 'long', month: 'long', day: 'numeric' }) {
    return new Intl.DateTimeFormat(undefined, options).format(dateObject(value));
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function uid() {
    return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function validData(value) {
    if (!value || value.version !== 1 || !['kg', 'lb'].includes(value.unit) || (value.startDate !== '' && !validDate(value.startDate)) || !value.workouts || Array.isArray(value.workouts) || typeof value.workouts !== 'object' || !value.weights || Array.isArray(value.weights) || typeof value.weights !== 'object') return false;
    const isWeight = (number, allowZero) => typeof number === 'number' && Number.isFinite(number) && (allowZero ? number >= 0 : number > 0) && number <= 3000;
    for (const [day, weight] of Object.entries(value.weights)) if (!validDate(day) || !isWeight(weight, false)) return false;
    for (const [day, workout] of Object.entries(value.workouts)) {
      if (!validDate(day) || !workout || !Array.isArray(workout.exercises)) return false;
      for (const exercise of workout.exercises) {
        if (!exercise || typeof exercise.id !== 'string' || typeof exercise.name !== 'string' || !exercise.name.trim() || exercise.name.length > 100 || !Array.isArray(exercise.sets)) return false;
        for (const set of exercise.sets) {
          if (!set || typeof set.id !== 'string' || !isWeight(set.weightKg, true) || !Number.isInteger(set.reps) || set.reps < 1 || set.reps > 10000) return false;
        }
      }
    }
    if (value.nutrition !== undefined && !validNutrition(value.nutrition)) return false;
    return true;
  }

  function validNutrition(value) {
    const num = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
    const isObject = v => v && typeof v === 'object' && !Array.isArray(v);
    const text = (v, optional) => (optional && v === undefined) || (typeof v === 'string' && v.length <= 120 && (optional || v.trim().length > 0));
    const per100 = p => isObject(p) && num(p.kcal, 0, 1000) && num(p.protein, 0, 100) && num(p.carbs, 0, 100) && num(p.fat, 0, 100);
    const barcode = v => v === undefined || (typeof v === 'string' && /^\d{6,14}$/.test(v));
    if (!isObject(value) || !isObject(value.foods) || !isObject(value.products)) return false;
    const p = value.profile;
    if (p !== null && !(isObject(p) && ['m', 'f'].includes(p.sex) && Number.isInteger(p.age) && p.age >= 1 && p.age <= 99 && num(p.heightCm, 100, 250) && num(p.bodyFat, 1, 90) && Object.hasOwn(ACTIVITY, p.activity) && Number.isInteger(p.sport) && p.sport >= 0 && p.sport <= 7 && Object.hasOwn(GOALS, p.goal))) return false;
    for (const [day, entries] of Object.entries(value.foods)) {
      if (!validDate(day) || !Array.isArray(entries)) return false;
      for (const e of entries) if (!isObject(e) || typeof e.id !== 'string' || !text(e.name) || !text(e.brand, true) || !barcode(e.barcode) || !num(e.grams, 0.1, 5000) || !per100(e.per100)) return false;
    }
    for (const [code, product] of Object.entries(value.products)) {
      if (!/^\d{6,14}$/.test(code) || !isObject(product) || !text(product.name) || !text(product.brand, true) || !per100(product.per100) || (product.lastGrams !== undefined && !num(product.lastGrams, 0.1, 5000)) || (product.lastUsed !== undefined && !num(product.lastUsed, 0, 1e15))) return false;
    }
    return true;
  }

  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!validData(parsed)) throw new Error('The saved log is not in a recognized format.');
      data = parsed;
    }
  } catch (error) {
    unreadableData = true;
    storageIssue = 'Your saved log could not be read. It has not been overwritten; restore a backup to continue.';
  }

  function save() {
    if (unreadableData) {
      say('Restore a backup before changing this log.');
      return false;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      storageIssue = '';
      return true;
    } catch {
      storageIssue = 'Changes could not be saved on this device. Export a backup before closing this page.';
      say('Could not save. Export a backup before closing.');
      return false;
    }
  }

  function say(message) {
    notice.textContent = message;
    notice.classList.add('visible');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => notice.classList.remove('visible'), 3500);
  }

  function number(value) {
    return Number(value.toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  function displayWeight(kg) {
    return number(data.unit === 'kg' ? kg : kg / KG_PER_LB);
  }

  function inputWeight(kg) {
    return String(Number((data.unit === 'kg' ? kg : kg / KG_PER_LB).toFixed(2)));
  }

  function parseWeight(value, zeroAllowed) {
    const text = value.trim().replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
    const raw = Number(text);
    const kg = data.unit === 'kg' ? raw : raw * KG_PER_LB;
    if (!Number.isFinite(kg) || (zeroAllowed ? kg < 0 : kg <= 0) || kg > 3000) return null;
    return Number(kg.toFixed(5));
  }

  function currentWorkout() {
    return data.workouts[selectedDate] || { exercises: [] };
  }

  function getExercise(id) {
    return currentWorkout().exercises.find(exercise => exercise.id === id);
  }

  function setCount(workout) {
    return workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  }

  function sessionCount() {
    return Object.entries(data.workouts).filter(([day, workout]) => day <= deviceToday() && setCount(workout) > 0).length;
  }

  function nutrition() {
    if (!data.nutrition) data.nutrition = { profile: null, foods: {}, products: {} };
    return data.nutrition;
  }

  // Body weight for a day: that day's entry, otherwise the most recent earlier entry.
  function weightForDay(day) {
    if (data.weights[day]) return { kg: data.weights[day], day };
    const earlier = Object.keys(data.weights).filter(d => d < day).sort().at(-1);
    return earlier ? { kg: data.weights[earlier], day: earlier } : null;
  }

  // Same calculation as the ESN calorie calculator.
  function esnTargets(profile, weightKg) {
    const w = weightKg;
    let lean = 1;
    let kcal;
    if (profile.sex === 'm') {
      if (profile.bodyFat > 20) lean -= profile.bodyFat / 100;
      kcal = 66.47 + 13.7 * lean * w + 5 * profile.heightCm - 6.8 * profile.age;
    } else {
      if (profile.bodyFat > 30) lean -= profile.bodyFat / 100;
      kcal = 655.1 + 9.6 * lean * w + 1.8 * profile.heightCm - 4.7 * profile.age;
    }
    kcal *= SPORT_FACTORS[profile.sport] + ACTIVITY[profile.activity].factor;
    let protein;
    let fat;
    if (profile.goal === 'lose') { kcal -= 400; protein = 2.2 * lean * w; fat = (profile.sex === 'm' ? 0.7 : 0.9) * lean * w; }
    else if (profile.goal === 'gain') { kcal += 400; protein = 1.8 * lean * w; fat = 1.2 * lean * w; }
    else { protein = 2 * lean * w; fat = lean * w; }
    const carbs = (kcal - 4.1 * protein - 9.3 * fat) / 4.1;
    if (![kcal, protein, fat, carbs].every(v => Number.isFinite(v) && v >= 0)) return null;
    return { kcal, protein, fat, carbs };
  }

  function foodTotals(entries) {
    return entries.reduce((sum, e) => {
      const f = e.grams / 100;
      sum.kcal += e.per100.kcal * f; sum.protein += e.per100.protein * f; sum.carbs += e.per100.carbs * f; sum.fat += e.per100.fat * f;
      return sum;
    }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }

  function round(value, digits = 0) {
    return Number(value.toFixed(digits)).toLocaleString(undefined, { maximumFractionDigits: digits });
  }

  function parseAmount(value, min, max) {
    const text = String(value || '').trim().replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
    const n = Number(text);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  }

  function profileForm(p) {
    const v = p || { sex: 'm', age: '', heightCm: '', bodyFat: '', activity: 'mostly-sitting', sport: 3, goal: 'gain' };
    const radio = (name, value, label, checked) => `<label class="choice"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;
    return `<section class="card settings-card profile-card" aria-labelledby="profile-heading"><h2 id="profile-heading">Your details</h2><p class="setting-copy">Enter these once. They carry over to every day until you change them.</p>
      <form data-form="profile" class="profile-form">
        <div><span class="label">SEX</span><div class="choice-group">${radio('sex', 'm', 'Male', v.sex === 'm')}${radio('sex', 'f', 'Female', v.sex === 'f')}</div></div>
        <div class="profile-grid"><label><span class="form-label">Age</span><input class="field" name="age" type="text" inputmode="numeric" value="${escapeHTML(v.age)}" placeholder="e.g. 25" required></label>
          <label><span class="form-label">Height (cm)</span><input class="field" name="height" type="text" inputmode="decimal" value="${escapeHTML(v.heightCm)}" placeholder="e.g. 180" required></label>
          <label><span class="form-label">Body fat (%)</span><input class="field" name="bodyFat" type="text" inputmode="decimal" value="${escapeHTML(v.bodyFat)}" placeholder="e.g. 15" required></label></div>
        <label><span class="form-label">Daily activity (without sport)</span><select class="field" name="activity">${Object.entries(ACTIVITY).map(([key, a]) => `<option value="${key}" ${v.activity === key ? 'selected' : ''}>${a.label}</option>`).join('')}</select></label>
        <label><span class="form-label">Sport per week</span><select class="field" name="sport">${SPORT_FACTORS.map((_, i) => `<option value="${i}" ${Number(v.sport) === i ? 'selected' : ''}>${i === 0 ? 'No sport' : i === 7 ? '7× or more' : `${i}×`}</option>`).join('')}</select></label>
        <div><span class="label">GOAL</span><div class="choice-group three">${Object.entries(GOALS).map(([key, label]) => radio('goal', key, label, v.goal === key)).join('')}</div></div>
        <div class="form-row"><button class="button button-primary" type="submit">Save details</button>${p ? '<button class="button button-light" type="button" data-action="cancel-profile">Cancel</button>' : ''}</div>
      </form></section>`;
  }

  function profileSummary(p) {
    const sport = p.sport === 0 ? 'no sport' : `sport ${p.sport === 7 ? '7+' : p.sport}× a week`;
    const chips = [p.sex === 'm' ? 'Male' : 'Female', `${p.age} yrs`, `${round(p.heightCm, 1)} cm`, `${round(p.bodyFat, 1)}% body fat`, ACTIVITY[p.activity].label, sport, `Goal: ${GOALS[p.goal]}`];
    return `<section class="card settings-card profile-card"><div class="profile-summary-top"><div><h2>Your details</h2><p class="setting-copy">Used for every day's targets.</p></div><button class="button button-light" type="button" data-action="edit-profile">Edit</button></div><div class="muscle-chips">${chips.map(c => `<span class="muscle-chip">${escapeHTML(c)}</span>`).join('')}</div></section>`;
  }

  function macroRow(label, eaten, target) {
    const pct = target > 0 ? Math.min(100, (eaten / target) * 100) : 0;
    const left = target - eaten;
    return `<div class="macro-row"><div class="macro-top"><span>${label}</span><span><strong>${round(eaten)}</strong> / ${round(target)} g</span></div><div class="macro-bar"><span style="width:${pct}%"></span></div><div class="macro-left">${left >= 0 ? `${round(left)} g left` : `${round(-left)} g over`}</div></div>`;
  }

  function foodRow(entry) {
    const f = entry.grams / 100;
    return `<article class="card food-row"><div class="food-info"><strong>${escapeHTML(entry.name)}</strong><span>${entry.brand ? `${escapeHTML(entry.brand)} · ` : ''}${round(entry.grams, 1)} g</span><small>P ${round(entry.per100.protein * f, 1)} g · C ${round(entry.per100.carbs * f, 1)} g · F ${round(entry.per100.fat * f, 1)} g</small></div><div class="food-side"><span class="food-kcal">${round(entry.per100.kcal * f)}<small> kcal</small></span><button class="text-button" type="button" data-action="edit-food" data-food-id="${escapeHTML(entry.id)}" aria-label="Edit ${escapeHTML(entry.name)}">Edit</button></div></article>`;
  }

  function caloriesView() {
    const n = nutrition();
    const today = deviceToday();
    const p = n.profile;
    const w = weightForDay(selectedDate);
    const target = p && w ? esnTargets(p, w.kg) : null;
    const foods = n.foods[selectedDate] || [];
    const eaten = foodTotals(foods);
    let summary;
    if (!p) summary = `<p class="calorie-empty">Fill in your details below to see your daily calories and macros.</p>`;
    else if (!w) summary = `<p class="calorie-empty">Log your body weight on the Daily Log to calculate your targets.</p><button class="button button-lime" style="margin-top:14px" data-action="tab" data-tab="today">Go to Daily Log</button>`;
    else if (!target) summary = `<p class="calorie-empty">These details don't give a usable result. Please check your age, height and body fat.</p>`;
    else {
      const left = target.kcal - eaten.kcal;
      const sameDay = w.day === selectedDate;
      summary = `<div class="calorie-summary"><p class="weight-number">${round(Math.abs(left))} <span>kcal ${left >= 0 ? 'left' : 'over'}</span></p><div class="calorie-sub">Target <strong>${round(target.kcal)}</strong> · Eaten <strong>${round(eaten.kcal)}</strong></div></div>
        <div class="macro-list">${macroRow('Protein', eaten.protein, target.protein)}${macroRow('Carbs', eaten.carbs, target.carbs)}${macroRow('Fat', eaten.fat, target.fat)}</div>
        <p class="calorie-basis">Based on ${displayWeight(w.kg)} ${data.unit}${sameDay ? ' logged for this day' : ` from ${formatDate(w.day, { month: 'short', day: 'numeric' })} (no weight logged for this day yet)`}.</p>`;
    }
    return `<div class="page-heading"><div><div class="eyebrow">FUEL YOUR BULK</div><h1>Calories</h1><p class="page-subtitle">${formatDate(selectedDate)}</p></div>
      <div class="date-controls"><button class="icon-button" data-action="previous-day" aria-label="Previous day">${icons.left}</button><input class="date-input" type="date" value="${selectedDate}" max="${today}" data-input="selected-date" aria-label="Calories date"><button class="icon-button" data-action="next-day" aria-label="Next day" ${selectedDate >= today ? 'disabled' : ''}>${icons.right}</button></div></div>
      <div class="daily-log"><section class="card weight-card" aria-labelledby="calorie-heading"><div class="weight-card-heading"><span class="step-icon">${icons.flame}</span><div><div class="step-label">01 / YOUR TARGET</div><h2 id="calorie-heading">Daily calories</h2><p>For ${selectedDate === today ? 'today' : formatDate(selectedDate, { month: 'short', day: 'numeric' })}</p></div></div>${summary}</section>
      <div class="stack" style="margin-top:15px">${!p || editingProfile ? profileForm(p) : profileSummary(p)}</div>
      <section class="stack exercises-section" aria-labelledby="food-heading"><div class="section-heading"><div><div class="eyebrow">02 / WHAT YOU ATE</div><h2 id="food-heading">Food</h2></div><span class="subheading">${foods.length} ${foods.length === 1 ? 'item' : 'items'}</span></div>
        <div class="card add-card"><div><span class="label">BARCODE SCANNER</span><p class="add-hint">Scan a package to get its calories and macros, then enter how many grams you ate.</p></div><div class="food-buttons"><button class="button button-primary" type="button" data-action="open-food-scan">${icons.scan} Scan barcode</button><button class="button button-light" type="button" data-action="open-food-manual">Add manually</button></div></div>
        ${foods.map(foodRow).join('')}
      </section></div>`;
  }

  function button(tabName, label, icon) {
    return `<button class="nav-button ${tab === tabName ? 'active' : ''}" data-action="tab" data-tab="${tabName}" ${tab === tabName ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`;
  }

  function shell(content) {
    const navigation = `${button('today', 'Daily Log', icons.barbell)}${button('calories', 'Calories', icons.flame)}${button('progress', 'Progress', icons.chart)}`;
    return `<div class="app-shell">
      <header class="topbar"><div class="brand"><span class="brand-mark">${icons.barbell}</span><div><div class="brand-name">bulk log<span style="color:#8bae63">.</span></div><div class="brand-small">Made for your progress</div></div></div>
        <nav class="desktop-nav" aria-label="Main navigation">${navigation}</nav><div class="device-time" aria-label="Current device time"><span>DEVICE TIME</span><time data-device-clock>${deviceTime()}</time></div></header>
      ${storageIssue ? `<div role="alert" style="margin-top:16px;padding:13px 15px;background:#fff4dd;border-radius:12px;color:#795417;font-size:12px;line-height:1.5">${escapeHTML(storageIssue)}</div>` : ''}
      <main class="page">${content}</main>
      <nav class="bottom-nav" aria-label="Main navigation">${navigation}</nav>
    </div>`;
  }

  function exerciseCard(exercise) {
    const libraryExercise = exerciseLibrary.find(item => item.id === exercise.exerciseKey)
      || exerciseLibrary.find(item => item.name.toLowerCase() === exercise.name.toLowerCase());
    const rows = exercise.sets.map((set, index) => `<div class="set-row"><span class="set-number">${index + 1}</span><span>${displayWeight(set.weightKg)} ${data.unit}</span><span>${set.reps}</span><span class="set-edit"><button class="text-button" data-action="edit-set" data-exercise="${escapeHTML(exercise.id)}" data-set="${escapeHTML(set.id)}" aria-label="Edit set ${index + 1} of ${escapeHTML(exercise.name)}">Edit</button></span></div>`).join('');
    const edit = editingSet?.exercise === exercise.id ? exercise.sets.find(set => set.id === editingSet.set) : null;
    const previous = exercise.sets.at(-1);
    const value = edit || previous;
    const isCollapsed = collapsed.has(exercise.id) && !edit;
    const top = exercise.sets.reduce((best, set) => (!best || set.weightKg > best.weightKg || (set.weightKg === best.weightKg && set.reps > best.reps) ? set : best), null);
    const meta = `${exercise.sets.length} ${exercise.sets.length === 1 ? 'set' : 'sets'}${isCollapsed && top ? ` · top ${displayWeight(top.weightKg)} ${data.unit} × ${top.reps}` : ' logged'}${libraryExercise && !isCollapsed ? ` · ${escapeHTML(libraryExercise.group)}` : ''}`;
    const toggle = `<button class="collapse-toggle" type="button" data-action="toggle-exercise" data-exercise="${escapeHTML(exercise.id)}" aria-expanded="${!isCollapsed}" aria-label="${isCollapsed ? 'Show' : 'Hide'} sets for ${escapeHTML(exercise.name)}">${icons.right}</button>`;
    if (isCollapsed) {
      return `<article class="card exercise-card collapsed"><div class="exercise-top"><button class="exercise-identity collapsed-open" type="button" data-action="toggle-exercise" data-exercise="${escapeHTML(exercise.id)}" aria-expanded="false">${libraryExercise ? `<img class="exercise-card-image" src="${exerciseImage(libraryExercise)}" alt="">` : ''}<span><span class="exercise-name">${escapeHTML(exercise.name)}</span><span class="exercise-meta">${meta}</span></span></button>${toggle}</div></article>`;
    }
    return `<article class="card exercise-card"><div class="exercise-top"><div class="exercise-identity">${libraryExercise ? `<img class="exercise-card-image" src="${exerciseImage(libraryExercise)}" alt="">` : ''}<div><h3 class="exercise-name">${escapeHTML(exercise.name)}</h3><div class="exercise-meta">${meta}</div>${libraryExercise ? `<button class="exercise-details-link" type="button" data-action="exercise-details" data-library-id="${libraryExercise.id}">View muscles</button>` : ''}</div></div><div class="exercise-actions"><button class="text-button" data-action="remove-exercise" data-exercise="${escapeHTML(exercise.id)}" aria-label="Remove ${escapeHTML(exercise.name)}">Remove</button>${toggle}</div></div>
      ${rows ?`<div class="set-table"><div class="set-head"><span>Set</span><span>Weight</span><span>Reps</span><span></span></div>${rows}</div>` : ''}
      <form class="set-form ${edit ? 'editing' : ''}" data-form="set" data-exercise="${escapeHTML(exercise.id)}"><label><span class="form-label">Weight (${data.unit})</span><input class="field" name="weight" type="text" inputmode="decimal" value="${value ? inputWeight(value.weightKg) : ''}" placeholder="e.g. 40" required aria-label="Weight for ${escapeHTML(exercise.name)} in ${data.unit}"></label><label><span class="form-label">Reps</span><input class="field" name="reps" type="text" inputmode="numeric" value="${value ? value.reps : ''}" placeholder="e.g. 8" required aria-label="Reps for ${escapeHTML(exercise.name)}"></label>
        ${edit ? `<div class="edit-actions"><button class="button button-primary" type="submit">Save</button><button class="button button-light" type="button" data-action="cancel-edit">Cancel</button><button class="button button-light" type="button" data-action="remove-set" data-exercise="${escapeHTML(exercise.id)}" data-set="${escapeHTML(edit.id)}">Delete</button></div>` : `<button class="button button-primary" type="submit">${icons.plus} Log set</button>`}
      </form></article>`;
  }

  function todayView() {
    const workout = currentWorkout();
    const sets = setCount(workout);
    const today = deviceToday();
    const isToday = selectedDate === today;
    const weight = data.weights[selectedDate];
    const dayOfBulk = bulkDay(selectedDate);
    const weightContent = weight && !editingWeight
      ? `<div class="weight-summary"><p class="weight-number" aria-label="Body weight: ${displayWeight(weight)} ${data.unit}">${displayWeight(weight)} <span>${data.unit}</span></p><button class="button button-lime" type="button" data-action="edit-weight">Change</button></div>
        <div class="weight-status"><span>${storageIssue ? 'Not saved on this device' : 'Saved for this day'}</span><button class="text-button" type="button" data-action="remove-weight">Remove</button></div>`
      : `<form class="weight-form" data-form="weight"><label class="label" for="body-weight">WEIGHT (${data.unit})</label><div class="form-row"><input class="field" id="body-weight" name="weight" type="text" inputmode="decimal" value="${escapeHTML(weightDraft !== null ? weightDraft : weight ? inputWeight(weight) : '')}" placeholder="e.g. 75" required><button class="button button-lime" type="submit">${weight ? 'Save changes' : 'Save weight'}</button></div></form>
        <div class="weight-status"><span>${weight ? `Current: <strong>${displayWeight(weight)} ${data.unit}</strong>` : 'No weight logged for this day'}</span>${weight ? '<button class="text-button" type="button" data-action="cancel-weight">Cancel</button>' : ''}</div>`;
    return `<div class="page-heading"><div><div class="eyebrow">YOUR BULKING JOURNAL</div><h1>Daily Log</h1><p class="page-subtitle">${formatDate(selectedDate)}${dayOfBulk ? ` · Day ${dayOfBulk} of your bulk` : ''}</p></div>
      <div class="date-controls"><button class="icon-button" data-action="previous-day" aria-label="Previous day">${icons.left}</button><input class="date-input" type="date" value="${selectedDate}" max="${today}" data-input="selected-date" aria-label="Daily log date"><button class="icon-button" data-action="next-day" aria-label="Next day" ${selectedDate >= today ? 'disabled' : ''}>${icons.right}</button></div></div>
      <p class="date-hint" data-date-hint>${selectedDate > today ? 'Your device date changed. Choose today or an earlier day before saving.' : 'Today and past days only, based on your device.'}</p>
      <div class="daily-log"><section class="card weight-card" aria-labelledby="body-weight-heading"><div class="weight-card-heading"><span class="step-icon">${icons.scale}</span><div><div class="step-label">01 / START HERE</div><h2 id="body-weight-heading">Body weight</h2><p data-weight-day>For ${isToday ? 'today' : formatDate(selectedDate, { month: 'short', day: 'numeric' })}</p></div></div>
        ${weightContent}
      </section>
      <section class="stack exercises-section" aria-labelledby="exercises-heading"><div class="section-heading"><div><div class="eyebrow">02 / YOUR TRAINING</div><h2 id="exercises-heading">Exercises</h2></div><span class="subheading">${sets} ${sets === 1 ? 'set' : 'sets'} logged${workout.exercises.length > 1 ? ` · <button class="text-button collapse-all" type="button" data-action="${workout.exercises.every(e => collapsed.has(e.id)) ? 'expand-all' : 'collapse-all'}">${workout.exercises.every(e => collapsed.has(e.id)) ? 'Expand all' : 'Collapse all'}</button>` : ''}</span></div>
        ${workout.exercises.map(exerciseCard).join('')}
        <div class="card add-card"><div><span class="label">EXERCISE LIBRARY</span><p class="add-hint">${workout.exercises.length ? 'Next exercise? Pick it from the library.' : 'Choose an exercise to see the movement and muscles it works.'}</p></div><button class="button button-primary choose-exercise" type="button" data-action="open-exercises">${icons.plus} Choose exercise</button></div>
      </section></div>`;
  }

  // ---------- Progress: weekly / monthly charts ----------

  function mondayOf(day) {
    const d = dateObject(day);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return localDate(d);
  }

  function progressBuckets() {
    const today = deviceToday();
    const anchor = progressAnchor || today;
    if (progressPeriod === 'week') {
      const start = mondayOf(anchor);
      const days = Array.from({ length: 7 }, (_, i) => shiftDate(start, i));
      const end = days[6];
      const sameMonth = start.slice(0, 7) === end.slice(0, 7);
      return {
        title: `${formatDate(start, { month: 'short', day: 'numeric' })} – ${sameMonth ? dateObject(end).getDate() : formatDate(end, { month: 'short', day: 'numeric' })}, ${dateObject(end).getFullYear()}`,
        isCurrent: start === mondayOf(today),
        next: shiftDate(start, 7),
        prev: shiftDate(start, -7),
        buckets: days.map(day => ({ days: [day], label: formatDate(day, { weekday: 'short' }), sub: String(dateObject(day).getDate()), long: formatDate(day, { weekday: 'short', month: 'short', day: 'numeric' }), future: day > today }))
      };
    }
    const first = `${anchor.slice(0, 7)}-01`;
    const firstDate = dateObject(first);
    const last = localDate(new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0));
    const buckets = [];
    for (let start = mondayOf(first); start <= last; start = shiftDate(start, 7)) {
      const days = Array.from({ length: 7 }, (_, i) => shiftDate(start, i)).filter(day => day >= first && day <= last);
      const a = dateObject(days[0]).getDate();
      const b = dateObject(days.at(-1)).getDate();
      buckets.push({ days, label: a === b ? String(a) : `${a}–${b}`, sub: '', long: `${formatDate(days[0], { month: 'short', day: 'numeric' })}${a === b ? '' : ` – ${b}`}`, future: days[0] > today });
    }
    return {
      title: formatDate(first, { month: 'long', year: 'numeric' }),
      isCurrent: first.slice(0, 7) === today.slice(0, 7),
      next: localDate(new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 1)),
      prev: localDate(new Date(firstDate.getFullYear(), firstDate.getMonth() - 1, 1)),
      buckets
    };
  }

  function toUnit(kg) {
    return data.unit === 'kg' ? kg : kg / KG_PER_LB;
  }

  function exerciseKeyOf(exercise) {
    return exercise.exerciseKey ? `lib:${exercise.exerciseKey}` : `name:${exercise.name.trim().toLowerCase()}`;
  }

  // Every exercise ever logged with at least one set, most recently trained first.
  function loggedExercises() {
    const map = new Map();
    for (const day of Object.keys(data.workouts).sort()) {
      if (day > deviceToday()) continue;
      for (const exercise of data.workouts[day].exercises) {
        if (!exercise.sets.length) continue;
        map.set(exerciseKeyOf(exercise), { key: exerciseKeyOf(exercise), name: exercise.name, last: day });
      }
    }
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last) || a.name.localeCompare(b.name));
  }

  function niceTicks(min, max, count = 4) {
    if (min === max) { min -= 1; max += 1; }
    const raw = (max - min) / (count - 1);
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || 10 * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
    return ticks;
  }

  const CHART = { w: 320, h: 150, l: 36, r: 8, t: 12, b: 30 };
  const BAR_CHART = { ...CHART, h: 112 };

  function chartFrame(buckets, ticks, yOf, readouts, plot, cfg = CHART) {
    const { w, h, l, r, b } = cfg;
    const slot = (w - l - r) / buckets.length;
    const grid = ticks.map(v => `<line class="chart-grid" x1="${l}" x2="${w - r}" y1="${yOf(v)}" y2="${yOf(v)}"/><text class="chart-tick" x="${l - 6}" y="${yOf(v) + 3}" text-anchor="end">${round(v, 1)}</text>`).join('');
    const xLabels = buckets.map((bucket, i) => {
      const x = l + slot * (i + 0.5);
      return `<text class="chart-xlabel" x="${x}" y="${h - b + 14}" text-anchor="middle">${escapeHTML(bucket.label)}</text>${bucket.sub ? `<text class="chart-xsub" x="${x}" y="${h - b + 25}" text-anchor="middle">${escapeHTML(bucket.sub)}</text>` : ''}`;
    }).join('');
    const hits = buckets.map((_, i) => `<rect class="chart-hit" data-chart-index="${i}" data-readout="${escapeHTML(readouts[i])}" x="${l + slot * i}" y="${cfg.t - 6}" width="${slot}" height="${h - b - cfg.t + 6}" rx="6"/>`).join('');
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img">${grid}${hits}${plot(slot)}${xLabels}</svg>`;
  }

  function lineChart(buckets, values, readouts, label) {
    const known = values.filter(v => v !== null);
    if (!known.length) return `<p class="chart-empty">No ${label} in this period yet.</p>`;
    const ticks = niceTicks(Math.min(...known), Math.max(...known));
    const { h, l, t, b } = CHART;
    const yOf = v => t + (1 - (v - ticks[0]) / (ticks.at(-1) - ticks[0])) * (h - b - t);
    return chartFrame(buckets, ticks, yOf, readouts, slot => {
      const pts = values.map((v, i) => (v === null ? null : [l + slot * (i + 0.5), yOf(v)])).filter(Boolean);
      const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
      return `${pts.length > 1 ? `<path class="chart-line" d="${path}"/>` : ''}${pts.map(p => `<circle class="chart-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4.5"/>`).join('')}`;
    });
  }

  function barChart(buckets, values, readouts, label) {
    const known = values.filter(v => v !== null && v > 0);
    if (!known.length) return `<p class="chart-empty">No ${label} in this period yet.</p>`;
    const max = Math.max(...known);
    const step = max <= 4 ? 1 : Math.ceil(max / 4);
    const ticks = [];
    for (let v = 0; v <= Math.ceil(max / step) * step; v += step) ticks.push(v);
    const { h, l, t, b } = BAR_CHART;
    const base = h - b;
    const yOf = v => t + (1 - v / ticks.at(-1)) * (base - t);
    return chartFrame(buckets, ticks, yOf, readouts, slot => values.map((v, i) => {
      if (!v) return '';
      const bw = Math.min(14, slot * 0.35);
      const x = l + slot * (i + 0.5) - bw / 2;
      const y = yOf(v);
      const rr = Math.min(4, (base - y) / 2, bw / 2);
      return `<path class="chart-bar" d="M${x},${base}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + bw - rr}Q${x + bw},${y} ${x + bw},${y + rr}V${base}Z"/>`;
    }).join(''), BAR_CHART);
  }

  function libraryFor(option) {
    return option.key.startsWith('lib:')
      ? exerciseLibrary.find(item => item.id === option.key.slice(4))
      : exerciseLibrary.find(item => item.name.toLowerCase() === option.name.toLowerCase());
  }

  function exerciseThumb(option) {
    const item = libraryFor(option);
    return item ? `<img src="${exerciseImage(item)}" alt="" loading="lazy">` : `<span class="thumb-fallback" aria-hidden="true">${icons.barbell}</span>`;
  }

  // Exercise chooser with the same illustrations as the Daily Log.
  function exercisePicker(options, chosen) {
    const item = libraryFor(chosen);
    const current = `<button class="library-row exercise-select" type="button" data-action="toggle-progress-picker" aria-expanded="${progressPickerOpen}" aria-controls="progress-exercise-list">${exerciseThumb(chosen)}<span class="library-row-text"><span>${progressPickerOpen ? 'Choose an exercise' : 'Analyzing'}</span><strong>${escapeHTML(chosen.name)}</strong>${item ? `<small>${escapeHTML(item.group)}</small>` : ''}</span><span class="select-chevron ${progressPickerOpen ? 'open' : ''}" aria-hidden="true">${icons.right}</span></button>`;
    if (!progressPickerOpen) return current;
    return `${current}<div class="library-list progress-exercise-list" id="progress-exercise-list" role="listbox" aria-label="Exercise to analyze">${options.map(o => {
      const lib = libraryFor(o);
      const selected = o.key === chosen.key;
      return `<button class="library-row ${selected ? 'selected' : ''}" type="button" role="option" aria-selected="${selected}" data-action="choose-progress-exercise" data-key="${escapeHTML(o.key)}">${exerciseThumb(o)}<span class="library-row-text"><strong>${escapeHTML(o.name)}</strong>${lib ? `<span>${escapeHTML(lib.equipment)}</span>` : ''}<small>Last trained ${formatDate(o.last, { month: 'short', day: 'numeric' })}</small></span>${selected ? '<span class="selected-check" aria-hidden="true">✓</span>' : ''}</button>`;
    }).join('')}</div>`;
  }

  function lastIndex(values) {
    for (let i = values.length - 1; i >= 0; i--) if (values[i] !== null && values[i] !== 0) return i;
    return -1;
  }

  function progressView() {
    const period = progressBuckets();
    const { buckets } = period;
    const today = deviceToday();
    const u = data.unit;

    // Body weight: daily value (weekly view) or weekly average (monthly view).
    const weights = buckets.map(bucket => {
      const list = bucket.days.filter(day => day <= today && data.weights[day]).map(day => data.weights[day]);
      return list.length ? toUnit(list.reduce((s, v) => s + v, 0) / list.length) : null;
    });
    const weightReadouts = buckets.map((bucket, i) => `${bucket.long}: ${weights[i] === null ? 'no weight logged' : `${progressPeriod === 'month' ? 'avg ' : ''}${round(weights[i], 1)} ${u}`}`);
    const knownWeights = weights.filter(v => v !== null);
    const avg = knownWeights.length ? knownWeights.reduce((s, v) => s + v, 0) / knownWeights.length : null;
    const change = knownWeights.length >= 2 ? knownWeights.at(-1) - knownWeights[0] : null;
    const wLast = lastIndex(weights);

    // Exercise analysis.
    const options = loggedExercises();
    if (!options.some(o => o.key === progressExercise)) progressExercise = options[0]?.key || null;
    const chosen = options.find(o => o.key === progressExercise);
    const exStats = buckets.map(bucket => {
      const sets = bucket.days.filter(day => day <= today).flatMap(day => (data.workouts[day]?.exercises || []).filter(e => exerciseKeyOf(e) === progressExercise).flatMap(e => e.sets));
      if (!sets.length) return null;
      const top = Math.max(...sets.map(s => s.weightKg));
      const atTop = sets.filter(s => s.weightKg === top);
      return { top: toUnit(top), count: atTop.length, reps: Math.max(...atTop.map(s => s.reps)), total: sets.length };
    });
    const tops = exStats.map(s => (s ? s.top : null));
    const counts = exStats.map(s => (s ? s.count : null));
    const exReadouts = buckets.map((bucket, i) => {
      const s = exStats[i];
      return `${bucket.long}: ${s ? `top ${round(s.top, 1)} ${u} (best ${s.reps} reps) · ${s.count} ${s.count === 1 ? 'set' : 'sets'} at that weight · ${s.total} total` : 'not trained'}`;
    });
    const best = exStats.reduce((m, s) => (s && (!m || s.top > m.top || (s.top === m.top && s.reps > m.reps)) ? s : m), null);
    const trained = exStats.filter(Boolean).length;
    const eLast = lastIndex(tops);

    const tile = (label, value, detail) => `<div class="card metric"><div class="eyebrow">${label}</div><div class="metric-value">${value}</div><div class="metric-detail">${detail}</div></div>`;
    const unitSpan = ` <span>${u}</span>`;
    const periodWord = progressPeriod === 'week' ? 'week' : 'month';

    return `<div class="page-heading"><div><div class="eyebrow">THE BIG PICTURE</div><h1>Your progress</h1><p class="page-subtitle">See how your weight and lifts are moving.</p></div></div>
      <div class="period-bar"><div class="unit-toggle period-toggle" role="group" aria-label="Show progress by"><button data-action="period" data-period="week" class="${progressPeriod === 'week' ? 'active' : ''}" aria-pressed="${progressPeriod === 'week'}">Weekly</button><button data-action="period" data-period="month" class="${progressPeriod === 'month' ? 'active' : ''}" aria-pressed="${progressPeriod === 'month'}">Monthly</button></div>
        <div class="period-nav"><button class="icon-button" data-action="period-prev" aria-label="Previous ${periodWord}">${icons.left}</button><span class="period-title">${escapeHTML(period.title)}</span><button class="icon-button" data-action="period-next" aria-label="Next ${periodWord}" ${period.isCurrent ? 'disabled' : ''}>${icons.right}</button></div></div>

      <section class="card chart-card" aria-labelledby="weight-chart-title"><div class="chart-head"><div><div class="eyebrow">BODY WEIGHT</div><h2 id="weight-chart-title">${progressPeriod === 'week' ? 'Daily weight' : 'Weekly average weight'}</h2></div></div>
        <div class="metric-row"><div><span>Average</span><strong>${avg === null ? '—' : `${round(avg, 1)}${unitSpan}`}</strong></div><div><span>Change</span><strong>${change === null ? '—' : `${change > 0 ? '+' : change < 0 ? '−' : ''}${round(Math.abs(change), 1)}${unitSpan}`}</strong></div><div><span>Logged</span><strong>${knownWeights.length}<span> / ${buckets.length}</span></strong></div></div>
        ${lineChart(buckets, weights, weightReadouts, 'body weight')}
        ${knownWeights.length ? `<p class="chart-readout" aria-live="polite">${escapeHTML(weightReadouts[wLast])}</p><p class="chart-hint">Tap the chart to see each ${progressPeriod === 'week' ? 'day' : 'week'}.</p>` : ''}
      </section>

      <section class="card chart-card" aria-labelledby="exercise-chart-title"><div class="chart-head"><div><div class="eyebrow">EXERCISE</div><h2 id="exercise-chart-title">Lift progress</h2></div></div>
        ${options.length ? `${exercisePicker(options, chosen)}
        <div class="metric-row"><div><span>Best</span><strong>${best ? `${round(best.top, 1)}${unitSpan} <span>× ${best.reps}</span>` : '—'}</strong></div><div><span>${progressPeriod === 'week' ? 'Days' : 'Weeks'} trained</span><strong>${trained}<span> / ${buckets.length}</span></strong></div></div>
        <h3 class="chart-subtitle">Top weight (${u})</h3>
        ${lineChart(buckets, tops, exReadouts, `${escapeHTML(chosen.name)} sessions`)}
        ${trained ? `<h3 class="chart-subtitle">Sets at that top weight</h3>${barChart(buckets, counts, exReadouts, 'sets')}<p class="chart-readout" aria-live="polite">${escapeHTML(exReadouts[eLast])}</p><p class="chart-hint">Tap either chart to see each ${progressPeriod === 'week' ? 'day' : 'week'}.</p>` : ''}`
        : '<p class="chart-empty">Log a few sets on the Daily Log and your exercises will show up here.</p>'}
      </section>

      <section class="card settings-card"><h2>Your data stays with you</h2><p class="setting-copy">Your log is saved on this device. Clearing browser data or removing the app can delete it, so export a backup regularly.</p><div class="backup-buttons"><button class="button button-outline" data-action="export">Export backup</button><button class="button button-light" data-action="import">Restore backup</button><input id="import-file" class="file-input" type="file" accept="application/json,.json" aria-label="Choose backup file"></div></section>`;
  }

  function render() {
    root.innerHTML = shell(tab === 'today' ? todayView() : tab === 'calories' ? caloriesView() : progressView());
  }

  // Re-render without losing weight/reps typed into set forms but not yet logged.
  function renderKeepingDrafts() {
    const drafts = [...root.querySelectorAll('[data-form="set"]')].map(form => ({ exercise: form.dataset.exercise, weight: form.elements.weight.value, reps: form.elements.reps.value, changed: [...form.querySelectorAll('input')].some(input => input.value !== input.defaultValue) }));
    render();
    for (const draft of drafts) {
      if (!draft.changed) continue;
      const form = [...root.querySelectorAll('[data-form="set"]')].find(item => item.dataset.exercise === draft.exercise);
      if (form) { form.elements.weight.value = draft.weight; form.elements.reps.value = draft.reps; }
    }
  }

  function exerciseImage(exercise) {
    return `./assets/exercises/${exercise.id}-illustration.webp`;
  }

  function pickerCredit() {
    return '<p class="picker-credit">Muscle images: Chrizz / Nikai, <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>; BodyParts3D / Anatomography / DBCLS, <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en" target="_blank" rel="noopener noreferrer">CC BY-SA 2.1 JP</a> (resized). Sources accompany each image. <a href="https://training.fit/exercise/" target="_blank" rel="noopener noreferrer">Muscle references</a></p>';
  }

  function updatePickerResults() {
    const results = exerciseDialog.querySelector('[data-picker-results]');
    const count = exerciseDialog.querySelector('[data-picker-count]');
    if (!results || !count) return;
    const terms = pickerQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matching = exerciseLibrary.filter(exercise => {
      const text = [exercise.name, exercise.group, exercise.equipment, ...exercise.primary, ...exercise.secondary, exercise.keywords || ''].join(' ').toLowerCase();
      return (pickerGroup === 'All' || exercise.group === pickerGroup) && terms.every(term => text.includes(term));
    });
    count.textContent = `${matching.length} ${matching.length === 1 ? 'exercise' : 'exercises'}`;
    results.innerHTML = matching.length ? matching.map(exercise => `<button class="library-row" type="button" data-picker="details" data-id="${exercise.id}"><img src="${exerciseImage(exercise)}" alt="" loading="lazy"><span class="library-row-text"><strong>${escapeHTML(exercise.name)}</strong><span>${escapeHTML(exercise.equipment)}</span><small>Targets: ${escapeHTML(exercise.primary.join(', '))}</small></span><span class="library-chevron" aria-hidden="true">›</span></button>`).join('') : '<p class="picker-empty">No exercises match your search. Try a different name or muscle.</p>';
    exerciseDialog.querySelectorAll('[data-picker="group"]').forEach(button => {
      const selected = button.dataset.group === pickerGroup;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function showPickerList() {
    const groups = ['All', 'Chest', 'Back', 'Biceps', 'Shoulders', 'Triceps'];
    exerciseDialog.innerHTML = `<div class="picker-shell"><header class="picker-header"><div><div class="eyebrow">YOUR EXERCISE LIBRARY</div><h2 id="picker-title">Choose an exercise</h2><p>See the movement and muscles it works.</p></div><button class="picker-close" type="button" data-picker="close" aria-label="Close exercise library">×</button></header>
      <div class="picker-tools"><label class="visually-hidden" for="exercise-search">Search exercises or muscles</label><input id="exercise-search" class="field picker-search" type="search" value="${escapeHTML(pickerQuery)}" placeholder="Search exercises or muscles" autocomplete="off"><div class="picker-filters" role="group" aria-label="Filter by muscle group">${groups.map(group => `<button class="filter-chip" type="button" data-picker="group" data-group="${group}" aria-pressed="false">${group}</button>`).join('')}</div></div>
      <div class="picker-scroll"><div class="picker-count" data-picker-count role="status"></div><div class="library-list" data-picker-results></div><div class="picker-custom"><span>Doing something else?</span><button class="text-button" type="button" data-picker="custom">Add a custom exercise</button></div>${pickerCredit()}</div></div>`;
    updatePickerResults();
    if (exerciseDialog.open) exerciseDialog.querySelector('[data-picker="close"]')?.focus({ preventScroll: true });
  }

  function showExerciseDetails(exercise, viewOnly = false) {
    const muscles = items => `<div class="muscle-chips">${items.map(item => `<span class="muscle-chip">${escapeHTML(item)}</span>`).join('')}</div>`;
    const anatomy = (exercise.muscleArt || []).map(id => {
      const item = muscleArt[id];
      if (!item) return '';
      return `<figure class="anatomy-figure"><button class="anatomy-image-button" type="button" data-picker="zoom-muscle" data-id="${id}" aria-label="Enlarge ${escapeHTML(item.label)} muscle image"><img src="./assets/muscles/${id}.png" alt="${escapeHTML(item.label)} highlighted in red"></button><figcaption><strong>${escapeHTML(item.label)}</strong><span>Tap image to enlarge · <a href="${item.source}" target="_blank" rel="noopener noreferrer" aria-label="Image source for ${escapeHTML(item.label)}">Source ↗</a></span></figcaption></figure>`;
    }).join('');
    const diagramNote = exercise.muscleArt?.includes('deltoids') ? ' The shoulder image shows the whole deltoid; the labels below name the portions most involved.' : '';
    exerciseDialog.innerHTML = `<div class="picker-shell"><header class="picker-header detail-header">${viewOnly ? '<span class="picker-back">EXERCISE DETAILS</span>' : `<button class="picker-back" type="button" data-picker="back">${icons.left} All exercises</button>`}<button class="picker-close" type="button" data-picker="close" aria-label="Close exercise details">×</button></header>
      <div class="picker-scroll picker-detail"><div class="eyebrow">${escapeHTML(exercise.group)} · ${escapeHTML(exercise.equipment)}</div><h2 id="picker-title">${escapeHTML(exercise.name)}</h2><div class="exercise-visuals"><figure class="movement-figure"><div class="visual-heading">THE MOVEMENT</div><img src="${exerciseImage(exercise)}" alt="Illustration of ${escapeHTML(exercise.name)}"><figcaption>Exercise illustration</figcaption></figure><div class="anatomy-column"><div class="visual-heading"><span class="red-dot" aria-hidden="true"></span> MUSCLES IN RED</div>${anatomy}</div></div>
      <section class="muscle-section"><h3>Main muscles</h3>${muscles(exercise.primary)}</section>${exercise.secondary.length ? `<section class="muscle-section"><h3>Assisting muscles</h3>${muscles(exercise.secondary)}</section>` : ''}<p class="muscle-note">The muscles involved can vary with technique and equipment.${diagramNote}</p><a class="exercise-reference" href="${exercise.reference}" target="_blank" rel="noopener noreferrer">Read about this exercise ↗</a>${pickerCredit()}</div>
      <footer class="picker-footer">${viewOnly ? '<button class="button button-primary picker-add" type="button" data-picker="close">Done</button>' : `<p class="picker-day">Adding to ${formatDate(pickerDate, { weekday: 'short', month: 'short', day: 'numeric' })}</p><p class="picker-error" data-picker-error role="alert" hidden></p><button class="button button-primary picker-add" type="button" data-picker="add" data-id="${exercise.id}">${icons.plus} Add to Daily Log</button>`}</footer></div>`;
    exerciseDialog.querySelector(viewOnly ? '[data-picker="close"]' : '[data-picker="back"]')?.focus({ preventScroll: true });
  }

  function showCustomExercise() {
    exerciseDialog.innerHTML = `<div class="picker-shell"><header class="picker-header detail-header"><button class="picker-back" type="button" data-picker="back">${icons.left} All exercises</button><button class="picker-close" type="button" data-picker="close" aria-label="Close exercise library">×</button></header>
      <div class="picker-scroll picker-detail"><div class="eyebrow">YOUR OWN EXERCISE</div><h2 id="picker-title">Add a custom exercise</h2><p class="custom-copy">You can still log an exercise that is not in the library. Custom exercises do not have an illustration or muscle details yet.</p><form data-picker-form="custom"><label class="label" for="custom-exercise-name">EXERCISE NAME</label><input class="field" id="custom-exercise-name" name="name" maxlength="100" placeholder="e.g. Squat" autocomplete="off" required><p class="picker-day">Adding to ${formatDate(pickerDate, { weekday: 'short', month: 'short', day: 'numeric' })}</p><p class="picker-error" data-picker-error role="alert" hidden></p><button class="button button-primary custom-submit" type="submit">${icons.plus} Add to Daily Log</button></form>${pickerCredit()}</div></div>`;
    exerciseDialog.querySelector('#custom-exercise-name')?.focus();
  }

  function openExercisePicker() {
    if (exerciseDialog.open) return;
    pickerDate = selectedDate;
    pickerQuery = '';
    pickerGroup = 'All';
    pickerAddedExercise = false;
    pickerReturnFocus = root.querySelector('[data-action="open-exercises"]');
    showPickerList();
    exerciseDialog.showModal();
    document.body.classList.add('dialog-open');
    exerciseDialog.querySelector('[data-picker="close"]')?.focus({ preventScroll: true });
  }

  function openLoggedExerciseDetails(exercise, origin) {
    if (exerciseDialog.open) return;
    pickerAddedExercise = false;
    pickerReturnFocus = origin;
    showExerciseDetails(exercise, true);
    exerciseDialog.showModal();
    document.body.classList.add('dialog-open');
    exerciseDialog.querySelector('[data-picker="close"]')?.focus({ preventScroll: true });
  }

  function showMuscleCloseup(id) {
    const item = muscleArt[id];
    if (!item || muscleDialog.open) return;
    muscleDialog.innerHTML = `<div class="muscle-closeup"><div class="muscle-closeup-header"><div><div class="eyebrow">MUSCLE CLOSE-UP</div><h2 id="muscle-title">${escapeHTML(item.label)}</h2></div><button class="picker-close" type="button" data-muscle-close aria-label="Close muscle image">×</button></div><img src="./assets/muscles/${id}.png" alt="${escapeHTML(item.label)} highlighted in red"><p>Highlighted in red · <a href="${item.source}" target="_blank" rel="noopener noreferrer">Image source ↗</a></p></div>`;
    muscleDialog.showModal();
  }

  function addExerciseToLog(name, exerciseKey = null) {
    syncDeviceClock();
    if (unreadableData || pickerDate !== selectedDate || selectedDate > deviceToday()) {
      const error = exerciseDialog.querySelector('[data-picker-error]');
      if (error) { error.textContent = unreadableData ? 'Restore a backup before changing this log.' : 'Choose today or an earlier day before adding an exercise.'; error.hidden = false; }
      return;
    }
    if (!data.workouts[selectedDate]) data.workouts[selectedDate] = { exercises: [] };
    const exerciseId = uid();
    const exercise = { id: exerciseId, name, sets: [] };
    if (exerciseKey) exercise.exerciseKey = exerciseKey;
    // Minimize finished exercises (ones with logged sets and no unsaved typing) to keep the log short.
    for (const form of root.querySelectorAll('[data-form="set"]')) {
      const prev = getExercise(form.dataset.exercise);
      const untouched = [...form.querySelectorAll('input')].every(input => input.value === input.defaultValue);
      if (prev?.sets.length && untouched) collapsed.add(prev.id);
    }
    storeCollapsed();
    data.workouts[selectedDate].exercises.push(exercise);
    const saved = save();
    pickerAddedExercise = true;
    exerciseDialog.close();
    renderKeepingDrafts();
    const setForm = [...root.querySelectorAll('[data-form="set"]')].find(item => item.dataset.exercise === exerciseId);
    setForm?.querySelector('[name="weight"]')?.focus();
    if (saved) say('Exercise added. Now log your first set.');
  }

  exerciseDialog.addEventListener('input', event => {
    if (event.target.id === 'exercise-search') { pickerQuery = event.target.value; updatePickerResults(); }
  });

  exerciseDialog.addEventListener('click', event => {
    const target = event.target.closest('[data-picker]');
    if (!target) return;
    const action = target.dataset.picker;
    if (action === 'close') { exerciseDialog.close(); return; }
    if (action === 'back') { showPickerList(); return; }
    if (action === 'group') { pickerGroup = target.dataset.group; updatePickerResults(); return; }
    if (action === 'custom') { showCustomExercise(); return; }
    if (action === 'zoom-muscle') { showMuscleCloseup(target.dataset.id); return; }
    const exercise = exerciseLibrary.find(item => item.id === target.dataset.id);
    if (action === 'details' && exercise) { showExerciseDetails(exercise); return; }
    if (action === 'add' && exercise) addExerciseToLog(exercise.name, exercise.id);
  });

  muscleDialog.addEventListener('click', event => {
    if (event.target.closest('[data-muscle-close]')) muscleDialog.close();
  });

  exerciseDialog.addEventListener('submit', event => {
    if (event.target.dataset.pickerForm !== 'custom') return;
    event.preventDefault();
    const name = String(new FormData(event.target).get('name') || '').trim();
    if (!name) {
      const error = exerciseDialog.querySelector('[data-picker-error]');
      if (error) { error.textContent = 'Enter an exercise name.'; error.hidden = false; }
      return;
    }
    addExerciseToLog(name);
  });

  exerciseDialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    pickerDate = null;
    if (!pickerAddedExercise) (pickerReturnFocus?.isConnected ? pickerReturnFocus : root.querySelector('[data-action="open-exercises"]'))?.focus({ preventScroll: true });
    pickerReturnFocus = null;
    pickerAddedExercise = false;
  });

  // ---------- Food dialog: barcode scanner, product lookup, grams ----------

  function foodHeader(title, eyebrow, back) {
    return `<header class="picker-header ${back ? 'detail-header' : ''}">${back ? `<button class="picker-back" type="button" data-food="back">${icons.left} Scanner</button>` : `<div><div class="eyebrow">${eyebrow}</div><h2 id="food-title">${title}</h2></div>`}<button class="picker-close" type="button" data-food="close" aria-label="Close">×</button></header>`;
  }

  function foodDay() {
    return `<p class="picker-day">Adding to ${formatDate(foodDate, { weekday: 'short', month: 'short', day: 'numeric' })}</p>`;
  }

  function recentProducts() {
    return Object.entries(nutrition().products).sort((a, b) => (b[1].lastUsed || 0) - (a[1].lastUsed || 0)).slice(0, 8);
  }

  function showFoodScan() {
    stopScanner();
    foodCurrent = null;
    const recent = recentProducts();
    foodDialog.innerHTML = `<div class="picker-shell">${foodHeader('Scan a barcode', 'FOOD SCANNER')}
      <div class="picker-scroll"><div class="scanner-frame" data-scanner-frame><video playsinline muted autoplay></video><div class="scanner-guide" aria-hidden="true"></div></div><p class="scanner-status" data-scan-status role="status">Starting camera…</p>
        <form data-food-form="code" class="code-form"><label class="label" for="barcode-input">OR TYPE THE BARCODE NUMBER</label><div class="form-row"><input class="field" id="barcode-input" name="code" type="text" inputmode="numeric" autocomplete="off" placeholder="e.g. 4000417025005"><button class="button button-primary" type="submit">Look up</button></div></form>
        ${recent.length ? `<div class="recent-foods"><span class="label">RECENT FOODS</span><div class="library-list">${recent.map(([code, p]) => `<button class="library-row recent-row" type="button" data-food="recent" data-code="${code}"><span class="library-row-text"><strong>${escapeHTML(p.name)}</strong><span>${p.brand ? `${escapeHTML(p.brand)} · ` : ''}${round(p.per100.kcal)} kcal per 100 g</span></span><span class="library-chevron" aria-hidden="true">›</span></button>`).join('')}</div></div>` : ''}
        <div class="picker-custom"><span>No barcode?</span><button class="text-button" type="button" data-food="manual">Enter food manually</button></div>
        <p class="picker-credit">Food data from <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a>, a free community database. Check values against the package if something looks off.</p></div></div>`;
    startScanner();
  }

  function scanStatus(text) {
    const el = foodDialog.querySelector('[data-scan-status]');
    if (el) el.textContent = text;
  }

  function loadZxing() {
    if (window.ZXing) return Promise.resolve();
    if (!zxingPromise) {
      zxingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = ZXING_URL;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve();
        script.onerror = () => { zxingPromise = null; script.remove(); reject(new Error('Scanner library failed to load')); };
        document.head.appendChild(script);
      });
    }
    return zxingPromise;
  }

  function stopScanner() {
    scanToken++;
    const stop = foodScanStop;
    foodScanStop = null;
    if (stop) { try { stop(); } catch { /* already stopped */ } }
  }

  function onBarcode(code) {
    if (navigator.vibrate) navigator.vibrate(60);
    stopScanner();
    lookupBarcode(code);
  }

  async function startScanner() {
    const token = ++scanToken;
    const video = foodDialog.querySelector('video');
    const frame = foodDialog.querySelector('[data-scanner-frame]');
    if (!video) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      frame?.remove();
      scanStatus('The camera is not available here (it needs a secure https address). Type the barcode instead.');
      return;
    }
    const constraints = { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } };
    try {
      const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
      let supported = [];
      if ('BarcodeDetector' in window) { try { supported = await window.BarcodeDetector.getSupportedFormats(); } catch { supported = []; } }
      const usable = formats.filter(f => supported.includes(f));
      if (token !== scanToken) return;
      if (usable.length) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (token !== scanToken) { stream.getTracks().forEach(t => t.stop()); return; }
        let stopped = false;
        foodScanStop = () => { stopped = true; stream.getTracks().forEach(t => t.stop()); video.srcObject = null; };
        video.srcObject = stream;
        await video.play().catch(() => {});
        const detector = new window.BarcodeDetector({ formats: usable });
        scanStatus('Point the camera at the barcode.');
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            if (!stopped && codes.length) { onBarcode(codes[0].rawValue); return; }
          } catch { /* frame not ready */ }
          if (!stopped) setTimeout(tick, 200);
        };
        tick();
        return;
      }
      scanStatus('Loading scanner…');
      await loadZxing();
      if (token !== scanToken) return;
      const Z = window.ZXing;
      const hints = new Map();
      hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128]);
      const reader = new Z.BrowserMultiFormatReader(hints, 200);
      let done = false;
      foodScanStop = () => { done = true; reader.reset(); };
      await reader.decodeFromConstraints(constraints, video, result => {
        if (result && !done) { done = true; onBarcode(result.getText()); }
      });
      if (!done && token === scanToken) scanStatus('Point the camera at the barcode.');
    } catch (error) {
      if (token !== scanToken) return;
      stopScanner();
      frame?.remove();
      scanStatus(error?.name === 'NotAllowedError'
        ? 'Camera access was blocked. Allow camera access for this app in your settings, or type the barcode below.'
        : error?.message === 'Scanner library failed to load'
          ? 'The scanner needs an internet connection the first time. Type the barcode below instead.'
          : 'The camera could not be started. Type the barcode below instead.');
    }
  }

  function showFoodLoading(code) {
    foodDialog.innerHTML = `<div class="picker-shell">${foodHeader('', '', true)}<div class="picker-scroll picker-detail"><div class="eyebrow">BARCODE ${escapeHTML(code)}</div><h2 id="food-title">Looking up product…</h2><p class="custom-copy">Searching the Open Food Facts database.</p></div></div>`;
  }

  function productFromApi(code, product) {
    const n = product.nutriments || {};
    const value = key => {
      const v = Number(n[key]);
      return n[key] !== undefined && n[key] !== '' && Number.isFinite(v) && v >= 0 ? v : null;
    };
    let kcal = value('energy-kcal_100g');
    if (kcal === null && value('energy_100g') !== null) kcal = value('energy_100g') / 4.184;
    const name = String(product.product_name || product.product_name_de || product.product_name_en || product.generic_name || '').trim().slice(0, 120) || 'Unnamed product';
    const brand = String(product.brands || '').split(',')[0].trim().slice(0, 120);
    const per100 = { kcal, protein: value('proteins_100g'), carbs: value('carbohydrates_100g'), fat: value('fat_100g') };
    return { barcode: code, name, brand, per100 };
  }

  function completePer100(per100) {
    return per100.kcal !== null && per100.protein !== null && per100.carbs !== null && per100.fat !== null && per100.kcal <= 1000 && per100.protein <= 100 && per100.carbs <= 100 && per100.fat <= 100;
  }

  async function lookupBarcode(raw) {
    const code = String(raw || '').replace(/\D/g, '');
    if (!/^\d{6,14}$/.test(code)) { say('That barcode number does not look right.'); return; }
    const cached = nutrition().products[code];
    if (cached) { showFoodProduct({ barcode: code, name: cached.name, brand: cached.brand, per100: cached.per100 }, { grams: cached.lastGrams }); return; }
    const token = ++lookupToken;
    showFoodLoading(code);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${FOOD_API}${code}.json?fields=product_name,product_name_de,product_name_en,generic_name,brands,nutriments`, { signal: controller.signal });
      const json = response.ok || response.status === 404 ? await response.json() : null;
      if (token !== lookupToken || !foodDialog.open) return;
      if (!json || json.status !== 1 || !json.product) {
        showFoodManual({ barcode: code }, response.ok || response.status === 404 ? 'This product is not in the food database yet. Enter the values from the nutrition label (per 100 g).' : 'The food database did not respond. Try again later, or enter the values from the label.');
        return;
      }
      const product = productFromApi(code, json.product);
      if (!completePer100(product.per100)) { showFoodManual(product, 'Some nutrition values are missing for this product. Fill them in from the label (per 100 g).'); return; }
      showFoodProduct(product);
    } catch {
      if (token !== lookupToken || !foodDialog.open) return;
      showFoodManual({ barcode: code }, 'Could not reach the food database. Check your connection, or enter the values from the label.');
    } finally { clearTimeout(timer); }
  }

  function amountTotals(per100, grams) {
    const f = grams / 100;
    return `<div class="amount-totals"><div><strong>${round(per100.kcal * f)}</strong><span>kcal</span></div><div><strong>${round(per100.protein * f, 1)}</strong><span>protein g</span></div><div><strong>${round(per100.carbs * f, 1)}</strong><span>carbs g</span></div><div><strong>${round(per100.fat * f, 1)}</strong><span>fat g</span></div></div>`;
  }

  function showFoodProduct(product, { entryId = null, grams } = {}) {
    stopScanner();
    foodCurrent = { product, entryId };
    const amount = grams || 100;
    const p = product.per100;
    foodDialog.innerHTML = `<div class="picker-shell">${entryId ? foodHeader('Edit food', 'YOUR FOOD') : foodHeader('', '', true)}
      <div class="picker-scroll picker-detail">${entryId ? '' : `<div class="eyebrow">${product.brand ? escapeHTML(product.brand) : 'PRODUCT'}</div><h2 id="food-title">${escapeHTML(product.name)}</h2>`}${entryId ? `<h2 class="food-edit-name">${escapeHTML(product.name)}</h2>` : ''}
        ${product.barcode ? `<p class="food-code">Barcode ${escapeHTML(product.barcode)}</p>` : ''}
        <div class="visual-heading" style="margin-top:20px">PER 100 G</div>
        <div class="per100-grid"><div><strong>${round(p.kcal)}</strong><span>kcal</span></div><div><strong>${round(p.protein, 1)}</strong><span>protein g</span></div><div><strong>${round(p.carbs, 1)}</strong><span>carbs g</span></div><div><strong>${round(p.fat, 1)}</strong><span>fat g</span></div></div>
        <form id="food-amount-form" data-food-form="amount" class="amount-form"><label class="label" for="food-grams">HOW MANY GRAMS DID YOU EAT?</label><input class="field" id="food-grams" name="grams" type="text" inputmode="decimal" value="${String(Number(amount.toFixed(1)))}" required></form>
        <div class="visual-heading" style="margin-top:18px">YOU ATE</div><div data-food-totals>${amountTotals(p, amount)}</div>
        <button class="text-button" type="button" data-food="correct" style="margin-top:10px;padding-left:0">Values wrong? Correct them</button></div>
      <footer class="picker-footer">${foodDay()}<p class="picker-error" data-food-error role="alert" hidden></p><div class="edit-actions"><button class="button button-primary picker-add" type="submit" form="food-amount-form">${entryId ? 'Save changes' : `${icons.plus} Add to today's food`}</button>${entryId ? '<button class="button button-light" type="button" data-food="delete">Delete</button>' : ''}</div></footer></div>`;
    if (!entryId && foodDate !== deviceToday()) foodDialog.querySelector('.picker-add').innerHTML = `${icons.plus} Add to food log`;
    const input = foodDialog.querySelector('#food-grams');
    input?.focus({ preventScroll: true });
    input?.select();
  }

  function showFoodManual(prefill = {}, note = '') {
    stopScanner();
    const editing = foodCurrent?.entryId || null;
    foodCurrent = { product: prefill, entryId: editing, grams: foodCurrent?.grams };
    const p = prefill.per100 || {};
    const val = v => (v === null || v === undefined ? '' : escapeHTML(String(Number(Number(v).toFixed(1)))));
    foodDialog.innerHTML = `<div class="picker-shell">${editing ? foodHeader('Correct values', 'YOUR FOOD') : foodHeader('', '', true)}
      <div class="picker-scroll picker-detail">${editing ? '' : `<div class="eyebrow">${prefill.barcode ? `BARCODE ${escapeHTML(prefill.barcode)}` : 'YOUR OWN FOOD'}</div><h2 id="food-title">Enter nutrition values</h2>`}
        ${note ? `<p class="food-note">${escapeHTML(note)}</p>` : ''}
        <form id="food-manual-form" data-food-form="manual" class="manual-form"><label><span class="form-label">Food name</span><input class="field" name="name" maxlength="120" value="${escapeHTML(prefill.name && prefill.name !== 'Unnamed product' ? prefill.name : '')}" placeholder="e.g. Oats" required></label>
          <div class="visual-heading" style="margin-top:6px">PER 100 G (FROM THE LABEL)</div>
          <div class="manual-grid"><label><span class="form-label">Calories (kcal)</span><input class="field" name="kcal" type="text" inputmode="decimal" value="${val(p.kcal)}" required></label><label><span class="form-label">Protein (g)</span><input class="field" name="protein" type="text" inputmode="decimal" value="${val(p.protein)}" required></label><label><span class="form-label">Carbs (g)</span><input class="field" name="carbs" type="text" inputmode="decimal" value="${val(p.carbs)}" required></label><label><span class="form-label">Fat (g)</span><input class="field" name="fat" type="text" inputmode="decimal" value="${val(p.fat)}" required></label></div>
          <label><span class="form-label">Grams eaten</span><input class="field" name="grams" type="text" inputmode="decimal" value="${val(prefill.grams || foodCurrent.grams || 100)}" required></label></form></div>
      <footer class="picker-footer">${foodDay()}<p class="picker-error" data-food-error role="alert" hidden></p><button class="button button-primary picker-add" type="submit" form="food-manual-form">${editing ? 'Save changes' : `${icons.plus} Add food`}</button></footer></div>`;
    foodDialog.querySelector('[name="name"]')?.focus({ preventScroll: true });
  }

  function foodError(text) {
    const el = foodDialog.querySelector('[data-food-error]');
    if (el) { el.textContent = text; el.hidden = false; } else say(text);
  }

  function saveFoodEntry(product, grams) {
    syncDeviceClock();
    if (unreadableData) { foodError('Restore a backup before changing this log.'); return; }
    if (foodDate !== selectedDate || foodDate > deviceToday()) { foodError('Choose today or an earlier day before adding food.'); return; }
    const n = nutrition();
    const entryId = foodCurrent?.entryId;
    const list = n.foods[foodDate] || (n.foods[foodDate] = []);
    const per100 = { kcal: Number(product.per100.kcal.toFixed(2)), protein: Number(product.per100.protein.toFixed(2)), carbs: Number(product.per100.carbs.toFixed(2)), fat: Number(product.per100.fat.toFixed(2)) };
    const entry = { id: entryId || uid(), name: product.name.trim().slice(0, 120), grams, per100 };
    if (product.brand) entry.brand = product.brand.slice(0, 120);
    if (product.barcode) entry.barcode = product.barcode;
    const index = entryId ? list.findIndex(e => e.id === entryId) : -1;
    if (index >= 0) list[index] = entry; else list.push(entry);
    if (product.barcode) {
      n.products[product.barcode] = { name: entry.name, ...(entry.brand ? { brand: entry.brand } : {}), per100, lastGrams: grams, lastUsed: Date.now() };
      const codes = Object.keys(n.products);
      if (codes.length > 300) codes.sort((a, b) => (n.products[a].lastUsed || 0) - (n.products[b].lastUsed || 0)).slice(0, codes.length - 300).forEach(c => delete n.products[c]);
    }
    const saved = save();
    foodAdded = true;
    foodDialog.close();
    render();
    if (saved) say(index >= 0 ? 'Food updated.' : `${entry.name} added.`);
  }

  function openFoodDialog(mode, entryId, origin) {
    if (foodDialog.open) return;
    if (selectedDate > deviceToday()) { say('Choose today or an earlier day.'); return; }
    foodDate = selectedDate;
    foodAdded = false;
    foodCurrent = null;
    foodReturnFocus = origin;
    if (mode === 'edit') {
      const entry = (nutrition().foods[selectedDate] || []).find(e => e.id === entryId);
      if (!entry) return;
      foodDialog.innerHTML = '';
      foodDialog.showModal();
      showFoodProduct({ barcode: entry.barcode, name: entry.name, brand: entry.brand, per100: entry.per100 }, { entryId: entry.id, grams: entry.grams });
    } else {
      foodDialog.innerHTML = '';
      foodDialog.showModal();
      if (mode === 'manual') showFoodManual(); else showFoodScan();
    }
    document.body.classList.add('dialog-open');
  }

  foodDialog.addEventListener('click', event => {
    const target = event.target.closest('[data-food]');
    if (!target) return;
    const action = target.dataset.food;
    if (action === 'close') { foodDialog.close(); return; }
    if (action === 'back') { lookupToken++; showFoodScan(); return; }
    if (action === 'manual') { showFoodManual(); return; }
    if (action === 'recent') { lookupBarcode(target.dataset.code); return; }
    if (action === 'correct' && foodCurrent) {
      const grams = parseAmount(foodDialog.querySelector('#food-grams')?.value, 0.1, 5000);
      showFoodManual({ ...foodCurrent.product, grams: grams || undefined });
      return;
    }
    if (action === 'delete' && foodCurrent?.entryId) {
      const entryId = foodCurrent.entryId;
      const day = foodDate;
      askConfirm(`Remove ${foodCurrent.product.name} from this day?`, 'Remove').then(ok => {
        if (!ok || !foodDialog.open || foodDate !== day) return;
        if (unreadableData) { foodError('Restore a backup before changing this log.'); return; }
        const n = nutrition();
        n.foods[day] = (n.foods[day] || []).filter(e => e.id !== entryId);
        if (!n.foods[day].length) delete n.foods[day];
        const saved = save(); foodAdded = true; foodDialog.close(); render(); if (saved) say('Food removed.');
      });
    }
  });

  // In-app confirmation (window.confirm is blocked or auto-dismissed in some browsers and installed web apps).
  const confirmDialog = document.getElementById('confirm-dialog');
  let confirmResolve = null;
  function askConfirm(message, actionLabel = 'Delete') {
    if (confirmResolve) { confirmResolve(false); confirmResolve = null; }
    if (confirmDialog.open) confirmDialog.close();
    return new Promise(resolve => {
      confirmResolve = resolve;
      confirmDialog.innerHTML = `<div class="confirm-box"><h2 id="confirm-title">${escapeHTML(message)}</h2><div class="confirm-actions"><button class="button button-light" type="button" data-confirm="no">Cancel</button><button class="button button-danger" type="button" data-confirm="yes">${escapeHTML(actionLabel)}</button></div></div>`;
      confirmDialog.showModal();
      confirmDialog.querySelector('[data-confirm="no"]')?.focus({ preventScroll: true });
    });
  }
  confirmDialog.addEventListener('click', event => {
    const choice = event.target.closest('[data-confirm]')?.dataset.confirm;
    if (!choice && event.target !== confirmDialog) return;
    const resolve = confirmResolve; confirmResolve = null;
    confirmDialog.close();
    if (resolve) resolve(choice === 'yes');
  });
  confirmDialog.addEventListener('close', () => {
    const resolve = confirmResolve; confirmResolve = null;
    if (resolve) resolve(false);
  });

  foodDialog.addEventListener('input', event => {
    if (event.target.id !== 'food-grams' || !foodCurrent) return;
    const grams = parseAmount(event.target.value, 0, 5000);
    const box = foodDialog.querySelector('[data-food-totals]');
    if (box) box.innerHTML = amountTotals(foodCurrent.product.per100, grams || 0);
  });

  foodDialog.addEventListener('submit', event => {
    const form = event.target.closest('[data-food-form]');
    if (!form) return;
    event.preventDefault();
    const kind = form.dataset.foodForm;
    if (kind === 'code') { lookupBarcode(form.elements.code.value); return; }
    if (kind === 'amount' && foodCurrent) {
      const grams = parseAmount(form.elements.grams.value, 0.1, 5000);
      if (grams === null) { foodError('Enter the grams you ate (up to 5000).'); return; }
      saveFoodEntry(foodCurrent.product, grams);
      return;
    }
    if (kind === 'manual') {
      const v = name => form.elements[name].value;
      const name = v('name').trim();
      const per100 = { kcal: parseAmount(v('kcal'), 0, 1000), protein: parseAmount(v('protein'), 0, 100), carbs: parseAmount(v('carbs'), 0, 100), fat: parseAmount(v('fat'), 0, 100) };
      const grams = parseAmount(v('grams'), 0.1, 5000);
      if (!name) { foodError('Enter a name for this food.'); return; }
      if (!completePer100(per100)) { foodError('Enter calories (0–1000) and protein, carbs and fat (0–100 g) per 100 g.'); return; }
      if (grams === null) { foodError('Enter the grams you ate (up to 5000).'); return; }
      saveFoodEntry({ ...(foodCurrent?.product || {}), name, per100 }, grams);
    }
  });

  foodDialog.addEventListener('close', () => {
    stopScanner();
    lookupToken++;
    document.body.classList.remove('dialog-open');
    if (!foodAdded && foodReturnFocus?.isConnected) foodReturnFocus.focus({ preventScroll: true });
    foodDialog.innerHTML = '';
    foodDate = null; foodCurrent = null; foodReturnFocus = null; foodAdded = false;
  });

  function hasPendingWork() {
    if (exerciseDialog.open || foodDialog.open || editingProfile || editingWeight || editingSet || weightDraft !== null) return true;
    return [...root.querySelectorAll('form[data-form] input')].some(input => input.value !== input.defaultValue);
  }

  function syncDeviceClock() {
    const now = new Date();
    const today = localDate(now);
    root.querySelectorAll('[data-device-clock]').forEach(clock => { clock.textContent = deviceTime(now); });
    if (today === knownDeviceDay) return false;

    const previousDay = knownDeviceDay;
    knownDeviceDay = today;
    const datedTab = tab === 'today' || tab === 'calories';
    const pending = datedTab && hasPendingWork();
    const wasFollowingToday = followDeviceDay;
    if ((followDeviceDay || selectedDate > today) && !pending) {
      selectedDate = today;
      followDeviceDay = true;
    } else if (pending && (followDeviceDay || selectedDate > today)) {
      followDeviceDay = false;
    }

    const shouldRender = datedTab
      ? !pending && (wasFollowingToday || selectedDate === today)
      : !hasPendingWork();
    if (shouldRender) {
      render();
      if (datedTab && wasFollowingToday) say('A new day has started on your device.');
      return true;
    }

    const dateInput = root.querySelector('[data-input="selected-date"]');
    if (dateInput) dateInput.max = today;
    const nextButton = root.querySelector('[data-action="next-day"]');
    if (nextButton) nextButton.disabled = selectedDate >= today;
    const weightDay = root.querySelector('[data-weight-day]');
    if (weightDay) weightDay.textContent = `For ${selectedDate === today ? 'today' : formatDate(selectedDate, { month: 'short', day: 'numeric' })}`;
    const hint = root.querySelector('[data-date-hint]');
    if (hint) {
      hint.textContent = selectedDate > today
        ? 'Your device date changed. Choose today or an earlier day before saving.'
        : pending && selectedDate === previousDay
          ? `It is a new day. You are still editing ${formatDate(selectedDate, { month: 'short', day: 'numeric' })}.`
          : 'Today and past days only, based on your device.';
    }
    return false;
  }

  root.addEventListener('click', async event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (syncDeviceClock()) return;
    if (action === 'tab') { tab = target.dataset.tab; editingSet = null; editingWeight = false; weightDraft = null; editingProfile = false; render(); window.scrollTo(0, 0); return; }
    if (action === 'previous-day' || action === 'next-day') {
      const nextDate = shiftDate(selectedDate, action === 'previous-day' ? -1 : 1);
      if (!validDate(nextDate) || nextDate > deviceToday()) { say('Choose today or an earlier day.'); return; }
      selectedDate = nextDate; followDeviceDay = selectedDate === deviceToday(); editingSet = null; editingWeight = false; weightDraft = null; render(); return;
    }
    if (action === 'open-day') {
      if (!validDate(target.dataset.date) || target.dataset.date > deviceToday()) { say('Future days cannot be edited.'); return; }
      selectedDate = target.dataset.date; followDeviceDay = selectedDate === deviceToday(); tab = 'today'; editingSet = null; editingWeight = false; weightDraft = null; render(); window.scrollTo(0, 0); return;
    }
    if (selectedDate > deviceToday() && ['edit-set', 'remove-set', 'remove-exercise', 'edit-weight', 'remove-weight'].includes(action)) { say('Choose today or an earlier day.'); return; }
    if (action === 'edit-set') { editingSet = { exercise: target.dataset.exercise, set: target.dataset.set }; render(); return; }
    if (action === 'cancel-edit') { editingSet = null; render(); return; }
    if (action === 'export') {
      const json = unreadableData ? localStorage.getItem(KEY) : JSON.stringify(data, null, 2);
      const blob = new Blob([json || ''], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `bulk-log-backup-${localDate(new Date())}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      say('Backup exported. Keep it somewhere safe.');
      return;
    }
    if (action === 'import') { document.getElementById('import-file').click(); return; }
    if (action === 'toggle-progress-picker') {
      progressPickerOpen = !progressPickerOpen; render();
      root.querySelector('[data-action="toggle-progress-picker"]')?.focus({ preventScroll: true });
      return;
    }
    if (action === 'choose-progress-exercise') {
      progressExercise = target.dataset.key; progressPickerOpen = false; render();
      const picker = root.querySelector('[data-action="toggle-progress-picker"]');
      picker?.focus({ preventScroll: true });
      picker?.closest('.chart-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }
    if (action === 'period') { progressPeriod = target.dataset.period === 'month' ? 'month' : 'week'; progressAnchor = null; render(); return; }
    if (action === 'period-prev' || action === 'period-next') {
      const period = progressBuckets();
      if (action === 'period-next' && period.isCurrent) return;
      progressAnchor = action === 'period-prev' ? period.prev : period.next;
      if (progressAnchor >= deviceToday() || progressBuckets().isCurrent) progressAnchor = null;
      render(); return;
    }
    if (action === 'toggle-exercise') {
      const id = target.dataset.exercise;
      const form = root.querySelector(`[data-form="set"][data-exercise="${CSS.escape(id)}"]`);
      if (!collapsed.has(id) && form && [...form.querySelectorAll('input')].some(input => input.value !== input.defaultValue)) { say('Log or clear the set you are typing before hiding this exercise.'); return; }
      if (collapsed.has(id)) collapsed.delete(id); else collapsed.add(id);
      if (editingSet?.exercise === id) editingSet = null;
      storeCollapsed();
      renderKeepingDrafts();
      root.querySelector(`[data-action="toggle-exercise"][data-exercise="${CSS.escape(id)}"].collapse-toggle`)?.focus({ preventScroll: true });
      return;
    }
    if (action === 'collapse-all' || action === 'expand-all') {
      for (const exercise of currentWorkout().exercises) {
        const form = root.querySelector(`[data-form="set"][data-exercise="${CSS.escape(exercise.id)}"]`);
        const typing = form && [...form.querySelectorAll('input')].some(input => input.value !== input.defaultValue);
        if (action === 'expand-all') collapsed.delete(exercise.id); else if (!typing) collapsed.add(exercise.id);
      }
      editingSet = null;
      storeCollapsed();
      renderKeepingDrafts();
      return;
    }
    if (action === 'exercise-details') {
      const exercise = exerciseLibrary.find(item => item.id === target.dataset.libraryId);
      if (exercise) openLoggedExerciseDetails(exercise, target);
      return;
    }
    if (unreadableData) { say('Restore a backup before changing this log.'); return; }
    if (action === 'edit-profile') { editingProfile = true; render(); root.querySelector('[data-form="profile"] input[name="age"]')?.focus(); return; }
    if (action === 'cancel-profile') { editingProfile = false; render(); return; }
    if (action === 'open-food-scan') { openFoodDialog('scan', null, target); return; }
    if (action === 'open-food-manual') { openFoodDialog('manual', null, target); return; }
    if (action === 'edit-food') { openFoodDialog('edit', target.dataset.foodId, target); return; }
    if (action === 'open-exercises') { if (selectedDate > deviceToday()) say('Choose today or an earlier day.'); else openExercisePicker(); return; }
    if (action === 'edit-weight') { editingWeight = true; weightDraft = inputWeight(data.weights[selectedDate]); render(); const input = document.getElementById('body-weight'); input?.focus(); input?.select(); return; }
    if (action === 'cancel-weight') { editingWeight = false; weightDraft = null; render(); return; }
    if (action === 'unit') { data.unit = target.dataset.unit; save(); render(); return; }
    const day = selectedDate;
    if (action === 'remove-weight') {
      if (!(await askConfirm('Remove this body-weight entry?', 'Remove'))) return;
      delete data.weights[day]; editingWeight = false; weightDraft = null; const saved = save(); render(); if (saved) say('Weight entry removed.');
      return;
    }
    if (action === 'remove-exercise') {
      if (!(await askConfirm('Remove this exercise and all of its sets for this day?', 'Remove'))) return;
      if (!data.workouts[day]) return;
      data.workouts[day].exercises = data.workouts[day].exercises.filter(item => item.id !== target.dataset.exercise);
      if (!data.workouts[day].exercises.length) delete data.workouts[day];
      editingSet = null; const saved = save(); render(); if (saved) say('Exercise removed.'); return;
    }
    if (action === 'remove-set') {
      if (!(await askConfirm('Delete this set?'))) return;
      const exercise = (data.workouts[day]?.exercises || []).find(item => item.id === target.dataset.exercise);
      if (exercise) exercise.sets = exercise.sets.filter(item => item.id !== target.dataset.set);
      editingSet = null; const saved = save(); render(); if (saved) say('Set deleted.');
    }
  });

  // Chart readout: tap (or hover) a day/week column to see its values.
  function showChartReadout(hit) {
    const card = hit.closest('.chart-card');
    if (!card) return;
    const readout = card.querySelector('.chart-readout');
    if (readout) readout.textContent = hit.dataset.readout;
    const index = hit.dataset.chartIndex;
    card.querySelectorAll('.chart-hit').forEach(rect => rect.classList.toggle('active', rect.dataset.chartIndex === index));
  }
  root.addEventListener('click', event => { const hit = event.target.closest('.chart-hit'); if (hit) showChartReadout(hit); });
  root.addEventListener('mouseover', event => { const hit = event.target.closest('.chart-hit'); if (hit) showChartReadout(hit); });

  root.addEventListener('input', event => {
    if (event.target.id === 'body-weight') weightDraft = event.target.value;
  });

  root.addEventListener('change', async event => {
    if (syncDeviceClock()) return;
    if (event.target.dataset.input === 'selected-date') {
      const date = event.target.value;
      if (!validDate(date) || date > deviceToday()) { event.target.value = selectedDate; say('Choose today or an earlier day.'); return; }
      selectedDate = date; followDeviceDay = selectedDate === deviceToday(); editingSet = null; editingWeight = false; weightDraft = null; render(); return;
    }
    if (event.target.id !== 'import-file' || !event.target.files.length) return;
    try {
      const incoming = JSON.parse(await event.target.files[0].text());
      if (!validData(incoming)) throw new Error('Invalid backup');
      if (!(await askConfirm('Restore this backup? It will replace the log currently on this device.', 'Restore'))) { event.target.value = ''; return; }
      data = incoming; unreadableData = false; const saved = save(); editingSet = null; editingWeight = false; weightDraft = null; render(); if (saved) say('Backup restored.');
    } catch { event.target.value = ''; say('That file is not a valid Bulk Log backup.'); }
  });

  root.addEventListener('submit', event => {
    const form = event.target.closest('[data-form]');
    if (!form) return;
    event.preventDefault();
    if (syncDeviceClock()) return;
    if (unreadableData) { say('Restore a backup before changing this log.'); return; }
    if (['set', 'weight'].includes(form.dataset.form) && selectedDate > deviceToday()) { say('Choose today or an earlier day.'); return; }
    const values = new FormData(form);
    if (form.dataset.form === 'set') {
      const weight = parseWeight(String(values.get('weight') || ''), true);
      const repsText = String(values.get('reps') || '').trim();
      const reps = Number(repsText);
      if (weight === null) { say('Enter a valid weight. Use 0 for bodyweight.'); return; }
      if (!/^\d+$/.test(repsText) || !Number.isInteger(reps) || reps < 1 || reps > 10000) { say('Enter a whole number of reps greater than zero.'); return; }
      const exercise = getExercise(form.dataset.exercise);
      if (!exercise) return;
      const existing = editingSet?.exercise === exercise.id ? exercise.sets.find(set => set.id === editingSet.set) : null;
      if (existing) { existing.weightKg = weight; existing.reps = reps; } else exercise.sets.push({ id: uid(), weightKg: weight, reps });
      const message = existing ? 'Set updated.' : 'Set logged.';
      editingSet = null; const saved = save(); render(); if (saved) say(message); return;
    }
    if (form.dataset.form === 'weight') {
      const weight = parseWeight(String(values.get('weight') || ''), false);
      if (weight === null) { say('Enter a valid body weight greater than zero.'); return; }
      data.weights[selectedDate] = weight; editingWeight = false; weightDraft = null; const saved = save(); render(); if (saved) say('Body weight saved.'); return;
    }
    if (form.dataset.form === 'profile') {
      const age = parseAmount(values.get('age'), 1, 99);
      const heightCm = parseAmount(values.get('height'), 100, 250);
      const bodyFat = parseAmount(values.get('bodyFat'), 1, 90);
      const activity = String(values.get('activity') || '');
      const sport = Number(values.get('sport'));
      const sex = String(values.get('sex') || '');
      const goal = String(values.get('goal') || '');
      if (age === null || !Number.isInteger(age)) { say('Enter your age as a whole number (1–99).'); return; }
      if (heightCm === null) { say('Enter your height in cm (100–250).'); return; }
      if (bodyFat === null) { say('Enter your body fat in % (1–90).'); return; }
      if (!['m', 'f'].includes(sex) || !Object.hasOwn(ACTIVITY, activity) || !Number.isInteger(sport) || sport < 0 || sport > 7 || !Object.hasOwn(GOALS, goal)) { say('Check your details and try again.'); return; }
      nutrition().profile = { sex, age, heightCm, bodyFat, activity, sport, goal };
      editingProfile = false; const saved = save(); render(); if (saved) say('Details saved. They carry over to every day.'); return;
    }
    if (form.dataset.form === 'start') {
      const date = String(values.get('date') || '');
      if (date && !validDate(date)) { say('Choose a valid start date.'); return; }
      data.startDate = date; const saved = save(); render(); if (saved) say(date ? 'Start date saved.' : 'Start date cleared.');
    }
  });

  render();
  setInterval(syncDeviceClock, 30000);
  window.addEventListener('focus', syncDeviceClock);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncDeviceClock(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
