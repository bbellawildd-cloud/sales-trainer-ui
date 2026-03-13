import { useEffect, useRef, useState } from "react";

const VALID_EMOTIONS = [
"idle",
"skeptical",
"annoyed",
"happy",
"confused",
"thinking",
"not_interested",
"surprised"
];

export default function ProspectAvatar({ speaking, emotion = "idle" }) {
const [frame, setFrame] = useState("idle");
const blinkTimeoutRef = useRef(null);

const safeEmotion = VALID_EMOTIONS.includes(emotion) ? emotion : "idle";

useEffect(() => {
const blink = setInterval(() => {
if (speaking) return;

setFrame("blink");

if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);

blinkTimeoutRef.current = setTimeout(() => {
setFrame(safeEmotion);
}, 150);
}, 4000);

return () => {
clearInterval(blink);
if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
};
}, [safeEmotion, speaking]);

useEffect(() => {
if (!speaking) {
setFrame(safeEmotion);
return;
}

const talkFrames = ["talk1", "talk2", "talk3", "talk2"];
let i = 0;

const talk = setInterval(() => {
setFrame(talkFrames[i % talkFrames.length]);
i += 1;
}, 120);

return () => clearInterval(talk);
}, [speaking, safeEmotion]);

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
