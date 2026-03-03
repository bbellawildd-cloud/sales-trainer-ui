import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ResetPasswordPage() {
const [loading, setLoading] = useState(true);
const [stage, setStage] = useState("checking"); // checking | ready | updated | error
const [errMsg, setErrMsg] = useState("");
const [password, setPassword] = useState("");
const [password2, setPassword2] = useState("");
const [saving, setSaving] = useState(false);

// When the user clicks the email link, Supabase redirects here with tokens in the URL.
// Supabase JS will pick up the session automatically. We just confirm we have a session.
useEffect(() => {
let mounted = true;

async function init() {
try {
// Give the client a moment to process URL tokens
const { data } = await supabase.auth.getSession();
const session = data?.session;

if (!mounted) return;

if (!session) {
setStage("error");
setErrMsg(
"No reset session found. Please click the reset link from your email again."
);
} else {
setStage("ready");
}
} catch (e) {
if (!mounted) return;
setStage("error");
setErrMsg(e?.message || "Something went wrong.");
} finally {
if (mounted) setLoading(false);
}
}

init();

return () => {
mounted = false;
};
}, []);

async function updatePassword() {
setErrMsg("");

if (!password || password.length < 8) {
setErrMsg("Password must be at least 8 characters.");
return;
}
if (password !== password2) {
setErrMsg("Passwords do not match.");
return;
}

try {
setSaving(true);

const { error } = await supabase.auth.updateUser({ password });
if (error) throw error;

setStage("updated");

// Optional: sign them out after update so they log in fresh
// await supabase.auth.signOut();
} catch (e) {
setErrMsg(e?.message || "Failed to update password.");
setStage("ready"); // keep them on form
} finally {
setSaving(false);
}
}

function goToLogin() {
window.location.href = "/";
}

return (
<div className="app">
<div className="content">
<div className="card">
<h2>Reset Password</h2>
<p className="muted">
{stage === "checking" && "Checking reset link…"}
{stage === "ready" && "Enter a new password for your account."}
{stage === "updated" && "Your password has been updated."}
{stage === "error" && "This reset link isn’t valid or expired."}
</p>

{loading ? (
<div className="muted" style={{ marginTop: 14 }}>
Loading…
</div>
) : stage === "error" ? (
<>
<div className="errorBox">{errMsg}</div>
<div className="row" style={{ marginTop: 12 }}>
<button onClick={goToLogin}>Back to Login</button>
</div>
</>
) : stage === "updated" ? (
<>
<div className="successBox">✅ Password updated successfully.</div>
<div className="row" style={{ marginTop: 12 }}>
<button onClick={goToLogin}>Go to Login</button>
</div>
</>
) : (
<>
{errMsg ? <div className="errorBox">{errMsg}</div> : null}

<div className="field">
<label>New password</label>
<input
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
placeholder="At least 8 characters"
/>
</div>

<div className="field">
<label>Confirm new password</label>
<input
type="password"
value={password2}
onChange={(e) => setPassword2(e.target.value)}
placeholder="Re-enter password"
/>
</div>

<div className="row wrap">
<button onClick={updatePassword} disabled={saving}>
{saving ? "Saving..." : "Update Password"}
</button>
<button className="secondary" onClick={goToLogin} type="button">
Back
</button>
</div>
</>
)}
</div>
</div>

<style jsx global>{globalCss}</style>
</div>
);
}

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

.content {
max-width: 900px;
margin: 60px auto;
padding: 0 24px;
}

.card {
width: 100%;
background: rgba(255,255,255,0.05);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.10);
border-radius: 16px;
padding: 22px;
box-shadow: 0 20px 50px rgba(0,0,0,0.35);
}

h2 { margin: 0; font-size: 26px; }
.muted { opacity: 0.8; font-size: 14px; line-height: 1.4; }

.field {
display: flex;
flex-direction: column;
gap: 6px;
margin: 12px 0;
}
.field label { font-size: 13px; opacity: 0.85; }

.row { display: flex; align-items: center; gap: 10px; }
.wrap { flex-wrap: wrap; }

button {
background: linear-gradient(135deg, #3b82f6, #2563eb);
border: none;
color: white;
padding: 10px 16px;
border-radius: 10px;
font-weight: 700;
cursor: pointer;
transition: 0.2s ease;
}
button:hover { transform: translateY(-1px); opacity: 0.96; }
button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

button.secondary {
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.14);
}

input {
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.15);
color: white;
padding: 10px 12px;
border-radius: 10px;
outline: none;
min-width: 260px;
}
input::placeholder { color: rgba(255,255,255,0.5); }

.errorBox {
margin-top: 12px;
padding: 10px 12px;
border-radius: 12px;
background: rgba(239,68,68,0.12);
border: 1px solid rgba(239,68,68,0.25);
color: rgba(255,255,255,0.95);
}
.successBox {
margin-top: 12px;
padding: 10px 12px;
border-radius: 12px;
background: rgba(34,197,94,0.12);
border: 1px solid rgba(34,197,94,0.22);
color: rgba(255,255,255,0.95);
}
`;
