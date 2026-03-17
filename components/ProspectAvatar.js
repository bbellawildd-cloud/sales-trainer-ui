import { useEffect, useState } from "react";

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
const safeEmotion = VALID_EMOTIONS.includes(emotion) ? emotion : "idle";

useEffect(() => {
const blinkTimer = setInterval(() => {
if (speaking) return;

setFrame("blink");

setTimeout(() => {
setFrame(safeEmotion);
}, 140);
}, 3500);

return () => clearInterval(blinkTimer);
}, [safeEmotion, speaking]);

useEffect(() => {
if (!speaking) {
setFrame(safeEmotion);
return;
}

const talkFrames = ["talk1", "talk2", "talk3", "talk2"];
let i = 0;

const talkTimer = setInterval(() => {
setFrame(talkFrames[i % talkFrames.length]);
i += 1;
}, 110);

return () => clearInterval(talkTimer);
}, [speaking, safeEmotion]);

return (
<div
className={[
"avatarSwapWrap",
speaking ? "isSpeaking" : "",
`emotion-${safeEmotion}`
].join(" ")}
>
<img
src={`/prospect/${frame}.png`}
alt="Prospect"
className="avatarSwapImage"
/>
</div>
);
}

