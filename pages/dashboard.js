import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Dashboard() {
const [loading, setLoading] = useState(true);
const [profile, setProfile] = useState(null);
const [reps, setReps] = useState([]);

useEffect(() => {
(async () => {
const { data: sessionData } = await supabase.auth.getSession();
const user = sessionData.session?.user;
if (!user) {
window.location.href = "/";
return;
}

const { data: p, error: pErr } = await supabase
.from("profiles")
.select("user_id, company_id, rep_name, role")
.eq("user_id", user.id)
.single();

if (pErr || !p) {
window.location.href = "/";
return;
}

// Only managers can view dashboard
if (p.role !== "manager") {
window.location.href = "/";
return;
}

setProfile(p);

// Load reps in the same company
const { data: repList, error: rErr } = await supabase
.from("profiles")
.select("rep_name, role, total_xp, level")
.eq("company_id", p.company_id)
.order("level", { ascending: false })
.order("total_xp", { ascending: false });

if (!rErr) setReps(repList || []);

setLoading(false);
})();
}, []);

if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

return (
<div style={{ padding: 40 }}>
<h2>Manager Dashboard</h2>
<div style={{ marginBottom: 16 }}>
Logged in as <b>{profile.rep_name}</b> (manager)
</div>

<h3>Reps</h3>
<table cellPadding="10" style={{ borderCollapse: "collapse" }}>
<thead>
<tr>
<th align="left">Name</th>
<th align="left">Role</th>
<th align="left">Level</th>
<th align="left">XP</th>
</tr>
</thead>
<tbody>
{reps.map((r, idx) => (
<tr key={idx} style={{ borderTop: "1px solid #ddd" }}>
<td>{r.rep_name}</td>
<td>{r.role}</td>
<td>{r.level}</td>
<td>{r.total_xp}</td>
</tr>
))}
</tbody>
</table>

<div style={{ marginTop: 24, opacity: 0.7 }}>
Next: add “sessions this week”, “avg score”, and rep drilldowns.
</div>
</div>
);
}
