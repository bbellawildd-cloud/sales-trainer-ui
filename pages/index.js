import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ProspectAvatar from "../components/ProspectAvatar";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

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

function Pill({ children, tone = "default" }) {
const map = {
default: {
bg: "rgba(255,255,255,0.08)",
border: "rgba(255,255,255,0.12)"
},
blue: {
bg: "rgba(59,130,246,0.16)",
border: "rgba(59,130,246,0.28)"
},
green: {
bg: "rgba(34,197,94,0.14)",
border: "rgba(34,197,94,0.28)"
},
amber: {
bg: "rgba(245,158,11,0.14)",
border: "rgba(245,158,11,0.28)"
},
red: {
bg: "rgba(239,68,68,0.14)",
border: "rgba(239,68,68,0.28)"
}
};

const style = map[tone] || map.default;

return (
<span
style={{
display: "inline-flex",
alignItems: "center",
padding: "6px 10px",
borderRadius: 999,
background: style.bg,
border: `1px solid ${style.border}`,
fontSize: 12,
marginRight: 8,
marginBottom: 8
}}
>
{children}
</span>
);
}

function Bar({ label, value }) {
const v = value == null ? null : Math.max(0, Math.min(100, Number(value)));
return (
<div style={{ marginBottom: 10 }}>
<div
style={{
display: "flex",
justifyContent: "space-between",
fontSize: 13,
opacity: 0.9
}}
>
<div>{label}</div>
<div style={{ fontVariantNumeric: "tabular-nums" }}>
{v == null ? "—" : `${v}/100`}
</div>
</div>
<div
style={{
height: 10,
borderRadius: 999,
background: "rgba(255,255,255,0.10)",
overflow: "hidden"
}}
>
<div
style={{
height: "100%",
width: v == null ? "0%" : `${v}%`,
background: "linear-gradient(90deg, #22c55e, #3b82f6)",
borderRadius: 999,
transition: "width 250ms ease"
}}
/>
</div>
</div>
);
}

function getBadgesFromGrade(raw) {
const g = raw || {};
const rubric = g.rubric || g.scores || {};
const badges = [];

const opener = Number(rubric.opener ?? 0);
const discovery = Number(rubric.discovery ?? 0);
const objections = Number(rubric.objection_handling ?? 0);
const closing = Number(rubric.closing ?? 0);
const clarity = Number(rubric.clarity ?? 0);
const confidence = Number(g?.delivery?.confidence ?? 0);

if (opener >= 85) badges.push("Rapport Builder");
if (discovery >= 85) badges.push("Discovery Master");
if (objections >= 85) badges.push("Objection Slayer");
if (closing >= 85) badges.push("Closing Machine");
if (clarity >= 85) badges.push("Clear Communicator");
if (confidence >= 85) badges.push("Confident Closer");

if (!badges.length && Number(g.overall_score ?? 0) >= 70) {
badges.push("Solid Session");
}

return badges;
}

function Scorecard({ grade, profile }) {
const n = normalizeGrade(grade);
const [showRaw, setShowRaw] = useState(false);
const badges = getBadgesFromGrade(grade);

return (
<div className="card">
<div className="headerRow">
<div>
<h3>Session Scorecard</h3>
<p className="muted">Detailed coaching after every completed run.</p>
</div>
<button
className="secondary small"
type="button"
onClick={() => setShowRaw((s) => !s)}
>
{showRaw ? "Hide Raw" : "View Raw"}
</button>
</div>

<div className="scoreTop">
<div className="scoreHero">
<div className="scoreEyebrow">Overall</div>
<div className="scoreBig">{n.overall == null ? "—" : n.overall}</div>
<div className="scoreSub">/100</div>
{n.oneLine ? <div className="scoreSummary">{n.oneLine}</div> : null}
<div style={{ marginTop: 12 }}>
<Pill tone="blue">{profile?.is_manager ? "Manager view" : "Rep view"}</Pill>
{n.stageReached ? <Pill tone="amber">Stage: {String(n.stageReached)}</Pill> : null}
{n.delivery?.wpm != null ? <Pill>Speed: {n.delivery.wpm} wpm</Pill> : null}
{n.delivery?.talkRatio != null ? <Pill>Talk ratio: {n.delivery.talkRatio}</Pill> : null}
</div>
{badges.length ? (
<div style={{ marginTop: 10 }}>
{badges.map((badge, i) => (
<Pill key={i} tone="green">🏆 {badge}</Pill>
))}
</div>
) : null}
</div>

<div className="scoreBars">
<h3 style={{ marginBottom: 12 }}>Delivery & Presence</h3>
<Bar label="Confidence" value={n.delivery.confidence} />
<Bar label="Tone" value={n.delivery.tone} />
<Bar label="Pacing / Speed" value={n.delivery.pacing} />
<Bar label="Clarity" value={n.delivery.clarity} />
<Bar label="Energy" value={n.delivery.energy} />
</div>
</div>

<div className="scoreGrid">
<div className="scoreTile">
<h3>What went well</h3>
<div style={{ marginTop: 10 }}>
{n.wins.length ? n.wins.map((w, i) => <Pill key={i} tone="green">{String(w)}</Pill>) : <div className="muted">—</div>}
</div>
</div>

<div className="scoreTile">
<h3>Needs coaching</h3>
<div style={{ marginTop: 10 }}>
{n.fixes.length ? n.fixes.map((f, i) => <Pill key={i} tone="red">{String(f)}</Pill>) : <div className="muted">—</div>}
</div>
</div>

<div className="scoreTile">
<h3>Where you got stuck</h3>
<div style={{ marginTop: 10 }}>
{n.stuckPoints.length ? n.stuckPoints.map((s, i) => <Pill key={i} tone="amber">{String(s)}</Pill>) : <div className="muted">—</div>}
</div>
</div>
</div>

<div className="scoreTile" style={{ marginTop: 16 }}>
<h3>Skills rubric</h3>
<div style={{ marginTop: 10 }}>
{n.rubricItems?.length ? (
n.rubricItems.map((it, idx) => (
<div key={idx} className="rubricRow">
<div className="rubricTop">
<div style={{ fontWeight: 750 }}>{it.label}</div>
<div>{it.score == null ? "—" : `${it.score}/100`}</div>
</div>
{it.notes ? <div className="rubricNotes">{it.notes}</div> : null}
</div>
))
) : (
<div className="muted">No rubric categories yet.</div>
)}
</div>

{n.nextBestAction ? (
<div className="nextBestAction">
<div className="muted" style={{ fontSize: 13 }}>Next best action</div>
<div style={{ marginTop: 6 }}>{String(n.nextBestAction)}</div>
</div>
) : null}
</div>

{showRaw ? (
<div className="rawBox">
<div className="muted" style={{ marginBottom: 8 }}>Raw grade payload</div>
<pre className="rawPre">{JSON.stringify(n.raw, null, 2)}</pre>
</div>
) : null}
</div>
);
}

