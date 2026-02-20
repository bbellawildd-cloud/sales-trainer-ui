import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Home() {
// ----------------------------
// Auth / profile
// ----------------------------
const [authUser, setAuthUser] = useState(null);

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [repName, setRepName] = useState("");
const [companyName, setCompanyName] = useState("");

const [profile, setProfile] = useState(null);

// Company settings (industry locked to reps)
const [company, setCompany] = useState(null);
const [companyIndustry, setCompanyIndustry] = useState(""); // manager can set
const [savingCompany, setSavingCompany] = useState(false);

// ----------------------------
// Session / chat
// ----------------------------
const [session, setSession] = useState(null);
const [faceUrl, setFaceUrl] = useState("");
const [message, setMessage] = useState("");
const [reply, setReply] = useState("");

const [grade, setGrade] = useState(null);
const [leaderboard, setLeaderboard] = useState([]);

// Rep training difficulty only (industry is locked from company)
const [difficulty, setDifficulty] = useState(2);

// ----------------------------
// Voice (STT + TTS)
// ----------------------------
const recognitionRef = useRef(null);
const [listening, setListening] = useState(false);
const [speaking, setSpeaking] = useState(false);

useEffect(() => {
if (typeof window === "undefined") return;

const SpeechRecognition =
window.SpeechRecognition || window.webkitSpeechRecognition;

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

// ----------------------------
// Auth listeners
// ----------------------------
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

// ----------------------------
// Auth actions
// ----------------------------
async function signUp() {
const { error } = await supabase.auth.signUp({ email, password });
if (error) return alert(error.message);
alert("Signed up. If email confirmation is on, check your email, then sign in.");
}

async function signIn() {
const { data, error } = await supabase.auth.signInWithPassword({
email,
password,
});
if (error) return alert(error.message);
setAuthUser(data.user);
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

// ----------------------------
// First-time manager setup (create company + profile)
// ----------------------------
async function createCompanyAndProfile() {
if (!authUser?.id) return;

if (!repName.trim() || !companyName.trim()) {
return alert("Enter rep name + company name");
}

// 1) create company
const { data: companyRow, error: cErr } = await supabase
.from("companies")
.insert({ name: companyName.trim() })
.select("id, name, industry")
.single();

if (cErr) return alert(cErr.message);

// 2) create profile (manager)
const { error: pErr } = await supabase.from("profiles").insert({
user_id: authUser.id,
company_id: companyRow.id,
rep_name: repName.trim(),
role: "manager",
total_xp: 0,
level: 1,
is_manager: true,
});

if (pErr) return alert(pErr.message);

await loadProfile(authUser.id);
}

// ----------------------------
// Manager: set company industry (reps locked)
// ----------------------------
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

// ----------------------------
// Sessions
// ----------------------------
const lockedIndustry = useMemo(() => {
// Fallback: if company industry not set, allow a default
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
difficulty,
}),
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
message: message.trim(),
}),
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
sessionId: session.id,
}),
});

const data = await res.json();
if (!res.ok) return alert(data.error || "Evaluate failed");

setGrade(data);
await loadProfile(profile.user_id);

const lbRes = await fetch(`${API_BASE}/api/leaderboard?userId=${profile.user_id}`);
const lb = await lbRes.json();
if (lbRes.ok) setLeaderboard(lb.leaderboard || []);
}

// ----------------------------
// Invite link (manager)
// ----------------------------
async function createInviteLink() {
if (!profile?.company_id) return;
const code = crypto.randomUUID();

const { error } = await supabase.from("invites").insert({
code,
company_id: profile.company_id,
});

if (error) return alert(error.message);

alert(`Invite link created:\n${window.location.origin}/invite/${code}`);
}

// ----------------------------
// XP progress (simple)
// ----------------------------
const xpPercent = useMemo(() => {
// 0-99 shows progress to next level (simple)
const xp = profile?.total_xp || 0;
return Math.min(100, xp % 100);
}, [profile?.total_xp]);

// =========================================================
// UI RENDER
// =========================================================

// Logged out
if (!authUser) {
return (
<div className="app">
<div className="content">
<div className="card">
<h2>AI Sales Trainer</h2>
<p className="muted">Sign in to start training.</p>

<div className="field">
<label>Email</label>
<input
placeholder="email"
value={email}
onChange={(e) => setEmail(e.target.value)}
/>
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
</div>
</div>
</div>

<style jsx global>{globalCss}</style>
</div>
);
}

