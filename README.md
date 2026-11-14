# Bulk Log

A small, installable web app for logging exercises, sets, reps, and body weight during a bulk. It saves your entries on the device you use it on. There are no accounts or analytics in the app.

## Try it on this computer

From this folder, run:

```powershell
node server.mjs
```

Open `http://127.0.0.1:4173` in a browser. Stop the server with Ctrl+C. The preview is only available on this computer; it is not yet an iPhone link.

## Use it on an iPhone

The contents of `dist/` are ready to be hosted on any static HTTPS host. Once they have a stable HTTPS address:

1. Open the address in Safari on the iPhone.
2. Tap Share, then **Add to Home Screen**. Turn on **Open as Web App** if the option is shown, and tap Add.
3. Open Bulk Log from the Home Screen and enter your data there. On iOS, a Home Screen app can have separate storage from Safari, so entries made in Safari may not appear in the installed app.
4. Open it while online at least once after adding it. Its app files can then be cached for offline use.

Hosting has not been configured yet. The app itself does not require a paid account or a server-side database. For example, Netlify can host the static files, though a free account is needed to keep a Netlify deployment beyond its anonymous trial.

## Logging

- On **Daily Log**, choose today or an earlier date and record your body weight first. The app uses the device's local date and time; future dates cannot be edited. Your saved weight appears prominently; use **Change** if you need to edit it. Choose an exercise from the illustrated library to see its main and assisting muscles, add it to the log, and enter its weight and rep count after each set. Tap a muscle picture to enlarge it, or choose **View muscles** on a logged exercise to see the pictures again. Use weight `0` for a bodyweight set. You can still add a custom exercise by name.
- On **Calories**, enter your sex, age, height, body fat %, daily activity, sport per week and goal once; they carry over to every day and can be changed with **Edit**. Daily calories, protein, carbs and fat are calculated the same way as the [ESN calorie calculator](https://www.esn.com/pages/kalorienrechner), using that day's body weight or, if none is logged, the most recent earlier weight. Scan a food's barcode (or type its number) to look it up in [Open Food Facts](https://world.openfoodfacts.org), enter the grams you ate, and it is subtracted from the day's targets. Foods not in the database can be added manually from the label. Scanning needs the camera, so the app must be opened from an `https://` address (or `localhost`); looking up a new barcode needs an internet connection.
- To revisit an earlier day, use the date picker or arrows on the Daily Log. Use **Edit** beside a set to update or delete it.
- On **Progress**, choose **Weekly** (a point per day) or **Monthly** (a point per week, averaged) and step back with the arrows. It charts your body weight, and for any exercise you've logged, the top weight lifted and how many sets were done at that top weight. Tap a chart to see a day's or week's numbers.

## Backups and privacy

Your data is stored in the browser or installed Home Screen app on that device. It does not automatically sync between devices, between Safari and the installed app, or to a different website address. Clearing site data, removing the Home Screen app, device loss, or browser storage cleanup can delete it.

Use **Progress → Export backup** regularly and keep the downloaded JSON file somewhere safe. **Restore backup** replaces the current log with an exported file; it can also move the log to a new device or website address. The backup includes your workout and body-weight entries, so treat it as personal data.

## Project files

`dist/` contains the complete app and its offline cache. `server.mjs` is a dependency-free local preview server. There is no build step.

The exercise illustrations were created for this app. Muscle information was checked against individual exercise guides, including [Training.fit](https://training.fit/exercise/); each illustrated exercise links to a relevant reference. The shoulder diagram highlights the whole deltoid, while the labels name the portions mainly involved in each movement.

The muscle images are shown alongside links to their sources in the app:

- [Chest](https://commons.wikimedia.org/wiki/File:Pectoralis_major.png), [biceps](https://commons.wikimedia.org/wiki/File:Biceps_brachii.png), [shoulders](https://commons.wikimedia.org/wiki/File:Deltoideus.png), [triceps](https://commons.wikimedia.org/wiki/File:Triceps_brachii.png), and [lats](https://commons.wikimedia.org/wiki/File:Latissimus_dorsi.png): Chrizz, with the lats image credited to Nikai. [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). These files are unmodified.
- [Brachialis](https://commons.wikimedia.org/wiki/File:Brachialis_muscle01.png) and [rhomboid major](https://commons.wikimedia.org/wiki/File:Rhomboid_major_muscle_back.png): BodyParts3D / Anatomography, © Database Center for Life Science (DBCLS). [CC BY-SA 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en). These files were resized using Wikimedia Commons thumbnails.
