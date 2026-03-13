import { useEffect, useState } from "react";

export default function ProspectAvatar({ speaking }) {

const talkFrames = ["talk1","talk2","talk3","talk2"];
const [frame, setFrame] = useState("idle");


// blink animation
useEffect(() => {

const blink = setInterval(() => {

setFrame("blink");

setTimeout(() => {
setFrame("idle");
},150);

},4000);

return () => clearInterval(blink);

},[]);


// talking animation
useEffect(() => {

if(!speaking) return;

let i = 0;

const talk = setInterval(() => {

setFrame(talkFrames[i % talkFrames.length]);

i++;

},120);

return () => clearInterval(talk);

},[speaking]);


return (

<div style={{width:140,height:140}}>

<img
src={`/prospect/${frame}.png`}
style={{
width:120,
borderRadius:16
}}
/>

</div>

);

}
