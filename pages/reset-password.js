import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ResetPassword() {

const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);

async function updatePassword() {
if (!password) return alert("Enter a new password");

setLoading(true);

const { error } = await supabase.auth.updateUser({
password
});

setLoading(false);

if (error) {
alert(error.message);
return;
}

alert("Password updated! You can now login.");
window.location.href = "/";
}

return (
<div style={{
minHeight:"100vh",
display:"flex",
alignItems:"center",
justifyContent:"center",
background:"#0f172a",
color:"white"
}}>
<div style={{
width:400,
padding:30,
background:"rgba(255,255,255,0.05)",
borderRadius:12
}}>
<h2>Reset Password</h2>

<input
type="password"
placeholder="New password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
style={{
width:"100%",
padding:12,
marginTop:10,
borderRadius:8
}}
/>

<button
onClick={updatePassword}
disabled={loading}
style={{
marginTop:15,
width:"100%",
padding:12
}}
>
{loading ? "Updating..." : "Update Password"}
</button>

</div>
</div>
);
}
