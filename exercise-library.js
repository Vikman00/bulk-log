// Muscle descriptions were checked against the linked exercise references.
window.BULK_EXERCISES = [
  {
    id: 'db-bench-press', name: 'Flat Bench Press (Dumbbell)', group: 'Chest',
    equipment: 'Dumbbells · flat bench', primary: ['Chest (pectoralis major)'], muscleArt: ['chest'],
    secondary: ['Front shoulders', 'Triceps'], reference: 'https://training.fit/exercise/dumbbell-bench-press/'
  },
  {
    id: 'bench-press', name: 'Flat Bench Press (Barbell)', group: 'Chest',
    equipment: 'Barbell · flat bench', primary: ['Chest (pectoralis major)'], muscleArt: ['chest'],
    secondary: ['Front shoulders', 'Triceps'], reference: 'https://training.fit/exercise/benchpress/'
  },
  {
    id: 'machine-chest-fly', name: 'Butterfly (Machine)', group: 'Chest',
    equipment: 'Chest fly machine', primary: ['Chest (pectoralis major)'], muscleArt: ['chest'],
    secondary: ['Front shoulders', 'Serratus anterior'], reference: 'https://training.fit/exercise/machine-fly/', keywords: 'pec deck chest fly'
  },
  {
    id: 'db-fly', name: 'Flat Dumbbell Butterfly', group: 'Chest',
    equipment: 'Dumbbells · flat bench', primary: ['Chest (pectoralis major)'], muscleArt: ['chest'],
    secondary: ['Front shoulders'], reference: 'https://training.fit/exercise/flys/', keywords: 'dumbbell fly flyes'
  },
  {
    id: 'machine-reverse-fly', name: 'Reverse Butterfly (Machine)', group: 'Shoulders',
    equipment: 'Reverse fly machine', primary: ['Rear shoulders (posterior deltoids)'], muscleArt: ['deltoids'],
    secondary: ['Rhomboids', 'Trapezius'], reference: 'https://training.fit/exercise/reverse-butterfly/', keywords: 'rear delt reverse pec deck'
  },
  {
    id: 'lat-pulldown', name: 'Cable Lat Pulldown', group: 'Back',
    equipment: 'Cable pulldown machine', primary: ['Lats (latissimus dorsi)'], muscleArt: ['lats'],
    secondary: ['Biceps', 'Rhomboids', 'Rear shoulders'], reference: 'https://training.fit/exercise/cable-lat-pulldown/'
  },
  {
    id: 'seated-cable-row', name: 'Seated Cable Row (Narrow Grip)', group: 'Back',
    equipment: 'Cable machine · narrow handle', primary: ['Lats (latissimus dorsi)', 'Rhomboids'], muscleArt: ['lats', 'rhomboid'],
    secondary: ['Biceps', 'Rear shoulders', 'Spinal erectors'], reference: 'https://training.fit/exercise/cable-row/', keywords: 'close grip v handle'
  },
  {
    id: 'wide-grip-seated-cable-row', name: 'Seated Cable Row (Wider Grip)', group: 'Back',
    equipment: 'Cable machine · wide bar', primary: ['Lats (latissimus dorsi)', 'Rhomboids'], muscleArt: ['lats', 'rhomboid'],
    secondary: ['Biceps', 'Rear shoulders'], reference: 'https://exercise-dataset.com/exercise/wide-grip-seated-cable-row/', keywords: 'wide grip upper back'
  },
  {
    id: 'hammer-curl', name: 'Dumbbell Hammer Curls', group: 'Biceps',
    equipment: 'Dumbbells · neutral grip', primary: ['Biceps (biceps brachii)', 'Brachialis'], muscleArt: ['biceps', 'brachialis'],
    secondary: ['Forearms'], reference: 'https://training.fit/exercise/hammer-curls/'
  },
  {
    id: 'bicep-curl', name: 'Dumbbell Bicep Curls', group: 'Biceps',
    equipment: 'Dumbbells', primary: ['Biceps (biceps brachii)'], muscleArt: ['biceps'],
    secondary: ['Brachialis', 'Forearms'], reference: 'https://training.fit/exercise/biceps-curls/', keywords: 'biceps curls'
  },
  {
    id: 'incline-db-curl', name: 'Incline Dumbbell Bicep Curls', group: 'Biceps',
    equipment: 'Dumbbells · incline bench', primary: ['Biceps (biceps brachii)'], muscleArt: ['biceps'],
    secondary: ['Brachialis'], reference: 'https://training.fit/exercise/incline-dumbbell-biceps-curls/', keywords: 'biceps curls'
  },
  {
    id: 'machine-preacher-curl', name: 'Preacher Curls (Machine)', group: 'Biceps',
    equipment: 'Preacher curl machine', primary: ['Biceps (biceps brachii)'], muscleArt: ['biceps'],
    secondary: ['Brachialis'], reference: 'https://training.fit/exercise/preacher-curls/', keywords: 'scott curl'
  },
  {
    id: 'machine-shoulder-press', name: 'Shoulder Press (Machine)', group: 'Shoulders',
    equipment: 'Shoulder press machine', primary: ['Front shoulders (anterior deltoids)', 'Side shoulders (lateral deltoids)'], muscleArt: ['deltoids'],
    secondary: ['Triceps', 'Trapezius'], reference: 'https://exercise-dataset.com/exercise/machine-shoulder-press/'
  },
  {
    id: 'lateral-raise', name: 'Dumbbell Lateral Raise', group: 'Shoulders',
    equipment: 'Dumbbells', primary: ['Side shoulders (lateral deltoids)'], muscleArt: ['deltoids'],
    secondary: ['Front shoulders'], reference: 'https://training.fit/exercise/lateral-raise/'
  },
  {
    id: 'tricep-pushdown', name: 'Cable Tricep Pushdowns', group: 'Triceps',
    equipment: 'Cable machine', primary: ['Triceps (triceps brachii)'], muscleArt: ['triceps'],
    secondary: [], reference: 'https://training.fit/exercise/cable-tricep-pushdowns/', keywords: 'pressdown triceps rope'
  }
];

// Source links accompany the images in the picker; license details are in the README.
window.BULK_MUSCLE_ART = {
  chest: { label: 'Chest · pectoralis major', source: 'https://commons.wikimedia.org/wiki/File:Pectoralis_major.png' },
  lats: { label: 'Lats · latissimus dorsi', source: 'https://commons.wikimedia.org/wiki/File:Latissimus_dorsi.png' },
  rhomboid: { label: 'Rhomboid major', source: 'https://commons.wikimedia.org/wiki/File:Rhomboid_major_muscle_back.png' },
  biceps: { label: 'Biceps · biceps brachii', source: 'https://commons.wikimedia.org/wiki/File:Biceps_brachii.png' },
  brachialis: { label: 'Brachialis', source: 'https://commons.wikimedia.org/wiki/File:Brachialis_muscle01.png' },
  deltoids: { label: 'Shoulder · deltoids', source: 'https://commons.wikimedia.org/wiki/File:Deltoideus.png' },
  triceps: { label: 'Triceps · triceps brachii', source: 'https://commons.wikimedia.org/wiki/File:Triceps_brachii.png' }
};
