import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../',import.meta.url));
const timing = JSON.parse(await readFile(path.join(root,'out/narration-male-v1/timing-report.json'),'utf8'));
const result=[];
for(const segment of timing){
  const form=new FormData();
  form.append('audio',new Blob([await readFile(path.join(root,`out/narration-male-v1/${segment.id}.wav`))],{type:'audio/wav'}),'clip.wav');
  form.append('mode','reference');
  form.append('language','en');
  const response=await fetch('http://127.0.0.1:3900/transcribe',{method:'POST',body:form,signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw new Error(await response.text());
  const transcript=await response.json();
  result.push({id:segment.id,expected:segment.text,actual:transcript.text});
  console.log(segment.id,transcript.text);
}
await writeFile(path.join(root,'out/narration-male-v1/transcript-check.json'),JSON.stringify(result,null,2));
