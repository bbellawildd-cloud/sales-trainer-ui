import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* =========================================================
Supabase + Config
========================================================= */
const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

/* =========================================================
SCORECARD HELPERS + UI (SINGLE COPY — DO NOT DUPLICATE)
========================================================= */
function asScore100(v) {
if (v == null) return null;
const x = Number(v);
if (Number.isNaN(x)) return null;
if (x >= 0 && x <= 1) return Math.round(x * 100);
if (x >= 0 && x <= 100) return Math.round(x);
return Math.round(x);
}

function pick(obj, keys) {
for (const k of keys) {
if (obj && obj[k] != null) return obj[k];
}
return null;
}

function normalizeGrade(raw) {
const g = raw || {};

const overall = asScore100(
pick(g, ["overall_score", "overall", "score", "total_score", "final_score"])
);

const stageReached =
pick(g, ["stage_reached", "stage", "furthest_stage", "pipeline_stage"]) ||
pick(g?.summary, ["stage_reached", "stage"]) ||
null;

const stuckPoints =
pick(g, ["stuck_points", "stuckPoints", "blockers"]) ||
pick(g?.summary, ["stuck_points", "blockers"]) ||
[];

const wins =
pick(g, ["wins", "strengths", "did_well"]) ||
pick(g?.summary, ["wins", "strengths"]) ||
[];

const fixes =
pick(g, ["fixes", "improvements", "needs_work", "coaching_points"]) ||
pick(g?.summary, ["fixes", "improvements"]) ||
[];

const delivery = g.delivery || g.delivery_metrics || g.speaking || {};
const confidence = asScore100(pick(delivery, ["confidence", "confidence_score"]));
const tone = asScore100(pick(delivery, ["tone", "tone_score"]));
const pacing = asScore100(
pick(delivery, ["pacing", "pace", "speed", "pacing_score", "speed_score"])
);
const clarity = asScore100(pick(delivery, ["clarity", "clarity_score"]));
const energy = asScore100(pick(delivery, ["energy", "energy_score", "enthusiasm"]));

const talkRatio =
pick(delivery, ["talk_ratio", "rep_talk_ratio", "talkToListenRatio"]) ?? null;
const wpm = pick(delivery, ["wpm", "words_per_minute", "speed_wpm"]) ?? null;

const rubric =
g.rubric || g.categories || g.breakdown || g.scores || g.scorecard || null;

let rubricItems = [];
if (rubric && typeof rubric === "object") {
if (Array.isArray(rubric)) {
rubricItems = rubric
.map((it, idx) => {
const label = it.label || it.name || it.category || `Category ${idx + 1}`;
const score = asScore100(it.score ?? it.value ?? it.points);
const notes = it.notes || it.feedback || it.commentary || "";
return { label, score, notes };
})
.filter(Boolean);
} else {
rubricItems = Object.entries(rubric).map(([k, v]) => {
if (v && typeof v === "object") {
return {
label: v.label || v.name || k,
score: asScore100(v.score ?? v.value ?? v.points),
notes: v.notes || v.feedback || ""
};
}
return { label: k, score: asScore100(v), notes: "" };
});
}
}

const nextBestAction =
pick(g, ["next_best_action", "next_step", "recommended_next_step"]) ||
pick(g?.summary, ["next_best_action", "next_step"]) ||
null;

const oneLine =
pick(g, ["summary", "one_liner", "headline"]) ||
pick(g?.summary, ["headline", "one_liner"]) ||
null;

return {
overall,
stageReached,
stuckPoints: Array.isArray(stuckPoints) ? stuckPoints : [stuckPoints].filter(Boolean),
wins: Array.isArray(wins) ? wins : [wins].filter(Boolean),
fixes: Array.isArray(fixes) ? fixes : [fixes].filter(Boolean),
delivery: { confidence, tone, pacing, clarity, energy, talkRatio, wpm },
rubricItems,
nextBestAction,
oneLine,
raw: g
};
}

