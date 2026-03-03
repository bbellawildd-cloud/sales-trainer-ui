import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ResetPassword() {
const [ready, setReady] = useState(false);
const [pw1, setPw1] = useState("");
const [pw2, setPw2] = useState("");
const [saving, setSaving] = useState(false);

useEffect(() => {
supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(!!s));
return () => sub.subscription.unsubscribe();
}, []);

async function updatePassword() {
if (pw1.length < 8) return alert("Password must be at least 8 characters.");
if (pw1 !== pw2) return alert("Passwords do not match.");

setSaving(true);
const { error } = await supabase.auth.updateUser({ password: pw1 });
setSaving(false);

if (error) return alert(error.message);

alert("Password updated ✅");
window.location.href = "/";
}

return (
<div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
<div style={{ width: "100%", maxWidth: 420, padding: 20, borderRadius: 14 }}>
<h2>Reset password</h2>

{!ready ? (
<p>Open this page from the password reset email link.</p>
) : (
<>
<input
type="password"
placeholder="New password"
value={pw1}
onChange={(e) => setPw1(e.target.value)}
style={{ width: "100%", padding: 10, marginBottom: 10 }}
/>
<input
type="password"
placeholder="Confirm new password"
value={pw2}
onChange={(e) => setPw2(e.target.value)}
style={{ width: "100%", padding: 10, marginBottom: 10 }}
/>
<button onClick={updatePassword} disabled={saving} style={{ width: "100%" }}>
{saving ? "Saving..." : "Update password"}
</button>
</>
)}
</div>
</div>
);
}
