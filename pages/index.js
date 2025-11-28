import { useState } from "react";

export default function Home() {
const [input, setInput] = useState("");
const [response, setResponse] = useState("");
const [loading, setLoading] = useState(false);

async function sendMessage() {
if (!input.trim()) return;

setLoading(true);
setResponse("");

try {
const res = await fetch("https://sales-trainer-api.onrender.com/api/chat", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({ message: input }),
});

const data = await res.json();
setResponse(data.reply || "No reply from server");
} catch (err) {
console.error(err);
setResponse("Error contacting server");
}

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

<button
onClick={sendMessage}
style={{ marginLeft: 10, padding: 10 }}
>
{loading ? "Thinking..." : "Send"}
</button>

{response && (
<div style={{ marginTop: 20 }}>
<strong>AI Response:</strong>
<p>{response}</p>
</div>
)}
</div>
);
}
