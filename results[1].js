// Vercel serverless function — stores quiz results in Upstash Redis (Vercel Storage → "Upstash for Redis").
// Env vars set automatically by the integration: KV_REST_API_URL + KV_REST_API_TOKEN
// (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN). Add TEACHER_PASSWORD yourself.

const KEY = 'eng-sabah:unit5:results';
const LESSON_KEYS = ['L12', 'L13', 'L14', 'L15', 'L16'];

function str(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max); }
function num(v, min, max) { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0; }

function clean(b) {
  if (!b || typeof b !== 'object') return null;
  const name = str(b.name, 60);
  if (!name) return null;
  const total = Math.round(num(b.total, 1, 500));
  const correct = Math.round(num(b.correct, 0, total));
  const perLesson = {};
  if (b.perLesson && typeof b.perLesson === 'object') {
    for (const k of LESSON_KEYS) {
      const v = b.perLesson[k];
      if (Array.isArray(v)) perLesson[k] = [Math.round(num(v[0], 0, 500)), Math.round(num(v[1], 0, 500))];
    }
  }
  const answers = Array.isArray(b.answers)
    ? b.answers.slice(0, 500).map(a => [str(a && a[0], 24), a && a[1] ? 1 : 0]).filter(a => a[0])
    : [];
  return {
    id: str(b.id, 40) || Math.random().toString(36).slice(2),
    name,
    cls: str(b.cls, 30),
    lessons: Array.isArray(b.lessons) ? b.lessons.filter(l => LESSON_KEYS.includes(l)) : [],
    total, correct,
    pct: Math.round((correct / total) * 100),
    points: Math.round(num(b.points, 0, 100000)),
    secs: Math.round(num(b.secs, 0, 86400)),
    perLesson, answers,
    at: new Date().toISOString()
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const PASS = process.env.TEACHER_PASSWORD || '';
  const q = req.query || {};

  if (req.method === 'GET' && q.ping) return res.status(200).json({ ok: true, storage: !!(url && token) });
  if (!url || !token) return res.status(503).json({ error: 'storage_not_configured' });

  const redis = async (cmd) => {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  };
  const authed = () => !!PASS && (req.headers['x-teacher-pass'] || '') === PASS;
  const readAll = async () => ((await redis(['LRANGE', KEY, 0, -1])) || []).map(s => { try { return { raw: s, rec: JSON.parse(s) }; } catch { return null; } }).filter(Boolean);

  try {
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body || '{}');
      const rec = clean(body);
      if (!rec) return res.status(400).json({ error: 'invalid_result' });
      await redis(['LPUSH', KEY, JSON.stringify(rec)]);
      await redis(['LTRIM', KEY, 0, 9999]);
      return res.status(201).json({ ok: true, id: rec.id });
    }

    if (req.method === 'GET') {
      const all = (await readAll()).map(x => x.rec);
      if (q.leaderboard) {
        const best = {};
        for (const r of all) {
          const k = (r.name + '|' + r.cls).toLowerCase();
          const cur = best[k];
          if (!cur || r.pct > cur.pct || (r.pct === cur.pct && r.points > cur.points)) best[k] = r;
        }
        const board = Object.values(best)
          .sort((a, b) => b.pct - a.pct || b.points - a.points || a.secs - b.secs)
          .slice(0, 10)
          .map(r => ({ name: r.name, cls: r.cls, pct: r.pct, points: r.points, secs: r.secs }));
        return res.status(200).json({ board });
      }
      if (!PASS) return res.status(503).json({ error: 'teacher_password_not_set' });
      if (!authed()) return res.status(401).json({ error: 'wrong_password' });
      return res.status(200).json({ results: all });
    }

    if (req.method === 'DELETE') {
      if (!authed()) return res.status(401).json({ error: 'wrong_password' });
      if (q.id) {
        const hit = (await readAll()).find(x => x.rec.id === q.id);
        if (hit) await redis(['LREM', KEY, 1, hit.raw]);
      } else {
        await redis(['DEL', KEY]);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', detail: String(e.message || e) });
  }
};