function Bar({ label, value }) {
const v = value == null ? null : Math.max(0, Math.min(100, Number(value)));
return (
<div style={{ marginBottom: 10 }}>
<div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, opacity: 0.9 }}>
<div>{label}</div>
<div style={{ fontVariantNumeric: "tabular-nums" }}>{v == null ? "—" : `${v}/100`}</div>
</div>
<div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.10)", overflow: "hidden" }}>
<div
style={{
height: "100%",
width: v == null ? "0%" : `${v}%`,
background: "linear-gradient(135deg, rgba(59,130,246,1), rgba(37,99,235,1))",
borderRadius: 999,
transition: "width 250ms ease"
}}
/>
</div>
</div>
);
}

function Pill({ children }) {
return (
<span
style={{
display: "inline-flex",
alignItems: "center",
padding: "6px 10px",
borderRadius: 999,
background: "rgba(255,255,255,0.08)",
border: "1px solid rgba(255,255,255,0.12)",
fontSize: 12,
marginRight: 8,
marginBottom: 8
}}
>
{children}
</span>
);
}

function Scorecard({ grade, profile }) {
const n = normalizeGrade(grade);
const [showRaw, setShowRaw] = useState(false);

return (
<div className="card">
<div className="headerRow">
<div>
<h3>Scorecard</h3>
<p className="muted">After you grade, the results show up here.</p>
</div>
<button
className="secondary small"
type="button"
onClick={() => setShowRaw((s) => !s)}
>
{showRaw ? "Hide Raw" : "View Raw"}
</button>
</div>

<div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
<div
style={{
flex: "1 1 260px",
minWidth: 260,
background: "rgba(255,255,255,0.05)",
border: "1px solid rgba(255,255,255,0.10)",
borderRadius: 14,
padding: 18
}}
>
<div style={{ fontSize: 13, opacity: 0.85 }}>Overall</div>
<div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 10 }}>
<div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
{n.overall == null ? "—" : n.overall}
</div>
<div style={{ opacity: 0.8 }}>/100</div>
</div>

{n.oneLine ? (
<div style={{ marginTop: 8, fontSize: 13, opacity: 0.9, lineHeight: 1.35 }}>
{n.oneLine}
</div>
) : null}

<div style={{ marginTop: 12 }}>
<Pill>{profile?.is_manager ? "Manager view" : "Rep view"}</Pill>
{n.stageReached && <Pill>Stage: {String(n.stageReached)}</Pill>}
{n.delivery?.wpm != null && <Pill>Speed: {n.delivery.wpm} wpm</Pill>}
{n.delivery?.talkRatio != null && <Pill>Talk ratio: {n.delivery.talkRatio}</Pill>}
</div>
</div>

<div
style={{
flex: "2 1 420px",
minWidth: 320,
background: "rgba(255,255,255,0.05)",
border: "1px solid rgba(255,255,255,0.10)",
borderRadius: 14,
padding: 18
}}
>
<h3 style={{ margin: 0, fontSize: 16 }}>Delivery & Presence</h3>
<div style={{ marginTop: 12 }}>
<Bar label="Confidence" value={n.delivery.confidence} />
<Bar label="Tone" value={n.delivery.tone} />
<Bar label="Pacing / Speed" value={n.delivery.pacing} />
<Bar label="Clarity" value={n.delivery.clarity} />
<Bar label="Energy" value={n.delivery.energy} />
</div>
</div>
</div>

<div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 16 }}>
<div style={{ flex: "1 1 320px", minWidth: 280, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 18 }}>
<h3 style={{ margin: 0, fontSize: 16 }}>What went well</h3>
<div style={{ marginTop: 10 }}>
{n.wins.length ? n.wins.map((w, i) => <Pill key={i}>{String(w)}</Pill>) : <div style={{ opacity: 0.7 }}>—</div>}
</div>
</div>

<div style={{ flex: "1 1 320px", minWidth: 280, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 18 }}>
<h3 style={{ margin: 0, fontSize: 16 }}>Needs coaching</h3>
<div style={{ marginTop: 10 }}>
{n.fixes.length ? n.fixes.map((f, i) => <Pill key={i}>{String(f)}</Pill>) : <div style={{ opacity: 0.7 }}>—</div>}
</div>
</div>

