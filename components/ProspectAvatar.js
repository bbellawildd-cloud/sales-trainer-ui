import { useEffect, useRef, useState } from "react";

const EMOTIONS = [
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
const talkFrameIndex = useRef(0);

const safeEmotion = EMOTIONS.includes(emotion) ? emotion : "idle";

// Blink loop
useEffect(() => {

const blinkLoop = setInterval(() => {

if (speaking) return;

setFrame("blink");

setTimeout(() => {
setFrame(safeEmotion);
}, 150);

}, 4000);

return () => clearInterval(blinkLoop);

}, [safeEmotion, speaking]);



// Talking animation
useEffect(() => {

if (!speaking) {
setFrame(safeEmotion);
return;
}

const talkFrames = [
`${safeEmotion}-talk1`,
`${safeEmotion}-talk2`,
`${safeEmotion}-talk3`
];

const fallbackFrames = ["talk1","talk2","talk3"];

const interval = setInterval(() => {

talkFrameIndex.current++;

const index = talkFrameIndex.current % 3;

const preferred = talkFrames[index];
const fallback = fallbackFrames[index];

setFrame(preferred);

// fallback safety
const img = new Image();
img.src = `/prospect/${preferred}.png`;

img.onerror = () => {
setFrame(fallback);
};

},120);

return () => clearInterval(interval);

}, [speaking, safeEmotion]);



return (
<div className={`avatarContainer emotion-${safeEmotion}`}>
<img
src={`/prospect/${frame}.png`}
className={`avatar ${speaking ? "talking" : ""}`}
alt="prospect"
/>
</div>
);
}
