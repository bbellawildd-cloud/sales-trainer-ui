import { useEffect, useState } from "react";

export default function Home() {
const [input, setInput] = useState("");
const [reply, setReply] = useState("");
const [evaluation, setEvaluation] = useState(null);
const [leaderboard, setLeaderboard] = useState([]);

const sessionId = crypto.randomUUID();
const repId = "eli"; // later from auth
const companyId = "demo-company";

async function sendMessage() {
const res = await fetch("http://localhost:3000/api/chat", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
message: input,
sessionId,
repId,
companyId,
difficulty: 3
})
});

const data = await res.json();
setReply(data.reply);
setInput("");
}

async function endSession() {
const res = await fetch("http://localhost:3000/api/evaluate", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ sessionId })
});

const data = await res.json();
setEvaluation(data);

const lb = await fetch(
`http://localhost:3000/api/leaderboard/${companyId}`
);
setLeaderboard(await lb.json());
}

return (
<div style={{ padding: 40 }}>
<h2>AI Sales Trainer</h2>

<input
value={input}
onChange={(e) => setInput(e.target.value)}
/>
<button onClick={sendMessage}>Send</button>
<p>{reply}</p>

<button onClick={endSession}>
End Session & Grade
</button>

{evaluation && (
<>
<h3>Scorecard</h3>
<pre>{JSON.stringify(evaluation, null, 2)}</pre>
</>
)}

<h3>Leaderboard</h3>
<ul>
{leaderboard.map((r, i) => (
<li key={i}>
{r.repId} — Level {r.level} ({r.totalXp} XP)
</li>
))}
</ul>
</div>
);
}
