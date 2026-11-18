import Phaser from 'phaser';
import { gameEvents } from '../events';
import { SAFE_EXITS, type AreaId } from '../worldData';
import { isPointInPolygon, nearestWalkablePoint } from '../systems/interiorNavigation';
import { isSafeExternalUrl, supportConfig } from '../../config/support';

interface MeditationSeat {
  x:number;
  y:number;
  depth:'back'|'middle'|'front';
  occupied:boolean;
  npcId?:string;
  anchorOffsetX:number;
  anchorOffsetY:number;
}

const MEDITATION_SEATS:MeditationSeat[]=[
  // Calibrated to the actual woven-cushion centres in meditation-cave.png.
  // The rows spread outward toward the camera, so they are intentionally not
  // aligned as two perfectly vertical columns.
  {x:260,y:320,depth:'back',occupied:true,npcId:'meditator-elder',anchorOffsetX:0,anchorOffsetY:0},
  {x:241,y:369,depth:'middle',occupied:false,anchorOffsetX:0,anchorOffsetY:0},
  {x:229,y:426,depth:'front',occupied:false,anchorOffsetX:0,anchorOffsetY:0},
  {x:699,y:320,depth:'back',occupied:true,npcId:'meditator-adult',anchorOffsetX:0,anchorOffsetY:0},
  {x:722,y:369,depth:'middle',occupied:true,npcId:'meditator-novice',anchorOffsetX:0,anchorOffsetY:0},
  {x:734,y:426,depth:'front',occupied:false,anchorOffsetX:0,anchorOffsetY:0},
];

const MEDITATOR_HEIGHT:Record<MeditationSeat['depth'],number>={back:80,middle:88,front:96};
const MEDITATOR_ASPECT=879/1323;
const MEDITATOR_ORIGIN={x:.5,y:.88} as const;

const ROOM_NAMES:Record<AreaId,[string,string]>={
  gate:['山门迎客堂','Gate Reception'],oracle:['问道阁','Oracle Hall'],meditation:['静心洞','Meditation Cave'],
  taichi:['太极修炼场','Tai Chi Hall'],library:['藏经阁','Wisdom Library'],garden:['修行花园','Practice Garden'],
  wish:['祈福台','Wish Pavilion'],bamboo:['竹林秘境','Bamboo Grotto'],sanqing:['三清殿','Sanqing Hall'],wealth:['财神殿','God of Wealth Hall'],
};

export class InteriorScene extends Phaser.Scene{
  private area!:AreaId;
  private returnArea!:AreaId;
  private player!:Phaser.Physics.Arcade.Sprite;
  private cursors!:Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!:Record<'W'|'A'|'S'|'D'|'E',Phaser.Input.Keyboard.Key>;
  private target?:Phaser.Math.Vector2;
  private joystick={x:0,y:0};
  private nearFeature=false;
  private nearExit=false;
  private featureZone!:Phaser.GameObjects.Zone;
  private exitZone!:Phaser.GameObjects.Zone;
  private prompt!:Phaser.GameObjects.Text;
  private baseScale=new Phaser.Math.Vector2(1,1);
  private lastValid=new Phaser.Math.Vector2(480,545);
  private seated=false;
  private selectedCushion?:Phaser.Math.Vector2;
  private oracleDrawing=false;
  private fallenOracleStick?:Phaser.GameObjects.Rectangle;
  private carriedOracleStick?:Phaser.GameObjects.Rectangle;
  private oracleMasterZone?:Phaser.GameObjects.Zone;
  private pendingStickPickup=false;
  private pendingMasterConsult=false;
  private carryingOracleStick=false;
  private nearOracleStick=false;
  private nearOracleMaster=false;
  private wishPaperZones:Phaser.GameObjects.Zone[]=[];
  private wishTreeZone?:Phaser.GameObjects.Zone;
  private carriedWishPaper?:Phaser.GameObjects.Rectangle;
  private carryingWishPaper=false;
  private nearWishPaper=false;
  private nearWishTree=false;
  private pendingWishPickup=false;
  private pendingWishTree=false;

  constructor(){super('InteriorScene')}
  init(data:{id:AreaId;returnArea?:AreaId}){this.area=data.id;this.returnArea=data.returnArea??data.id}
  preload(){
    if(!this.textures.exists('novice-art'))this.load.image('novice-art','./assets/characters/novice.png');
    if(!this.textures.exists('interiors-a'))this.load.image('interiors-a','./assets/interiors/interiors-atlas-a.webp');
    if(!this.textures.exists('interiors-b'))this.load.image('interiors-b','./assets/interiors/interiors-atlas-b.webp');
    if(!this.textures.exists('npc-oracleMaster'))this.load.image('npc-oracleMaster','./assets/characters/oracle-master.png');
    if(!this.textures.exists('meditating-npc'))this.load.image('meditating-npc','./assets/characters/meditating-npc.webp');
    if(!this.textures.exists('hall-sanqing'))this.load.image('hall-sanqing','./assets/interiors/sanqing-hall.webp');
    if(!this.textures.exists('hall-wealth'))this.load.image('hall-wealth','./assets/interiors/wealth-hall.webp');
    if(!this.textures.exists('meditation-cave'))this.load.image('meditation-cave','./assets/interiors/meditation-cave.png');
  }

