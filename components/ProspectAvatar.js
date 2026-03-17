export default function ProspectAvatar({ speaking }) {
  return (
    <div className={'avatarAlive ${speaking ? "avatarSpeaking" : ""}'}>
      <img src="/prospect/idle.png" width={120} alt="avatar" />
   </div>
  );
}

