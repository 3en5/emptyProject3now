import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '../..'); // backend/routes → שורש הפרויקט

// האם התיקייה היא Git clone (יש .git)? אם לא — לא ניתן לעדכן אוטומטית (למשל התקנת ZIP).
function isGitRepo() {
  return fs.existsSync(path.join(REPO_ROOT, '.git'));
}

// הרצת פקודה בשורש הפרויקט. shell:true לתאימות Windows (npm.cmd וכו').
// כל הפקודות קבועות בקוד — אין קלט משתמש, אין סיכון הזרקה.
function run(command, timeout = 300000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { cwd: REPO_ROOT, shell: true, timeout });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => (code === 0 ? resolve(out.trim()) : reject(new Error((err || out || `exit ${code}`).trim()))));
    child.on('error', reject);
  });
}

// מידע על הגרסה המותקנת כרגע (commit נוכחי).
async function currentInfo() {
  const [hash, subject, date, branch] = await Promise.all([
    run('git rev-parse --short HEAD'),
    run('git log -1 --pretty=%s'),
    run('git log -1 --pretty=%cI'),
    run('git rev-parse --abbrev-ref HEAD'),
  ]);
  return { hash, subject, date, branch };
}

// גרסה נוכחית — מה מותקן עכשיו.
router.get('/version', async (req, res) => {
  try {
    if (!isGitRepo()) return res.json({ gitAvailable: false });
    res.json({ gitAvailable: true, current: await currentInfo() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// בדיקת עדכון — מושך מידע מ-GitHub ומשווה, בלי לשנות כלום מקומית.
router.get('/update/check', async (req, res) => {
  try {
    if (!isGitRepo()) return res.json({ gitAvailable: false });
    const current = await currentInfo();
    await run(`git fetch --quiet origin ${current.branch}`, 60000);

    let behind = 0;
    let commits = [];
    try {
      behind = parseInt(await run(`git rev-list --count HEAD..origin/${current.branch}`), 10) || 0;
      if (behind > 0) {
        const log = await run(`git log --pretty=%h|%s|%cI HEAD..origin/${current.branch}`);
        commits = log
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [hash, subject, cdate] = line.split('|');
            return { hash, subject, date: cdate };
          });
      }
    } catch {
      // אין upstream tracking לענף — נחשיב כ"אין עדכון".
    }

    res.json({ gitAvailable: true, updateAvailable: behind > 0, behind, current, commits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// החלת עדכון — pull + התקנה + בנייה מחדש. הנתונים (finance.db) מחוץ ל-git ולא נוגעים.
router.post('/update/apply', async (req, res) => {
  try {
    if (!isGitRepo()) return res.status(400).json({ error: 'התיקייה אינה Git clone — לא ניתן לעדכן אוטומטית' });
    const branch = await run('git rev-parse --abbrev-ref HEAD');
    const pull = await run(`git pull --ff-only origin ${branch}`, 120000);
    await run('npm install --silent');
    await run('npm install --prefix frontend --silent');
    await run('npm run build');
    const current = await currentInfo();
    res.json({
      ok: true,
      pull,
      current,
      note: 'העדכון הותקן. רעננו את הדף לראות שינויי ממשק; להשלמת שינויי צד-שרת יש להפעיל מחדש את השרת.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
