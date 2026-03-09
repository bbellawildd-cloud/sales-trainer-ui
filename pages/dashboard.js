import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function scoreFromEvaluationRow(row) {
const scores = row?.scores || {};
if (typeof scores?.overall_score === "number") return scores.overall_score;

const rubric = scores?.rubric;
if (rubric && typeof rubric === "object") {
const vals = Object.values(rubric).map((v) => Number(v)).filter((n) => Number.isFinite(n));
if (vals.length) return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

const vals = Object.values(scores).map((v) => Number(v)).filter((n) => Number.isFinite(n));
if (vals.length) return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

return null;
}

function firstListItem(v) {
if (Array.isArray(v) && v.length) return String(v[0]);
return null;
}

function getTopCoachFromScores(scores) {
if (!scores || typeof scores !== "object") return "No coaching data yet";

if (Array.isArray(scores.fixes) && scores.fixes.length) {
return String(scores.fixes[0]);
}

const rubric = scores.rubric;
if (rubric && typeof rubric === "object") {
const entries = Object.entries(rubric)
.map(([k, v]) => [k, Number(v)])
.filter(([, v]) => Number.isFinite(v))
.sort((a, b) => a[1] - b[1]);

if (entries.length) {
const [key] = entries[0];
return `Focus on ${String(key).replaceAll("_", " ")}`;
}
}

return "No coaching data yet";
}

function getTopWinFromScores(scores) {
if (!scores || typeof scores !== "object") return "—";
if (Array.isArray(scores.wins) && scores.wins.length) return String(scores.wins[0]);
return "—";
}
function buildTeamHeatmap(evaluations) {
const buckets = {
opener: [],
discovery: [],
value_proposition: [],
objection_handling: [],
closing: [],
clarity: [],
conciseness: [],
curiosity_questions: [],
active_listening: [],
control_of_call: []
};

for (const row of evaluations) {
const rubric = row?.scores?.rubric;
if (!rubric || typeof rubric !== "object") continue;

for (const key of Object.keys(buckets)) {
const val = Number(rubric[key]);
if (Number.isFinite(val)) buckets[key].push(val);
}
}

return Object.entries(buckets).map(([key, vals]) => {
const avg = vals.length
? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
: null;

return {
key,
label: key.replaceAll("_", " "),
avg
};
});
}

function heatColor(score) {
if (score == null) return "rgba(255,255,255,0.05)";
if (score >= 85) return "rgba(34,197,94,0.28)";
if (score >= 70) return "rgba(59,130,246,0.28)";
if (score >= 55) return "rgba(250,204,21,0.28)";
return "rgba(239,68,68,0.28)";
}


function StatCard({ label, value, sub }) {
return (
<div className="statCard">
<div className="statLabel">{label}</div>
<div className="statValue">{value}</div>
{sub ? <div className="statSub">{sub}</div> : null}
</div>
);
}

export default function DashboardPage() {
const [authUser, setAuthUser] = useState(null);
const [profile, setProfile] = useState(null);
const [company, setCompany] = useState(null);
const [reps, setReps] = useState([]);
const [evaluations, setEvaluations] = useState([]);
const [loading, setLoading] = useState(true);
const [errorText, setErrorText] = useState("");

useEffect(() => {
supabase.auth.getSession().then(({ data }) => {
setAuthUser(data.session?.user ?? null);
});

const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
setAuthUser(session?.user ?? null);
});

return () => sub.subscription.unsubscribe();
}, []);

useEffect(() => {
if (!authUser?.id) {
setLoading(false);
return;
}

async function loadDashboard() {
try {
setLoading(true);
setErrorText("");

const { data: profileRow, error: profileErr } = await supabase
.from("profiles")
.select("user_id, company_id, rep_name, total_xp, level, is_manager")
.eq("user_id", authUser.id)
.single();

if (profileErr || !profileRow) {
throw new Error(profileErr?.message || "Could not load profile");
}

setProfile(profileRow);

if (!profileRow.is_manager) {
throw new Error("Only managers can view the dashboard.");
}

const { data: companyRow } = await supabase
.from("companies")
.select("id, name, industry")
.eq("id", profileRow.company_id)
.single();

setCompany(companyRow || null);

const { data: repsRows, error: repsErr } = await supabase
.from("profiles")
.select("user_id, rep_name, total_xp, level, is_manager")
.eq("company_id", profileRow.company_id)
.order("total_xp", { ascending: false });

if (repsErr) throw new Error(repsErr.message);
setReps(repsRows || []);

const { data: evalRows, error: evalErr } = await supabase
.from("evaluations")
.select("id, user_id, scores, summary, xp_earned, created_at")
.eq("company_id", profileRow.company_id)
.order("created_at", { ascending: false })
.limit(500);

if (evalErr) throw new Error(evalErr.message);
setEvaluations(evalRows || []);
} catch (err) {
setErrorText(err.message || "Failed to load dashboard");
} finally {
setLoading(false);
}
}

loadDashboard();
}, [authUser]);