function buildLiveCoachHints(text) {
const t = String(text || "").toLowerCase().trim();
if (!t) return [];

const hints = [];
const words = t.split(/\s+/).filter(Boolean);
const questionCount = (t.match(/\?/g) || []).length;
const fillerCount = (t.match(/\b(um|uh|like|you know|basically|actually)\b/g) || []).length;
const weakWords = (t.match(/\b(maybe|kind of|sort of|hopefully|i think|probably)\b/g) || []).length;

if (fillerCount >= 2) hints.push({ label: "Too many filler words", tone: "red" });
if (weakWords >= 2) hints.push({ label: "Sound more confident", tone: "amber" });
if (questionCount === 0 && words.length > 12) hints.push({ label: "Ask a question", tone: "blue" });
if (!/\b(pain|problem|issue|challenge|currently|today|process)\b/.test(t)) {
hints.push({ label: "Discover pain deeper", tone: "amber" });
}
if (words.length > 35) hints.push({ label: "Too much talking", tone: "red" });
if (!/\b(why|how|what|walk me through|tell me about)\b/.test(t)) {
hints.push({ label: "Use discovery language", tone: "blue" });
}

return hints.slice(0, 4);
}

function computeSessionMood({ listening, speaking, waitingForReply, currentEmotion }) {
if (waitingForReply) return "thinking";
if (listening) return "listening";
if (speaking) return "speaking";
return currentEmotion || "idle";
}

