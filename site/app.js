import {Game} from './emulator.js';
import {Room} from './room.js';
import {NEUTRAL,parseRoomCode} from './protocol.js';
import {setupControls} from './controls.js';
const $=s=>document.querySelector(s);
const game=new Game();
let mode='lobby',room=null,busy=false,muted=false,remoteStream=null,lastCode=null,wakeLock,networkSettings={};
const controls=setupControls(input=>{if(mode==='guest')room?.setInput(input);else game.input(0,input);});
function status(text,kind=''){$('#status').textContent=text;$('#status').className=`status ${kind}`;}
function connection(text){$('#connection').textContent=text;}
function message(title,detail=''){$('#screen-message').hidden=false;$('#screen-status').textContent=title;$('#screen-detail').textContent=detail;}
function fail(error){status(error.message||error,'error');}
async function wake(){try{if(navigator.wakeLock&&!document.hidden)wakeLock=await navigator.wakeLock.request('screen');}catch{}}
function refreshAudio(){
  if(!game.ready||mode==='guest')return;
  $('#resume-audio').hidden=!game.audioBlocked||muted;
  $('#sound-button').textContent=game.audioBlocked?'Enable sound':muted?'Sound off':'Sound on';
  $('#sound-button').setAttribute('aria-pressed',String(muted));
}
game.onAudioStateChange=refreshAudio;
function streamToGuest(){
  if(!game.ready||!room?.accepted||mode!=='host')return;
  try{game.resumeAudio();room.stream(game.capture());room.broadcast('Player two connected. Choose VS MODE → VS START in the original game.');}catch(e){fail(e);room.broadcast(e.message);}
}
function makeRoom(){
  const instance=new Room({
    status:text=>{if(room===instance)status(text);},
    error:text=>{if(room!==instance)return;fail(text);connection('Connection needs attention');if(mode==='guest'){$('#retry-button').hidden=false;if(!remoteStream)message('Could not connect.',text);}},
    input:input=>{if(room===instance&&mode==='host')game.input(1,document.hidden||document.querySelector('dialog[open]')?NEUTRAL:input);},
    connected:()=>{
      if(room!==instance)return;
      connection('Two players connected');
      status(mode==='host'?'Your friend joined! Choose VS MODE → VS START.':'Connected. You are player two.','success');
      if(mode==='host'){if(!game.ready)room.broadcast('The host is loading Super Smash Bros.');streamToGuest();}
      else message('Room connected. Waiting for the game…','Keep the host’s game visible.');
    },
    stream:stream=>{
      if(room!==instance||mode!=='guest')return;
      remoteStream=stream;const video=$('#remote-video');video.srcObject=stream;video.muted=true;
      video.onplaying=()=>{$('#screen-message').hidden=true;};
      video.play().catch(()=>message('Tap to start the game picture.','Use the yellow button below.'));
      $('#resume-video').hidden=false;$('#sound-button').textContent='Enable sound';
    },
    mediaClosed:()=>{if(room===instance&&mode==='guest'){$('#retry-button').hidden=false;message('The game stream stopped.','Tap Retry to reconnect to the host.');}},
    disconnected:()=>{
      if(room!==instance)return;
      controls.clear();game.input(1,NEUTRAL);$('#latency').textContent='DISCONNECTED';
      if(mode==='host'){game.stopCapture();connection('Waiting for player two');status('Your friend left. They can rejoin with the same code.');}
      else{remoteStream=null;$('#remote-video').srcObject=null;$('#resume-video').hidden=true;$('#retry-button').hidden=false;connection('Disconnected');message('Your friend disconnected.','Tap Retry when the host is ready.');}
    },
    latency:ms=>{if(room===instance)$('#latency').textContent=`${ms} ms RTT`;},
  },networkSettings);
  room=instance;return instance;
}
async function launch(nextMode,code){
  if(busy)return;busy=true;mode=nextMode;
  for(const id of ['host-button','solo-button','join-button'])$(`#${id}`).disabled=true;
  document.body.classList.add('playing');$('#lobby').hidden=true;$('#play-area').hidden=false;
  $('#player-label').textContent=mode==='guest'?'PLAYER 2':'PLAYER 1';
  $('#emulator').hidden=mode==='guest';$('#remote-video').hidden=mode!=='guest';
  $('#retry-button').hidden=true;controls.enable(true);wake();
  try{
    if(mode!=='solo'){
      if(mode==='guest')lastCode=code;
      connection('Opening room…');message(mode==='host'?'Making room for two…':'Finding your friend…','Connecting to the room service.');
      const instance=makeRoom();const reserved=await instance.open(mode==='host',code);
      if(room!==instance)return;
      $('#room-label').textContent=`ROOM ${reserved}`;
      if(mode==='guest'){connection('Joining room…');return;}
      $('#invite-button').hidden=false;connection('Waiting for player two');status('Room ready. Tap Invite to send the link to your friend.');
    }else{$('#room-label').textContent='SOLO';connection('Solo warm-up');status('Press Start, then use the stick and A to choose a mode.');}
    message('Starting Super Smash Bros.…','The first N64 start can take a moment.');
    $('#screen-message').hidden=true;
    await game.start();game.resumeAudio();refreshAudio();streamToGuest();
    if(document.hidden)game.pause(true);
  }catch(e){
    fail(e);connection('Could not start');message('Could not start the game.',`${e.message} ${game.startPromise?'Use Leave, then try again.':''}`);
    const previous=room;room=null;previous?.close();
    if(mode==='guest')$('#retry-button').hidden=false;
  }finally{busy=false;for(const id of ['host-button','solo-button','join-button'])$(`#${id}`).disabled=false;}
}
$('#host-button').addEventListener('click',()=>launch('host'));
$('#solo-button').addEventListener('click',()=>launch('solo'));
$('#join-form').addEventListener('submit',e=>{e.preventDefault();const code=parseRoomCode($('#room-code').value);if(!code){fail('Enter the two-character room code or the full invite link.');$('#room-code').focus();return;}launch('guest',code);});
$('#retry-button').addEventListener('click',()=>{
  if(busy||mode!=='guest'||!lastCode)return;
  controls.clear();const previous=room;room=null;previous?.close();remoteStream=null;
  $('#remote-video').pause();$('#remote-video').srcObject=null;$('#resume-video').hidden=true;launch('guest',lastCode);
});
$('#invite-button').addEventListener('click',async()=>{
  if(!room)return;const url=new URL(location.href);url.search='';url.hash=new URLSearchParams({room:room.code}).toString();
  if(navigator.share&&matchMedia('(pointer:coarse)').matches){try{await navigator.share({title:'Smashbra · Join my match',url:url.href});return;}catch(e){if(e.name==='AbortError')return;}}
  try{await navigator.clipboard.writeText(url.href);status('Invite copied. Send it to your friend.','success');}catch{status(`Tell your friend to open this site and enter room ${room.code}.`);}
});
$('#leave-button').addEventListener('click',()=>{controls.clear();room?.close();game.release();game.stopCapture();wakeLock?.release();location.replace(location.pathname);});
async function enableVideo(){const video=$('#remote-video');video.muted=false;try{await video.play();muted=false;$('#resume-video').hidden=true;$('#sound-button').textContent='Sound on';$('#sound-button').setAttribute('aria-pressed','false');}catch{video.muted=true;fail('Tap again to enable playback.');}}
$('#resume-video').addEventListener('click',enableVideo);
$('#resume-audio').addEventListener('click',()=>game.resumeAudio());
$('#sound-button').addEventListener('click',()=>{
  if(mode==='guest'){
    if(!remoteStream){status('Sound is available when the game stream arrives.');return;}
    if($('#remote-video').muted){enableVideo();return;}
    $('#remote-video').muted=true;muted=true;$('#sound-button').textContent='Sound off';$('#sound-button').setAttribute('aria-pressed','true');
  }else{const blocked=game.audioBlocked;game.resumeAudio();muted=blocked?false:!muted;game.setMuted(muted);refreshAudio();if(mode==='host'&&muted)status('Game sound is muted for both players.');}
});
$('#fullscreen-button').addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement){await document.exitFullscreen();return;}
    if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();try{await screen.orientation?.lock?.('landscape');}catch{}}
    else status('On iPhone, rotate sideways. Safari’s Share → Add to Home Screen gives you more space.');
  }catch{status('Rotate sideways for a wider game view.');}
});
$('#help-button').addEventListener('click',()=>{controls.clear();game.release();$('#help-dialog').showModal();if(game.ready&&mode!=='guest'){game.pause(true);room?.broadcast('The host opened Help. The game is paused.');}});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$('#help-dialog').addEventListener('close',()=>{if(game.ready&&mode!=='guest'&&!document.hidden){game.pause(false);room?.broadcast('The host is back. Let’s play!');}});
$('#network-form').addEventListener('submit',e=>{
  e.preventDefault();const s=Object.fromEntries(new FormData(e.target));
  if(s.turn&&!/^turns?:[^\s]+$/.test(s.turn)){e.target.elements.turn.setCustomValidity('Use a URL starting with turn: or turns:.');e.target.elements.turn.reportValidity();return;}
  if(s.host&&/[\s/:]/.test(s.host)){e.target.elements.host.setCustomValidity('Enter only the server hostname.');e.target.elements.host.reportValidity();return;}
  networkSettings={...s,port:Number(s.port)||443};$('#help-dialog').close();status('Connection settings apply to the next room. Leave first if already playing.');
});
$('#network-form').addEventListener('input',e=>e.target.setCustomValidity?.(''));
document.addEventListener('visibilitychange',()=>{
  controls.clear();
  if(mode==='host'||mode==='solo'){
    const paused=document.hidden||!!document.querySelector('dialog[open]');game.pause(paused);
    room?.broadcast(paused?'The host switched away. The game is paused.':'The host is back. Let’s play!');
  }
  if(!document.hidden){wake();refreshAudio();}
});
window.addEventListener('pagehide',()=>{controls.clear();game.release();room?.close();game.stopCapture();wakeLock?.release();});
window.addEventListener('pageshow',e=>{if(e.persisted&&mode!=='lobby')location.reload();});
const invite=parseRoomCode(new URLSearchParams(location.hash.slice(1)).get('room')||'');
if(invite){$('#room-code').value=invite;status(`Your friend invited you to room ${invite}. Tap Join when ready.`);}
if(new URLSearchParams(location.search).has('debug'))window.smash={game,controls,get room(){return room;},get mode(){return mode;}};
