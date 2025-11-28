mport { useState } from "react";

export default function Home() {
const [input, setInput] = useState("");
const [response, setResponse] = useState("");
const [loading, setLoading] = useState(false);

async function sendMessage() {
setLoading(true);

try {
const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/chat", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ message: input })
});

const data = await res.json();
setResponse(data.reply || "No response");
} catch (err) {
setResponse("Error contacting AI");
}

setLoading(false);
}

return (
<div style={{ padding: 30, fontFamily: "Arial" }}>
<h1>Sales Trainer</h1>

<input
placeholder="Say your pitch..."
value={input}
onChange={(e) => setInput(e.target.value)}
style={{ width: "300px", padding: 10, marginRight: 10 }}
/>
<button onClick={sendMessage} disabled={loading}>
{loading ? "Thinking..." : "Send"}
</button>

<div style={{ marginTop: 25 }}>
<h3>AI Response:</h3>
<p>{response}</p>
</div>
</div>
);
}
