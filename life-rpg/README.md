# 🔥 EmberQuest

**Gamified Life Progress & RPG Habit Tracker with a Morphing Pixel Hero**

Built by **Namish** as an open-source hobby project.

---

## 🎮 What Is It?

EmberQuest turns your real-life habits into an RPG adventure. Every workout, study session, glass of water, and resisted urge becomes XP that levels up your pixel-art hero.

- 🧬 **Morphing hero** — muscles grow from workouts, fade from inactivity, belly grows from junk food
- ⚔️ **Weekly boss raids** — Procrastination Slime, Couch Golem, Doomscroll Wraith
- 📊 **7-day trend analytics** — green/yellow/red performance charts
- 🚭 **Bad Habit Quitter** — clean streaks with urge-resist XP
- 🕸️ **Radar chart** — balance across Strength, Stamina, Focus, Knowledge, Recovery, Fuel, Reflection
- 🔊 **8-bit sound effects** — synthesized live via Web Audio API
- 💾 **JSON export/import** — backup your progress anytime

---

## 🚀 Play It Live

👉 **https://<your-username>.github.io/emberquest/**

No signup. No tracking. Your data stays in your browser.

---

## 🛠️ Tech Stack

Pure vanilla JavaScript — **zero dependencies, no build step.**

| File | Purpose |
|------|---------|
| `index.html` | UI structure & modals |
| `styles.css` | Dark ember-orange theme |
| `js/util.js` | Date math & helpers |
| `js/sprite.js` | Parametric pixel-art hero renderer |
| `js/logic.js` | Game rules (XP, levels, bosses) |
| `js/audio.js` | Web Audio 8-bit synth |
| `js/radar.js` | SVG radar chart |
| `js/analytics.js` | Trend analysis |
| `js/app.js` | Main controller |

---

## 📁 Run Locally

Just open `index.html` in a browser. For best results (audio + localStorage), run a local server:

```bash
python -m http.server 8000