<div style={{ flex: "1 1 320px", minWidth: 280, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 18 }}>
<h3 style={{ margin: 0, fontSize: 16 }}>Where they got stuck</h3>
<div style={{ marginTop: 10 }}>
{n.stuckPoints.length ? n.stuckPoints.map((s, i) => <Pill key={i}>{String(s)}</Pill>) : <div style={{ opacity: 0.7 }}>—</div>}
</div>
</div>
</div>

<div style={{ marginTop: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 18 }}>
<h3 style={{ margin: 0, fontSize: 16 }}>Skills rubric</h3>
<div style={{ marginTop: 10 }}>
{n.rubricItems?.length ? (
n.rubricItems.map((it, idx) => (
<div
key={idx}
style={{
padding: "10px 12px",
borderRadius: 12,
background: "rgba(255,255,255,0.04)",
border: "1px solid rgba(255,255,255,0.08)",
marginBottom: 10
}}
>
<div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
<div style={{ fontWeight: 750 }}>{it.label}</div>
<div style={{ opacity: 0.9 }}>{it.score == null ? "—" : `${it.score}/100`}</div>
</div>
{it.notes ? (
<div style={{ marginTop: 6, opacity: 0.85, fontSize: 13, lineHeight: 1.35 }}>
{it.notes}
</div>
) : null}
</div>
))
) : (
<div style={{ opacity: 0.7 }}>No rubric categories yet (backend can add later).</div>
)}
</div>

{n.nextBestAction ? (
<div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
<div style={{ fontSize: 13, opacity: 0.8 }}>Next best action</div>
<div style={{ marginTop: 6, fontSize: 14 }}>{String(n.nextBestAction)}</div>
</div>
) : null}
</div>

{showRaw ? (
<div style={{ marginTop: 14, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 14 }}>
<div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>Raw grade payload</div>
<pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, fontSize: 12, lineHeight: 1.35 }}>
{JSON.stringify(n.raw, null, 2)}
</pre>
</div>
) : null}
</div>
);
}

/* =========================================================
Home Page
========================================================= */
export default function Home() {
// Auth / profile
const [authUser, setAuthUser] = useState(null);
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [repName, setRepName] = useState("");
const [companyName, setCompanyName] = useState("");
const [profile, setProfile] = useState(null);

// Company settings (industry locked to reps)
const [company, setCompany] = useState(null);
const [companyIndustry, setCompanyIndustry] = useState("");
const [savingCompany, setSavingCompany] = useState(false);

// Session / chat
const [session, setSession] = useState(null);
const [faceUrl, setFaceUrl] = useState("");
const [message, setMessage] = useState("");
const [reply, setReply] = useState("");

const [grade, setGrade] = useState(null);
const [leaderboard, setLeaderboard] = useState([]);

// Rep training difficulty only (industry locked from company)
const [difficulty, setDifficulty] = useState(2);

// Voice
const recognitionRef = useRef(null);
const [listening, setListening] = useState(false);
const [speaking, setSpeaking] = useState(false);

useEffect(() => {
if (typeof window === "undefined") return;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) return;

const rec = new SpeechRecognition();
rec.continuous = false;
rec.lang = "en-US";
recognitionRef.current = rec;
}, []);

function startListening() {
const recognition = recognitionRef.current;
if (!recognition) {
alert("Speech recognition not supported. Use Chrome on desktop.");
return;
}

setListening(true);
recognition.start();

recognition.onresult = (event) => {
const transcript = event.results?.[0]?.[0]?.transcript || "";
setMessage(transcript);
setListening(false);
};

recognition.onerror = () => setListening(false);
recognition.onend = () => setListening(false);
}

function speak(text) {
if (!text || typeof window === "undefined") return;

window.speechSynthesis.cancel();
const u = new SpeechSynthesisUtterance(text);
u.onstart = () => setSpeaking(true);
u.onend = () => setSpeaking(false);
u.onerror = () => setSpeaking(false);
window.speechSynthesis.speak(u);
}

