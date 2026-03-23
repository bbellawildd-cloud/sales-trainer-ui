export default function ProspectAvatar({ speaking, listening }) {
return (
<div
className={`avatar ${
speaking ? "speaking" : listening ? "listening" : "idle"
}`}
>
<img src="/prospect/idle.png" alt="avatar" />

<style jsx>{`
.avatar {
width: 260px;
display: flex;
justify-content: center;
align-items: center;
animation: float 3s ease-in-out infinite;
transition: transform 0.2s ease;
}

img {
width: 100%;
height: auto;
border-radius: 50%;
filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.3));
}

/* IDLE FLOAT */
@keyframes float {
0% { transform: translateY(0px); }
50% { transform: translateY(-6px); }
100% { transform: translateY(0px); }
}

/* SPEAKING = subtle bounce */
.speaking {
animation: speak 0.35s infinite ease-in-out;
}

@keyframes speak {
0% { transform: scale(1); }
50% { transform: scale(1.04); }
100% { transform: scale(1); }
}

/* LISTENING = pulse */
.listening {
animation: listen 1.2s infinite ease-in-out;
}

@keyframes listen {
0% { transform: scale(1); opacity: 1; }
50% { transform: scale(1.08); opacity: 0.85; }
100% { transform: scale(1); opacity: 1; }
}
`}</style>
</div>
);
}
