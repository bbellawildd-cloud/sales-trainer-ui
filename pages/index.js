import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

let recognition;

if (typeof window !== "undefined") {
const SpeechRecognition =
window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.lang = "en-US";
}
}

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Home() {
const [authUser, setAuthUser] = useState(null);
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [profile, setProfile] = useState(null);
const [session, setSession] = useState(null);
const [faceUrl, setFaceUrl] = useState("");
const [message, setMessage] = useState("");
const [reply, setReply] = useState("");
const [grade, setGrade] = useState(null);
const [industry, setIndustry] = useState("pest");
const [difficulty, setDifficulty] = useState(2);
const [listening, setListening] = useState(false);
const [speaking, setSpeaking] = useState(false);

function startListening() {
if (!recognition) {
alert("Speech recognition not supported.");
return;
}

setListening(true);
recognition.start();

recognition.onresult = (event) => {
const transcript = event.results?.[0]?.[0]?.transcript || "";
setMessage(transcript);
setListening(false);
};

recognition.onend = () => setListening(false);
recognition.onerror = () => setListening(false);
}

function speak(text) {
if (!text) return;
window.speechSynthesis.cancel();
const u = new SpeechSynthesisUtterance(text);
u.onstart = () => setSpeaking(true);
u.onend = () => setSpeaking(false);
window.speechSynthesis.speak(u);
}

useEffect(() => {
supabase.auth.getSession().then(({ data }) =>
setAuthUser(data.session?.user ?? null)
);

const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
setAuthUser(session?.user ?? null);
});

return () => sub.subscription.unsubscribe();
}, []);

async function loadProfile(userId) {
const { data } = await supabase
.from("profiles")
.select("*")
.eq("user_id", userId)
.single();

setProfile(data);
}

useEffect(() => {
if (authUser?.id) loadProfile(authUser.id);
}, [authUser]);

async function signIn() {
const { data, error } = await supabase.auth.signInWithPassword({
email,
password,
});
if (error) return alert(error.message);
setAuthUser(data.user);
}

async function signUp() {
const { error } = await supabase.auth.signUp({ email, password });
if (error) return alert(error.message);
alert("Signed up! Check email if confirmation enabled.");
}

async function signOut() {
await supabase.auth.signOut();
setAuthUser(null);
setProfile(null);
setSession(null);
setGrade(null);
setReply("");
}

async function startSession() {
const res = await fetch(`${API_BASE}/api/session/start`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
userId: profile.user_id,
industry,
difficulty,
}),
});

const data = await res.json();
if (!res.ok) return alert(data.error);

setSession(data.session);
setFaceUrl(data.faceUrl);
setGrade(null);
setReply("");
}

async function sendMessage() {
if (!session) return;

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
if (!res.ok) return alert(data.error);

setReply(data.reply);
speak(data.reply);
setMessage("");
}

async function endAndGrade() {
const res = await fetch(`${API_BASE}/api/evaluate`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
userId: profile.user_id,
sessionId: session.id,
}),
});

const data = await res.json();
if (!res.ok) return alert(data.error);

setGrade(data);
await loadProfile(profile.user_id);
}

if (!authUser) {
return (
<div style={{ padding: 40 }}>
<h2>AI Sales Trainer</h2>
<input
placeholder="email"
value={email}
onChange={(e) => setEmail(e.target.value)}
/>
<input
type="password"
placeholder="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
/>
<div>
<button onClick={signIn}>Sign In</button>
<button onClick={signUp}>Sign Up</button>
</div>
</div>
);
}

if (!profile) {
return <div style={{ padding: 40 }}>Loading profile...</div>;
}

return (
<div style={{ padding: 40 }}>
<h2>AI Sales Trainer</h2>

<div>
Logged in as <b>{profile.rep_name}</b> — Level{" "}
<b>{profile.level}</b> ({profile.total_xp} XP)
<button onClick={signOut} style={{ marginLeft: 10 }}>
Sign Out
</button>
</div>

<div style={{ marginTop: 20 }}>
<select
value={industry}
onChange={(e) => setIndustry(e.target.value)}
>
<option value="pest">Pest</option>
<option value="solar">Solar</option>
<option value="insurance">Insurance</option>
</select>

<select
value={difficulty}
onChange={(e) => setDifficulty(Number(e.target.value))}
>
<option value={1}>1</option>
<option value={2}>2</option>
<option value={3}>3</option>
<option value={4}>4</option>
<option value={5}>5</option>
</select>

<button onClick={startSession}>Start Session</button>
</div>

{session && (
<div style={{ marginTop: 20 }}>
<div>Session: {session.id}</div>

<input
value={message}
onChange={(e) => setMessage(e.target.value)}
placeholder="Say your pitch..."
/>

<button onClick={sendMessage}>Send</button>
<button onClick={startListening}>
{listening ? "Listening..." : "🎤 Talk"}
</button>
<button onClick={() => speak(reply)} disabled={!reply}>
🔊 Replay
</button>

<div style={{ marginTop: 10 }}>
<b>Prospect:</b> {reply}
</div>

<button onClick={endAndGrade} style={{ marginTop: 10 }}>
End Session & Grade
</button>
</div>
)}

{grade && (
<div style={{ marginTop: 20 }}>
<h3>Scorecard</h3>
<pre>{JSON.stringify(grade, null, 2)}</pre>
</div>
)}
</div>
);
}