// Auth listeners
useEffect(() => {
supabase.auth.getSession().then(({ data }) => {
setAuthUser(data.session?.user ?? null);
});

const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
setAuthUser(session?.user ?? null);
});

return () => sub.subscription.unsubscribe();
}, []);

async function loadProfile(userId) {
const { data, error } = await supabase
.from("profiles")
.select("user_id, company_id, rep_name, total_xp, level, is_manager")
.eq("user_id", userId)
.single();

if (error) {
setProfile(null);
return;
}
setProfile(data);
}

async function loadCompany(companyId) {
if (!companyId) return;
const { data, error } = await supabase
.from("companies")
.select("id, name, industry")
.eq("id", companyId)
.single();

if (error) {
setCompany(null);
setCompanyIndustry("");
return;
}

setCompany(data);
setCompanyIndustry(data.industry || "");
}

useEffect(() => {
if (authUser?.id) loadProfile(authUser.id);
}, [authUser]);

useEffect(() => {
if (profile?.company_id) loadCompany(profile.company_id);
}, [profile?.company_id]);

// Auth actions
async function signUp() {
const { error } = await supabase.auth.signUp({ email, password });
if (error) return alert(error.message);
alert("Signed up. If email confirmation is on, check your email, then sign in.");
}

async function signIn() {
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) return alert(error.message);
setAuthUser(data.user);
}

async function forgotPassword() {
if (!email.trim()) return alert("Type your email first.");

const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
redirectTo: `${window.location.origin}/reset-password`,
});

if (error) return alert(error.message);

alert("Reset email sent ✅ Check inbox/spam.");
}

async function signOut() {
await supabase.auth.signOut();
setAuthUser(null);
setProfile(null);
setCompany(null);
setCompanyIndustry("");
setSession(null);
setGrade(null);
setLeaderboard([]);
setFaceUrl("");
setReply("");
setMessage("");
}

// First-time manager setup
async function createCompanyAndProfile() {
if (!authUser?.id) return;

if (!repName.trim() || !companyName.trim()) {
return alert("Enter your name + company name");
}

const { data: companyRow, error: cErr } = await supabase
.from("companies")
.insert({ name: companyName.trim() })
.select("id, name, industry")
.single();

if (cErr) return alert(cErr.message);

const { error: pErr } = await supabase.from("profiles").insert({
user_id: authUser.id,
company_id: companyRow.id,
rep_name: repName.trim(),
total_xp: 0,
level: 1,
is_manager: true
});

if (pErr) return alert(pErr.message);
await loadProfile(authUser.id);
}

// Manager: set company industry
async function saveCompanyIndustry() {
if (!profile?.company_id) return;
if (!companyIndustry) return alert("Pick an industry first.");

try {
setSavingCompany(true);
const { error } = await supabase
.from("companies")
.update({ industry: companyIndustry })
.eq("id", profile.company_id);

if (error) return alert(error.message);

await loadCompany(profile.company_id);
alert("Company industry saved ✅ Reps will be locked to this.");
} finally {
setSavingCompany(false);
}
}

// Sessions
const lockedIndustry = useMemo(() => {
return company?.industry || companyIndustry || "pest";
}, [company?.industry, companyIndustry]);

async function startSession() {
if (!profile) return alert("No profile loaded.");
if (!lockedIndustry) return alert("Manager must set company industry first.");

setGrade(null);
setReply("");
setFaceUrl("");

const res = await fetch(`${API_BASE}/api/session/start`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
userId: profile.user_id,
industry: lockedIndustry,
difficulty
})
});

const data = await res.json();
if (!res.ok) return alert(data.error || "Failed to start session");

setSession(data.session);
setFaceUrl(data.faceUrl || "");
}

async function sendMessage() {
if (!session) return alert("Start a session first.");
if (!message.trim()) return;

const res = await fetch(`${API_BASE}/api/chat`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
userId: profile.user_id,
sessionId: session.id,
message: message.trim()
})
});

const data = await res.json();
if (!res.ok) return alert(data.error || "Chat failed");

