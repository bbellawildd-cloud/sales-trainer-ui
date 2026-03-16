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

function getBrowFile(emotion) {
switch (emotion) {
case "skeptical":
return "brows-skeptical.png";
case "annoyed":
return "brows-annoyed.png";
case "happy":
return "brows-happy.png";
case "confused":
case "thinking":
return "brows-confused.png";
case "surprised":
return "brows-surprised.png";
case "not_interested":
return "brows-idle.png";
default:
return "brows-idle.png";
}
}

function getContainerClass(emotion, speaking) {
return [
"avatarRig",
`emotion-${emotion}`,
speaking ? "isSpeaking" : ""
].join(" ");
}

export default function ProspectAvatar({ speaking, emotion = "idle" }) {
const safeEmotion = VALID_EMOTIONS.includes(emotion) ? emotion : "idle";

const [eyesClosed, setEyesClosed] = useState(false);
const [mouthFrame, setMouthFrame] = useState("mouth-idle.png");

useEffect(() => {
const blinkLoop = setInterval(() => {
setEyesClosed(true);
setTimeout(() => setEyesClosed(false), 130);
}, 3200);

return () => clearInterval(blinkLoop);
}, []);

useEffect(() => {
if (!speaking) {
setMouthFrame("mouth-idle.png");
return;
}

const frames = ["mouth-talk1.png", "mouth-talk2.png", "mouth-talk3.png", "mouth-talk2.png"];
let i = 0;

const talkLoop = setInterval(() => {
setMouthFrame(frames[i % frames.length]);
i += 1;
}, 90);

return () => clearInterval(talkLoop);
}, [speaking]);

return (
<div className={getContainerClass(safeEmotion, speaking)}>
<img src="/prospect/base.png" className="layer baseLayer" alt="prospect base" />
<img
src={eyesClosed ? "/prospect/eyes-closed.png" : "/prospect/eyes-open.png"}
className="layer eyesLayer"
alt="prospect eyes"
/>
<img
src={`/prospect/${getBrowFile(safeEmotion)}`}
className="layer browLayer"
alt="prospect brows"
/>
<img
src={`/prospect/${mouthFrame}`}
className="layer mouthLayer"
alt="prospect mouth"
/>
</div>
);
}