  create(){
    this.physics.world.setBounds(80,100,800,500);
    this.drawRoom();
    // Interior art uses a closer camera scale than the mountain map. Keep a
    // separate, larger character presentation so the novice matches desks,
    // railings and doorways instead of looking miniature.
    this.player=this.physics.add.sprite(480,545,'novice-art').setDisplaySize(78,112).setCollideWorldBounds(true).setDepth(20);
    this.baseScale.set(this.player.scaleX,this.player.scaleY);
    this.player.body!.setSize(48,34).setOffset(39,126);
    this.cursors=this.input.keyboard!.createCursorKeys();
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,E') as typeof this.keys;
    this.keys.E.on('down',()=>this.activate());
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{const target=nearestWalkablePoint({x:p.worldX,y:p.worldY});this.target=new Phaser.Math.Vector2(target.x,target.y)});
    const joy=((event:CustomEvent<{x:number;y:number}>)=>{this.joystick=event.detail;this.target=undefined}) as EventListener;
    window.addEventListener('cloud-tao-joystick',joy);
    const offActivate=gameEvents.on('activateArea',()=>this.activate());
    const offSeat=gameEvents.on('meditationSeat',({active})=>{if(!active)this.standUp()});
    const offWishHung=gameEvents.on('wishHung',({text})=>{if(this.area==='wish')this.addWishToTree(text)});
    const offWealthBlessing=gameEvents.on('wealthBlessing',({message})=>{if(this.area==='wealth')this.playWealthBlessing(message)});
    this.events.once('shutdown',()=>{window.removeEventListener('cloud-tao-joystick',joy);offActivate();offSeat();offWishHung();offWealthBlessing();gameEvents.emit('nearby',{id:this.area,active:false})});
    this.cameras.main.setBounds(0,0,960,640);
    const fitCamera=()=>{
      const zoom=Math.min(this.scale.width/960,this.scale.height/640);
      const width=960*zoom,height=640*zoom;
      this.cameras.main.setViewport((this.scale.width-width)/2,(this.scale.height-height)/2,width,height).setZoom(zoom).centerOn(480,320);
    };
    fitCamera();this.scale.on('resize',fitCamera);this.events.once('shutdown',()=>this.scale.off('resize',fitCamera));
  }

  private drawRoom(){
    const zh=(localStorage.getItem('i18nextLng')||navigator.language).startsWith('zh');
    const dedicated=this.area==='sanqing'||this.area==='wealth'||this.area==='meditation';
    const first=['gate','oracle','meditation','taichi'].includes(this.area);
    const order:AreaId[]=first?['gate','oracle','meditation','taichi']:['library','garden','wish','bamboo'];
    const index=order.indexOf(this.area),column=index%2,row=Math.floor(index/2);
    const atlasKey=first?'interiors-a':'interiors-b',frameName=`room-${this.area}`;
    if(dedicated){
      const textureKey=this.area==='meditation'?'meditation-cave':`hall-${this.area}`;
      this.add.image(0,0,textureKey).setOrigin(0).setDisplaySize(960,640).setDepth(-10);
    }else{
      const texture=this.textures.get(atlasKey);
      if(!texture.has(frameName))texture.add(frameName,0,column*724,row*543,724,543);
      this.add.image(0,0,atlasKey,frameName).setOrigin(0).setDisplaySize(960,640).setDepth(-10);
    }
    const overlay=this.add.graphics();
    overlay.fillStyle(0x202d2a,.68).fillRoundedRect(332,18,296,48,6);
    overlay.lineStyle(2,0xc8a46a,.8).strokeRoundedRect(332,18,296,48,6);
    overlay.fillStyle(0x202d2a,.58).fillRoundedRect(355,584,250,38,5);
    this.add.text(480,42,zh?ROOM_NAMES[this.area][0]:ROOM_NAMES[this.area][1],{fontFamily:'serif',fontSize:'23px',color:'#f1ebdd',stroke:'#202d2a',strokeThickness:2}).setOrigin(.5).setDepth(5);
    this.add.text(480,603,zh?'出口 · 按 E 返回山中':'EXIT · Press E to return',{fontFamily:'serif',fontSize:'14px',color:'#f1ebdd'}).setOrigin(.5).setDepth(5);
    this.featureZone=this.add.zone(480,310,260,100).setInteractive({useHandCursor:true});
    this.exitZone=this.add.zone(480,585,190,95).setInteractive({useHandCursor:true});
    if(this.area!=='meditation'&&this.area!=='oracle'&&this.area!=='wish')this.featureZone.on('pointerdown',()=>gameEvents.emit('enterArea',{id:this.area}));
    this.exitZone.on('pointerdown',()=>this.leave());
    this.prompt=this.add.text(480,325,'',{fontFamily:'serif',fontSize:'16px',color:'#f1ebdd',backgroundColor:'#202d2add',padding:{x:12,y:7}}).setOrigin(.5).setDepth(30).setVisible(false);
    if(this.area==='meditation'){this.createMeditationCushions();this.createMeditatingNpcs()}
    if(this.area==='oracle'){this.createOracleMaster();this.createOracleCylinder()}
    if(this.area==='wish')this.createWishInteractions();
    if(this.area==='sanqing')this.createSanqingHotspots();
    if(this.area==='wealth')this.createWealthInteractions();
    if(this.area==='library')this.createLibraryBookHotspot();
  }

  private createLibraryBookHotspot(){
    const zh=(localStorage.getItem('i18nextLng')||navigator.language).startsWith('zh');
    // Bind the Amazon link to the real stack of books beside the desk, rather
    // than the ladder/empty shelf on the far left.
    const x=320,y=258;
    const glow=this.add.ellipse(x,y,86,48,0xf4d889,.13).setStrokeStyle(2,0xf4d889,.72).setDepth(11);
    const hint=this.add.text(x,y+42,zh?'点击典籍 · 查看本书':'CLICK THE BOOK · VIEW ON AMAZON',{fontFamily:'serif',fontSize:zh?'13px':'11px',color:'#f4d889',backgroundColor:'#202d2acc',padding:{x:10,y:6}}).setOrigin(.5).setDepth(30);
    const zone=this.add.zone(x,y,105,76).setInteractive({useHandCursor:true}).setDepth(20);
    zone.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{pointer.event.stopPropagation();if(isSafeExternalUrl(supportConfig.amazonBookUrl))window.open(supportConfig.amazonBookUrl,'_blank','noopener,noreferrer')});
    zone.on('pointerover',()=>{glow.setScale(1.1);glow.setAlpha(1);hint.setColor('#fff1b8')});
    zone.on('pointerout',()=>{glow.setScale(1);glow.setAlpha(.82);hint.setColor('#f4d889')});
    if(localStorage.getItem('cloud-tao-motion')!=='reduced'){this.tweens.add({targets:glow,scaleX:1.12,scaleY:1.12,alpha:{from:.48,to:1},duration:1200,yoyo:true,repeat:-1,ease:'Sine.InOut'});this.tweens.add({targets:hint,alpha:{from:.62,to:1},duration:1400,yoyo:true,repeat:-1})}
  }

  private createWealthInteractions(){
    const cushion=this.add.container(480,382).setDepth(6);
    const art=this.add.graphics();
    art.fillStyle(0x202d2a,.32).fillEllipse(0,14,126,38);
    art.fillStyle(0x6f382c,1).fillEllipse(0,5,116,44);
    art.lineStyle(4,0xd0a25f,1).strokeEllipse(0,1,116,43);
    art.fillStyle(0xa8583e,1).fillEllipse(0,-3,106,38);
    art.lineStyle(2,0x6d352b,.9).strokeEllipse(0,-3,84,27);
    art.fillStyle(0xc78050,.75).fillEllipse(0,-5,66,20);
    art.lineStyle(1,0xe0bd7a,.8);
    for(let index=0;index<12;index++){
      const angle=(Math.PI*2*index)/12;art.lineBetween(Math.cos(angle)*34,Math.sin(angle)*10-4,Math.cos(angle)*50,Math.sin(angle)*17-3);
    }
    art.fillStyle(0xd7b06a,1).fillCircle(0,-4,4);
    const tassels=this.add.text(0,24,'╱╲   ╱╲   ╱╲',{fontFamily:'serif',fontSize:'12px',color:'#d9b66f'}).setOrigin(.5);
    cushion.add([art,tassels]);
    const zone=this.add.zone(480,382,150,78).setInteractive({useHandCursor:true}).setDepth(8);
    zone.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{pointer.event.stopPropagation();const point=nearestWalkablePoint({x:480,y:438});this.target=new Phaser.Math.Vector2(point.x,point.y);this.tweens.add({targets:cushion,scaleX:.94,scaleY:.94,duration:180,yoyo:true});window.setTimeout(()=>gameEvents.emit('enterArea',{id:'wealth'}),520)});
  }

  private playWealthBlessing(message:string){
    const smoke=this.add.text(480,300,'〰\n 〰\n  │',{fontFamily:'serif',fontSize:'25px',align:'center',color:'#f1ebdd'}).setOrigin(.5,1).setDepth(32).setAlpha(0);
    this.tweens.add({targets:smoke,y:245,alpha:{from:0,to:.85},duration:900,hold:700,yoyo:true,onComplete:()=>smoke.destroy()});
    for(let index=0;index<24;index++){
      const glow=this.add.text(480,330,index%4===0?'◆':'✦',{fontSize:`${Phaser.Math.Between(10,22)}px`,color:index%3===0?'#f1ebdd':'#e7b957'}).setOrigin(.5).setDepth(33).setAlpha(0);
      this.tweens.add({targets:glow,x:480+Phaser.Math.Between(-210,210),y:330+Phaser.Math.Between(-150,120),alpha:{from:0,to:1},scale:{from:.2,to:1.2},duration:Phaser.Math.Between(700,1300),yoyo:true,onComplete:()=>glow.destroy()});
    }
    const text=this.add.text(480,385,message,{fontFamily:'serif',fontSize:'19px',color:'#f4d889',backgroundColor:'#202d2add',padding:{x:18,y:10}}).setOrigin(.5).setDepth(35).setAlpha(0);
    this.tweens.add({targets:text,y:365,alpha:1,duration:650,hold:2400,yoyo:true,onComplete:()=>text.destroy()});
  }

  private createSanqingHotspots(){
    for(const x of [300,480,660]){
      const hotspot=this.add.zone(x,205,155,215).setInteractive({useHandCursor:true}).setDepth(8);
      hotspot.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{pointer.event.stopPropagation();gameEvents.emit('enterArea',{id:'sanqing'})});
    }
  }

  private createWishInteractions(){
    const zh=(localStorage.getItem('i18nextLng')||navigator.language).startsWith('zh');
    for(const x of [178,782]){
      const zone=this.add.zone(x,315,78,175).setInteractive({useHandCursor:true}).setDepth(8);this.wishPaperZones.push(zone);
      zone.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{pointer.event.stopPropagation();if(this.carryingWishPaper){this.prompt.setVisible(true).setText(zh?'手中已有一张祈福纸，请先挂到树上':'You already have a wish paper. Hang it on the tree first');return}const point=nearestWalkablePoint({x:x<480?235:725,y:365});this.target=new Phaser.Math.Vector2(point.x,point.y);this.pendingWishPickup=true;this.pendingWishTree=false});
    }
    this.wishTreeZone=this.add.zone(480,245,300,250).setInteractive({useHandCursor:true}).setDepth(7);
    this.wishTreeZone.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{pointer.event.stopPropagation();if(!this.carryingWishPaper){this.prompt.setVisible(true).setText(zh?'请先从左右纸签架取一张祈福纸':'Take a wish paper from either rack first');return}const point=nearestWalkablePoint({x:480,y:375});this.target=new Phaser.Math.Vector2(point.x,point.y);this.pendingWishTree=true;this.pendingWishPickup=false});
  }

  private pickUpWishPaper(){
    if(this.carryingWishPaper)return;this.carryingWishPaper=true;this.pendingWishPickup=false;
    this.carriedWishPaper=this.add.rectangle(this.player.x+20,this.player.y-26,12,30,0xe3c778).setStrokeStyle(1,0x8b5738).setAngle(10).setDepth(26);
    this.prompt.setVisible(false);this.target=undefined;this.player.setVelocity(0);
    gameEvents.emit('enterArea',{id:'wish'});
  }

  private beginWishWriting(){
    if(!this.carryingWishPaper)return;this.pendingWishTree=false;this.carryingWishPaper=false;this.carriedWishPaper?.destroy();this.carriedWishPaper=undefined;this.target=undefined;this.player.setVelocity(0);gameEvents.emit('enterArea',{id:'wish'});
  }

  private addWishToTree(text:string){
    const positions=[[390,210],[430,175],[520,185],[565,225],[470,235]];const index=Math.abs(text.split('').reduce((sum,char)=>sum+char.charCodeAt(0),0))%positions.length;const[x,y]=positions[index];
    this.carryingWishPaper=false;this.carriedWishPaper?.destroy();this.carriedWishPaper=undefined;
    const paper=this.add.rectangle(this.player.x,this.player.y-32,10,30,0xe3c778).setStrokeStyle(1,0x8b5738).setDepth(32);
    this.tweens.add({targets:paper,x,y,angle:index%2?6:-6,duration:1000,ease:'Sine.Out',onComplete:()=>{
      paper.setDepth(9);this.tweens.add({targets:paper,angle:paper.angle+5,duration:1800,yoyo:true,repeat:-1,ease:'Sine.InOut'});
    }});
    for(let spark=0;spark<18;spark++){
      const star=this.add.text(x,y,'✦',{fontSize:`${Phaser.Math.Between(10,20)}px`,color:spark%3===0?'#f1ebdd':'#d9b66f'}).setOrigin(.5).setDepth(34).setAlpha(0);
      this.tweens.add({targets:star,x:x+Phaser.Math.Between(-125,125),y:y+Phaser.Math.Between(-100,85),alpha:{from:0,to:1},scale:{from:.35,to:1.25},duration:Phaser.Math.Between(650,1100),yoyo:true,onComplete:()=>star.destroy()});
    }
    const zh=(localStorage.getItem('i18nextLng')||navigator.language).startsWith('zh');
    const blessing=this.add.text(480,390,zh?'愿此心愿乘云而行，与你的行动相逢':'May this wish travel with the clouds and meet your actions',{fontFamily:'serif',fontSize:'19px',color:'#f4d889',backgroundColor:'#202d2add',padding:{x:18,y:10}}).setOrigin(.5).setDepth(35).setAlpha(0);
    this.tweens.add({targets:blessing,alpha:1,y:370,duration:650,hold:2200,yoyo:true,onComplete:()=>blessing.destroy()});
  }

  private createHallStatues(zh:boolean){
    if(this.area==='gate'){
      this.createStatueImage(480,222,'lingguan',zh?'王灵官':'Wang Lingguan',zh?'山门护法，纠察善恶':'Guardian of the temple gate',155,198);
    }else if(this.area==='meditation'){
      this.createStatueImage(480,215,'sanqing',zh?'三清':'The Three Pure Ones',zh?'元始、灵宝、道德三位天尊':'Yuanshi, Lingbao and Daode Tianzun',300,210);
    }else if(this.area==='taichi'){
      this.createStatueImage(480,218,'zhenwu',zh?'真武大帝':'Zhenwu Dadi',zh?'披发仗剑，玄武祖师':'The sword-bearing Perfected Warrior',140,186);
    }else if(this.area==='library'){
      this.createStatueImage(682,228,'wenchang',zh?'文昌帝君':'Wenchang Dijun',zh?'主文运、学问与功名':'Patron of learning and scholarship',108,138,.9);
    }else if(this.area==='wish'){
      this.createStatueImage(178,242,'cihang',zh?'慈航真人':'Cihang Zhenren',zh?'象征慈悲、护佑与济度':'A figure of compassion and protection',112,150,.92);
    }
  }

  private createStatueImage(x:number,y:number,key:string,name:string,description:string,width:number,height:number,alpha=1){
    const container=this.add.container(x,y).setDepth(3);
    const statue=this.add.image(0,0,`statue-${key}`).setDisplaySize(width,height).setAlpha(alpha);
    const hit=this.add.zone(0,0,width,height).setInteractive({useHandCursor:true});
    const label=this.add.text(0,height/2+5,`${name}\n${description}`,{align:'center',fontFamily:'serif',fontSize:'12px',color:'#f1ebdd',backgroundColor:'#202d2add',padding:{x:7,y:5}}).setOrigin(.5,0).setVisible(false).setDepth(6);
    container.add([statue,hit,label]);
    hit.on('pointerover',()=>label.setVisible(true));
    hit.on('pointerout',()=>label.setVisible(false));
    hit.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{pointer.event.stopPropagation();label.setVisible(true);this.prompt.setVisible(true).setText(`${name} · ${description}`)});
  }

  private createOracleMaster(){
    const zh=(localStorage.getItem('i18nextLng')||navigator.language).startsWith('zh');
    // Interior furniture is rendered at a closer perspective than the outdoor
    // map. The master is therefore slightly taller than the visitor and rises
    // clearly above the casting table while his feet remain on the same plane.
    this.add.image(355,292,'npc-oracleMaster').setDisplaySize(86,124).setDepth(14);
    this.add.text(355,220,zh?'玄微道长':'Master Xuanwei',{fontFamily:'serif',fontSize:'13px',color:'#f1ebdd',backgroundColor:'#202d2acc',padding:{x:6,y:3}}).setOrigin(.5).setDepth(15);
    this.oracleMasterZone=this.add.zone(355,340,108,125).setInteractive({useHandCursor:true});
    this.oracleMasterZone.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
      pointer.event.stopPropagation();
      if(this.carryingOracleStick){const point=nearestWalkablePoint({x:355,y:380});this.target=new Phaser.Math.Vector2(point.x,point.y);this.pendingMasterConsult=true}
      else this.prompt.setVisible(true).setText(zh?'道长：请先摇签并拾起竹签':'Master: Cast and pick up a bamboo stick first');
    });
  }

  private createOracleCylinder(){
    const zh=(localStorage.getItem('i18nextLng')||navigator.language).startsWith('zh');
    // Keep the hand-painted cylinder in the room artwork visible. The zone is
    // deliberately invisible so interaction never covers it with vector art.
    const glow=this.add.ellipse(480,205,112,82,0xc8a46a,.001).setStrokeStyle(2,0xc8a46a,.001).setDepth(7);
    const hit=this.add.zone(480,198,112,145).setInteractive({useHandCursor:true});
    const label=this.add.text(480,278,zh?'点击签筒摇签':'Click the cylinder to cast',{fontFamily:'serif',fontSize:'15px',color:'#f1ebdd',backgroundColor:'#202d2acc',padding:{x:12,y:7}}).setOrigin(.5).setDepth(12).setVisible(false);
    hit.on('pointerover',()=>{glow.setFillStyle(0xc8a46a,.18).setStrokeStyle(2,0xc8a46a,.9);label.setVisible(true)});
    hit.on('pointerout',()=>{if(!this.oracleDrawing){glow.setFillStyle(0xc8a46a,.001).setStrokeStyle(2,0xc8a46a,.001);label.setVisible(false)}});
    hit.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{pointer.event.stopPropagation();this.castOracle(glow,hit,label)});
  }

  private castOracle(glow:Phaser.GameObjects.Ellipse,hit:Phaser.GameObjects.Zone,label:Phaser.GameObjects.Text){
    if(this.oracleDrawing||this.fallenOracleStick||this.carryingOracleStick)return;
    this.oracleDrawing=true;this.target=undefined;this.player.setVelocity(0);hit.disableInteractive();
    glow.setFillStyle(0xc8a46a,.14).setStrokeStyle(2,0xc8a46a,.9);
    label.setVisible(true).setText((localStorage.getItem('i18nextLng')||'zh').startsWith('zh')?'签筒摇动中…':'Shaking the cylinder…');
    this.tweens.add({targets:glow,scaleX:{from:.9,to:1.1},scaleY:{from:.9,to:1.1},alpha:{from:.45,to:1},duration:90,yoyo:true,repeat:5,ease:'Sine.InOut',onComplete:()=>{
      glow.setScale(1).setAlpha(1);
      const fallen=this.add.rectangle(480,132,6,78,0xd9b66f).setOrigin(.5,1).setAngle(8).setDepth(13);
      fallen.setStrokeStyle(1,0x6b4931);
      label.setText((localStorage.getItem('i18nextLng')||'zh').startsWith('zh')?'一支竹签落下…':'A bamboo stick falls…');
      this.tweens.add({targets:fallen,x:548,y:326,angle:72,duration:720,ease:'Bounce.Out',onComplete:()=>{
        this.fallenOracleStick=fallen.setInteractive({useHandCursor:true});
        fallen.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{pointer.event.stopPropagation();this.walkToOracleStick()});
        label.setText((localStorage.getItem('i18nextLng')||'zh').startsWith('zh')?'竹签已落，走近拾取':'The stick has fallen. Walk over to pick it up');
        this.time.delayedCall(280,()=>{
          glow.setFillStyle(0xc8a46a,.001).setStrokeStyle(2,0xc8a46a,.001);
          this.oracleDrawing=false;hit.setInteractive({useHandCursor:true});
        });
      }});
    }});
  }

  private walkToOracleStick(){
    if(!this.fallenOracleStick)return;
    const point=nearestWalkablePoint({x:this.fallenOracleStick.x,y:this.fallenOracleStick.y+20});
    this.target=new Phaser.Math.Vector2(point.x,point.y);this.pendingStickPickup=true;
  }

  private pickUpOracleStick(){
    if(!this.fallenOracleStick||this.carryingOracleStick)return;
    this.fallenOracleStick.destroy();this.fallenOracleStick=undefined;this.pendingStickPickup=false;this.carryingOracleStick=true;
    this.carriedOracleStick=this.add.rectangle(this.player.x+18,this.player.y-24,5,42,0xd9b66f).setAngle(18).setDepth(25).setStrokeStyle(1,0x6b4931);
    this.prompt.setVisible(true).setText((localStorage.getItem('i18nextLng')||'zh').startsWith('zh')?'已拾取竹签，请交给玄微道长':'Stick collected. Take it to Master Xuanwei');
  }

  private beginOracleConsult(){
    if(!this.carryingOracleStick)return;
    this.carryingOracleStick=false;this.carriedOracleStick?.destroy();this.carriedOracleStick=undefined;
    this.pendingMasterConsult=false;
    this.player.setVelocity(0);this.target=undefined;
    gameEvents.emit('oracleConsult',{castKey:Date.now()});
  }

  private createMeditationCushions(){
    // Three cushions remain available to the visitor; the other three are
    // occupied by silent practitioners created below.
    for(const {x,y,occupied} of MEDITATION_SEATS){
      if(occupied)continue;
      const glow=this.add.ellipse(x,y,92,42,0xc8a46a,.001).setStrokeStyle(2,0xc8a46a,.001).setDepth(4).setInteractive({useHandCursor:true});
      glow.on('pointerover',()=>glow.setFillStyle(0xc8a46a,.13).setStrokeStyle(2,0xc8a46a,.75));
      glow.on('pointerout',()=>glow.setFillStyle(0xc8a46a,.001).setStrokeStyle(2,0xc8a46a,.001));
      glow.on('pointerdown',()=>{this.selectedCushion=new Phaser.Math.Vector2(x,y);this.target=this.selectedCushion.clone();this.seated=false});
    }
  }

  private createMeditatingNpcs(){
    const zh=(localStorage.getItem('i18nextLng')||navigator.language).startsWith('zh');
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches||localStorage.getItem('cloud-tao-motion')==='reduced';
    const practitioners=MEDITATION_SEATS.filter(seat=>seat.occupied);
    practitioners.forEach((seat,index)=>{
      const height=MEDITATOR_HEIGHT[seat.depth],width=height*MEDITATOR_ASPECT;
      const x=seat.x+seat.anchorOffsetX,y=seat.y+seat.anchorOffsetY;
      const halo=this.add.ellipse(seat.x,seat.y+7,width*1.08,22,0xc8a46a,.08).setDepth(seat.y-2);
      // The origin is the seated contact point, not the bottom of the source
      // canvas. Equal-depth seats therefore share exactly the same scale.
      const npc=this.add.image(x,y,'meditating-npc').setDisplaySize(width,height).setOrigin(MEDITATOR_ORIGIN.x,MEDITATOR_ORIGIN.y).setFlipX(false).setDepth(seat.y+1).setInteractive({useHandCursor:true});
      npc.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
        pointer.event.stopPropagation();
        this.prompt.setVisible(true).setText(zh?'静修中，请放轻脚步':'In quiet practice — please tread softly');
        this.time.delayedCall(1800,()=>this.prompt.setVisible(false));
      });
      // Keep the body completely fixed on the cushion. Only the subtle halo
      // breathes, so a long-running tween cannot make the feet drift.
      if(!reduced)this.tweens.add({targets:halo,alpha:{from:.04,to:.12},duration:3200+index*420,yoyo:true,repeat:-1,ease:'Sine.InOut'});
    });
  }

  private sitDown(){
    if(!this.selectedCushion)return;
    this.player.setPosition(this.selectedCushion.x,this.selectedCushion.y).setVelocity(0);
    this.target=undefined;this.seated=true;
    gameEvents.emit('enterArea',{id:'meditation'});
  }

  private standUp(){this.seated=false;this.selectedCushion=undefined;this.player.setScale(this.baseScale.x,this.baseScale.y)}

  private drawDecor(g:Phaser.GameObjects.Graphics,zh:boolean){
    const label=zh?'靠近陈设，按 E 互动':'Approach and press E to interact';
    if(this.area==='library'){
      for(const x of [145,250,710,815]){g.fillStyle(0x5b3b2c).fillRect(x-38,135,76,180);for(let y=150;y<300;y+=30){g.fillStyle(0xc8a46a).fillRect(x-34,y,68,4);for(let i=0;i<5;i++)g.fillStyle([0x8d493b,0x315b50,0xb58a50][i%3]).fillRect(x-29+i*13,y-21,9,21)}}
      g.fillStyle(0x704a34).fillRoundedRect(385,145,190,100,5);g.fillStyle(0xf1ebdd).fillRect(415,164,130,48);
    }else if(this.area==='meditation'){
      g.fillStyle(0x76503c).fillRoundedRect(395,140,170,70,6);g.fillStyle(0xc8a46a).fillCircle(480,165,18);
      for(const x of [300,400,560,660])g.fillStyle(0x819a94).fillEllipse(x,270,90,34);
      g.lineStyle(3,0xc8a46a,.8).lineBetween(480,135,480,95);
    }else if(this.area==='taichi'){
      g.fillStyle(0xf1ebdd).fillCircle(480,205,105);g.fillStyle(0x24483f).slice(480,205,105,-Math.PI/2,Math.PI/2,true).fillPath();
      g.fillStyle(0x24483f).fillCircle(480,257,52).fillCircle(480,153,10);g.fillStyle(0xf1ebdd).fillCircle(480,153,52).fillCircle(480,257,10);
    }else if(this.area==='wish'){
      g.lineStyle(7,0x684737).lineBetween(480,120,480,270).lineBetween(480,160,350,245).lineBetween(480,165,610,245);
      for(const [x,y] of [[350,230],[420,205],[540,205],[610,230]]){g.fillStyle(0xb9553f).fillRoundedRect(x-18,y-22,36,52,7);g.fillStyle(0xc8a46a).fillCircle(x,y+7,7)}
    }else if(this.area==='garden'){
      g.fillStyle(0x604332).fillRect(365,145,230,105);for(let i=0;i<7;i++){g.fillStyle([0x728b65,0x9a744d,0xb6995d][i%3]).fillCircle(390+i*30,180+(i%2)*25,14)}
      for(const x of [180,760]){g.fillStyle(0x315b50).fillRect(x-55,130,110,150);for(let y=150;y<270;y+=35)g.fillStyle(0xc8a46a).fillRect(x-50,y,100,4)}
    }else if(this.area==='bamboo'){
      for(const x of [180,240,720,780]){g.fillStyle(0x315b50).fillRect(x,105,14,210);for(let y=130;y<300;y+=44)g.fillStyle(0xc8a46a).fillRect(x-3,y,20,4)}
      g.fillStyle(0x52645d).fillRoundedRect(365,140,230,130,45);g.fillStyle(0x202d2a).fillEllipse(480,210,125,95);g.fillStyle(0xc8a46a,.8).fillCircle(480,205,18);
    }else if(this.area==='oracle'){
      g.fillStyle(0x674433).fillRoundedRect(370,145,220,105,5);g.fillStyle(0xc8a46a).fillRect(390,165,180,8);
      g.fillStyle(0x8a4b38).fillRoundedRect(447,118,66,90,18);for(let x=455;x<510;x+=7)g.lineStyle(3,0xd8b773).lineBetween(x,125,x-8,75);
      g.lineStyle(5,0x24483f).strokeCircle(480,205,35);
    }else{
      g.fillStyle(0x674433).fillRoundedRect(375,145,210,90,5);g.fillStyle(0xc8a46a).fillCircle(480,180,28);
      for(const x of [220,740]){g.fillStyle(0x24483f).fillRect(x-65,130,130,145);g.fillStyle(0xf1ebdd).fillCircle(x,200,42)}
    }
    this.add.text(480,290,label,{fontFamily:'serif',fontSize:'13px',color:'#52645d'}).setOrigin(.5);
  }

  private activate(){
    if(this.nearExit)this.leave();
    else if(this.area==='oracle'&&this.nearOracleStick)this.pickUpOracleStick();
    else if(this.area==='oracle'&&this.nearOracleMaster&&this.carryingOracleStick)this.beginOracleConsult();
    else if(this.area==='wish'&&this.nearWishPaper&&!this.carryingWishPaper)this.pickUpWishPaper();
    else if(this.area==='wish'&&this.nearWishTree&&this.carryingWishPaper)this.beginWishWriting();
    else if(this.nearFeature)gameEvents.emit('enterArea',{id:this.area});
  }
  private leave(){this.player.setVelocity(0);this.target=undefined;gameEvents.emit('nearby',{id:this.area,active:false});this.scene.start('TempleScene',{spawn:SAFE_EXITS[this.returnArea],fromInterior:true,fromArea:this.returnArea})}

  update(_time:number,delta:number){
    if(isPointInPolygon(this.player)){this.lastValid.set(this.player.x,this.player.y)}else{this.player.setPosition(this.lastValid.x,this.lastValid.y).setVelocity(0);this.target=undefined}
    const v=new Phaser.Math.Vector2(Number(this.cursors.right.isDown||this.keys.D.isDown)-Number(this.cursors.left.isDown||this.keys.A.isDown)+this.joystick.x,Number(this.cursors.down.isDown||this.keys.S.isDown)-Number(this.cursors.up.isDown||this.keys.W.isDown)+this.joystick.y);
    if(this.seated){this.player.setVelocity(0);this.target=undefined}
    else if(v.lengthSq()>.02){
      v.normalize();const speed=92,next={x:this.player.x+v.x*speed*delta/1000,y:this.player.y+v.y*speed*delta/1000};
      if(isPointInPolygon(next))this.player.setVelocity(v.x*speed,v.y*speed);else{const edge=nearestWalkablePoint(next);this.player.setPosition(edge.x,edge.y).setVelocity(0)}
      this.target=undefined;
      if(this.area==='wish'){this.pendingWishPickup=false;this.pendingWishTree=false}
    }
    else if(this.target){const d=this.target.clone().subtract(this.player.getCenter());if(d.length()<8){this.target=undefined;this.player.setVelocity(0);if(this.selectedCushion)this.sitDown()}else{d.normalize();const speed=84,next={x:this.player.x+d.x*speed*delta/1000,y:this.player.y+d.y*speed*delta/1000};if(isPointInPolygon(next))this.player.setVelocity(d.x*speed,d.y*speed);else{const edge=nearestWalkablePoint(next);this.player.setPosition(edge.x,edge.y).setVelocity(0);this.target=undefined}}}else this.player.setVelocity(0);
    const moving=this.player.body!.velocity.lengthSq()>20,pulse=moving?Math.sin(this.time.now/90):0;
    this.player.setFlipX(this.player.body!.velocity.x<0).setScale(this.baseScale.x*(this.seated?1.12:1),this.baseScale.y*(this.seated ? 0.68 : 1)*(1+Math.abs(pulse)*.03)).setAngle(this.seated?0:pulse*1.5);
    const feature=this.area!=='meditation'&&this.area!=='oracle'&&this.area!=='wish'&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.featureZone.x,this.featureZone.y)<125;
    const exit=Phaser.Math.Distance.Between(this.player.x,this.player.y,this.exitZone.x,this.exitZone.y)<85;
    if(feature!==this.nearFeature){this.nearFeature=feature;gameEvents.emit('nearby',{id:this.area,active:feature})}
    this.nearExit=exit;
    if(this.area==='oracle'){
      this.carriedOracleStick?.setPosition(this.player.x+(this.player.flipX?-18:18),this.player.y-25).setAngle(this.player.flipX?-18:18);
      this.nearOracleStick=!!this.fallenOracleStick&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.fallenOracleStick.x,this.fallenOracleStick.y)<65;
      this.nearOracleMaster=!!this.oracleMasterZone&&Phaser.Math.Distance.Between(this.player.x,this.player.y,this.oracleMasterZone.x,this.oracleMasterZone.y)<105;
      if(this.pendingStickPickup&&this.nearOracleStick)this.pickUpOracleStick();
      if(this.pendingMasterConsult&&this.nearOracleMaster)this.beginOracleConsult();
    }
    if(this.area==='wish'){
      this.carriedWishPaper?.setPosition(this.player.x+(this.player.flipX?-20:20),this.player.y-26).setAngle(this.player.flipX?-10:10);
      this.nearWishPaper=this.wishPaperZones.some(zone=>Phaser.Math.Distance.Between(this.player.x,this.player.y,zone.x,zone.y)<105);
      this.nearWishTree=!!this.wishTreeZone&&Phaser.Math.Distance.Between(this.player.x,this.player.y,480,365)<85;
      if(this.pendingWishPickup&&this.nearWishPaper)this.pickUpWishPaper();
      if(this.pendingWishTree&&this.nearWishTree)this.beginWishWriting();
    }
    const zh=(localStorage.getItem('i18nextLng')||'zh').startsWith('zh');
    const promptText=exit?(zh?'按 E 返回山中':'Press E to return outside'):this.nearOracleStick?(zh?'按 E 拾取竹签':'Press E to pick up the stick'):(this.nearOracleMaster&&this.carryingOracleStick)?(zh?'按 E 请道长解签':'Press E to consult the master'):'';
    this.prompt.setVisible(!!promptText).setText(promptText);
  }
}
