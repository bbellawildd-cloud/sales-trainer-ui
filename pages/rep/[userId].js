import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
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

function getLowestRubric(scores) {
const rubric = scores?.rubric;
if (!rubric || typeof rubric !== "object") return "No rubric data";

const entries = Object.entries(rubric)
.map(([k, v]) => [k, Number(v)])
.filter(([, v]) => Number.isFinite(v))
.sort((a, b) => a[1] - b[1]);

if (!entries.length) return "No rubric data";
return `Focus on ${String(entries[0][0]).replaceAll("_", " ")}`;
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

export default function RepDetailPage() {
const router = useRouter();
const { userId } = router.query;

const [authUser, setAuthUser] = useState(null);
const [managerProfile, setManagerProfile] = useState(null);
const [rep, setRep] = useState(null);
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
if (!authUser?.id || !userId) return;

async function loadRepPage() {
try {
setLoading(true);
setErrorText("");

const { data: mgr, error: mgrErr } = await supabase
.from("profiles")
.select("user_id, company_id, rep_name, is_manager")
.eq("user_id", authUser.id)
.single();

if (mgrErr || !mgr) throw new Error(mgrErr?.message || "Could not load manager profile");
if (!mgr.is_manager) throw new Error("Only managers can view rep details.");

setManagerProfile(mgr);

const { data: repRow, error: repErr } = await supabase
.from("profiles")
.select("user_id, company_id, rep_name, total_xp, level, is_manager")
.eq("user_id", userId)
.single();

if (repErr || !repRow) throw new Error(repErr?.message || "Rep not found");
if (repRow.company_id !== mgr.company_id) throw new Error("You can only view reps in your company.");

setRep(repRow);

const { data: evalRows, error: evalErr } = await supabase
.from("evaluations")
.select("id, user_id, scores, summary, xp_earned, created_at")
.eq("user_id", userId)
.order("created_at", { ascending: false })
.limit(200);

if (evalErr) throw new Error(evalErr.message);
setEvaluations(evalRows || []);
} catch (err) {
setErrorText(err.message || "Failed to load rep page");
} finally {
setLoading(false);
}
}

loadRepPage();
}, [authUser, userId]);

const stats = useMemo(() => {
const sessionCount = evaluations.length;
const scoreVals = evaluations
.map((row) => scoreFromEvaluationRow(row))
.filter((v) => Number.isFinite(v));

const avgScore = scoreVals.length
? Math.round(scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length)
: "—";

const latest = evaluations[0] || null;
const latestScore = latest ? scoreFromEvaluationRow(latest) : "—";
const topCoach = latest ? getLowestRubric(latest.scores) : "No coaching data";
const topWin = latest ? firstListItem(latest?.scores?.wins) || "—" : "—";

return {
sessionCount,
avgScore,
latestScore,
topCoach,
topWin
};
}, [evaluations]);

if (!authUser) {
return (
<div className="app">
<div className="content">
<div className="card">
<h2>Rep Detail</h2>
<p className="muted">You need to sign in first.</p>
<button onClick={() => (window.location.href = "/")}>Go to Login</button>
</div>
</div>
<style jsx global>{globalCss}</style>
</div>
);
}

return (
<div className="app">
<div className="topbar">
<div className="logo">Rep Detail</div>
<div className="user">
<button className="secondary small" onClick={() => (window.location.href = "/dashboard")}>
Back to Dashboard
</button>
</div>
</div>

<div className="contentWide">
{loading ? (
<div className="card">
<h2>Loading rep...</h2>
<p className="muted">Pulling rep profile and evaluations.</p>
</div>
) : errorText ? (
<div className="card">
<h2>Rep page unavailable</h2>
<p className="muted">{errorText}</p>
</div>
) : (
<>
<div className="stack">
<div className="card">
<h2>{rep?.rep_name || "Rep"}</h2>
<p className="muted">
Company manager: <b>{managerProfile?.rep_name || "Manager"}</b>
</p>

<div className="statsGrid">
<StatCard label="Level" value={rep?.level || 1} />
<StatCard label="XP" value={rep?.total_xp || 0} />
<StatCard label="Sessions" value={stats.sessionCount} />
<StatCard label="Avg Score" value={stats.avgScore} />
</div>
</div>

<div className="card">
<h3>Coaching Snapshot</h3>
<div className="notes">
<div className="note">
<b>Latest score:</b> {stats.latestScore == null ? "—" : `${stats.latestScore}/100`}
</div>
<div className="note">
<b>Top coaching focus:</b> {stats.topCoach}
</div>
<div className="note">
<b>Best win:</b> {stats.topWin}
</div>
</div>
</div>
</div>

<div className="stack">
<div className="card">
<h3>Recent Evaluations</h3>
<p className="muted">Latest session outcomes for this rep.</p>

{!evaluations.length ? (
<div className="emptyState">No evaluations yet.</div>
) : (
<div className="feed">
{evaluations.map((row) => {
const score = scoreFromEvaluationRow(row);
const stage = row?.scores?.stage_reached || "—";
const fix = firstListItem(row?.scores?.fixes);
const win = firstListItem(row?.scores?.wins);

return (
<div className="feedRow" key={row.id}>
<div className="feedTop">
<div className="feedName">{score == null ? "—" : `${score}/100`}</div>
<div className="feedMetaRight">
{new Date(row.created_at).toLocaleDateString()}
</div>
</div>

<div className="feedMeta">
<span>Stage: {String(stage)}</span>
<span>XP: {row.xp_earned || 0}</span>
</div>

<div className="feedSummary">{row.summary || "No summary."}</div>

{fix ? <div className="feedCoach">Coach: {fix}</div> : null}
{win ? <div className="feedWin">Win: {win}</div> : null}
</div>
);
})}
</div>
)}
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
}

.user {
display: flex;
align-items: center;
gap: 12px;
}

.content {
max-width: 900px;
margin: 60px auto;
padding: 0 24px;
}

.contentWide {
max-width: 1280px;
margin: 28px auto;
padding: 0 18px;
display: grid;
grid-template-columns: 0.9fr 1.1fr;
gap: 18px;
}

@media (max-width: 980px) {
.contentWide { grid-template-columns: 1fr; }
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
grid-template-columns: repeat(2, minmax(0, 1fr));
gap: 12px;
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

.feedMetaRight {
font-size: 12px;
opacity: 0.72;
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

.feedWin {
margin-top: 6px;
font-size: 13px;
opacity: 0.82;
}

.emptyState {
margin-top: 12px;
padding: 14px;
border-radius: 12px;
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
opacity: 0.8;
}
`;