setReply(data.reply);
speak(data.reply);
setMessage("");
}

async function endAndGrade() {
if (!session) return;

const res = await fetch(`${API_BASE}/api/evaluate`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
userId: profile.user_id,
sessionId: session.id
})
});

const data = await res.json();
if (!res.ok) return alert(data.error || "Evaluate failed");

setGrade(data);
await loadProfile(profile.user_id);

const lbRes = await fetch(`${API_BASE}/api/leaderboard?userId=${profile.user_id}`);
const lb = await lbRes.json();
if (lbRes.ok) setLeaderboard(lb.leaderboard || []);
}

// Invite link (manager)
async function createInviteLink() {
if (!profile?.company_id) return;
const code = crypto.randomUUID();

const { error } = await supabase.from("invites").insert({
code,
company_id: profile.company_id
});

if (error) return alert(error.message);
alert(`Invite link created:\n${window.location.origin}/invite/${code}`);
}

// XP progress
const xpPercent = useMemo(() => {
const xp = profile?.total_xp || 0;
return Math.min(100, xp % 100);
}, [profile?.total_xp]);

/* =========================================================
UI
========================================================= */
if (!authUser) {
return (
<div className="app">
<div className="content">
<div className="card">
<h2>AI Sales Trainer</h2>
<p className="muted">Sign in to start training.</p>

<div className="field">
<label>Email</label>
<input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
</div>

<div className="field">
<label>Password</label>
<input
placeholder="password"
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
/>
</div>

<div className="row">
<button onClick={signIn}>Sign In</button>
<button className="secondary" onClick={signUp}>
Sign Up
</button>
<div style={{ marginTop: 10 }}>
<button className="secondary" onClick={forgotPassword}>
Forgot password?
</button>
</div>
</div>
</div>
</div>

<style jsx global>{globalCss}</style>
</div>
);
}

if (authUser && !profile) {
return (
<div className="app">
<div className="content">
<div className="card">
<h2>Set up your account</h2>
<p className="muted">Create your company + manager profile (one-time).</p>

<div className="field">
<label>Your name</label>
<input
placeholder="Rep / Manager name"
value={repName}
onChange={(e) => setRepName(e.target.value)}
/>
</div>

<div className="field">
<label>Company name</label>
<input
placeholder="Company name"
value={companyName}
onChange={(e) => setCompanyName(e.target.value)}
/>
</div>

<div className="row">
<button onClick={createCompanyAndProfile}>Create Company</button>
<button className="secondary" onClick={signOut}>
Sign Out
</button>
</div>
</div>
</div>

<style jsx global>{globalCss}</style>
</div>
);
}

