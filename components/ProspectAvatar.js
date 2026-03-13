import { useEffect, useState } from "react";

export default function ProspectAvatar({ speaking, emotion }) {

const [frame, setFrame] = useState("idle");

const talkFrames = ["talk1","talk2","talk3","talk2"];

useEffect(() => {

const blinkInterval = setInterval(() => {

setFrame("blink");

setTimeout(() => {
setFrame("idle");
},120);

},4000);

return () => clearInterval(blinkInterval);

}, []);


useEffect(() => {

if(!speaking) return;

let i = 0;

const talkInterval = setInterval(() => {

setFrame(talkFrames[i % talkFrames.length]);

i++;

},120);

return () => clearInterval(talkInterval);

},[speaking]);


useEffect(() => {

if(!speaking && emotion){

setFrame(emotion);

}

},[emotion, speaking]);


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
