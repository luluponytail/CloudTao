import Phaser from 'phaser';
import { gameEvents } from '../events';
import { AREA_ENTRANCES, BUILDING_PORTALS, EXIT_EGRESS_ROUTES, areas, WORLD, type AreaDefinition, type AreaId } from '../worldData';
import { npcs, type NpcId } from '../npcs';
import { advanceRoadPosition, expandedRoadPathFrom, locateRoadPosition, roadPoint, type RoadPosition } from '../systems/roadMovement';
import {roadNodeRoute} from '../systems/roadNavigation';
import {canWalk,nearestWalkableTerrainPoint,terrainRoute} from '../systems/terrainNavigation';
import {loadTimeMode,resolveTimePhase,timeVisuals,type TimeMode} from '../systems/timeOfDay';

const WALK_SPEED=58;
const APPROACH_SPEED=46;
type MovementMode='road'|'approaching-portal'|'entering-portal'|'exiting-portal'|'locked';
const AREA_LABELS:Record<AreaId,{zh:string;en:string}>={
  gate:{zh:'山门',en:'Entrance Gate'},oracle:{zh:'问道阁',en:'Oracle Hall'},meditation:{zh:'静心殿 · 建设中',en:'Meditation Hall · Under Construction'},
  sanqing:{zh:'三清殿',en:'Sanqing Hall'},wealth:{zh:'财神殿',en:'God of Wealth Hall'},taichi:{zh:'太极场',en:'Tai Chi Court'},
  library:{zh:'藏经阁',en:'Wisdom Library'},garden:{zh:'修行园',en:'Practice Garden'},wish:{zh:'祈福台',en:'Wish Pavilion'},bamboo:{zh:'静心洞',en:'Meditation Cave'},
};

