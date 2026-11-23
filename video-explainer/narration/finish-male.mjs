import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root,'out/narration-male-v1');
const run = (command,args) => {
  const result = spawnSync(command,args,{cwd:root,stdio:'inherit'});
  if(result.status !== 0) throw new Error(`${command} failed`);
};
const render = (name,frames) => run(process.execPath,[
  'node_modules/@remotion/cli/remotion-cli.js','render','src/index.tsx','PcpExplainer',
  path.join(out,`patch-${name}.mp4`),`--frames=${frames}`,'--muted','--log=error',
]);
// Re-render only the corrected picture ranges; keep the verified full render intact.
if (!process.argv.includes('--assemble-only')) {
  render('hook','0-899');
  render('commands','2700-4499');
  render('closing','8100-8459');
}
const filters = [
  '[1:v]setpts=PTS-STARTPTS[v0]',
  '[0:v]trim=start_frame=900:end_frame=2700,setpts=PTS-STARTPTS[v1]',
  '[2:v]setpts=PTS-STARTPTS[v2]',
  '[0:v]trim=start_frame=4500:end_frame=8100,setpts=PTS-STARTPTS[v3]',
  '[3:v]setpts=PTS-STARTPTS[v4]',
  '[0:v]trim=start_frame=8460:end_frame=9000,setpts=PTS-STARTPTS[v5]',
  '[v0][v1][v2][v3][v4][v5]concat=n=6:v=1:a=0[video]',
  '[4:a]asplit=2[voice][control]',
  '[0:a]volume=0.25[bed]',
  '[bed][control]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[ducked]',
  '[ducked][voice]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.89:level=0,atrim=duration=300[audio]',
];
console.log('Assembling the five-minute narrated cut.');
run('ffmpeg',['-hide_banner','-loglevel','warning',
  '-i','out/pcp-explainer.mp4','-i',path.join(out,'patch-hook.mp4'),
  '-i',path.join(out,'patch-commands.mp4'),'-i',path.join(out,'patch-closing.mp4'),
  '-i','public/narration/pcp-male-v1.wav',
  '-filter_complex',filters.join(';'),'-map','[video]','-map','[audio]',
  '-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',
  '-c:a','aac','-b:a','192k','-ar','48000','-t','300','-movflags','+faststart',
  '-y','out/pcp-explainer-narrated-male-v1.mp4']);
console.log('Finished: out/pcp-explainer-narrated-male-v1.mp4');
