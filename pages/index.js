import { useState } from "react";

export default function Home() {
const [input, setInput] = useState("");

return (
<div style={{ padding: 40, fontFamily: "Arial" }}>
<h1>Sales Trainer UI</h1>
<input
value={input}
onChange={(e) => setInput(e.target.value)}
placeholder="Type something..."
style={{ padding: 10, fontSize: 18 }}
/>
<p>You typed: {input}</p>
</div>
);
}