export default function Home() {
const [authUser, setAuthUser] = useState(null);
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [inviteName, setInviteName] = useState("");
const [inviteEmail, setInviteEmail] = useState("");
const [sendingInvite, setSendingInvite] = useState(false);

const [repName, setRepName] = useState("");
const [companyName, setCompanyName] = useState("");
const [profile, setProfile] = useState(null);

const [company, setCompany] = useState(null);
const [companyIndustry, setCompanyIndustry] = useState("");
const [savingCompany, setSavingCompany] = useState(false);

const [session, setSession] = useState(null);
const [message, setMessage] = useState("");
const [reply, setReply] = useState("");
const [currentEmotion, setCurrentEmotion] = useState("idle");
const [grade, setGrade] = useState(null);
const [leaderboard, setLeaderboard] = useState([]);
const [listening, setListening] = useState(false);
const [speaking, setSpeaking] = useState(false);
const [voices, setVoices] = useState([]);
const [selectedVoiceName, setSelectedVoiceName] = useState("");
const [waitingForReply, setWaitingForReply] = useState(false);
const [liveCoachVisible, setLiveCoachVisible] = useState(true);
const [sessionStreak, setSessionStreak] = useState(0);
const [sessionXp, setSessionXp] = useState(0);
const [startingSession, setStartingSession] = useState(false);

const recognitionRef = useRef(null);
const silenceTimerRef = useRef(null);
const finalTranscriptRef = useRef("");
const audioContextRef = useRef(null);
const analyserRef = useRef(null);
const micStreamRef = useRef(null);
const rafRef = useRef(null);

const [micLevel, setMicLevel] = useState(0);
  
const sessionRef = useRef(null);
const profileRef = useRef(null);
const speakingRef = useRef(false);
const listeningRef = useRef(false);

const difficulty = useMemo(() => {
if (!profile) return 1;
if (profile.level <= 2) return 1;
if (profile.level <= 4) return 2;
if (profile.level <= 6) return 3;
if (profile.level <= 8) return 4;
return 5;
}, [profile?.level]);

const lockedIndustry = useMemo(() => {
return company?.industry || companyIndustry || "pest";
}, [company?.industry, companyIndustry]);

const liveCoachHints = useMemo(() => buildLiveCoachHints(message), [message]);

const sessionMood = useMemo(
() => computeSessionMood({ listening, speaking, waitingForReply, currentEmotion }),
[listening, speaking, waitingForReply, currentEmotion]
);

const xpPercent = useMemo(() => {
const xp = profile?.total_xp || 0;
return Math.min(100, xp % 100);
}, [profile?.total_xp]);

useEffect(() => {
sessionRef.current = session;
}, [session]);

useEffect(() => {
profileRef.current = profile;
}, [profile]);

useEffect(() => {
speakingRef.current = speaking;
}, [speaking]);

useEffect(() => {
listeningRef.current = listening;
}, [listening]);

useEffect(() => {
if (typeof window === "undefined") return;

const SpeechRecognition =
window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
const rec = new SpeechRecognition();
rec.continuous = true;
rec.interimResults = true;
rec.lang = "en-US";
recognitionRef.current = rec;

rec.onstart = () => {
finalTranscriptRef.current = "";
setListening(true);
};

rec.onresult = (event) => {
let interim = "";
let finalText = finalTranscriptRef.current;

for (let i = event.resultIndex; i < event.results.length; i += 1) {
const transcript = event.results[i][0]?.transcript || "";
if (event.results[i].isFinal) {
finalText += ` ${transcript}`;
} else {
interim += ` ${transcript}`;
}
}

finalTranscriptRef.current = finalText.trim();
setMessage(`${finalText} ${interim}`.trim());

if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
silenceTimerRef.current = setTimeout(() => {
stopListeningAndSend();
}, 1800);
};

rec.onerror = () => {
setListening(false);
};

rec.onend = () => {
setListening(false);
};
}

const loadVoices = () => {
const available = window.speechSynthesis?.getVoices?.() || [];
setVoices(available);

const preferred =
available.find((v) =>
/Siri|Google US English|Jenny|Aria|Guy|Christopher/i.test(v.name)
) ||
available.find((v) => /en-US/i.test(v.lang)) ||
available[0];

if (preferred) setSelectedVoiceName(preferred.name);
};

loadVoices();

if (window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

return () => {
if (silenceTimerRef.current) {
clearTimeout(silenceTimerRef.current);
}

if (typeof stopMicMeter === "function") {
stopMicMeter();
}

if (micStreamRef.current) {
micStreamRef.current.getTracks().forEach((track) => track.stop());
}

if (
audioContextRef.current &&
typeof audioContextRef.current.close === "function" &&
audioContextRef.current.state !== "closed"
) {
audioContextRef.current.close();
}
};
}, []);


useEffect(() => {
supabase.auth.getSession().then(({ data }) => {
setAuthUser(data.session?.user ?? null);
});

const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
setAuthUser(nextSession?.user ?? null);
});

return () => sub.subscription.unsubscribe();
}, []);

useEffect(() => {
if (authUser?.id) loadProfile(authUser.id);
}, [authUser]);

useEffect(() => {
if (profile?.company_id) loadCompany(profile.company_id);
}, [profile?.company_id]);

async function startListening() {
const recognition = recognitionRef.current;

if (!sessionRef.current) return;
if (!recognition) return;
if (listeningRef.current) return;
if (speakingRef.current) return;

setMessage("");
finalTranscriptRef.current = "";

await setupMicVisualizer();
startMicMeter();

try {
recognition.start();
} catch (err) {
// ignore if already started
}
}

async function stopListeningAndSend() {
const recognition = recognitionRef.current;

if (recognition && listeningRef.current) {
try {
recognition.stop();
} catch (err) {
// ignore
}
}

if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
stopMicMeter();


const finalText = (finalTranscriptRef.current || message || "").trim();

if (finalText) {
sendVoiceMessage(finalText);
} else if (sessionRef.current && !speakingRef.current) {
setTimeout(() => {
startListening();
}, 250);
}
}

function stopListeningOnly() {
const recognition = recognitionRef.current;
  
if (recognition && listeningRef.current) {
try {
recognition.stop();
} catch (err) {
// ignore
}
}
if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  stopMicMeter();
}

async function setupMicVisualizer() {
if (typeof window === "undefined") return;
if (analyserRef.current) return;

try {
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
micStreamRef.current = stream;

const AudioContextClass = window.AudioContext || window.webkitAudioContext;
if (!AudioContextClass) return;

const audioContext = new AudioContextClass();
audioContextRef.current = audioContext;

const source = audioContext.createMediaStreamSource(stream);
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
analyser.smoothingTimeConstant = 0.8;

source.connect(analyser);
analyserRef.current = analyser;
} catch (err) {
// ignore mic visualizer failures
}
}

function startMicMeter() {
const analyser = analyserRef.current;
if (!analyser) return;

const dataArray = new Uint8Array(analyser.frequencyBinCount);

const tick = () => {
if (!analyserRef.current) return;

analyser.getByteFrequencyData(dataArray);

let sum = 0;
for (let i = 0; i < dataArray.length; i += 1) {
sum += dataArray[i];
}

const avg = sum / dataArray.length;
const normalized = Math.max(0, Math.min(1, avg / 90));
setMicLevel(normalized);

rafRef.current = requestAnimationFrame(tick);
};

if (rafRef.current) cancelAnimationFrame(rafRef.current);
tick();
}