const repRows = useMemo(() => {
const latestByUser = new Map();
const countsByUser = new Map();
const totalScoreByUser = new Map();

for (const row of evaluations) {
const userId = row.user_id;
if (!latestByUser.has(userId)) latestByUser.set(userId, row);

countsByUser.set(userId, (countsByUser.get(userId) || 0) + 1);

const score = scoreFromEvaluationRow(row);
if (score != null) {
const cur = totalScoreByUser.get(userId) || { total: 0, count: 0 };
totalScoreByUser.set(userId, { total: cur.total + score, count: cur.count + 1 });
}
}

return reps
.filter((r) => !r.is_manager)
.map((rep) => {
const latest = latestByUser.get(rep.user_id) || null;
const scoreBucket = totalScoreByUser.get(rep.user_id);
const avgScore = scoreBucket ? Math.round(scoreBucket.total / scoreBucket.count) : null;

return {
...rep,
sessionsCompleted: countsByUser.get(rep.user_id) || 0,
latestScore: latest ? scoreFromEvaluationRow(latest) : null,
avgScore,
latestSummary: latest?.summary || "—",
topCoach: latest ? getTopCoachFromScores(latest.scores) : "No coaching data yet",
topWin: latest ? getTopWinFromScores(latest.scores) : "—",
lastActivity: latest?.created_at || null
};
})
.sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0));
}, [reps, evaluations]);

const stats = useMemo(() => {
const repCount = repRows.length;
const totalSessions = repRows.reduce((sum, r) => sum + (r.sessionsCompleted || 0), 0);

const avgTeamScoreValues = repRows
.map((r) => r.avgScore)
.filter((v) => Number.isFinite(v));

const avgTeamScore = avgTeamScoreValues.length
? Math.round(avgTeamScoreValues.reduce((a, b) => a + b, 0) / avgTeamScoreValues.length)
: "—";

const topRep = repRows[0]?.rep_name || "—";

return { repCount, totalSessions, avgTeamScore, topRep };
}, [repRows]);