export class TempleScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'E', Phaser.Input.Keyboard.Key>;
  private target?: Phaser.Math.Vector2;
  private targetPath: Phaser.Math.Vector2[] = [];
  private pendingEntry?: AreaId;
  private nearby?: AreaId;
  private nearbyNpc?: NpcId;
  private zones = new Map<AreaId, Phaser.GameObjects.Zone>();
  private npcZones = new Map<NpcId, Phaser.GameObjects.Zone>();
  private joystick = { x: 0, y: 0 };
  private reducedMotion = false;
  private playerName!: Phaser.GameObjects.Text;
  private playerBaseScale = new Phaser.Math.Vector2(1, 1);
  private spawnPoint = new Phaser.Math.Vector2(900,1015);
  private roadPosition!:RoadPosition;
  private movementMode:MovementMode='road';
  private transitionVeil?:Phaser.GameObjects.Rectangle;
  private inputLockedUntil=0;
  private stalledFor=0;
  private pathAge=0;
  private entryIdleFor=0;
  private entryRecoveryAttempts=0;
  private returningFrom?:AreaId;
  private timeOverlay?:Phaser.GameObjects.Rectangle;
  private lampGlows:Phaser.GameObjects.Arc[]=[];
  private routeGuide?:Phaser.GameObjects.Graphics;
  private immersiveZoom=1.15;
  private cameraLook=new Phaser.Math.Vector2(0,-72);
  private cameraResizeHandler?:()=>void;
  private immersiveTrail=false;
  private trailFocusZoom?:number;
  private areaLabelObjects=new Map<AreaId,Phaser.GameObjects.Text>();
  private npcLabelObjects=new Map<NpcId,Phaser.GameObjects.Text>();

  constructor() { super('TempleScene'); }
  init(data?:{spawn?:{x:number;y:number};fromInterior?:boolean;fromArea?:AreaId}){this.spawnPoint.set(data?.spawn?.x??900,data?.spawn?.y??1015);this.returningFrom=data?.fromArea;this.inputLockedUntil=data?.fromInterior?180:0;this.stalledFor=0;this.pathAge=0;this.entryIdleFor=0;this.entryRecoveryAttempts=0;this.movementMode='road'}

  preload(){
    this.load.image('cloud-tao-map','./assets/maps/cloud-tao-main-map-v4.webp');
    this.load.image('novice-art','./assets/characters/novice.png');
    this.load.image('npc-greeter','./assets/characters/greeter.png');
    this.load.image('npc-oracleMaster','./assets/characters/oracle-master.png');
    this.load.image('npc-taichiMaster','./assets/characters/taichi-master.png');
    this.load.image('npc-librarian','./assets/characters/librarian.png');
  }

  create() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || localStorage.getItem('cloud-tao-motion') === 'reduced';
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.drawWorld();
    this.createTimeOfDay();
    this.createPlayer();
    this.createControls();
    this.beginExitEgress();
    const offActivate = gameEvents.on('activateArea', ({id}) => this.walkToArea(id));
    const offNavigate = gameEvents.on('navigateArea', ({id}) => this.navigateToArea(id));
    const offTrail=gameEvents.on('startImmersiveTrail',()=>this.startImmersiveTrail());
    const languageListener=((event:CustomEvent<string>)=>this.updateWorldLanguage(event.detail)) as EventListener;
    window.addEventListener('cloud-tao-language',languageListener);
    this.events.once('shutdown',()=>{offActivate();offNavigate();offTrail();window.removeEventListener('cloud-tao-language',languageListener)});
    this.configureImmersiveCamera();
  }

  private configureImmersiveCamera(){
    const camera=this.cameras.main;
    const fit=()=>{
      const width=this.scale.width;
      this.immersiveZoom=width<700?.9:Phaser.Math.Clamp(width/1280,1.06,1.28);
      camera.setZoom(this.immersiveZoom).setFollowOffset(0,-72);
    };
    camera.setBounds(0,0,WORLD.width,WORLD.height).startFollow(this.player,true,.095,.095).setRoundPixels(true);
    fit();
    this.cameraResizeHandler=fit;
    this.scale.on('resize',fit);
    this.events.once('shutdown',()=>{if(this.cameraResizeHandler)this.scale.off('resize',this.cameraResizeHandler)});
  }

  private updateImmersiveCamera(movedX:number,movedY:number,moving:boolean,delta:number){
    const camera=this.cameras.main;
    const ease=1-Math.pow(.001,Math.min(delta,50)/1000);
    const direction=moving?new Phaser.Math.Vector2(movedX,movedY).normalize():new Phaser.Math.Vector2(0,0);
    const targetX=this.reducedMotion?0:direction.x*82;
    const targetY=this.reducedMotion?-54:-72+direction.y*52;
    this.cameraLook.x=Phaser.Math.Linear(this.cameraLook.x,targetX,ease*(moving?.8:.36));
    this.cameraLook.y=Phaser.Math.Linear(this.cameraLook.y,targetY,ease*(moving?.8:.36));
    camera.setFollowOffset(this.cameraLook.x,this.cameraLook.y);
    const motionZoom=this.trailFocusZoom??(this.reducedMotion?this.immersiveZoom:this.immersiveZoom-(moving?.055:0));
    camera.setZoom(Phaser.Math.Linear(camera.zoom,motionZoom,ease*.45));
  }

  private startImmersiveTrail(){
    if(this.movementMode==='entering-portal'||this.movementMode==='locked')return;
    this.cancelPath();this.immersiveTrail=true;this.trailFocusZoom=this.immersiveZoom*1.08;
    this.player.setPosition(900,1015).setAlpha(1).setScale(this.playerBaseScale.x,this.playerBaseScale.y);
    this.roadPosition=locateRoadPosition(900,1015);
    const route=[
      {x:900,y:970},{x:900,y:915},{x:900,y:855},{x:900,y:795},
      {x:900,y:735},{x:900,y:680},{x:900,y:625},{x:900,y:575},{x:900,y:552},
    ];
    this.targetPath=route.map(point=>new Phaser.Math.Vector2(point.x,point.y));
    this.target=this.targetPath.shift();this.movementMode='exiting-portal';this.pathAge=0;this.stalledFor=0;
  }

  private updateTrailDirection(){
    if(!this.immersiveTrail)return;
    if(this.player.y>835){this.trailFocusZoom=this.immersiveZoom*1.1;this.cameraLook.y=-92}
    else if(this.player.y>645){this.trailFocusZoom=this.immersiveZoom*.96;this.cameraLook.y=-105}
    else{this.trailFocusZoom=this.immersiveZoom*1.16;this.cameraLook.y=-82}
    if(!this.target&&this.targetPath.length===0){this.immersiveTrail=false;this.trailFocusZoom=undefined;this.movementMode='road';gameEvents.emit('immersiveTrailComplete',undefined)}
  }

  private createTimeOfDay(){
    this.timeOverlay=this.add.rectangle(WORLD.width/2,WORLD.height/2,WORLD.width,WORLD.height,0xffffff,0).setDepth(7900).setBlendMode(Phaser.BlendModes.MULTIPLY);
    for(const {x,y} of [AREA_ENTRANCES.gate,AREA_ENTRANCES.sanqing,AREA_ENTRANCES.bamboo,AREA_ENTRANCES.wealth,AREA_ENTRANCES.oracle,AREA_ENTRANCES.library,AREA_ENTRANCES.wish]){
      const glow=this.add.circle(x,y-55,54,0xf4bd5b,0).setDepth(7901).setBlendMode(Phaser.BlendModes.ADD);this.lampGlows.push(glow);
    }
    const apply=(mode:TimeMode)=>{const visual=timeVisuals[resolveTimePhase(mode)];this.timeOverlay?.setFillStyle(visual.color,visual.alpha);for(const glow of this.lampGlows)glow.setAlpha(visual.lampAlpha)};
    apply(loadTimeMode());
    const listener=((event:CustomEvent<TimeMode>)=>apply(event.detail)) as EventListener;
    window.addEventListener('cloud-tao-time',listener);this.events.once('shutdown',()=>window.removeEventListener('cloud-tao-time',listener));
  }

  private isZh(language=localStorage.getItem('i18nextLng')||navigator.language){return language.toLowerCase().startsWith('zh')}

  private updateWorldLanguage(language:string){
    const zh=this.isZh(language);
    for(const[id,label]of this.areaLabelObjects)label.setText(zh?AREA_LABELS[id].zh:AREA_LABELS[id].en);
    for(const[id,label]of this.npcLabelObjects){const npc=npcs.find(item=>item.id===id);if(npc)label.setText(zh?npc.nameZh:npc.nameEn)}
  }

  private beginExitEgress(){
    const route=this.returningFrom&&EXIT_EGRESS_ROUTES[this.returningFrom];
    this.returningFrom=undefined;
    if(!route?.length)return;
    this.movementMode='exiting-portal';
    this.targetPath=route.map(point=>new Phaser.Math.Vector2(point.x,point.y));
    if(this.targetPath[0]&&Phaser.Math.Distance.BetweenPoints(this.player,this.targetPath[0])<20)this.targetPath.shift();
    this.target=this.targetPath.shift();this.pathAge=0;this.stalledFor=0;
  }

  private drawWorld() {
    this.add.image(0,0,'cloud-tao-map').setOrigin(0).setDisplaySize(WORLD.width,WORLD.height).setDepth(-100);
    // Legacy geometry remains as a non-rendered collision/layout reference while
    // the production art map supplies the visible terrain.
    const g = this.add.graphics().setVisible(false);
    g.fillStyle(0xadc0b7).fillRect(0, 0, WORLD.width, WORLD.height);
    // layered ink mountains
    for (let row = 0; row < 4; row++) {
      const y = 70 + row * 250;
      g.fillStyle(row % 2 ? 0x8fa89e : 0x9eb3aa, 0.7);
      for (let x = -80; x < WORLD.width; x += 170) g.fillTriangle(x, y + 150, x + 100, y - 25, x + 210, y + 150);
    }
    // paths
    g.lineStyle(74, 0xd9d0bb, 1).beginPath().moveTo(900, 1060).lineTo(900, 650).lineTo(890, 380).strokePath();
    g.lineStyle(58, 0xd9d0bb, 1).beginPath().moveTo(900, 650).lineTo(430, 540).moveTo(900, 620).lineTo(1370, 480).moveTo(900, 760).lineTo(1370, 810).moveTo(780, 740).lineTo(390, 840).strokePath();
    // stream and bridge
    g.lineStyle(80, 0x6e9b9c, 0.85).beginPath().moveTo(0, 690).lineTo(340, 650).lineTo(650, 720).lineTo(1030, 790).lineTo(1800, 730).strokePath();
    for (let i = 0; i < 9; i++) g.lineStyle(4, 0xcbded8, 0.55).lineBetween(i * 220, 675 + (i % 3) * 13, i * 220 + 120, 684 + (i % 2) * 8);
    g.fillStyle(0x806c55).fillRoundedRect(820, 714, 185, 72, 8).lineStyle(5, 0x453d34).strokeRoundedRect(820, 714, 185, 72, 8);
    // taiji court
    g.fillStyle(0xc8bfaa).fillCircle(900, 660, 125).lineStyle(5, 0x52645d).strokeCircle(900, 660, 125);
    g.fillStyle(0x24483f).beginPath().arc(900, 660, 102, -Math.PI / 2, Math.PI / 2).lineTo(900, 558).closePath().fillPath().fillCircle(900, 609, 51);
    g.fillStyle(0xf1ebdd).fillCircle(900, 711, 51).fillCircle(900, 609, 9);
    g.fillStyle(0x24483f).fillCircle(900, 711, 9);

    const obstacles = this.physics.add.staticGroup();
    areas.forEach((area) => this.drawBuilding(area, obstacles));
    this.createNpcs(obstacles);
    this.physics.world.once('worldstep', () => this.physics.add.collider(this.player, obstacles));
    this.createGuardianShrines();
    this.createSecrets();
    if (!this.reducedMotion) this.createAtmosphere();
  }

  private drawBuilding(a: AreaDefinition, _obstacles: Phaser.Physics.Arcade.StaticGroup) {
    const g = this.add.graphics().setDepth(a.y).setVisible(false);
    g.fillStyle(0x3d4b46, .18).fillEllipse(a.x + 12, a.y + a.h / 2 + 35, a.w * 1.25, 48);
    if (a.id === 'gate') {
      // A broad ceremonial shanmen with side walls, layered eaves and guardian plinths.
      g.fillStyle(0xe9dfc9).fillRect(a.x-a.w*.72, a.y-a.h*.35, a.w*1.44, a.h*.72);
      g.fillStyle(0x6d3d31).fillRect(a.x-a.w*.5, a.y-a.h*.55, 18, a.h*.95).fillRect(a.x+a.w*.42, a.y-a.h*.55, 18, a.h*.95);
      g.fillStyle(a.roof).fillTriangle(a.x-a.w*.82,a.y-a.h*.47,a.x,a.y-a.h*1.18,a.x+a.w*.82,a.y-a.h*.47);
      g.fillStyle(0x202d2a).fillRect(a.x-34,a.y-a.h*.18,68,a.h*.58);
      g.fillStyle(a.accent).fillRoundedRect(a.x-48,a.y-a.h*.62,96,26,3);
      g.fillStyle(0x819a94).fillCircle(a.x-a.w*.62,a.y+a.h*.35,18).fillCircle(a.x+a.w*.62,a.y+a.h*.35,18);
    } else if (a.id === 'library') {
      // The library is the only tall, three-tier silhouette on the mountain.
      g.fillStyle(0xeee4cf).fillRect(a.x-a.w/2, a.y-a.h*.78, a.w, a.h*1.3);
      for (let floor = 0; floor < 3; floor++) {
        const y = a.y + a.h*.42 - floor*a.h*.42;
        g.fillStyle(a.roof).fillTriangle(a.x-a.w*.66,y-a.h*.28,a.x,y-a.h*.58,a.x+a.w*.66,y-a.h*.28);
        g.fillStyle(a.accent).fillRect(a.x-a.w*.47,y-a.h*.26,a.w*.94,6);
        for (let window = -1; window <= 1; window++) g.fillStyle(0x92734d).fillRect(a.x+window*48-13,y-a.h*.2,26,22);
      }
      g.fillStyle(0x4c3d32).fillRect(a.x-25,a.y+a.h*.2,50,a.h*.32);
    } else {
      g.fillStyle(0xeee4cf).fillRect(a.x-a.w/2, a.y-a.h/2, a.w, a.h);
      g.fillStyle(0x4c3d32).fillRect(a.x-24, a.y, 48, a.h/2);
      g.fillStyle(a.roof).fillTriangle(a.x-a.w*.68, a.y-a.h/2+4, a.x, a.y-a.h*.98, a.x+a.w*.68, a.y-a.h/2+4);
      g.fillStyle(a.accent).fillRect(a.x-a.w*.47, a.y-a.h/2+8, a.w*.94, 8);
      g.fillStyle(0x7a3f32).fillRect(a.x-a.w*.43, a.y-a.h/2+18, 10, a.h*.75).fillRect(a.x+a.w*.38, a.y-a.h/2+18, 10, a.h*.75);
    }
    const zh=this.isZh();
    const areaLabel=this.add.text(a.x, a.y-a.h*.65, zh?AREA_LABELS[a.id].zh:AREA_LABELS[a.id].en, { fontFamily:'serif', fontSize:'15px', color:'#f1ebdd', backgroundColor:'#202d2acc', padding:{x:9,y:4} }).setOrigin(.5).setDepth(a.y+1);
    this.areaLabelObjects.set(a.id,areaLabel);
    // The former Meditation Hall remains visible as a future construction
    // project. Meditation now lives in the mountain cave on the eastern ridge.
    if(a.id==='meditation')return;
    // The illustrated production map no longer matches the old rectangular
    // building footprints. Road corridors now provide the authoritative walk
    // boundary, avoiding invisible walls across gates and courtyards.
    const entrance = AREA_ENTRANCES[a.id];
    const zone = this.add.zone(entrance.x, entrance.y, a.id === 'sanqing' ? 210 : 150, a.id === 'sanqing' ? 150 : 120).setOrigin(.5).setInteractive({useHandCursor:true}).setDepth(20000);
    this.physics.add.existing(zone, true); this.zones.set(a.id, zone);
    zone.on('pointerdown', (pointer:Phaser.Input.Pointer) => { pointer.event.stopPropagation(); this.walkToArea(a.id); });
    // The illustrated door sits above the road endpoint. A dedicated facade
    // hotspot makes clicking the visible door walk the player to the entrance
    // instead of treating the artwork as unreachable terrain.
    const doorY = a.id === 'sanqing' ? 335 : a.y;
    const doorHotspot = this.add.zone(a.x, doorY, Math.max(120, a.w * .72), Math.max(90, a.h * .72))
      .setOrigin(.5).setInteractive({useHandCursor:true}).setDepth(19999);
    doorHotspot.on('pointerdown', (pointer:Phaser.Input.Pointer) => { pointer.event.stopPropagation(); this.walkToArea(a.id); });
  }

  private drawTree(x: number, y: number, obstacles: Phaser.Physics.Arcade.StaticGroup, pine: boolean) {
    const g = this.add.graphics().setDepth(y);
    g.fillStyle(0x665341).fillRect(x-6, y-15, 12, 48);
    if (pine) {
      g.fillStyle(0x315b50).fillTriangle(x-42,y+5,x,y-85,x+42,y+5).fillTriangle(x-35,y-25,x,y-112,x+35,y-25);
    } else {
      g.fillStyle(0x47685b).fillCircle(x-22,y-45,27).fillCircle(x+17,y-54,34).fillCircle(x,y-78,30);
    }
    const body = this.add.rectangle(x, y+18, 28, 24, 0, 0); obstacles.add(body);
  }

  private createNpcs(obstacles:Phaser.Physics.Arcade.StaticGroup){
    for(const npc of npcs){
      this.add.image(npc.x,npc.y-24,`npc-${npc.id}`).setDisplaySize(72,90).setDepth(npc.y);
      const label=this.add.text(npc.x,npc.y-78,this.isZh()?npc.nameZh:npc.nameEn,{fontFamily:'serif',fontSize:'12px',color:'#f1ebdd',backgroundColor:'#202d2acc',padding:{x:5,y:2}}).setOrigin(.5).setDepth(npc.y+1);
      this.npcLabelObjects.set(npc.id,label);
      const body=this.add.rectangle(npc.x,npc.y+12,28,24,0,0);obstacles.add(body);
      const zone=this.add.zone(npc.x,npc.y,105,105).setOrigin(.5).setInteractive({useHandCursor:true});this.physics.add.existing(zone,true);this.npcZones.set(npc.id,zone);
      zone.on('pointerdown',()=>gameEvents.emit('talkNpc',{id:npc.id}));
    }
  }

  private createPlayer() {
    this.roadPosition=locateRoadPosition(this.spawnPoint.x,this.spawnPoint.y);
    const roadSpawn=roadPoint(this.roadPosition);
    this.player = this.physics.add.sprite(roadSpawn.x,roadSpawn.y, 'novice-art').setDisplaySize(44,55).setDepth(9999).setCollideWorldBounds(true);
    this.playerBaseScale.set(this.player.scaleX, this.player.scaleY);
    this.player.body!.setSize(44, 30).setOffset(42, 122);
    const saved=localStorage.getItem('cloud-tao-identity-v1');let name='云游客';try{name=saved?JSON.parse(saved).name:name}catch{name='云游客'}
    this.playerName=this.add.text(this.player.x,this.player.y-42,name,{fontFamily:'serif',fontSize:'12px',color:'#f1ebdd',backgroundColor:'#202d2acc',padding:{x:5,y:2}}).setOrigin(.5).setDepth(10000);
    const rename:EventListener=(event)=>{this.playerName.setText((event as CustomEvent<{name:string}>).detail.name)};
    window.addEventListener('cloud-tao-identity',rename);this.events.once('shutdown',()=>window.removeEventListener('cloud-tao-identity',rename));
  }

  private createControls() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E') as typeof this.keys;
    this.keys.E.on('down', () => { if(this.nearbyNpc)gameEvents.emit('talkNpc',{id:this.nearbyNpc});else if (this.nearby) this.walkToArea(this.nearby); });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.x < 155 && p.y > this.scale.height - 175) return;
      if(this.movementMode!=='road')return;
      const route = terrainRoute({x:this.player.x,y:this.player.y},{x:p.worldX,y:p.worldY});
      if(!route.length){this.cancelPath();return}
      this.targetPath = route.map(({x,y}) => new Phaser.Math.Vector2(x,y));
      if (this.targetPath[0] && Phaser.Math.Distance.BetweenPoints(this.player, this.targetPath[0]) < 30) this.targetPath.shift();
      this.target = this.targetPath.shift();
      this.pathAge=0;this.stalledFor=0;
    });
    window.addEventListener('cloud-tao-joystick', ((event: CustomEvent<{x:number;y:number}>) => { if(this.movementMode!=='road')return;this.joystick = event.detail; this.target = undefined; this.targetPath = []; }) as EventListener);
  }

  private enterInterior(id:AreaId){
    if(this.movementMode==='entering-portal'||this.movementMode==='locked')return;
    this.pendingEntry=undefined;
    gameEvents.emit('nearby',{id,active:false});
    this.movementMode='entering-portal';
    this.target=undefined;this.targetPath=[];
    const portal=BUILDING_PORTALS[id];
    this.playerName.setVisible(false);
    this.tweens.add({
      targets:this.player,x:portal.interior.x,y:portal.interior.y,
      scaleX:this.playerBaseScale.x*.82,scaleY:this.playerBaseScale.y*.82,alpha:0,
      duration:this.reducedMotion?180:650,ease:'Sine.easeIn',
      onComplete:()=>{
        this.movementMode='locked';
        this.transitionVeil=this.add.rectangle(this.cameras.main.midPoint.x,this.cameras.main.midPoint.y,this.scale.width/this.cameras.main.zoom+80,this.scale.height/this.cameras.main.zoom+80,0xf1ebdd,0).setScrollFactor(0).setDepth(50000);
        const interiorId:AreaId=id==='bamboo'?'meditation':id;
        this.tweens.add({targets:this.transitionVeil,alpha:1,duration:this.reducedMotion?80:260,onComplete:()=>this.scene.start('InteriorScene',{id:interiorId,returnArea:id})});
      }
    });
  }

  private walkToArea(id:AreaId){
    if(this.movementMode!=='road')return;
    const route=this.plannedRoadPath(id);
    if(!route.length){this.cancelPath();return}
    this.targetPath=route.map(({x,y})=>new Phaser.Math.Vector2(x,y));
    if(this.targetPath[0]&&Phaser.Math.Distance.BetweenPoints(this.player,this.targetPath[0])<30)this.targetPath.shift();
    this.target=this.targetPath.shift();
    this.pendingEntry=id;
    this.movementMode='approaching-portal';
    this.pathAge=0;this.stalledFor=0;this.entryIdleFor=0;this.entryRecoveryAttempts=0;
  }

  private navigateToArea(id:AreaId){
    if(this.movementMode!=='road')return;
    const route=this.plannedRoadPath(id);
    if(!route.length){this.cancelPath();return}
    this.targetPath=route.map(({x,y})=>new Phaser.Math.Vector2(x,y));
    if(this.targetPath[0]&&Phaser.Math.Distance.BetweenPoints(this.player,this.targetPath[0])<30)this.targetPath.shift();
    this.target=this.targetPath.shift();
    this.pendingEntry=undefined;
    this.movementMode='road';
    this.pathAge=0;this.stalledFor=0;
    this.showRouteGuide([{x:this.player.x,y:this.player.y},...route]);
  }

  private showRouteGuide(points:Array<{x:number;y:number}>){
    this.routeGuide?.destroy();
    if(points.length<2||this.reducedMotion)return;
    const guide=this.add.graphics().setDepth(45).setAlpha(.82);this.routeGuide=guide;
    guide.lineStyle(2,0xe6c66f,.68).beginPath().moveTo(points[0].x,points[0].y);
    for(const point of points.slice(1))guide.lineTo(point.x,point.y);
    guide.strokePath();
    for(let index=1;index<points.length;index+=2)guide.fillStyle(0xf1e3b5,.86).fillCircle(points[index].x,points[index].y,3);
    this.tweens.add({targets:guide,alpha:0,duration:900,delay:2400,onComplete:()=>{guide.destroy();if(this.routeGuide===guide)this.routeGuide=undefined}});
  }

  private plannedRoadPath(id:AreaId){
    const entrance=BUILDING_PORTALS[id].approach;
    this.roadPosition=locateRoadPosition(this.player.x,this.player.y);
    const nodeRoute=roadNodeRoute(this.player.x,this.player.y,entrance.x,entrance.y);
    const roadPath=expandedRoadPathFrom(this.roadPosition,nodeRoute);
    if(!roadPath.length)return terrainRoute({x:this.player.x,y:this.player.y},entrance,16);
    const first=roadPath[0];
    const connector=terrainRoute({x:this.player.x,y:this.player.y},first,16);
    if(!connector.length&&Phaser.Math.Distance.Between(this.player.x,this.player.y,first.x,first.y)>24)return[];
    const combined=[...connector,...roadPath];
    return combined.filter((point,index)=>index===0||Phaser.Math.Distance.Between(point.x,point.y,combined[index-1].x,combined[index-1].y)>2);
  }

  private cancelPath(){
    this.target=undefined;this.targetPath=[];this.pendingEntry=undefined;this.movementMode='road';this.pathAge=0;this.stalledFor=0;this.entryIdleFor=0;this.entryRecoveryAttempts=0;this.player?.setVelocity(0);
  }

  private createSecrets() {
    const secret = (id: string, x: number, y: number, color: number) => {
      const rune = this.add.circle(x, y, 15, color, .72).setDepth(y).setInteractive({ useHandCursor: true });
      if (!this.reducedMotion) this.tweens.add({ targets: rune, alpha: .25, scale: 1.3, yoyo: true, repeat: -1, duration: 1500 });
      rune.on('pointerdown', () => { gameEvents.emit('secret', { id }); rune.disableInteractive().setAlpha(.2); });
    };
    secret('pine', 245, 310, 0xc8a46a); secret('stele', 1170, 230, 0x202d2a); secret('crane', 1580, 625, 0xf1ebdd);
    secret('grotto', 1710, 150, 0xc8a46a);
  }

  private createGuardianShrines(){
    const zh=(localStorage.getItem('i18nextLng')||navigator.language).startsWith('zh');
    const shrinePoints=[{id:'guardian-west',x:598,y:982},{id:'guardian-east',x:1202,y:982}];
    for(const shrine of shrinePoints){
      const zone=this.add.zone(shrine.x,shrine.y,92,92).setOrigin(.5).setInteractive({useHandCursor:true}).setDepth(20010);
      const halo=this.add.ellipse(shrine.x,shrine.y+8,76,28,0xd7b36e,0).setDepth(55);
      const label=this.add.text(shrine.x,shrine.y-58,zh?'灵官护法':'GATE GUARDIAN',{fontFamily:'serif',fontSize:'12px',color:'#f1ebdd',backgroundColor:'#202d2ad9',padding:{x:7,y:3}}).setOrigin(.5).setDepth(20011).setAlpha(0);
      zone.on('pointerover',()=>{label.setAlpha(1);halo.setAlpha(.2)});
      zone.on('pointerout',()=>{label.setAlpha(0);halo.setAlpha(0)});
      zone.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{pointer.event.stopPropagation();gameEvents.emit('secret',{id:shrine.id});label.setText(zh?'灵官镇守山门，明辨善恶':'The guardian watches the gate and discerns right from wrong').setAlpha(1);halo.setAlpha(.28)});
    }
  }

  private createAtmosphere() {
    for (let i = 0; i < 12; i++) {
      const cloud = this.add.ellipse(i * 170, 100 + (i%4)*250, 190, 55, 0xf1ebdd, .18).setDepth(9000);
      this.tweens.add({ targets: cloud, x: cloud.x + 420, duration: 14000 + i*850, repeat: -1, yoyo: true, ease: 'Sine.inOut' });
    }
    const caveMist=this.add.ellipse(1728,152,120,35,0xf1ebdd,.24).setDepth(44);
    const caveHint=this.add.text(1728,110,(localStorage.getItem('i18nextLng')||navigator.language).startsWith('zh')?'洞天云息':'GROTTO BREATH',{fontFamily:'serif',fontSize:'12px',color:'#d9c98e',backgroundColor:'#202d2aaa',padding:{x:8,y:4}}).setOrigin(.5).setDepth(46).setAlpha(.72);
    if(!this.reducedMotion){this.tweens.add({targets:caveMist,scaleX:1.22,alpha:.1,x:1750,duration:3600,yoyo:true,repeat:-1,ease:'Sine.InOut'});this.tweens.add({targets:caveHint,alpha:.35,duration:1800,yoyo:true,repeat:-1})}
    for(let index=0;index<7;index++){
      const leaf=this.add.ellipse(index%2?28:this.scale.width-28,100+index*105,10+index%3*3,28,0x24483f,.2).setScrollFactor(0).setDepth(30000).setAngle(index%2?28:-28);
      this.tweens.add({targets:leaf,y:leaf.y+55,x:leaf.x+(index%2?35:-35),angle:leaf.angle+35,duration:4200+index*430,yoyo:true,repeat:-1,ease:'Sine.InOut'});
    }
  }

  update(_time:number,delta:number) {
    if(this.movementMode==='entering-portal'||this.movementMode==='locked')return;
    if(this.inputLockedUntil>0){this.inputLockedUntil-=delta;this.player.setVelocity(0);return}
    if(!canWalk({x:this.player.x,y:this.player.y})){
      const safe=nearestWalkableTerrainPoint({x:this.player.x,y:this.player.y});
      this.player.setPosition(safe.x,safe.y).setVelocity(0);this.cancelPath();
    }
    const deltaSeconds=Math.min(delta,50)/1000;
    const beforeX=this.player.x,beforeY=this.player.y;
    const v = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown || this.keys.D.isDown) - Number(this.cursors.left.isDown || this.keys.A.isDown) + this.joystick.x,
      Number(this.cursors.down.isDown || this.keys.S.isDown) - Number(this.cursors.up.isDown || this.keys.W.isDown) + this.joystick.y,
      );
      if (v.lengthSq() > .02&&this.movementMode!=='exiting-portal') {
        v.normalize();
        // Keep the current road edge while the visitor is moving. Re-projecting
        // every frame makes nearby branches fight for the character at junctions
        // (most visibly on the western route to the Wish Pavilion). Only recover
        // the road position after a real teleport or an external displacement.
        const trackedPoint=roadPoint(this.roadPosition);
        if(Phaser.Math.Distance.Between(this.player.x,this.player.y,trackedPoint.x,trackedPoint.y)>28){
          this.roadPosition=locateRoadPosition(this.player.x,this.player.y);
        }
        const nextRoadPosition=advanceRoadPosition(this.roadPosition,{x:v.x,y:v.y},WALK_SPEED*deltaSeconds);
      const next=roadPoint(nextRoadPosition);
      if(canWalk(next)){this.roadPosition=nextRoadPosition;this.player.setPosition(next.x,next.y)}
      this.player.setVelocity(0);
      this.target = undefined;
      this.targetPath = [];
      this.pendingEntry = undefined;
      this.movementMode='road';
    }
    else if (this.target) {
      const toTarget=this.target.clone().subtract(new Phaser.Math.Vector2(this.player.x,this.player.y));
      const step=(this.pendingEntry?APPROACH_SPEED:WALK_SPEED)*deltaSeconds;
      if(toTarget.length()<=Math.max(2,step)){
        this.player.setPosition(this.target.x,this.target.y).setVelocity(0);
        this.target=this.targetPath.shift();
        this.roadPosition=locateRoadPosition(this.player.x,this.player.y);
      }else{
        toTarget.normalize().scale(step);
        const next={x:this.player.x+toTarget.x,y:this.player.y+toTarget.y};
        if(canWalk(next))this.player.setPosition(next.x,next.y);
        else if(this.pendingEntry){this.target=undefined;this.targetPath=[];this.entryIdleFor=850}
        else this.cancelPath();
        this.player.setVelocity(0);
        this.roadPosition=locateRoadPosition(this.player.x,this.player.y);
      }
    } else {
      this.player.setVelocity(0);
    }
    if(this.movementMode==='exiting-portal'&&!this.target&&this.targetPath.length===0){this.movementMode='road';this.inputLockedUntil=0;this.roadPosition=locateRoadPosition(this.player.x,this.player.y)}
    const movedX=this.player.x-beforeX,movedY=this.player.y-beforeY;
    const moving = movedX*movedX+movedY*movedY>.002;
    this.updateTrailDirection();
    this.updateImmersiveCamera(movedX,movedY,moving,delta);
    if(this.target){this.pathAge+=delta;this.stalledFor=moving?0:this.stalledFor+delta;if(this.stalledFor>900||this.pathAge>30000){this.cancelPath();return}}else{this.pathAge=0;this.stalledFor=0}
    const walkPulse = moving && !this.reducedMotion ? Math.sin(this.time.now / 85) : 0;
    if(Math.abs(movedX)>.01)this.player.setFlipX(movedX<0);
    this.player.setDepth(this.player.y + 50).setAngle(walkPulse * 2.2).setScale(this.playerBaseScale.x, this.playerBaseScale.y * (1 + Math.abs(walkPulse) * .035));
    this.playerName.setPosition(this.player.x,this.player.y-42).setDepth(this.player.y+51).setAlpha(moving?.58:1);
    let found: AreaId | undefined;
    for (const [id, zone] of this.zones) if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), zone.getBounds())) found = id;
    if (found !== this.nearby) {
      if (this.nearby) gameEvents.emit('nearby', { id: this.nearby, active: false });
      this.nearby = found;
      if (found) gameEvents.emit('nearby', { id: found, active: true });
    }
    if(this.pendingEntry&&!this.target&&this.targetPath.length===0){
      const portal=BUILDING_PORTALS[this.pendingEntry];
      const distance=Phaser.Math.Distance.Between(this.player.x,this.player.y,portal.approach.x,portal.approach.y);
      this.entryIdleFor+=delta;
      if(distance<64){
        this.player.setPosition(portal.approach.x,portal.approach.y).setVelocity(0);
        this.enterInterior(this.pendingEntry);
      }else if(this.entryIdleFor>800&&this.entryRecoveryAttempts<1){
        this.entryRecoveryAttempts++;this.entryIdleFor=0;
        const route=this.plannedRoadPath(this.pendingEntry);
        if(route.length){this.targetPath=route.map(point=>new Phaser.Math.Vector2(point.x,point.y));this.target=this.targetPath.shift();this.pathAge=0;this.stalledFor=0}
        else this.cancelPath();
      }else if(this.entryIdleFor>1800)this.cancelPath();
    }else if(this.target){
      this.entryIdleFor=0;
    }
    let foundNpc:NpcId|undefined;
    for(const[id,zone]of this.npcZones)if(Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(),zone.getBounds()))foundNpc=id;
    if(foundNpc!==this.nearbyNpc){if(this.nearbyNpc)gameEvents.emit('npcNearby',{id:this.nearbyNpc,active:false});this.nearbyNpc=foundNpc;if(foundNpc)gameEvents.emit('npcNearby',{id:foundNpc,active:true})}
  }
}
