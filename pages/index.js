import { useState } from "react";

export default function Home() {
const [input, setInput] = useState("");
const [response, setResponse] = useState("");

async function handleSubmit(e) {
e.preventDefault();

const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ message: input }),
});

const data = await res.json();
setResponse(data.reply || "No response received");
}

return (
<div style={{ padding: "20px", fontFamily: "Arial" }}>
<h1>Sales Trainer</h1>

<form onSubmit={handleSubmit}>
<input
type="text"
value={input}
onChange={(e) => setInput(e.target.value)}
placeholder="Say something to your AI coach"
style={{ padding: "10px", width: "300px" }}
/>
<button
type="submit"
style={{ marginLeft: "10px", padding: "10px 20px" }}
>
Send
</button>
</form>

{response && (
<div style={{ marginTop: "20px", padding: "10px", background: "#eee" }}>
<strong>AI:</strong> {response}
</div>
)}
</div>
);
}
