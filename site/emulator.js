import {NEUTRAL} from './protocol.js';

export const ENGINE = 'EmulatorJS-4.2.3-parallel_n64';
export const ROM_URL = './roms/super-smash-bros.zip';
// Capture only the emulator's Web Audio output; no microphone or screen permission.
const audioTaps = new Map();
let patched = false;
function installAudioTap(onStateChange) {
  if (patched || !window.AudioNode) return;
  patched = true;
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(destination, ...args) {
    const result = connect.call(this, destination, ...args);
    if (destination === this.context.destination) {
      try {
        let tap = audioTaps.get(this.context);
        if (!tap) {
          tap = this.context.createMediaStreamDestination();
          audioTaps.set(this.context, tap);
          this.context.addEventListener('statechange', onStateChange);
        }
        connect.call(this, tap, args[0] || 0, 0);
      } catch (error) { console.warn('Audio stream capture unavailable', error); }
    }
    return result;
  };
}
export class Game {
  constructor() { this.ready = false; this.inputs = [{...NEUTRAL},{...NEUTRAL}]; this.startPromise = null; this.stream = null; }
  start() {
    if (this.startPromise) return this.startPromise;
    installAudioTap(() => this.onAudioStateChange?.());
    this.startPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('The emulator took too long to start. Reload and try again.')), 120000);
      Object.assign(window, {
        EJS_player:'#emulator', EJS_core:'parallel_n64', EJS_gameUrl:this.romUrl||ROM_URL,
        EJS_pathtodata:'./vendor/emulator/', EJS_gameName:'Super Smash Bros. (USA)',
        EJS_gameID:19990426, EJS_startOnLoaded:true, EJS_threads:false,
        EJS_defaultOptions:{'virtual-gamepad':'disabled','parallel-n64-screensize':'320x240'},
        EJS_language:'en-US', EJS_disableAutoLang:false, EJS_noAutoFocus:false,
        EJS_color:'#ffca5c', EJS_backgroundColor:'#121321', EJS_volume:.8,
        EJS_disableDatabases:true, EJS_disableLocalStorage:true,
        EJS_defaultControls:{0:{},1:{},2:{},3:{}}, EJS_VirtualGamepadSettings:[],
        EJS_Buttons:{playPause:false,restart:false,mute:false,settings:false,fullscreen:false,saveState:false,loadState:false,screenRecord:false,gamepad:false,cheat:false,volume:false,saveSavFiles:false,loadSavFiles:false,quickSave:false,quickLoad:false,screenshot:false,cacheManager:false,exitEmulation:false},
        EJS_onGameStart:() => {
          clearTimeout(timeout);
          this.emulator = window.EJS_emulator;
          this.manager = this.emulator.gameManager;
          this.manager.functions.setKeyboardEnabled(0);
          this.emulator.gamepad?.terminate?.();
          this.ready = true;
          this.onAudioStateChange?.();
          resolve();
        },
      });
      const script = document.createElement('script');
      script.src = './vendor/emulator/loader.js';
      script.onerror = () => { clearTimeout(timeout); reject(new Error('Could not load the emulator. Reload to try again.')); };
      document.head.append(script);
    });
    return this.startPromise;
  }
  input(player, input = NEUTRAL) {
    if (!this.ready) return;
    const previous=this.inputs[player];
    for(let button=0;button<16;button++) {
      if((previous.mask^input.mask)&(1<<button)) {
        // EmulatorJS N64: 0=A, 1=B, 11=R (grab), 12=Z (shield).
        // Our jump bit uses the N64 C-up axis at full magnitude.
        const index=button===13?23:button;
        this.manager.simulateInput(player,index,(input.mask&(1<<button))?(button===13?30000:1):0);
      }
    }
    if(previous.x!==input.x || previous.y!==input.y) {
      // Keep the bundled N64 core below its signed full-scale overflow edge.
      // 30000 still reaches full native stick travel; 32767 loses movement.
      for(const [positive,negative,value] of [[16,17,input.x],[18,19,input.y]]) {
        this.manager.simulateInput(player,value>=0?negative:positive,0);
        this.manager.simulateInput(player,value>=0?positive:negative,Math.round(Math.abs(value)*30000/32767));
      }
    }
    this.inputs[player]={...input};
  }
  release() { for(const player of [0,1])this.input(player,NEUTRAL); }
  get audioBlocked() { return [...audioTaps.keys()].some(context => context.state !== 'running' && context.state !== 'closed'); }
  resumeAudio() {
    // Mobile browsers may leave resume() pending until another user gesture.
    // Request audio activation, but never gate video or room startup on it.
    for (const context of audioTaps.keys()) {
      if (context.state === 'running' || context.state === 'closed') continue;
      try { context.resume().catch(() => {}); } catch {}
    }
  }
  setMuted(muted) { if (this.ready) this.emulator.setVolume(muted ? 0 : .8); }
  pause(value) { if (this.ready) { this.release(); this.manager.toggleMainLoop(value ? 0 : 1); } }
  capture() {
    if (this.stream?.getVideoTracks()[0]?.readyState === 'live') return this.stream;
    const canvas = this.displayCanvas || this.emulator?.canvas;
    if (!canvas?.captureStream) throw new Error('This browser cannot stream the game. Try hosting in a current Chrome or Safari browser.');
    this.stream = canvas.captureStream(60);
    for (const tap of audioTaps.values()) for (const track of tap.stream.getAudioTracks()) this.stream.addTrack(track.clone());
    this.stream.getVideoTracks().forEach(track => { track.contentHint = 'motion'; });
    return this.stream;
  }
  stopCapture() { this.stream?.getTracks().forEach(track => track.stop()); this.stream = null; }
}