return (
<div className="app">
<div className="topbar">
<div className="logo">AI Sales Trainer</div>
<div className="user">
<span className="pill">
{profile?.rep_name} • Level {profile?.level}
</span>
<button className="small" onClick={signOut}>
Sign Out
</button>
</div>
</div>

<div className="contentWide">
{/* LEFT */}
<div className="card">
<div className="headerRow">
<div>
<h2 className="title">Training</h2>
<div className="muted">
Company: <b>{company?.name || "—"}</b> • Industry: <b>{lockedIndustry}</b>
</div>
</div>
</div>

<div className="xpWrap">
<div className="xpTop">
<div className="xpLabel">
Logged in as <b>{profile?.rep_name}</b> • Level <b>{profile?.level}</b> ({profile?.total_xp} XP)
</div>
<div className="xpHint">Progress to next level</div>
</div>
<div className="xpBar">
<div className="xpFill" style={{ width: `${xpPercent}%` }} />
</div>
</div>

<div className="panel">
<div className="row wrap">
<div className="fieldInline">
<label>Difficulty</label>
<select value={difficulty} onChange={(e) => setDifficulty(parseInt(e.target.value, 10))}>
<option value={1}>1</option>
<option value={2}>2</option>
<option value={3}>3</option>
<option value={4}>4</option>
<option value={5}>5</option>
</select>
</div>

<button onClick={startSession}>Start Session</button>
</div>

{session ? (
<>
<div className="sessionBox">
<div className="muted">
Session: <code>{session.id}</code>
</div>

<div className="personaRow">
{faceUrl ? (
<img src={faceUrl} alt="Prospect face" width={56} height={56} className="avatar" />
) : null}
<div>
<div className="personaTitle">
<b>Prospect persona:</b> {session.persona}
</div>
<div className="muted smallText">Randomized each session • consistent during session</div>
</div>
</div>
</div>

<div className="chatControls">
<input
className="chatInput"
placeholder="Say your pitch..."
value={message}
onChange={(e) => setMessage(e.target.value)}
/>

<button onClick={sendMessage}>Send</button>

<button className="secondary" onClick={startListening} type="button">
{listening ? "Listening..." : "🎤 Talk"}
</button>

<button className="secondary" onClick={() => speak(reply)} disabled={!reply} type="button">
{speaking ? "Speaking..." : "🔊 Replay"}
</button>
</div>

<div className="replyBox">
<div className="replyLabel">Prospect</div>
<div className="replyText">{reply || "—"}</div>
</div>

<div className="row" style={{ marginTop: 12 }}>
<button onClick={endAndGrade}>End Session & Grade</button>
</div>
</>
) : (
<div className="muted" style={{ marginTop: 12 }}>
Start a session to begin training.
</div>
)}
</div>
</div>

{/* RIGHT */}
<div className="stack">
{profile?.is_manager === true ? (
<div className="card">
<h3>Manager Controls</h3>
<p className="muted">Set the industry once for the company — reps won’t be able to change it.</p>

<div className="row wrap">
<div className="fieldInline">
<label>Company Industry</label>
<select value={companyIndustry || ""} onChange={(e) => setCompanyIndustry(e.target.value)}>
<option value="" disabled>
Select…
</option>
<option value="pest">Pest</option>
<option value="solar">Solar</option>
<option value="insurance">Insurance</option>
</select>
</div>

<button onClick={saveCompanyIndustry} disabled={savingCompany}>
{savingCompany ? "Saving..." : "Save Industry"}
</button>
</div>

<div className="row wrap" style={{ marginTop: 12 }}>
<button className="secondary" onClick={() => (window.location.href = "/dashboard")} type="button">
Manager Dashboard
</button>
<div style={{ marginTop: 14 }}>
<h3 style={{ marginBottom: 8 }}>Invite a rep</h3>

<div className="field">
<label>Rep name</label>
<input
placeholder="John Smith"
value={inviteName}
onChange={(e) => setInviteName(e.target.value)}
/>
</div>

<div className="field">
<label>Rep email</label>
<input
placeholder="rep@company.com"
value={inviteEmail}
onChange={(e) => setInviteEmail(e.target.value)}
/>
</div>

<button onClick={sendRepInvite} disabled={sendingInvite}>
{sendingInvite ? "Sending..." : "Send Invite Email"}
</button>
</div>

</div>
</div>
) : null}

{grade ? <Scorecard grade={grade} profile={profile} /> : null}

<div className="card">
<h3>Leaderboard</h3>
<p className="muted">Updated after grading.</p>

{leaderboard?.length ? (
<div className="lb">
{leaderboard.map((row, idx) => (
<div className="lbRow" key={idx}>
<div className="lbLeft">
<span className="lbRank">#{idx + 1}</span>
<span className="lbName">{row.rep_name || "Rep"}</span>
</div>
<div className="lbRight">{row.total_xp || 0} XP</div>
</div>
))}
</div>
) : (
<div className="muted">No leaderboard data yet.</div>
)}
</div>
</div>
</div>

{/* IMPORTANT: style tag must be INSIDE the root JSX return */}
<style jsx global>{globalCss}</style>
</div>
);
}

