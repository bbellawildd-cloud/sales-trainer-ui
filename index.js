import { useState } from "react";
import { API_URL } from "../lib/api";

export default function Home() {
const [input, setInput] = useState("");
const [response, setResponse] = useState("");
const [loading, setLoading] = useState(false);

async function sendPrompt() {
if (!input.trim()) return;
setLoading(true);

try {
const res = await fetch(`${API_URL}/api/chat`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ message: input })
});

const data = await res.json();
setResponse(data.reply || "No response.");
} catch (err) {
console.error(err);
setResponse("Error contacting the server.");
}

setLoading(false);
}

return (
<div style={{ padding: "20px", maxWidth: "600px" }}>
<h1>Sales Trainer UI</h1>

<textarea
rows="4"
style={{ width: "100%", marginBottom: "10px" }}
placeholder="Type something..."
value={input}
onChange={(e) => setInput(e.target.value)}
/>

<button onClick={sendPrompt} disabled={loading}>
{loading ? "Thinking..." : "Send"}
</button>

<div style={{ marginTop: "20px", whiteSpace: "pre-wrap" }}>
<strong>Response:</strong>
<p>{response}</p>
</div>
</div>
);
}
