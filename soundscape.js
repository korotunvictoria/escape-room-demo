// All audible events use actual locally hosted audio files through Howler + its spatial plugin.
globalThis.ManorSoundscape = class ManorSoundscape {
  constructor({Howl=globalThis.Howl,Howler=globalThis.Howler,onError=()=>{},assetRoot=globalThis.document?.body?.dataset.demo==='classic'?'../assets/audio/':'assets/audio/'}={}) {
    if(!Howl||!Howler)throw new Error('Howler.js did not load');
    this.Howler=Howler;this.enabled=true;this.active=false;this.hidden=false;this.room='hall';this.nextEvent=14;this.nextStep=0;this.lastListener=0;this.played=new Set();this.errors=[];this.loops=[];
    const load=(name,{volume=.3,loop=false,pos=null,...extra}={})=>{
      const extension=name==='rain'?'mp3':['heartbeat','fire','door','creak','creak-alt','rustle','stone','lock','chime'].includes(name)?'wav':'ogg';
      const src=[`${assetRoot}${name}.${extension}`];
      if(extension==='ogg'&&name!=='dungeon')src.push(`${assetRoot}${name}.wav`);
      if(name==='dungeon')src.push(`${assetRoot}rain.mp3`);
      const sound=new Howl({src,html5:globalThis.location?.protocol==='file:',volume,loop,preload:true,pool:5,...(pos?{pos,pannerAttr:{panningModel:'HRTF',distanceModel:'inverse',refDistance:1.8,rolloffFactor:1.5,maxDistance:28}}:{}),...extra,
        onloaderror:(_,error)=>{this.errors.push({name,error});onError(name,error);},
        onplayerror:()=>sound.once('unlock',()=>{if(this.active&&this.enabled)sound.play();})});
      return sound;
    };
    this.wood=Array.from({length:4},(_,i)=>load(`footstep-wood-${i}`,{volume:.3}));
    this.stone=Array.from({length:3},(_,i)=>load(`footstep-stone-${i}`,{volume:.3}));
    this.door=load('door',{volume:.55,pos:[0,1.5,0]});this.creak=load('creak',{volume:.28,pos:[-4,1,-2]});
    this.knock=load('knock',{volume:.35,pos:[4,1.5,-3]});this.rustle=load('rustle',{volume:.18,pos:[3,2,-5]});
    this.lock=load('lock',{volume:.24,pos:[0,1.5,0]});this.chimeSample=load('chime',{volume:.17,pos:[0,1.2,0]});
    this.heartbeatSample=load('heartbeat',{volume:.22});this.thunder=load('thunder',{volume:.12,pos:[-10,7,-20]});this.stoneSlide=load('stone',{volume:.45,pos:[0,0,-26]});
    this.air=load('dungeon',{volume:.1,loop:true});
    this.rainHall=load('rain',{volume:.22,loop:true,pos:[-3.65,2.7,-7]});
    this.rainLibrary=load('rain',{volume:.27,loop:true,pos:[-18,2.7,-3.8]});
    this.rainDining=load('rain',{volume:.27,loop:true,pos:[18,2.7,3.8]});
    this.fire=load('fire',{volume:.36,loop:true,pos:[-12,.8,-6]});
    this.clock=load('clock',{volume:.18,loop:true,pos:[-4.25,1.6,-6.58]});
    this.loops=[this.air,this.rainHall,this.rainLibrary,this.rainDining,this.fire];
    this.Howler.volume(.8);
  }
  start() {
    this.active=true;
    // Called synchronously by the start/resume button to satisfy browser audio policies.
    const ctx=this.Howler.ctx;if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
    this.Howler.mute(!this.enabled||this.hidden);
    for(const sound of this.loops)if(!sound.playing())sound.play();
    this.installReverb();
  }
  installReverb() {
    if(this.reverb||!this.Howler.ctx||!this.Howler.masterGain)return;
    const ctx=this.Howler.ctx,seconds=2.6,buffer=ctx.createBuffer(2,ctx.sampleRate*seconds,ctx.sampleRate);
    for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)*.45;}
    const convolver=ctx.createConvolver();convolver.buffer=buffer;const wet=ctx.createGain();wet.gain.value=.13;
    this.Howler.masterGain.connect(convolver);convolver.connect(wet);wet.connect(ctx.destination);this.reverb={convolver,wet};
  }
  setEnabled(enabled) {this.enabled=enabled;this.Howler.mute(!enabled||!this.active||this.hidden);if(enabled&&this.active)this.start();}
  pause(paused=true) {this.active=!paused;this.Howler.mute(paused||!this.enabled||this.hidden);if(!paused)this.start();}
  setHidden(hidden) {this.hidden=hidden;this.Howler.mute(hidden||!this.enabled||!this.active);}
  play(sample,position=null,volume=null,rate=null) {
    if(!this.enabled||!this.active||this.hidden)return;
    const id=sample.play();if(position)sample.pos(position.x,position.y??1,position.z,id);if(volume!==null)sample.volume(volume,id);if(rate!==null)sample.rate(rate,id);
  }
  footstep(position,room,now) {if(now<this.nextStep)return;this.nextStep=now+.48;const collection=room==='cellar'?this.stone:this.wood,sample=collection[Math.floor(Math.random()*collection.length)];this.play(sample,null,room==='cellar'?.31:.26,.92+Math.random()*.14);}
  openDoor(position) {this.play(this.door,position,.45,.8);}
  touch(position) {this.play(this.lock,position,.12,.88);}
  paper(position) {this.play(this.rustle,position,.23,.82);}
  chime(position) {this.play(this.chimeSample,position,.18,.78);}
  heartbeat() {this.play(this.heartbeatSample,null,.24,1.12);}
  unlock(id,position) {if(id==='stones')this.play(this.stoneSlide,position,.4,.85);else this.chime(position);}
  sync(solved) {if(solved.includes('clock')){if(!this.clock.playing()&&this.active)this.clock.play();}else this.clock.stop();}
  update(camera,forward,room,time) {
    this.room=room;
    if(time-this.lastListener>.045){this.Howler.pos(camera.x,camera.y,camera.z);this.Howler.orientation(forward.x,forward.y,forward.z,0,1,0);this.lastListener=time;}
    this.fire.volume(room==='library'?.36:.045);this.rainHall.volume(room==='hall'?.23:.045);this.rainLibrary.volume(room==='library'?.27:.025);this.rainDining.volume(room==='dining'?.27:.025);
    this.air.volume(room==='cellar'?.17:.07);
    if(time>this.nextEvent&&this.active&&!this.hidden){this.nextEvent=time+19+Math.random()*20;const choice=Math.random();
      if(choice<.35)this.play(this.creak,{x:camera.x+(Math.random()>.5?3:-3),y:.1,z:camera.z-2},.24,.7+Math.random()*.35);
      else if(choice<.65)this.play(this.knock,{x:camera.x+(Math.random()>.5?4:-4),y:2,z:camera.z-3},.22,.75);
      else if(choice<.9)this.play(this.rustle,{x:camera.x+2,y:2.5,z:camera.z+3},.18,.65);
      else this.play(this.thunder,{x:camera.x-8,y:8,z:camera.z-12},.12,.85);
    }
  }
  destroy() {for(const property of Object.values(this))if(property?.unload)property.unload();for(const sample of [...this.wood,...this.stone])sample.unload();if(this.reverb){this.Howler.masterGain.disconnect(this.reverb.convolver);this.reverb.convolver.disconnect();this.reverb.wet.disconnect();}}
}