// Logged in but profile not created
if (authUser && !profile) {
return (
<div className="app">
<div className="content">
<div className="card">
<h2>Set up your account</h2>
<p className="muted">
Create your company and manager profile (one-time).
</p>

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

// Main app
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
{/* LEFT: Training */}
<div className="card">
<div className="headerRow">
<div>
<h2 className="title">Training</h2>
<div className="muted">
Company: <b>{company?.name || "—"}</b> • Industry:{" "}
<b>{lockedIndustry}</b>
</div>
</div>
</div>

{/* XP */}
<div className="xpWrap">
<div className="xpTop">
<div className="xpLabel">
Logged in as <b>{profile?.rep_name}</b> • Level{" "}
<b>{profile?.level}</b> ({profile?.total_xp} XP)
</div>
<div className="xpHint">Progress to next level</div>
</div>
<div className="xpBar">
<div className="xpFill" style={{ width: `${xpPercent}%` }} />
</div>
</div>

{/* Controls */}
<div className="panel">
<div className="row wrap">
<div className="fieldInline">
<label>Difficulty</label>
<select
value={difficulty}
onChange={(e) => setDifficulty(parseInt(e.target.value, 10))}
>
<option value={1}>1</option>
<option value={2}>2</option>
<option value={3}>3</option>
<option value={4}>4</option>
<option value={5}>5</option>
</select>
</div>

<button onClick={startSession}>Start Session</button>
</div>

{session && (
<div className="sessionBox">
<div className="sessionTop">
<div className="muted">
Session: <code>{session.id}</code>
</div>

<div className="personaRow">
{faceUrl && (
<img
src={faceUrl}
alt="Prospect face"
width={56}
height={56}
className="avatar"
/>
)}
<div>
<div className="personaTitle">
<b>Prospect persona:</b> {session.persona}
</div>
<div className="muted smallText">
Randomized each session • consistent during session
</div>
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

<button className="secondary" onClick={startListening}>
{listening ? "Listening..." : "🎤 Talk"}
</button>

<button
className="secondary"
onClick={() => speak(reply)}
disabled={!reply}
>
{speaking ? "Speaking..." : "🔊 Replay"}
</button>
</div>

<div className="replyBox">
<div className="replyLabel">Prospect</div>
<div className="replyText">{reply || "—"}</div>
</div>

<div className="row">
<button onClick={endAndGrade}>End Session & Grade</button>
</div>
</div>
)}
</div>
</div>

{/* RIGHT: Manager / Score */}
<div className="stack">
{profile?.is_manager === true && (
<div className="card">
<h3>Manager Controls</h3>
<p className="muted">
Set the industry once for the company — reps won’t be able to change it.
</p>

<div className="row wrap">
<div className="fieldInline">
<label>Company Industry</label>
<select
value={companyIndustry || ""}
onChange={(e) => setCompanyIndustry(e.target.value)}
>
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
<button
className="secondary"
onClick={() => (window.location.href = "/dashboard")}
>
Manager Dashboard
</button>

<button className="secondary" onClick={createInviteLink}>
Create Rep Invite Link
</button>
</div>
</div>
)}

<div className="card">
<h3>Scorecard</h3>
<p className="muted">After you grade, your results show up here.</p>

{!grade ? (
<div className="muted">No score yet.</div>
) : (
<pre className="pre">{JSON.stringify(grade, null, 2)}</pre>
)}
</div>

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

<style jsx global>{globalCss}</style>
</div>
);
}

// =========================================================
// Global CSS (cleaned + merged from what you pasted)
// =========================================================
const globalCss = `
body {
margin: 0;
font-family: Inter, system-ui, sans-serif;
background: linear-gradient(135deg, #0f172a, #1e293b);
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
border-bottom: 1px solid rgba(255,255,255,0.1);
position: sticky;
top: 0;
backdrop-filter: blur(10px);
background: rgba(15, 23, 42, 0.4);
z-index: 10;
}

.logo {
font-size: 18px;
font-weight: 700;
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
background: rgba(255,255,255,0.05);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.1);
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
h3 { margin: 0; font-weight: 700; }

.title { margin-bottom: 6px; }

.muted {
opacity: 0.8;
font-size: 14px;
line-height: 1.4;
}

.smallText { font-size: 12px; }

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

.wrap {
flex-wrap: wrap;
}

button {
background: linear-gradient(135deg, #3b82f6, #2563eb);
border: none;
color: white;
padding: 10px 16px;
border-radius: 10px;
font-weight: 600;
cursor: pointer;
transition: 0.2s ease;
}

button:hover {
transform: translateY(-1px);
opacity: 0.96;
}

button:disabled {
opacity: 0.5;
cursor: not-allowed;
transform: none;
}

button.secondary {
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.14);
}

button.small {
padding: 8px 12px;
border-radius: 10px;
font-weight: 600;
}

select, input {
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.15);
color: white;
padding: 10px 12px;
border-radius: 10px;
outline: none;
min-width: 220px;
}

select { min-width: 160px; }

input::placeholder { color: rgba(255,255,255,0.5); }

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

.pre {
background: rgba(0,0,0,0.25);
border: 1px solid rgba(255,255,255,0.12);
padding: 12px;
border-radius: 12px;
overflow: auto;
white-space: pre-wrap;
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
.lbName { font-weight: 700; }
.lbRight { opacity: 0.9; }
`;
