(() => {
  'use strict';

  const KEY = 'bulk-log-data-v1';
  const KG_PER_LB = 0.45359237;
  const root = document.getElementById('app');
  const notice = document.getElementById('notice');
  const exerciseDialog = document.getElementById('exercise-dialog');
  const muscleDialog = document.getElementById('muscle-dialog');
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

  const icons = {
    barbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8v8M7 6v12M17 6v12M20 8v8M2 10v4M22 10v4M7 12h10"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5h16M6.5 16V11M12 16V5M17.5 16V8"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 9a4 4 0 0 1 8 0M12 9l1.5-2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg>'
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

  function button(tabName, label, icon) {
    return `<button class="nav-button ${tab === tabName ? 'active' : ''}" data-action="tab" data-tab="${tabName}" ${tab === tabName ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`;
  }

  function shell(content) {
    const navigation = `${button('today', 'Daily Log', icons.barbell)}${button('history', 'History', icons.calendar)}${button('progress', 'Progress', icons.chart)}`;
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
    return `<article class="card exercise-card"><div class="exercise-top"><div class="exercise-identity">${libraryExercise ? `<img class="exercise-card-image" src="${exerciseImage(libraryExercise)}" alt="">` : ''}<div><h3 class="exercise-name">${escapeHTML(exercise.name)}</h3><div class="exercise-meta">${exercise.sets.length} ${exercise.sets.length === 1 ? 'set' : 'sets'} logged${libraryExercise ? ` · ${escapeHTML(libraryExercise.group)}` : ''}</div>${libraryExercise ? `<button class="exercise-details-link" type="button" data-action="exercise-details" data-library-id="${libraryExercise.id}">View muscles</button>` : ''}</div></div><button class="text-button" data-action="remove-exercise" data-exercise="${escapeHTML(exercise.id)}" aria-label="Remove ${escapeHTML(exercise.name)}">Remove</button></div>
      ${rows ? `<div class="set-table"><div class="set-head"><span>Set</span><span>Weight</span><span>Reps</span><span></span></div>${rows}</div>` : ''}
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
      <section class="stack exercises-section" aria-labelledby="exercises-heading"><div class="section-heading"><div><div class="eyebrow">02 / YOUR TRAINING</div><h2 id="exercises-heading">Exercises</h2></div><span class="subheading">${sets} ${sets === 1 ? 'set' : 'sets'} logged</span></div>
        <div class="card add-card"><div><span class="label">EXERCISE LIBRARY</span><p class="add-hint">Choose an exercise to see the movement and muscles it works.</p></div><button class="button button-primary choose-exercise" type="button" data-action="open-exercises">${icons.plus} Choose exercise</button></div>
        ${workout.exercises.map(exerciseCard).join('')}
      </section></div>`;
  }

  function historyView() {
    const days = Object.keys(data.workouts).filter(day => data.workouts[day].exercises.length).sort().reverse();
    return `<div class="page-heading"><div><div class="eyebrow">THE WORK YOU'VE PUT IN</div><h1>Workout history</h1><p class="page-subtitle">Every day you showed up, in one place.</p></div></div>
      ${days.length ? `<div class="history-list">${days.map(day => {
        const workout = data.workouts[day];
        const date = dateObject(day);
        const names = workout.exercises.map(exercise => exercise.name).join(' · ');
        const sets = setCount(workout);
        const future = day > deviceToday();
        return `<button class="history-row" data-action="open-day" data-date="${day}" ${future ? 'disabled title="Available on this date"' : ''}><span class="history-date"><strong>${date.getDate()}</strong><span>${formatDate(day, { month: 'short' })}</span></span><span class="history-info"><strong>${formatDate(day, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</strong><span>${future ? 'Locked until this date · ' : ''}${sets} ${sets === 1 ? 'set' : 'sets'} · ${escapeHTML(names)}</span></span><span class="history-arrow" aria-hidden="true">›</span></button>`;
      }).join('')}</div>` : `<div class="card empty-workout"><div class="empty-icon">${icons.calendar}</div><div class="empty-title">Your story starts here</div><p class="empty-copy">Your workouts will appear here when you add an exercise.</p><button class="button button-primary" style="margin-top:18px" data-action="tab" data-tab="today">Log a workout</button></div>`}`;
  }

  function progressView() {
    const allDates = Object.keys(data.weights).sort();
    const dates = allDates.filter(day => day <= deviceToday());
    const first = dates.length ? data.weights[dates[0]] : null;
    const last = dates.length ? data.weights[dates.at(-1)] : null;
    const diff = dates.length >= 2 ? last - first : null;
    const totalSets = Object.entries(data.workouts).reduce((sum, [day, workout]) => sum + (day <= deviceToday() ? setCount(workout) : 0), 0);
    const change = diff === null ? '—' : `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${displayWeight(Math.abs(diff))}`;
    return `<div class="page-heading"><div><div class="eyebrow">THE BIG PICTURE</div><h1>Your progress</h1><p class="page-subtitle">Keep track of the work behind your bulk.</p></div></div>
      <div class="metric-grid"><div class="card metric"><div class="eyebrow">LATEST WEIGHT</div><div class="metric-value">${last === null ? '—' : `${displayWeight(last)} <span>${data.unit}</span>`}</div><div class="metric-detail">${dates.length ? formatDate(dates.at(-1), { month: 'short', day: 'numeric', year: 'numeric' }) : 'No weight logged yet'}</div></div>
      <div class="card metric"><div class="eyebrow">WEIGHT CHANGE</div><div class="metric-value">${change}${diff === null ? '' : ` <span>${data.unit}</span>`}</div><div class="metric-detail">${dates.length >= 2 ? 'Since your first entry' : 'Add two entries to compare'}</div></div>
      <div class="card metric"><div class="eyebrow">WORK PUT IN</div><div class="metric-value">${sessionCount()} <span>sessions</span></div><div class="metric-detail">${totalSets} total sets logged</div></div></div>
      <div class="progress-grid"><section class="card settings-card"><h2>Body-weight history</h2><p class="setting-copy">Add a weight entry on any day from the Daily Log tab.</p><div class="weight-list">${allDates.length ? allDates.slice().reverse().map(day => `<div class="weight-row"><span>${formatDate(day, { month: 'short', day: 'numeric', year: 'numeric' })}${day > deviceToday() ? ' · Locked until this date' : ''}</span><strong>${displayWeight(data.weights[day])} ${data.unit}</strong></div>`).join('') : '<p class="setting-copy">No entries yet. Your trend will show up here.</p>'}</div></section>
      <div class="stack"><section class="card settings-card"><h2>Your setup</h2><p class="setting-copy">Make the log yours. You can change these any time.</p><div class="setting-line"><span class="label">WEIGHT UNIT</span><div class="unit-toggle" role="group" aria-label="Weight unit"><button data-action="unit" data-unit="kg" class="${data.unit === 'kg' ? 'active' : ''}" aria-pressed="${data.unit === 'kg'}">kg</button><button data-action="unit" data-unit="lb" class="${data.unit === 'lb' ? 'active' : ''}" aria-pressed="${data.unit === 'lb'}">lb</button></div></div>
      <form class="setting-line" data-form="start"><label class="label" for="bulk-start">BULK START DATE</label><div class="form-row"><input class="field" id="bulk-start" name="date" type="date" value="${escapeHTML(data.startDate)}"><button class="button button-light" type="submit">Save</button></div></form></section>
      <section class="card settings-card"><h2>Your data stays with you</h2><p class="setting-copy">Your log is saved on this device. Clearing browser data or removing the app can delete it, so export a backup regularly.</p><div class="backup-buttons"><button class="button button-outline" data-action="export">Export backup</button><button class="button button-light" data-action="import">Restore backup</button><input id="import-file" class="file-input" type="file" accept="application/json,.json" aria-label="Choose backup file"></div></section></div></div>`;
  }

  function render() {
    root.innerHTML = shell(tab === 'today' ? todayView() : tab === 'history' ? historyView() : progressView());
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
    const pendingSets = [...root.querySelectorAll('[data-form="set"]')].map(form => ({ exercise: form.dataset.exercise, weight: form.elements.weight.value, reps: form.elements.reps.value }));
    if (!data.workouts[selectedDate]) data.workouts[selectedDate] = { exercises: [] };
    const exerciseId = uid();
    const exercise = { id: exerciseId, name, sets: [] };
    if (exerciseKey) exercise.exerciseKey = exerciseKey;
    data.workouts[selectedDate].exercises.push(exercise);
    const saved = save();
    pickerAddedExercise = true;
    exerciseDialog.close();
    render();
    for (const draft of pendingSets) {
      const form = [...root.querySelectorAll('[data-form="set"]')].find(item => item.dataset.exercise === draft.exercise);
      if (form) { form.elements.weight.value = draft.weight; form.elements.reps.value = draft.reps; }
    }
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

  function hasPendingWork() {
    if (exerciseDialog.open || editingWeight || editingSet || weightDraft !== null) return true;
    return [...root.querySelectorAll('form[data-form] input')].some(input => input.value !== input.defaultValue);
  }

  function syncDeviceClock() {
    const now = new Date();
    const today = localDate(now);
    root.querySelectorAll('[data-device-clock]').forEach(clock => { clock.textContent = deviceTime(now); });
    if (today === knownDeviceDay) return false;

    const previousDay = knownDeviceDay;
    knownDeviceDay = today;
    const pending = tab === 'today' && hasPendingWork();
    const wasFollowingToday = followDeviceDay;
    if ((followDeviceDay || selectedDate > today) && !pending) {
      selectedDate = today;
      followDeviceDay = true;
    } else if (pending && (followDeviceDay || selectedDate > today)) {
      followDeviceDay = false;
    }

    const shouldRender = tab === 'today'
      ? !pending && (wasFollowingToday || selectedDate === today)
      : !hasPendingWork();
    if (shouldRender) {
      render();
      if (tab === 'today' && wasFollowingToday) say('A new day has started on your device.');
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

  root.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (syncDeviceClock()) return;
    if (action === 'tab') { tab = target.dataset.tab; editingSet = null; editingWeight = false; weightDraft = null; render(); window.scrollTo(0, 0); return; }
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
    if (action === 'exercise-details') {
      const exercise = exerciseLibrary.find(item => item.id === target.dataset.libraryId);
      if (exercise) openLoggedExerciseDetails(exercise, target);
      return;
    }
    if (unreadableData) { say('Restore a backup before changing this log.'); return; }
    if (action === 'open-exercises') { if (selectedDate > deviceToday()) say('Choose today or an earlier day.'); else openExercisePicker(); return; }
    if (action === 'edit-weight') { editingWeight = true; weightDraft = inputWeight(data.weights[selectedDate]); render(); const input = document.getElementById('body-weight'); input?.focus(); input?.select(); return; }
    if (action === 'cancel-weight') { editingWeight = false; weightDraft = null; render(); return; }
    if (action === 'unit') { data.unit = target.dataset.unit; save(); render(); return; }
    if (action === 'remove-weight') {
      if (confirm('Remove this body-weight entry?')) { delete data.weights[selectedDate]; editingWeight = false; weightDraft = null; const saved = save(); render(); if (saved) say('Weight entry removed.'); }
      return;
    }
    if (action === 'remove-exercise') {
      if (!confirm('Remove this exercise and all of its sets for this day?')) return;
      data.workouts[selectedDate].exercises = currentWorkout().exercises.filter(item => item.id !== target.dataset.exercise);
      if (!data.workouts[selectedDate].exercises.length) delete data.workouts[selectedDate];
      editingSet = null; const saved = save(); render(); if (saved) say('Exercise removed.'); return;
    }
    if (action === 'remove-set') {
      if (!confirm('Delete this set?')) return;
      const exercise = getExercise(target.dataset.exercise);
      if (exercise) exercise.sets = exercise.sets.filter(item => item.id !== target.dataset.set);
      editingSet = null; const saved = save(); render(); if (saved) say('Set deleted.');
    }
  });

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
      if (!confirm('Restore this backup? It will replace the log currently on this device.')) { event.target.value = ''; return; }
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