if (!authUser) {
return (
<div className="app">
<div className="content">
<div className="card">
<h2>Manager Dashboard</h2>
<p className="muted">You need to sign in first.</p>
<button onClick={() => (window.location.href = "/")}>Go to Login</button>
</div>
</div>
<style jsx global>{globalCss}</style>
</div>
);
}
const teamHeatmap = useMemo(() => {
  return buildTeamHeatmap(evaluations);
}, [evaluations]);
return (
<div className="app">
<div className="topbar">
<div className="logo">Manager Dashboard</div>
<div className="user">
<span className="pill">{profile?.rep_name || "Manager"}</span>
<button className="secondary small" onClick={() => (window.location.href = "/")}>
Back to App
</button>
</div>
</div>

<div className="contentWide">
{loading ? (
<div className="card">
<h2>Loading dashboard...</h2>
<p className="muted">Pulling rep data and evaluations.</p>
</div>
) : errorText ? (
<div className="card">
<h2>Dashboard unavailable</h2>
<p className="muted">{errorText}</p>
<p className="muted">
If this is a permissions issue, your Supabase policies may need to allow managers to read profiles and evaluations for their company.
</p>
</div>
) : (
<>
<div className="stack">
<div className="card">
<div className="headerRow">
<div>
  <div className="card">
<h3>Team Skill Heatmap</h3>
<p className="muted">Average team performance by rubric category.</p>

{!teamHeatmap.length ? (
<div className="emptyState">No heatmap data yet.</div>
) : (
<div className="heatmapGrid">
{teamHeatmap.map((item) => (
<div
key={item.key}
className="heatCell"
style={{ background: heatColor(item.avg) }}
>
<div className="heatLabel">{item.label}</div>
<div className="heatValue">
{item.avg == null ? "—" : `${item.avg}/100`}
</div>
</div>
))}
</div>
)}
</div>

<h2>{company?.name || "Company"}</h2>
<p className="muted">
Industry: <b>{company?.industry || "—"}</b>
</p>
</div>
</div>

<div className="statsGrid">
<StatCard label="Reps" value={stats.repCount} />
<StatCard label="Total Sessions" value={stats.totalSessions} />
<StatCard label="Avg Team Score" value={stats.avgTeamScore} />
<StatCard label="Top Rep" value={stats.topRep} />
</div>
</div>

<div className="card">
<h3>Rep Performance</h3>
<p className="muted">Latest results and coaching focus by rep.</p>

{!repRows.length ? (
<div className="emptyState">No reps found yet.</div>
) : (
<div className="repTable">
<div className="repTableHead">
<div>Rep</div>
<div>Level / XP</div>
<div>Sessions</div>
<div>Latest Score</div>
<div>Top Coaching Focus</div>
</div>

{repRows.map((rep) => (
<div className="repTableRow" key={rep.user_id}>
<div>
<div className="repName">{rep.rep_name || "Rep"}</div>
<div className="repSub">Best win: {rep.topWin}</div>
</div>

<div>
<div>Lvl {rep.level || 1}</div>
<div className="repSub">{rep.total_xp || 0} XP</div>
</div>

<div>{rep.sessionsCompleted || 0}</div>

<div>
{rep.latestScore == null ? "—" : `${rep.latestScore}/100`}
{rep.avgScore != null ? <div className="repSub">Avg {rep.avgScore}/100</div> : null}
</div>

<div>{rep.topCoach}</div>
</div>
))}
</div>
)}
</div>
</div>

<div className="stack">
<div className="card">
<h3>Recent Evaluations</h3>
<p className="muted">Most recent coaching results across the team.</p>

{!evaluations.length ? (
<div className="emptyState">No evaluations yet.</div>
) : (
<div className="feed">
{evaluations.slice(0, 12).map((row) => {
const rep = reps.find((r) => r.user_id === row.user_id);
const score = scoreFromEvaluationRow(row);
const scores = row.scores || {};
const stage = scores?.stage_reached || "—";
const topFix = firstListItem(scores?.fixes);

return (
<div className="feedRow" key={row.id}>
<div className="feedTop">
<div className="feedName">{rep?.rep_name || "Rep"}</div>
<div className="feedScore">{score == null ? "—" : `${score}/100`}</div>
</div>

<div className="feedMeta">
<span>Stage: {String(stage)}</span>
<span>XP: {row.xp_earned || 0}</span>
</div>

<div className="feedSummary">{row.summary || "No summary."}</div>

{topFix ? <div className="feedCoach">Coach: {topFix}</div> : null}
</div>
);
})}
</div>
)}
</div>

<div className="card">
<h3>Manager Notes</h3>
<p className="muted">
This is your first real dashboard version. Next upgrades should be:
</p>
<div className="notes">
<div className="note">Store full evaluation analytics in the DB for long-term trends.</div>
<div className="note">Add filters for date range and rep.</div>
<div className="note">Show weakest rubric categories team-wide.</div>
<div className="note">Add click-through rep detail pages.</div>
</div>
</div>
</div>
</>
)}
</div>

<style jsx global>{globalCss}</style>
</div>
);
}

