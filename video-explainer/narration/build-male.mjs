import {readFile, writeFile, mkdir, open} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const timeline = JSON.parse(await readFile(new URL('./timeline-male-v1.json', import.meta.url), 'utf8'));
const cues = JSON.parse(await readFile(new URL('./screen-cues.json', import.meta.url), 'utf8'));
const out = path.join(root, 'out/narration-male-v1');
await mkdir(out, {recursive:true});
await mkdir(path.join(root, 'public/narration'), {recursive:true});
const clock = seconds => `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
await writeFile(new URL('./script-male-final.md', import.meta.url),
  '# PCP: Final Male Narration Script\n\nApproved original male voice. Five-minute timeline with visual reading pauses.\n\n' +
  timeline.segments.map(s => `## ${clock(s.start)} to ${clock(s.end)}\n\n${s.text}\n`).join('\n'));
const run = (cmd, args) => {
  const result = spawnSync(cmd, args, {encoding:'utf8', maxBuffer:10*1024*1024});
  if (result.status !== 0) throw new Error(`${cmd}: ${result.stderr}`);
  return result.stdout;
};
const report = [];
for (const segment of timeline.segments) {
  if (!/^[0-9]{2}[a-z]?$/.test(segment.id)) throw new Error('Invalid clip ID');
  const cue = cues.find(c => c.clips.includes(segment.id));
  if (!cue || segment.start < cue.start || segment.end > cue.end) {
    throw new Error(`Clip ${segment.id} is outside its matching visual cue`);
  }
  const raw = path.join(out, `${segment.id}-raw.wav`);
  const fitted = path.join(out, `${segment.id}.wav`);
  try { await readFile(raw); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const file = await open(raw, 'wx', 0o600);
    try {
    const response = await fetch('http://127.0.0.1:3900/v1/audio/speech', {
      method:'POST', headers:{'Content-Type':'application/json'},
      redirect:'error',
      body:JSON.stringify({model:timeline.model, voice:timeline.voice, speed:timeline.speed,
        input:segment.text, language:'en', response_format:'wav', seed:42}),
      signal:AbortSignal.timeout(300000),
    });
    if (!response.ok) throw new Error(await response.text());
    const wav = Buffer.from(await response.arrayBuffer());
    if (wav.length < 44 || wav.length > 60*1024*1024 ||
        wav.toString('ascii',0,4) !== 'RIFF' || wav.toString('ascii',8,12) !== 'WAVE') {
      throw new Error('VoiceStudio returned invalid WAV audio');
    }
    await file.writeFile(wav);
    } finally { await file.close(); }
  }
  const duration = Number(run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',raw]));
  const slot = segment.end - segment.start;
  const tempo = Math.max(1, duration / (slot - 0.15));
  if (tempo > 1.22) throw new Error(`Segment ${segment.id} needs a shorter script: ${duration}s for ${slot}s`);
  run('ffmpeg',['-v','error','-i',raw,'-af',`atempo=${tempo},loudnorm=I=-16:TP=-1.5:LRA=11`,'-ar','48000','-ac','1','-c:a','pcm_s16le','-y',fitted]);
  const actual = Number(run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',fitted]));
  if (actual > slot) throw new Error(`Segment ${segment.id} exceeds its slot`);
  report.push({...segment, duration:actual, tempo});
  console.log(`Voice ${segment.id}: ${actual.toFixed(2)}s at ${segment.start}s`);
}
const args = ['-v','error'];
for (const segment of report) args.push('-i',path.join(out,`${segment.id}.wav`));
const filters = report.map((s,i)=>`[${i}:a]adelay=${Math.round(s.start*1000)}:all=1[a${i}]`);
filters.push(report.map((_,i)=>`[a${i}]`).join('')+`amix=inputs=${report.length}:normalize=0,apad=whole_dur=${timeline.duration},atrim=duration=${timeline.duration}[voice]`);
args.push('-filter_complex',filters.join(';'),'-map','[voice]','-ar','48000','-c:a','pcm_s16le','-y',path.join(root,'public/narration/pcp-male-v1.wav'));
run('ffmpeg',args);
await writeFile(path.join(out,'timing-report.json'),JSON.stringify(report,null,2));
console.log('Narration assembled: 300 seconds.');
