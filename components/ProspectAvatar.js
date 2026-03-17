import { useEffect, useState } from "react";

export default function ProspectAvatar({ speaking, emotion = "idle" }) {
const [tilt, setTilt] = useState(0);

useEffect(() => {
const interval = setInterval(() => {
setTilt((Math.random() - 0.5) * 6); // subtle head movement
}, 2000);

return () => clearInterval(interval);
}, []);

return (
<div
className={`avatarAlive ${speaking ? "avatarSpeaking" : ""}`}
style={{ transform: `rotate(${tilt}deg)` }}
>
<img src="/idle.png" width={120} className="avatarImg" />
</div>
);
}