const globalCss = `
:root { color-scheme: dark; }

body {
margin: 0;
font-family: Inter, system-ui, sans-serif;
background:
radial-gradient(1200px 700px at 20% 10%, rgba(59,130,246,0.25), transparent 60%),
radial-gradient(1000px 600px at 90% 20%, rgba(34,197,94,0.18), transparent 55%),
linear-gradient(135deg, #0f172a, #111827);
color: white;
}

* { box-sizing: border-box; }

.app {
min-height: 100vh;
display: flex;
flex-direction: column;
}

.topbar {
display: flex;
justify-content: space-between;
align-items: center;
padding: 18px 28px;
border-bottom: 1px solid rgba(255,255,255,0.10);
position: sticky;
top: 0;
backdrop-filter: blur(10px);
background: rgba(15, 23, 42, 0.55);
z-index: 10;
}

.logo {
font-size: 18px;
font-weight: 800;
letter-spacing: 0.2px;
}

.user {
display: flex;
align-items: center;
gap: 12px;
font-size: 14px;
}

.pill {
padding: 8px 10px;
border-radius: 999px;
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.12);
}

.contentWide {
max-width: 1280px;
margin: 28px auto;
padding: 0 18px;
display: grid;
grid-template-columns: 1.2fr 0.8fr;
gap: 18px;
}

@media (max-width: 980px) {
.contentWide { grid-template-columns: 1fr; }
}

.content {
max-width: 900px;
margin: 60px auto;
padding: 0 24px;
}

.card {
width: 100%;
background: rgba(255,255,255,0.06);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.10);
border-radius: 16px;
padding: 20px;
box-shadow: 0 20px 50px rgba(0,0,0,0.35);
}

.stack {
display: flex;
flex-direction: column;
gap: 18px;
}

h2 { margin: 0; font-size: 26px; }
h3 { margin: 0; font-weight: 800; }

.muted {
opacity: 0.82;
font-size: 14px;
line-height: 1.4;
}

.headerRow {
display: flex;
justify-content: space-between;
gap: 12px;
align-items: flex-start;
}

button {
background: linear-gradient(135deg, #3b82f6, #2563eb);
border: none;
color: white;
padding: 10px 16px;
border-radius: 12px;
font-weight: 700;
cursor: pointer;
}

button.secondary {
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.14);
}

button.small {
padding: 8px 12px;
}

.statsGrid {
margin-top: 16px;
display: grid;
grid-template-columns: repeat(4, minmax(0, 1fr));
gap: 12px;
}

@media (max-width: 900px) {
.statsGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.statCard {
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 14px;
padding: 14px;
}

.statLabel {
font-size: 12px;
opacity: 0.72;
margin-bottom: 6px;
}

.statValue {
font-size: 28px;
font-weight: 800;
}

.statSub {
margin-top: 6px;
font-size: 12px;
opacity: 0.75;
}

.repTable {
margin-top: 14px;
display: flex;
flex-direction: column;
gap: 10px;
}

.repTableHead,
.repTableRow {
display: grid;
grid-template-columns: 1.1fr 0.9fr 0.6fr 0.8fr 1.2fr;
gap: 12px;
align-items: center;
}

.repTableHead {
font-size: 12px;
opacity: 0.7;
padding: 0 8px;
}

.repTableRow {
padding: 12px 10px;
border-radius: 12px;
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
}

.repName {
font-weight: 800;
}

.repSub {
margin-top: 4px;
font-size: 12px;
opacity: 0.72;
}

.feed {
margin-top: 14px;
display: flex;
flex-direction: column;
gap: 10px;
}

.feedRow {
padding: 12px;
border-radius: 12px;
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
}

.feedTop {
display: flex;
justify-content: space-between;
gap: 12px;
align-items: center;
}

.feedName {
font-weight: 800;
}

.feedScore {
font-weight: 800;
opacity: 0.95;
}

.feedMeta {
display: flex;
gap: 14px;
flex-wrap: wrap;
font-size: 12px;
opacity: 0.72;
margin-top: 6px;
}

.feedSummary {
margin-top: 8px;
line-height: 1.4;
}

.feedCoach {
margin-top: 8px;
font-size: 13px;
opacity: 0.82;
}

.notes {
margin-top: 12px;
display: flex;
flex-direction: column;
gap: 10px;
}

.note {
padding: 10px 12px;
border-radius: 12px;
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
}

.emptyState {
margin-top: 12px;
padding: 14px;
border-radius: 12px;
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
opacity: 0.8;
}
.heatmapGrid {
margin-top: 14px;
display: grid;
grid-template-columns: repeat(2, minmax(0, 1fr));
gap: 10px;
}

.heatCell {
padding: 12px;
border-radius: 12px;
border: 1px solid rgba(255,255,255,0.10);
}

.heatLabel {
font-size: 12px;
opacity: 0.75;
text-transform: capitalize;
}

.heatValue {
margin-top: 6px;
font-size: 22px;
font-weight: 800;
}

@media (max-width: 700px) {
.heatmapGrid {
grid-template-columns: 1fr;
}
}

`;
