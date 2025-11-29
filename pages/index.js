import { useState } from "react";

export default function Home() {
const [input, setInput] = useState("");
const [response, setResponse] = useState(null);
const [loading, setLoading] = useState(false);

async function sendMessage() {
if (!input.trim()) return;

setLoading(true);

const res = await fetch("https://sales-trainer-api.onrender.com/api/chat", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
message: input,
history: response?.history || [],
industry: "pest"
}),
});

const data = await res.json();

const newHistory = [
...(response?.history || []),
{ role: "user", content: input },
{ role: "assistant", content: data.reply }
];

setResponse({ ...data, history: newHistory });
setInput("");
setLoading(false);
}

return (
<div style={{ padding: 40 }}>
<h1>Sales Trainer UI</h1>

<input
value={input}
onChange={(e) => setInput(e.target.value)}
placeholder="Say something..."
style={{ padding: 10, width: 300 }}
/>

<button onClick={sendMessage} style={{ marginLeft: 10, padding: 10 }}>
{loading ? "Thinking..." : "Send"}
</button>

{response && (
<div style={{ marginTop: 30 }}>
<h2>AI Response:</h2>
<p>{response.reply}</p>

<h3>Persona:</h3>
<pre>{JSON.stringify(response.persona, null, 2)}</pre>

<h3>Score: {response.score}</h3>
<h3>XP Gained: +{response.xpDelta}</h3>

<h3>Feedback:</h3>
<p>{response.feedback}</p>

{response.done && (
<div style={{ marginTop: 20, padding: 15, background: "#eee" }}>
<h2>Conversation Ended</h2>
<p>This pitch is complete.</p>
</div>
)}
</div>
)}
</div>
);
}
