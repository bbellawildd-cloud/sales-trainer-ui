import { useState } from "react";

export default function Home() {
const [input, setInput] = useState("");
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(false);

// Your API URL from Render
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const sendMessage = async () => {
if (!input.trim()) return;

setLoading(true);

// Add your message to UI immediately
setMessages((prev) => [...prev, { from: "user", text: input }]);

const userText = input;
setInput("");

try {
const res = await fetch(`${API_URL}/chat`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ message: userText }),
});

const data = await res.json();

// Add AI response
setMessages((prev) => [...prev, { from: "ai", text: data.response }]);
} catch (err) {
setMessages((prev) => [
...prev,
{ from: "ai", text: "Error contacting server." },
]);
}

setLoading(false);
};

return (
<div style={{ padding: 20, fontFamily: "Arial" }}>
<h1>Sales Trainer</h1>

<div
style={{
border: "1px solid #ccc",
padding: 10,
height: 300,
overflowY: "auto",
marginBottom: 20,
}}
>
{messages.map((msg, i) => (
<div
key={i}
style={{
textAlign: msg.from === "user" ? "right" : "left",
marginBottom: 10,
}}
>
<strong>{msg.from === "user" ? "You" : "AI"}:</strong> {msg.text}
</div>
))}
{loading && <p>AI is typing...</p>}
</div>

<input
value={input}
onChange={(e) => setInput(e.target.value)}
placeholder="Type your pitch..."
style={{ width: "80%", padding: 8 }}
/>
<button onClick={sendMessage} style={{ padding: 8, marginLeft: 10 }}>
Send
</button>
</div>
);
}
