import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function InviteJoin() {
const router = useRouter();
const { code } = router.query;

const [invite, setInvite] = useState(null);
const [repName, setRepName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);

useEffect(() => {
if (!code) return;
(async () => {
const { data, error } = await supabase
.from("invites")
.select("id, company_id, role, used_at, expires_at, code")
.eq("code", code)
.single();

if (error || !data) {
setInvite({ error: "Invalid invite link." });
return;
}
if (data.used_at) {
setInvite({ error: "This invite was already used." });
return;
}
if (data.expires_at && new Date(data.expires_at) < new Date()) {
setInvite({ error: "This invite expired." });
return;
}

setInvite(data);
})();
}, [code]);

async function joinTeam() {
if (!invite?.company_id) return;
if (!email || !password) return alert("Enter email + password");
setLoading(true);

// Sign up
const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
email,
password,
});

if (signUpErr) {
setLoading(false);
return alert(signUpErr.message);
}

const userId = signUpData?.user?.id;
if (!userId) {
setLoading(false);
return alert("Check your email to confirm, then log in and try again.");
}

// Create profile for this company
const { error: pErr } = await supabase.from("profiles").insert({
user_id: userId,
company_id: invite.company_id,
rep_name: repName || email,
role: invite.role || "rep",
total_xp: 0,
level: 1,
});

if (pErr) {
setLoading(false);
return alert(pErr.message);
}

// Mark invite used
await supabase
.from("invites")
.update({ used_at: new Date().toISOString() })
.eq("id", invite.id);

setLoading(false);
router.push("/");
}

if (!invite) return <div style={{ padding: 24 }}>Loading invite…</div>;
if (invite.error) return <div style={{ padding: 24 }}>{invite.error}</div>;

return (
<div style={{ padding: 24, maxWidth: 520 }}>
<h2>Join Team</h2>
<p>Invite code: <code>{invite.code}</code></p>

<input
placeholder="Your name"
value={repName}
onChange={(e) => setRepName(e.target.value)}
style={{ width: "100%", padding: 10, marginBottom: 10 }}
/>
<input
placeholder="Email"
value={email}
onChange={(e) => setEmail(e.target.value)}
style={{ width: "100%", padding: 10, marginBottom: 10 }}
/>
<input
placeholder="Password"
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
style={{ width: "100%", padding: 10, marginBottom: 10 }}
/>

<button
onClick={joinTeam}
disabled={loading}
style={{ width: "100%", padding: 12 }}
>
{loading ? "Joining..." : "Create account & join"}
</button>
</div>
);
}
