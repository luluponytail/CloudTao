export type AreaId = 'gate' | 'oracle' | 'meditation' | 'taichi' | 'library' | 'garden' | 'wish' | 'bamboo' | 'sanqing' | 'wealth';

export interface AreaDefinition {
  id: AreaId; x: number; y: number; w: number; h: number; roof: number; accent: number;
}

export const WORLD = { width: 1800, height: 1120 } as const;

// Walkable doorway positions on the illustrated production map. Keeping these
// separate from the decorative building bounds prevents art/layout updates
// from silently breaking interaction detection.
export const AREA_ENTRANCES: Record<AreaId, {x:number;y:number}> = {
  gate: {x:900,y:1015},
  oracle: {x:305,y:463},
  meditation: {x:900,y:175},
  sanqing: {x:900,y:431},
  wealth: {x:434,y:276},
  taichi: {x:900,y:552},
  library: {x:1477,y:421},
  garden: {x:1547,y:673},
  wish: {x:410,y:710},
  bamboo: {x:1734,y:186},
};

export interface BuildingPortal {
  approach: {x:number;y:number};
  threshold: {x:number;y:number};
  interior: {x:number;y:number};
}

// The road endpoint and the visible doorway are deliberately separate. The
// player remains road-bound until `approach`, then crosses the short portal
// strip under scene control instead of being allowed to walk over the roof.
export const BUILDING_PORTALS: Record<AreaId, BuildingPortal> = {
  gate:       {approach:{x:900,y:1015},threshold:{x:900,y:990},interior:{x:900,y:958}},
  oracle:     {approach:{x:305,y:463}, threshold:{x:305,y:442},interior:{x:305,y:412}},
  meditation: {approach:{x:900,y:175}, threshold:{x:900,y:154},interior:{x:900,y:126}},
  sanqing:    {approach:{x:900,y:431}, threshold:{x:900,y:405},interior:{x:900,y:369}},
  wealth:     {approach:{x:434,y:276}, threshold:{x:434,y:255},interior:{x:434,y:226}},
  taichi:     {approach:{x:900,y:552}, threshold:{x:900,y:533},interior:{x:900,y:505}},
  library:    {approach:{x:1477,y:421},threshold:{x:1477,y:400},interior:{x:1477,y:371}},
  garden:     {approach:{x:1547,y:673},threshold:{x:1547,y:652},interior:{x:1547,y:624}},
  // The pavilion is reached from the dry stone bridge on its right. The old
  // point (211,700) was beneath the pavilion and inside the stream mask.
  wish:       {approach:{x:410,y:710}, threshold:{x:372,y:690},interior:{x:330,y:665}},
  bamboo:     {approach:{x:1734,y:186},threshold:{x:1734,y:167},interior:{x:1734,y:142}},
};

export const SAFE_EXITS: Record<AreaId,{x:number;y:number}> = Object.fromEntries(
  Object.entries(BUILDING_PORTALS).map(([id,portal])=>[id,{...portal.approach}])
) as Record<AreaId,{x:number;y:number}>;

// Choke-point halls need a short automatic egress before controls are returned.
// In particular, walking straight down from the Wealth Hall doorway touches the
// Oracle Hall collision body; this route performs the visible right turn first.
export const EXIT_EGRESS_ROUTES:Partial<Record<AreaId,Array<{x:number;y:number}>>>={
  wealth:[{x:434,y:276},{x:482,y:276},{x:512,y:300},{x:565,y:338}],
  wish:[{x:410,y:710},{x:390,y:700},{x:370,y:689},{x:350,y:680}],
};

export const areas: AreaDefinition[] = [
  { id: 'gate', x: 900, y: 980, w: 220, h: 78, roof: 0x6c3d32, accent: 0xc8a46a },
  { id: 'sanqing', x: 900, y: 335, w: 330, h: 175, roof: 0x24483f, accent: 0xc8a46a },
  { id: 'wealth', x: 434, y: 225, w: 190, h: 125, roof: 0x315b50, accent: 0xc8a46a },
  { id: 'oracle', x: 305, y: 420, w: 190, h: 130, roof: 0x24483f, accent: 0xc8a46a },
  { id: 'meditation', x: 900, y: 130, w: 230, h: 145, roof: 0x315b50, accent: 0x9eb5ad },
  { id: 'library', x: 1477, y: 370, w: 215, h: 140, roof: 0x3f5148, accent: 0xc8a46a },
  { id: 'taichi', x: 900, y: 552, w: 260, h: 110, roof: 0x6d5242, accent: 0xe3d5b9 },
  { id: 'garden', x: 1547, y: 625, w: 190, h: 110, roof: 0x47685b, accent: 0xadc19b },
  { id: 'wish', x: 211, y: 650, w: 160, h: 105, roof: 0x70473d, accent: 0xd7b36e },
  { id: 'bamboo', x: 1734, y: 145, w: 130, h: 90, roof: 0x24483f, accent: 0x819a94 },
];
