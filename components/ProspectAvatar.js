export default function ProspectAvatar({ speaking }) {
  return (
    <div className={'avatarAlive ${speaking ? "avatarSpeaking" : ""}'}>
      <img src="/idle.png" width={120} alt="avatar" className="avatarImg" />
   </div>
  );
}