/* =========================================================
Global CSS
========================================================= */
const globalCss = `
:root { color-scheme: dark; }

body {
margin: 0;
font-family: Inter, system-ui, sans-serif;
background: radial-gradient(1200px 700px at 20% 10%, rgba(59,130,246,0.25), transparent 60%),
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
opacity: 0.95;
}

.pill {
padding: 8px 10px;
border-radius: 999px;
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.12);
}

.content {
max-width: 900px;
margin: 60px auto;
padding: 0 24px;
}

.contentWide {
max-width: 1200px;
margin: 28px auto;
padding: 0 18px;
display: grid;
grid-template-columns: 1.2fr 0.8fr;
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
.title { margin-bottom: 6px; }

.muted {
opacity: 0.82;
font-size: 14px;
line-height: 1.4;
}

.smallText { font-size: 12px; }

.headerRow{
display:flex;
align-items:flex-start;
justify-content: space-between;
gap: 12px;
}

.field {
display: flex;
flex-direction: column;
gap: 6px;
margin: 12px 0;
}

.field label {
font-size: 13px;
opacity: 0.85;
}

.fieldInline {
display: flex;
flex-direction: column;
gap: 6px;
}

.row {
display: flex;
align-items: center;
gap: 10px;
}

.wrap { flex-wrap: wrap; }

button {
background: linear-gradient(135deg, #3b82f6, #2563eb);
border: none;
color: white;
padding: 10px 16px;
border-radius: 12px;
font-weight: 700;
cursor: pointer;
transition: transform 0.18s ease, opacity 0.18s ease;
}

button:hover {
transform: translateY(-1px);
opacity: 0.96;
}

button:disabled {
opacity: 0.55;
cursor: not-allowed;
transform: none;
}

button.secondary {
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.14);
}

button.small {
padding: 8px 12px;
border-radius: 12px;
font-weight: 700;
}

select, input {
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.16);
color: white;
padding: 10px 12px;
border-radius: 12px;
outline: none;
min-width: 220px;
}

select { min-width: 160px; }

input::placeholder { color: rgba(255,255,255,0.55); }

.panel {
margin-top: 16px;
padding: 14px;
border-radius: 14px;
border: 1px solid rgba(255,255,255,0.10);
background: rgba(255,255,255,0.04);
}

.xpWrap {
margin-top: 14px;
padding: 14px;
border-radius: 14px;
border: 1px solid rgba(255,255,255,0.10);
background: rgba(255,255,255,0.04);
}

.xpTop {
display: flex;
justify-content: space-between;
gap: 12px;
margin-bottom: 10px;
align-items: baseline;
}

.xpLabel { font-size: 14px; opacity: 0.95; }
.xpHint { font-size: 12px; opacity: 0.75; }

.xpBar {
width: 100%;
height: 10px;
border-radius: 999px;
background: rgba(255,255,255,0.10);
overflow: hidden;
}

.xpFill {
height: 100%;
border-radius: 999px;
background: linear-gradient(90deg, #22c55e, #3b82f6);
width: 0%;
transition: width 0.35s ease;
}

.sessionBox {
margin-top: 14px;
padding: 14px;
border-radius: 14px;
border: 1px solid rgba(255,255,255,0.10);
background: rgba(0,0,0,0.18);
}

.personaRow {
display: flex;
align-items: center;
gap: 12px;
margin-top: 10px;
}

.avatar {
border-radius: 12px;
border: 1px solid rgba(255,255,255,0.14);
}

.chatControls {
display: flex;
gap: 10px;
align-items: center;
flex-wrap: wrap;
margin-top: 14px;
}

.chatInput {
flex: 1;
min-width: 280px;
}

.replyBox {
margin-top: 12px;
padding: 12px;
border-radius: 12px;
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.10);
}

.replyLabel {
font-size: 12px;
opacity: 0.7;
margin-bottom: 6px;
}

.replyText {
font-size: 15px;
line-height: 1.45;
}

.lb { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }

.lbRow {
display: flex;
justify-content: space-between;
align-items: center;
padding: 10px 12px;
border-radius: 12px;
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.10);
}

.lbLeft { display: flex; gap: 10px; align-items: center; }
.lbRank { opacity: 0.7; font-size: 12px; }
.lbName { font-weight: 800; }
.lbRight { opacity: 0.9; }
`;