function stopMicMeter() {
  
if (rafRef.current) {
cancelAnimationFrame(rafRef.current);
rafRef.current = null;
}
setMicLevel(0);
}

function speak(text) {
if (!text || typeof window === "undefined") {
setWaitingForReply(false);
return;
}

const synth = window.speechSynthesis;

if (!synth) {
setWaitingForReply(false);
setTimeout(() => {
startListening();
}, 700);
return;
}

synth.cancel();

const cleanedText = String(text || "")
  .replaced(/\s+/g, " ")
  .replaced(/\.\.\./g, ".")
  .replaced(/-/g, ", ")
  .replaced(/-/g," ")
  .trim();

const utterance = new SpeechSynthesisUtterance(cleanedText);
  
const preferredVoice =
voices.find((v) => /google us english/i.test(v.name)) ||
voices.find((v) => /microsoft aria/i.test(v.name)) ||
voices.find((v) => /microsoft jenny/i.test(v.name)) ||
voices.find((v) => /samantha/i.test(v.name)) ||
voices.find((v) => /alex/i.test(v.name)) ||
voices.find((v) => /en.us/i.test(v.name)) ||
voices[0];

if (prefferedVoice) {
utterance.voice = prefferedVoice;
}

let rate = 0.96;
let pitch = 1.0;

const personaText = String(sessionRef.current?.persona || "").toLowerCase();

if (personaText.includes("skeptical")) {
rate = 0.92;
pitch = 0.95;
} else if (personaText.includes("friendly")) {
rate = 1.0;
pitch = 1.05;
} else if (personaText.includes("aggressive")) {
rate = 1.02;
pitch = 0.92;
}

utterance.lang = "en-US";
utterance.rate = rate;
utterance.pitch = pitch;
utterance.volume = 1;


utterance.onstart = () => {
setWaitingForReply(false);
setSpeaking(true);
};

utterance.onend = () => {
setSpeaking(false);

const lower = cleanedText.toLowerCase();
const conversationEnded =
lower.includes("i'm not interested") ||
lower.includes("okay let's do it") ||
lower.includes("okay, let's do it");

if (!conversationEnded && sessionRef.current) {
setTimeout(() => {
startListening();
}, 700);
}
};

utterance.onerror = () => {
setWaitingForReply(false);
setSpeaking(false);

if (sessionRef.current) {
setTimeout(() => {
startListening();
}, 700);
}
};

try {
synth.speak(utterance);
} catch (err) {
setWaitingForReply(false);
setSpeaking(false);

if (sessionRef.current) {
setTimeout(() => {
startListening();
}, 700);
}
}
}

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
redirectTo: `${window.location.origin}/reset-password`
});

if (error) return alert(error.message);
alert("Reset email sent ✅ Check inbox/spam.");
}

async function signOut() {
stopListeningOnly();
setWaitingForReply(false);

if (typeof window !== "undefined") {
window.speechSynthesis.cancel();
}

await supabase.auth.signOut();
setAuthUser(null);
setProfile(null);
setCompany(null);
setCompanyIndustry("");
setSession(null);
setGrade(null);
setLeaderboard([]);
setReply("");
setMessage("");
setCurrentEmotion("idle");
setSessionXp(0);
setSessionStreak(0);
}

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

async function startSession() {
  if (startingSession) return;

setStartingSession(true);
setCurrentEmotion("idle");

  try {
if (!profile) return alert("No profile loaded.");
if (!lockedIndustry) return alert("Manager must set company industry first.");

setGrade(null);
setReply("");
setWaitingForReply(false);
setSessionXp(0);
setSessionStreak(0);

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
setCurrentEmotion("idle");

if (typeof window !== "undefined" && window.speechSynthesis) {
try {
const unlock = new SpeechSynthesisUtterance(" ");
unlock.volume = 0;
window.speechSynthesis.speak(unlock);
window.speechSynthesis.cancel();
} catch (err) {
// ignore
}
}

setTimeout(() => {
startListening();
}, 500);
  } finally {
    setStartingSession(false);
}
} 
  
async function sendVoiceMessage(transcript) {
const activeSession = sessionRef.current;
const activeProfile = profileRef.current;

if (!activeSession) return;
if (!activeProfile) return;
if (!transcript.trim()) return;

setWaitingForReply(true);
setReply("");
setCurrentEmotion("thinking");

const res = await fetch(`${API_BASE}/api/chat`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
userId: activeProfile.user_id,
sessionId: activeSession.id,
message: transcript.trim()
})
});

const data = await res.json();
if (!res.ok) {
setWaitingForReply(false);
return alert(data.error || "Chat failed");
}

setReply(data.reply || "");
setCurrentEmotion(data.emotion || "idle");
setMessage("");

const bonusXp = Math.min(12, Math.max(3, Math.round(transcript.trim().split(/\s+/).length / 5)));
setSessionXp((x) => x + bonusXp);
setSessionStreak((s) => s + 1);

speak(data.reply || "");
}

