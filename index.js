import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Home() {
const [authUser, setAuthUser] = useState(null);

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [repName, setRepName] = useState("");
const [companyName, setCompanyName] = useState("");

const [profile, setProfile] = useState(null);

const [session, setSession] = useState(null);
const [message, setMessage] = useState("");
const [reply, setReply] = useState("");

const [grade, setGrade] = useState(null);
const [leaderboard, setLeaderboard] = useState([]);

const [industry, setIndustry] = useState("pest");
const [difficulty, setDifficulty] = useState(2);

useEffect(() => {
supabase.auth.getSession().then(({ data }) => setAuthUser(data.session?.user ?? null));

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

useEffect(() => {
if (authUser?.id) loadProfile(authUser.id);
}, [authUser]);

async function signUp() {
const { data, error } = await supabase.auth.signUp({ email, password });
if (error) return alert(error.message);
alert("Signed up. If email confirmation is on, check your email, then sign in.");
}

async function signIn() {
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) return alert(error.message);
setAuthUser(data.user);
}

async function signOut() {
await supabase.auth.signOut();
setAuthUser(null);
setProfile(null);
setSession(null);
setGrade(null);
setLeaderboard([]);
}

// Create company + profile (first-time setup)
async function createCompanyAndProfile() {
if (!authUser?.id) return;

if (!repName.trim() || !companyName.trim()) {
return alert("Enter rep name + company name");
}

// 1) create company
const { data: company, error: cErr } = await supabase
.from("companies")
.insert({ name: companyName.trim() })
.select("id, name")
.single();

if (cErr) return alert(cErr.message);

// 2) create profile
const { error: pErr } = await supabase.from("profiles").insert({
user_id: authUser.id,
company_id: company.id,
rep_name: repName.trim(),
is_manager: false
});

if (pErr) return alert(pErr.message);

await loadProfile(authUser.id);
}

async function startSession() {
if (!profile) return alert("Finish profile setup first.");

setGrade(null);
setReply("");

const res = await fetch(`${API_BASE}/api/session/start`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
userId: profile.user_id,
industry,
difficulty
})
});

const data = await res.json();
if (!res.ok) return alert(data.error || "Failed to start session");

setSession(data.session);
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

// refresh leaderboard
const lbRes = await fetch(`${API_BASE}/api/leaderboard?userId=${profile.user_id}`);
const lb = await lbRes.json();
if (lbRes.ok) setLeaderboard(lb.leaderboard || []);
}

if (!authUser) {
return (
<div style={{ padding: 40 }}>
<h2>AI Sales Trainer</h2>

<div style={{ maxWidth: 360 }}>
<input
placeholder="email"
value={email}
onChange={(e) => setEmail(e.target.value)}
style={{ width: "100%", padding: 10, marginBottom: 10 }}
/>
<input
placeholder="password"
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
style={{ width: "100%", padding: 10, marginBottom: 10 }}
/>

<button onClick={signIn} style={{ padding: 10, marginRight: 10 }}>
Sign In
</button>
<button onClick={signUp} style={{ padding: 10 }}>
Sign Up
</button>
</div>
</div>
);
}

if (authUser && !profile) {
return (
<div style={{ padding: 40 }}>
<h2>Finish setup</h2>
<p>We need your rep name + company name (creates your company).</p>

<input
placeholder="Your name (ex: Eli)"
value={repName}
onChange={(e) => setRepName(e.target.value)}
style={{ width: 360, padding: 10, marginBottom: 10 }}
/>
<br />
<input
placeholder="Company name (ex: Ode Solar Team)"
value={companyName}
onChange={(e) => setCompanyName(e.target.value)}
style={{ width: 360, padding: 10, marginBottom: 10 }}
/>
<br />
<button onClick={createCompanyAndProfile} style={{ padding: 10 }}>
Create Company + Profile
</button>

<div style={{ marginTop: 20 }}>
<button onClick={signOut} style={{ padding: 10 }}>
Sign Out
</button>
</div>
</div>
);
}

return (
<div style={{ padding: 40 }}>
<h2>AI Sales Trainer</h2>

<div style={{ marginBottom: 10 }}>
Logged in as <b>{profile.rep_name}</b> — Level <b>{profile.level}</b> ({profile.total_xp} XP)
<button onClick={signOut} style={{ marginLeft: 12, padding: 8 }}>
Sign Out
</button>
</div>

<div style={{ marginBottom: 20 }}>
<label style={{ marginRight: 8 }}>Industry:</label>
<select value={industry} onChange={(e) => setIndustry(e.target.value)}>
<option value="pest">Pest</option>
<option value="solar">Solar</option>
<option value="insurance">Insurance</option>
</select>

<label style={{ marginLeft: 16, marginRight: 8 }}>Difficulty:</label>
<select value={difficulty} onChange={(e) => setDifficulty(parseInt(e.target.value, 10))}>
<option value={1}>1</option>
<option value={2}>2</option>
<option value={3}>3</option>
<option value={4}>4</option>
<option value={5}>5</option>
</select>

<button onClick={startSession} style={{ marginLeft: 16, padding: 10 }}>
Start Session
</button>
</div>

{session && (
<div style={{ marginBottom: 20 }}>
<div style={{ marginBottom: 10 }}>Session: <code>{session.id}</code></div>

<input
placeholder="Say your pitch..."
value={message}
onChange={(e) => setMessage(e.target.value)}
style={{ width: 520, padding: 10 }}
/>
<button onClick={sendMessage} style={{ marginLeft: 10, padding: 10 }}>
Send
</button>

<div style={{ marginTop: 12 }}>
<b>Homeowner:</b>
<div style={{ marginTop: 6 }}>{reply}</div>
</div>

<button onClick={endAndGrade} style={{ marginTop: 16, padding: 10 }}>
End Session & Grade
</button>
</div>
)}

{grade && (
<div style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>
<h3>Scorecard</h3>
<pre style={{ background: "#f5f5f5", padding: 12 }}>
{JSON.stringify(grade, null, 2)}
</pre>
</div>
)}

<div style={{ marginTop: 30 }}>
<h3>Company Leaderboard</h3>
<ol>
{leaderboard.map((r, idx) => (
<li key={idx}>
{r.rep_name} — Level {r.level} ({r.total_xp} XP)
</li>
))}
</ol>
</div>
</div>
);
}
