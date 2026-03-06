mport { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function InvitePage() {
const router = useRouter();
const { code } = router.query;

const [loading, setLoading] = useState(true);
const [invite, setInvite] = useState(null);
const [authUser, setAuthUser] = useState(null);

const [repName, setRepName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [working, setWorking] = useState(false);

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
if (!code) return;

async function loadInvite() {
const { data, error } = await supabase
.from("invites")
.select("*")
.eq("code", code)
.single();

if (error || !data) {
alert("Invite not found or expired.");
router.push("/");
return;
}

setInvite(data);
setEmail(data.invited_email || "");
setLoading(false);
}

loadInvite();
}, [code, router]);

async function signUpRep() {
if (!email.trim() || !password.trim()) {
return alert("Enter email and password.");
}

setWorking(true);
try {
const { error } = await supabase.auth.signUp({
email: email.trim(),
password
});

if (error) return alert(error.message);

alert("Account created. Now sign in.");
} finally {
setWorking(false);
}
}

async function signInRep() {
if (!email.trim() || !password.trim()) {
return alert("Enter email and password.");
}

setWorking(true);
try {
const { data, error } = await supabase.auth.signInWithPassword({
email: email.trim(),
password
});

if (error) return alert(error.message);

setAuthUser(data.user);
} finally {
setWorking(false);
}
}

async function joinCompany() {
if (!authUser?.id) return alert("Sign in first.");
if (!invite) return alert("Invite missing.");
if (!repName.trim()) return alert("Enter your name.");

setWorking(true);
try {
const { data: existing } = await supabase
.from("profiles")
.select("user_id")
.eq("user_id", authUser.id)
.maybeSingle();

if (existing?.user_id) {
alert("You already have a profile. Sending you to the app.");
router.push("/");
return;
}

const { error: profileErr } = await supabase.from("profiles").insert({
user_id: authUser.id,
company_id: invite.company_id,
rep_name: repName.trim(),
total_xp: 0,
level: 1,
is_manager: false
});

if (profileErr) return alert(profileErr.message);

await supabase
.from("invites")
.update({ used_at: new Date().toISOString() })
.eq("code", invite.code);

alert("Joined company successfully.");
router.push("/");
} finally {
setWorking(false);
}
}

if (loading) {
return (
<div className="wrap">
<div className="card">
<h2>Loading invite...</h2>
</div>
<style jsx global>{styles}</style>
</div>
);
}

return (
<div className="wrap">
<div className="card">
<h2>Join Your Team</h2>
<p className="muted">
You were invited to join this company as a rep.
</p>

{!authUser ? (
<>
<div className="field">
<label>Email</label>
<input
value={email}
onChange={(e) => setEmail(e.target.value)}
placeholder="rep@company.com"
/>
</div>

<div className="field">
<label>Password</label>
<input
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
placeholder="Create or enter password"
/>
</div>

<div className="row">
<button onClick={signInRep} disabled={working}>
{working ? "Working..." : "Sign In"}
</button>
<button className="secondary" onClick={signUpRep} disabled={working}>
{working ? "Working..." : "Sign Up"}
</button>
</div>
</>
) : (
<>
<div className="field">
<label>Your Name</label>
<input
value={repName}
onChange={(e) => setRepName(e.target.value)}
placeholder="John Smith"
/>
</div>

<div className="row">
<button onClick={joinCompany} disabled={working}>
{working ? "Joining..." : "Join Company"}
</button>
</div>
</>
)}
</div>

<style jsx global>{styles}</style>
</div>
);
}

const styles = `
body {
margin: 0;
font-family: Inter, system-ui, sans-serif;
background: linear-gradient(135deg, #0f172a, #111827);
color: white;
}

* { box-sizing: border-box; }

.wrap {
min-height: 100vh;
display: grid;
place-items: center;
padding: 24px;
}

.card {
width: 100%;
max-width: 460px;
background: rgba(255,255,255,0.06);
border: 1px solid rgba(255,255,255,0.10);
border-radius: 16px;
padding: 24px;
backdrop-filter: blur(12px);
}

h2 {
margin: 0 0 10px 0;
}

.muted {
opacity: 0.8;
font-size: 14px;
line-height: 1.4;
margin-bottom: 14px;
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

input {
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.16);
color: white;
padding: 10px 12px;
border-radius: 12px;
outline: none;
width: 100%;
}

input::placeholder {
color: rgba(255,255,255,0.55);
}

.row {
display: flex;
gap: 10px;
flex-wrap: wrap;
margin-top: 14px;
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

button:disabled {
opacity: 0.55;
cursor: not-allowed;
}
`;