async function endAndGrade() {
if (!session) return;

setWaitingForReply(false);
setCurrentEmotion("idle");
stopListeningOnly();

if (typeof window !== "undefined") {
window.speechSynthesis.cancel();
}

const res = await fetch(`${API_BASE}

/api/evaluate`, {
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
setCurrentEmotion("idle");
setSession(null);
await loadProfile(profile.user_id);

const lbRes = await fetch(`${API_BASE}/api/leaderboard?userId=${profile.user_id}`);
const lb = await lbRes.json();
if (lbRes.ok) setLeaderboard(lb.leaderboard || []);
}

async function sendRepInvite() {
try {
if (!inviteEmail.trim()) return alert("Enter rep email.");
setSendingInvite(true);

const res = await fetch(`${API_BASE}/api/invite/send`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
managerUserId: profile.user_id,
repName: inviteName,
repEmail: inviteEmail
})
});

const data = await res.json();

if (!res.ok) {
throw new Error(data.error || data.details || "Failed to send invite");
}

alert("✅ Invite sent!");
setInviteName("");
setInviteEmail("");
} catch (err) {
alert(err.message || "Invite failed");
} finally {
setSendingInvite(false);
}
}

if (!authUser) {
return (
<div className="app">
<div className="content">
<div className="card authCard">
<div className="heroBadge">VOICE FIRST AI ROLEPLAY</div>
<h2>AI Sales Trainer</h2>
<p className="muted">
Practice live objections, discovery, and closes against an AI prospect.
</p>

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

<div className="row wrap">
<button onClick={signIn}>Sign In</button>
<button className="secondary" onClick={signUp}>Sign Up</button>
</div>

<div style={{ marginTop: 10 }}>
<button className="secondary" onClick={forgotPassword} type="button">
Forgot password?
</button>
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
<div className="card authCard">
<h2>Set up your account</h2>
<p className="muted">Create your company + manager profile.</p>

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

<div className="row wrap">
<button onClick={createCompanyAndProfile}>Create Company</button>
<button className="secondary" onClick={signOut}>Sign Out</button>
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
<button className="small" onClick={signOut}>Sign Out</button>
</div>
</div>

<div className="contentWide">
<div className="mainStack">
<div className="card heroCard">
<div className="headerRow">
<div>
<div className="heroBadge">LIVE ROLEPLAY</div>
<h2 className="title">Training Arena</h2>
<div className="muted">
Company: <b>{company?.name || "—"}</b> • Industry: <b>{lockedIndustry}</b> • Level <b>{difficulty}</b>
</div>
</div>
</div>

<div className="statsRow">
<div className="statBox">
<div className="statLabel">Total XP</div>
<div className="statValue">{profile?.total_xp || 0}</div>
</div>
<div className="statBox">
<div className="statLabel">Current Streak</div>
<div className="statValue">{sessionStreak}</div>
</div>
<div className="statBox">
<div className="statLabel">Session XP</div>
<div className="statValue">+{sessionXp}</div>
</div>
<div className="statBox">
<div className="statLabel">Prospect Mood</div>
<div className="statValue moodText">{sessionMood}</div>
</div>
</div>

<div className="xpWrap">
<div className="xpTop">
<div className="xpLabel">
Logged in as <b>{profile?.rep_name}</b> • Level <b>{profile?.level}</b>
</div>
<div className="xpHint">Progress to next level</div>
</div>
<div className="xpBar">
<div className="xpFill" style={{ width: `${xpPercent}%` }} />
</div>
</div>

<div className="sessionPanel">
<div className="sessionHeader">
<div>
<div className="sectionTitle">AI Prospect</div>
<div className="muted">
Voice-first hands-free roleplay loop
</div>
</div>

<button onClick={startSession} disabled={startingSession}>
{startingSession
  ? "Starting..."
  : session
  ? "Restart Session"
  : "Start Session"}
</button>
</div>

{session ? (
<div className="sessionBox">
<div className="personaRow">
<div className="avatarCenter">
<ProspectAvatar speaking={speaking} emotion={currentEmotion} />
</div>

<div>
<div className="personaText">
<b>Prospect persona:</b> {session?.persona}
</div>
</div>
</div>

<div
className={`micIndicator ${listening ? "active" : ""}`}
style={{
transform: `scale(${1 + micLevel * 0.35})`,
boxShadow: listening
? `0 0 ${18 + micLevel * 28}px rgba(59,130,246,${0.2 + micLevel * 0.45})`
: "none"
}}
>
<div className="micBars">
<span style={{ height: `${12 + micLevel * 26}px` }} />
<span style={{ height: `${18 + micLevel * 34}px` }} />
<span style={{ height: `${12 + micLevel * 26}px` }} />
</div>
</div>

  
<div className="replyBox">
<div className="replyLabel">
{listening ? "Listening" : speaking ? "Prospect" : "Conversation"}
</div>

<div className="replyText">
{listening
? (message || "Listening...")
: waitingForReply
? "Thinking..."
: (reply || "Prospect speaking")}
</div>
</div>

<div className="row" style={{ marginTop: 12 }}>
<button onClick={endAndGrade}>End Session & Grade</button>
</div>
</div>
) : (
<div className="emptyArena">
<div className="emptyTitle">
{startingSession ? "Starting session..." : "Ready to train"}
</div>
<div className="muted">
{startingSession
? "Building your prospect and turning on voice..."
: "Start a session to enter the voice loop."}
</div>
</div>
)}

{session ? (
<div className="sessionBox premium">

  
<div className="avatarStage">
<div className={`avatarHalo mood-${sessionMood}`} />
<div className="avatarCenter big">
<ProspectAvatar speaking={speaking} emotion={currentEmotion} />
</div>
</div>

<div classNa
  


me="personaPanel">
<Pill tone="blue">Prospect persona</Pill>
<div className="personaMain">{session?.persona || "AI prospect loaded"}</div>
<div className="personaSub">
Real-time objections, emotion shifts, and automatic voice loop.
</div>
</div>

<div className="coachPanel">
<div className="coachHeader">
<div className="sectionTitle">Live Coach</div>
<button
className="secondary small"
type="button"
onClick={() => setLiveCoachVisible((v) => !v)}
>
{liveCoachVisible ? "Hide" : "Show"}
</button>
</div>

{liveCoachVisible ? (
<div>
{liveCoachHints.length ? (
<div>
{liveCoachHints.map((hint, idx) => (
<Pill key={idx} tone={hint.tone}>{hint.label}</Pill>
))}
</div>
) : (
<div className="muted">You look clean right now. Keep going.</div>
)}
</div>
) : (
<div className="muted">Live coaching hidden.</div>
)}
</div>

<div className="replyBox premium">
<div className="replyHeader">
<div className="replyLabel">
{listening
? "Listening"
: waitingForReply
? "Thinking"
: speaking
? "Prospect"
: "Conversation"}
</div>

<div className={`signal ${listening ? "live" : waitingForReply ? "thinking" : speaking ? "speaking" : ""}`}>
<span />
<span />
<span />
</div>
</div>

<div className="replyText large">
{listening
? (message || "Listening...")
: waitingForReply
? "Thinking..."
: speaking
? (reply || "Prospect speaking...")
: (reply || "Ready for your next response.")}
</div>
</div>

<div className="row wrap" style={{ marginTop: 14 }}>
<button onClick={endAndGrade}>End Session & Grade</button>
<Pill tone="green">Hands-free loop active</Pill>
</div>
</div>
) : (
<div className="emptyArena">
<div className="emptyTitle">Ready to train</div>
<div className="muted">
Start a session to enter the voice loop. The app will listen, think, speak, and listen again automatically.
</div>
</div>
)}
</div>
</div>

{grade ? <Scorecard grade={grade} profile={profile} /> : null}
</div>

<div className="stack">
<div className="card sideCard">
<h3>Performance Deck</h3>
<p className="muted">What matters most during the run.</p>
<div style={{ marginTop: 10 }}>
<Pill tone="blue">Ask questions</Pill>
<Pill tone="amber">Find pain</Pill>
<Pill tone="green">Sound confident</Pill>
<Pill tone="red">Avoid rambling</Pill>
</div>
</div>

{profile?.is_manager === true ? (
<div className="card sideCard">
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
<option value="" disabled>Select…</option>
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
type="button"
>
Manager Dashboard
</button>
</div>

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
) : null}

<div className="card sideCard">
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

const globalCss = `
:root { color-scheme: dark; }

body {
margin: 0;
font-family: Inter, system-ui, sans-serif;
background:
radial-gradient(1200px 700px at 20% 10%, rgba(59,130,246,0.25), transparent 60%),
radial-gradient(1000px 600px at 90% 20%, rgba(34,197,94,0.18), transparent 55%),
linear-gradient(135deg, #08101f, #111827 45%, #0b1220);
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
backdrop-filter: blur(14px);
background: rgba(8, 16, 31, 0.58);
z-index: 50;
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
max-width: 920px;
margin: 60px auto;
padding: 0 24px;
}

.contentWide {
max-width: 1380px;
margin: 28px auto;
padding: 0 18px 30px;
display: grid;
grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.75fr);
gap: 18px;
}

.mainStack {
display: flex;
flex-direction: column;
gap: 18px;
}

@media (max-width: 1020px) {
.contentWide {
grid-template-columns: 1fr;
}
}

.card {
width: 100%;
background: rgba(255,255,255,0.06);
backdrop-filter: blur(14px);
border: 1px solid rgba(255,255,255,0.10);
border-radius: 22px;
padding: 20px;
box-shadow: 0 24px 60px rgba(0,0,0,0.35);
}

.sideCard {
border-radius: 18px;
}

.authCard {
max-width: 620px;
margin: 0 auto;
}

.heroCard {
overflow: hidden;
position: relative;
}

.heroCard::before {
content: "";
position: absolute;
inset: 0;
background:
radial-gradient(600px 240px at 10% 0%, rgba(59,130,246,0.15), transparent 60%),
radial-gradient(500px 220px at 90% 10%, rgba(34,197,94,0.12), transparent 55%);
pointer-events: none;
}

.stack {
display: flex;
flex-direction: column;
gap: 18px;
}

h2 { margin: 0; font-size: 34px; }
h3 { margin: 0; font-weight: 800; }
.title { margin-bottom: 6px; }

.muted {
opacity: 0.82;
font-size: 14px;
line-height: 1.45;
}

.heroBadge {
display: inline-flex;
align-items: center;
gap: 8px;
padding: 7px 11px;
border-radius: 999px;
background: rgba(59,130,246,0.14);
border: 1px solid rgba(59,130,246,0.22);
color: #cfe3ff;
font-size: 11px;
font-weight: 800;
letter-spacing: 0.12em;
text-transform: uppercase;
margin-bottom: 10px;
}

.headerRow {
display: flex;
align-items: flex-start;
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
border-radius: 14px;
font-weight: 800;
cursor: pointer;
transition: transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
box-shadow: 0 12px 28px rgba(37,99,235,0.28);
}

button:hover {
transform: translateY(-1px);
opacity: 0.97;
}

button:disabled {
opacity: 0.55;
cursor: not-allowed;
transform: none;
box-shadow: none;
}

button.secondary {
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.14);
box-shadow: none;
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

.statsRow {
display: grid;
grid-template-columns: repeat(4, minmax(0,1fr));
gap: 12px;
margin-top: 18px;
}

@media (max-width: 900px) {
.statsRow {
grid-template-columns: repeat(2, minmax(0,1fr));
}
}

.statBox {
padding: 14px;
border-radius: 16px;
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.10);
}

.statLabel {
font-size: 12px;
opacity: 0.7;
margin-bottom: 6px;
}

.statValue {
font-size: 24px;
font-weight: 800;
}

.moodText {
text-transform: capitalize;
font-size: 18px;
}

.xpWrap {
margin-top: 14px;
padding: 14px;
border-radius: 18px;
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

.sessionPanel {
margin-top: 18px;
padding: 16px;
border-radius: 18px;
border: 1px solid rgba(255,255,255,0.10);
background: rgba(255,255,255,0.03);
}

.sessionHeader {
display: flex;
justify-content: space-between;
align-items: center;
gap: 12px;
flex-wrap: wrap;
}

.sectionTitle {
font-size: 16px;
font-weight: 800;
}

.emptyArena {
margin-top: 14px;
padding: 18px;
border-radius: 18px;
border: 1px dashed rgba(255,255,255,0.18);
background: rgba(255,255,255,0.03);
}

.emptyTitle {
font-size: 18px;
font-weight: 800;
margin-bottom: 8px;
}

.sessionBox {
margin-top: 18px;
padding: 18px;
border-radius: 22px;
border: 1px solid rgba(255,255,255,0.10);
background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03));
}

.sessionBox.premium {
position: relative;
overflow: hidden;
}

.sessionBox.premium::before {
content: "";
position: absolute;
inset: 0;
background:
radial-gradient(500px 220px at 50% 0%, rgba(59,130,246,0.12), transparent 65%);
pointer-events: none;
}

.avatarStage {
position: relative;
display: flex;
justify-content: center;
align-items: center;
min-height: 320px;
margin-bottom: 10px;
}

.avatarHalo {
position: absolute;
width: 270px;
height: 270px;
border-radius: 999px;
filter: blur(24px);
opacity: 0.75;
transition: all 0.25s ease;
}

.avatarHalo.mood-listening {
background: radial-gradient(circle, rgba(59,130,246,0.24), transparent 65%);
animation: pulseHalo 1.2s infinite ease-in-out;
}

.avatarHalo.mood-thinking {
background: radial-gradient(circle, rgba(245,158,11,0.20), transparent 65%);
}

.avatarHalo.mood-speaking {
background: radial-gradient(circle, rgba(34,197,94,0.18), transparent 65%);
animation: speakHalo 0.8s infinite ease-in-out;
}

.avatarHalo.mood-idle,
.avatarHalo.mood-happy,
.avatarHalo.mood-confused,
.avatarHalo.mood-skeptical,
.avatarHalo.mood-annoyed {
background: radial-gradient(circle, rgba(255,255,255,0.10), transparent 70%);
}

.avatarCenter {
display: flex;
justify-content: center;
align-items: center;
min-width: 180px;
position: relative;
z-index: 2;
}

.avatarCenter.big img {
width: 260px;
max-width: 100%;
height: auto;
}

.personaPanel {
margin-top: 4px;
margin-bottom: 14px;
text-align: center;
}

.personaMain {
font-size: 24px;
font-weight: 800;
line-height: 1.15;
margin-top: 6px;
}

.personaSub {
margin-top: 8px;
font-size: 14px;
opacity: 0.72;
}

.coachPanel {
margin-top: 14px;
padding: 14px;
border-radius: 16px;
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.10);
}

.coachHeader {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 10px;
}

.replyBox {
margin-top: 14px;
padding: 16px;
border-radius: 18px;
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.10);
}

.replyBox.premium {
background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04));
}

.replyHeader {
display: flex;
justify-content: space-between;
align-items: center;
gap: 12px;
margin-bottom: 8px;
}

.replyLabel {
font-size: 12px;
opacity: 0.72;
letter-spacing: 0.08em;
text-transform: uppercase;
font-weight: 800;
}

.replyText {
font-size: 15px;
line-height: 1.5;
}

.replyText.large {
font-size: 22px;
line-height: 1.35;
font-weight: 600;
}

.signal {
display: inline-flex;
align-items: center;
gap: 4px;
}

.signal span {
width: 6px;
height: 6px;
border-radius: 999px;
background: rgba(255,255,255,0.25);
}

.signal.live span {
background: #60a5fa;
animation: equalize 1s infinite ease-in-out;
}

.signal.thinking span {
background: #f59e0b;
animation: thinkingBlink 1s infinite ease-in-out;
}

.signal.speaking span {
background: #22c55e;
animation: equalize 0.7s infinite ease-in-out;
}

.signal span:nth-child(2) { animation-delay: 0.12s; }
.signal span:nth-child(3) { animation-delay: 0.24s; }

.scoreTop {
display: grid;
grid-template-columns: minmax(260px, 0.9fr) minmax(320px, 1.2fr);
gap: 16px;
margin-top: 14px;
}

@media (max-width: 980px) {
.scoreTop {
grid-template-columns: 1fr;
}
}

.scoreHero,
.scoreBars,
.scoreTile {
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.10);
border-radius: 16px;
padding: 18px;
}

.scoreEyebrow {
font-size: 13px;
opacity: 0.8;
}

.scoreBig {
font-size: 58px;
font-weight: 900;
line-height: 1;
margin-top: 8px;
}

.scoreSub {
opacity: 0.72;
margin-top: 4px;
}

.scoreSummary {
margin-top: 10px;
font-size: 14px;
opacity: 0.92;
line-height: 1.35;
}

.scoreGrid {
display: grid;
grid-template-columns: repeat(3, minmax(0,1fr));
gap: 16px;
margin-top: 16px;
}

@media (max-width: 980px) {
.scoreGrid {
grid-template-columns: 1fr;
}
}

.rubricRow {
padding: 10px 12px;
border-radius: 12px;
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
margin-bottom: 10px;
}

.rubricTop {
display: flex;
justify-content: space-between;
gap: 10px;
}

.rubricNotes {
margin-top: 6px;
opacity: 0.85;
font-size: 13px;
line-height: 1.35;
}

.nextBestAction {
margin-top: 12px;
padding-top: 12px;
border-top: 1px solid rgba(255,255,255,0.10);
}

.rawBox {
margin-top: 14px;
background: rgba(0,0,0,0.25);
border: 1px solid rgba(255,255,255,0.10);
border-radius: 14px;
padding: 14px;
}

.rawPre {
white-space: pre-wrap;
word-break: break-word;
margin: 0;
font-size: 12px;
line-height: 1.35;
}

.lb {
display: flex;
flex-direction: column;
gap: 10px;
margin-top: 8px;
}

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

@keyframes pulseHalo {
0% { transform: scale(1); opacity: 0.6; }
50% { transform: scale(1.08); opacity: 0.95; }
100% { transform: scale(1); opacity: 0.6; }
}

@keyframes speakHalo {
0% { transform: scale(1); opacity: 0.55; }
50% { transform: scale(1.06); opacity: 0.9; }
100% { transform: scale(1); opacity: 0.55; }
}

@keyframes equalize {
0% { transform: translateY(0px); opacity: 0.5; }
50% { transform: translateY(-5px); opacity: 1; }
100% { transform: translateY(0px); opacity: 0.5; }
}

@keyframes thinkingBlink {
0% { opacity: 0.35; }
50% { opacity: 1; }
100% { opacity: 0.35; }
}

button:disabled {
opacity: 0.7;
cursor: not-allowed;
}

.emptyArena {
margin-top: 14px;
padding: 18px;
border-radius: 18px;
border: 1px dashed rgba(255,255,255,0.18);
background: rgba(255,255,255,0.03);
}

.emptyTitle {
font-size: 18px;
font-weight: 800;
margin-bottom: 8px;
}

.micIndicator {
margin: 14px auto;
width: 82px;
height: 82px;
border-radius: 999px;
display: flex;
align-items: center;
justify-content: center;
background: rgba(255,255,255,0.06);
border: 1px solid rgba(255,255,255,0.12);
transition: transform 0.08s linear, box-shadow 0.08s linear, background 0.2s ease;
}

.micIndicator.active {
background: radial-gradient(circle, rgba(59,130,246,0.28), rgba(59,130,246,0.08));
}

.micBars {
width: 34px;
height: 34px;
display: flex;
align-items: end;
justify-content: center;
gap: 4px;
}

.micBars span {
width: 7px;
border-radius: 999px;
background: linear-gradient(180deg, #93c5fd, #3b82f6);
display: block;
transition: height 0.08s linear;
}


/* 🔥 ACTIVE LISTENING STATE */
.micIndicator.active {
background: radial-gradient(circle, rgba(59,130,246,0.35), rgba(59,130,246,0.08));
box-shadow: 0 0 0 rgba(59,130,246,0.0);
animation: micPulse 1.2s infinite;
}

/* 🔥 PULSE ANIMATION */
@keyframes micPulse {
0% {
transform: scale(1);
box-shadow: 0 0 0 0 rgba(59,130,246,0.5);
}
50% {
transform: scale(1.08);
box-shadow: 0 0 20px 6px rgba(59,130,246,0.35);
}
100% {
transform: scale(1);
box-shadow: 0 0 0 0 rgba(59,130,246,0.0);
}
}


`;
