import { useEffect, useState } from "react";

export default function ProspectAvatar({ speaking }) {
const talkFrames = ["talk1", "talk2", "talk3", "talk2"];
const [frame, setFrame] = useState("idle");

useEffect(() => {
const blink = setInterval(() => {
setFrame("blink");

setTimeout(() => {
setFrame("idle");
}, 150);
}, 4000);

return () => clearInterval(blink);
}, []);

useEffect(() => {
if (!speaking) {
setFrame("idle");
return;
}

let i = 0;

const talk = setInterval(() => {
setFrame(talkFrames[i % talkFrames.length]);
i += 1;
}, 120);

return () => clearInterval(talk);
}, [speaking]);

return (
<div className="avatarContainer">
<img
src={`/prospect/${frame}.png`}
className={`avatar ${speaking ? "talking" : ""}`}
alt="prospect"
/>
</div>
);
}

