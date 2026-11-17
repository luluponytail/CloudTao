import bookInsightsData from './bookInsights.json';

export interface Hexagram {
  number: number; symbol: string; lines: Array<'yang'|'yin'>; zh: string; en: string; keywordsZh: string; keywordsEn: string; chapter: number;
  bookCode: string; bookPage: number; themeEn: string; reflectionZh: string; reflectionEn: string;
  guidance: Record<'career'|'love'|'outlook'|'money'|'well_being'|'family'|'personal_growth'|'caution', string>;
}

type BookInsight = {
  code:string; theme:string; reflection:string; career:string; love:string; outlook:string; money:string;
  well_being:string; family:string; personal_growth:string; caution:string; bookPage:number;
};

// Bottom line first. 1 = yang (solid), 0 = yin (broken), in King Wen order.
const patterns=['111111','000000','100010','010001','111010','010111','010000','000010','111011','110111','111000','000111','101111','111101','001000','000100','100110','011001','110000','000011','100101','101001','000001','100000','100111','111001','100001','011110','010010','101101','001110','011100','001111','111100','000101','101000','101011','110101','001010','010100','110001','100011','111110','011111','000110','011000','010110','011010','101110','011101','100100','001001','001011','110100','101100','001101','011011','110110','010011','110010','110011','001100','101010','010101'] as const;

const rows: Array<[string,string,string,string]> = [
['乾','The Creative','刚健，自强','creative force and purposeful action'],['坤','The Receptive','包容，承载','receptivity and devoted support'],['屯','Difficulty at the Beginning','初生，积蓄','patient beginnings'],['蒙','Youthful Folly','启蒙，求学','learning with humility'],
['需','Waiting','等待，涵养','prepared waiting'],['讼','Conflict','争执，审慎','careful resolution of conflict'],['师','The Army','纪律，统领','discipline and collective purpose'],['比','Holding Together','亲比，合作','union and mutual support'],
['小畜','Small Taming','积小，待时','gentle restraint'],['履','Treading','谨慎，礼序','mindful conduct'],['泰','Peace','通达，和谐','harmony and flourishing'],['否','Standstill','闭塞，守正','integrity through stagnation'],
['同人','Fellowship','同道，协作','fellowship and shared purpose'],['大有','Great Possession','丰盛，谦明','abundance with responsibility'],['谦','Modesty','谦逊，平衡','modesty and balance'],['豫','Enthusiasm','喜悦，预备','enthusiasm with preparation'],
['随','Following','顺势，择善','adaptive following'],['蛊','Work on Decay','整治，更新','repairing what has decayed'],['临','Approach','临近，教化','approach and attentive leadership'],['观','Contemplation','观察，省思','contemplation and perspective'],
['噬嗑','Biting Through','决断，明罚','decisive removal of obstacles'],['贲','Grace','文饰，本质','grace grounded in substance'],['剥','Splitting Apart','剥落，静守','letting go and conserving strength'],['复','Return','回归，复始','return and renewal'],
['无妄','Innocence','真诚，无妄','sincerity without contrivance'],['大畜','Great Taming','蓄德，止健','cultivating great strength'],['颐','Nourishment','养正，慎言','nourishment and mindful speech'],['大过','Great Exceeding','非常，担当','extraordinary responsibility'],
['坎','The Abysmal Water','险阻，诚信','courage through recurring danger'],['离','The Clinging Fire','光明，依附','clarity and interdependence'],['咸','Influence','感应，相悦','mutual influence'],['恒','Duration','恒久，守常','endurance and consistency'],
['遁','Retreat','退避，保全','timely retreat'],['大壮','Great Power','强盛，守礼','power guided by restraint'],['晋','Progress','前进，光明','progress and recognition'],['明夷','Darkening of the Light','韬光，守明','protecting inner light'],
['家人','The Family','家道，分工','order in close relationships'],['睽','Opposition','分歧，求同','difference and constructive contrast'],['蹇','Obstruction','艰难，反省','turning inward amid obstruction'],['解','Deliverance','缓解，宽恕','release and resolution'],
['损','Decrease','减损，诚敬','simplifying with sincerity'],['益','Increase','增益，利他','increase through contribution'],['夬','Breakthrough','决断，告诫','resolute breakthrough'],['姤','Coming to Meet','相遇，警觉','unexpected encounter'],
['萃','Gathering Together','聚集，敬诚','gathering around shared values'],['升','Pushing Upward','上升，积累','gradual advancement'],['困','Oppression','困境，守志','resilience under pressure'],['井','The Well','滋养，共享','renewable shared resources'],
['革','Revolution','变革，顺时','timely transformation'],['鼎','The Cauldron','更新，养贤','renewal and cultural nourishment'],['震','The Arousing Thunder','震动，警醒','awakening through shock'],['艮','Keeping Still Mountain','止静，知止','stillness and right timing'],
['渐','Development','渐进，正序','gradual development'],['归妹','The Marrying Maiden','关系，位置','relationship and proper position'],['丰','Abundance','丰盛，日中','abundance at its peak'],['旅','The Wanderer','旅行，谨慎','adaptability while traveling'],
['巽','The Gentle Wind','柔入，申命','gentle penetration'],['兑','The Joyous Lake','喜悦，交流','joy and open exchange'],['涣','Dispersion','涣散，凝聚','dissolving division'],['节','Limitation','节制，适度','healthy limits'],
['中孚','Inner Truth','诚信，感通','inner truth and trust'],['小过','Small Exceeding','小事，谨慎','care in small matters'],['既济','After Completion','已成，防乱','vigilance after completion'],['未济','Before Completion','未成，慎终','care before completion']
];

const reflectionsZh = [
  '主动开创，并以持续行动让最初的力量真正落地。','让事物向你而来；大地不争，却能承载万物。','开端的混乱不是失败，先建立秩序，再稳步生长。','承认未知，以谦逊和正确的问题开启学习。',
  '时机未到时先准备自己，成熟的等待也是行动。','分歧需要边界与克制，胜负未必比止争更重要。','把力量组织起来，用纪律服务共同目标。','寻找能让你安定的同伴，联合始于共同方向。',
  '用温和的约束积蓄小力量，不必急于突破。','每一步都要谨慎而真诚，在复杂处境中守住礼度。','天地相交时让合作自然发生，并珍惜畅通的时机。','道路暂时闭塞，保存力量；停顿是准备，不是失败。',
  '在差异中寻找共同目标，让坦诚的合作超越小圈子。','拥有越多，责任越大；让丰盛惠及他人。','成就无需喧示，准确看见自己，才能保持平衡。','让安静的喜悦带来动力，同时给热情一个实际计划。',
  '顺应值得追随的方向，但不要放弃自己的判断。','面对已经腐坏之处，追溯根源并耐心修复。','以开放和关怀接近他人，影响力来自真正的在场。','退后观察，不急于干预；停止搅动后，格局才会显现。',
  '明确咬断阻碍，规则与证据能让决定保持公正。','形式应服务本质，美可以照亮内容，却不能替代内容。','释放正在脱落的事物，旧结构退去才有新空间。','回到最初正确的一步，微小复归能够开启新周期。',
  '不带算计地回应当下，以真诚代替对结果的操控。','先储蓄知识、品格与力量，真正强大懂得适时停止。','留意你吸收的食物、语言和思想，它们正在塑造你。','承重已经超过常态，需要非凡担当，也需要及时减负。',
  '危险反复出现时保持诚实和节奏，一步一步穿越。','让清明依附于正确的事物，光亮需要稳定的燃料。','真正的影响来自相互感应，不靠强迫推动。','长久不是僵化，而是在变化中持续守住核心。',
  '及时退让可以保存尊严与力量，不必在错误战场证明自己。','力量旺盛时更要克制，让能力服从正当目的。','像太阳一样稳定上升，持续可见胜过短暂耀眼。','环境不利时保护内在光明，暂不显露并非放弃原则。',
  '从亲近关系开始明确责任与言行，家庭秩序来自一致示范。','差异不必被消灭，找出可以并存的小共识。','遇到阻碍先停下反省并寻求帮助，绕行有时就是正路。','松开已经解开的结，让宽恕与行动完成真正的释放。',
  '有意识地减少，腾出空间给真正重要的事物。','增长来自贡献；把资源投向能共同受益的方向。','说清必须改变之处，果断行动，但不要把决心变成攻击。','突然而来的相遇很有力量，先设边界，再判断是否接纳。',
  '把属于同一目标的人与资源聚在一起，中心必须真诚可靠。','像树木一样逐寸上升，稳定积累比跳跃更可信。','外在受困时守住内在尺度，真实的话语能够穿过困境。','修整取水的井与工具，让共同资源重新滋养众人。',
  '变革要等到必要性与时机都清楚，再以可信方式更新旧制。','把原料转化为滋养，更新承载价值的器皿与文化。','震动先带来惊惧，稳住之后，它会唤醒真正重要的事。','完全停下来；静止不是空白，而是一切行动的根基。',
  '遵循自然次序慢慢成熟，不用催促尚未扎根的进展。','看清自己在关系中的位置，不要用幻想替代真实条件。','丰盛已到高点，及时照亮关键事务，并为转折做准备。','身在旅途要保持谦逊、清醒与轻装，不把临时处当作永久。',
  '像风一样反复而温和地进入，持续的小影响能够改变整体。','真诚交流让喜悦流动，但快乐也需要边界与深度。','溶解隔阂，让共同信念重新把分散的人心连接起来。','建立适度限制，使自由、资源和承诺都能长久。',
  '从内在真实出发，言行一致才能建立可信的连接。','此时适合把小事做好；低飞、谨慎，不追求过度扩张。','事情看似完成，恰恰需要维护细节，防止秩序重新松散。','尚未完成时不要急着跨越最后一步，辨清位置再抵达彼岸。'
];

const bookByCode = new Map((bookInsightsData as BookInsight[]).map(item => [item.code, item]));

export const hexagrams: Hexagram[] = rows.map((row, index) => {
  const code=patterns[index];
  const book=bookByCode.get(code);
  if(!book)throw new Error(`Missing book insight for hexagram code ${code}`);
  return {
    number:index+1, symbol:String.fromCodePoint(0x4dc0+index), lines:[...code].map(line=>line==='1'?'yang':'yin'),
    zh:row[0], en:row[1], keywordsZh:row[2], keywordsEn:row[3], chapter:index+1,
    bookCode:code, bookPage:book.bookPage, themeEn:book.theme, reflectionZh:reflectionsZh[index], reflectionEn:book.reflection,
    guidance:{career:book.career,love:book.love,outlook:book.outlook,money:book.money,well_being:book.well_being,family:book.family,personal_growth:book.personal_growth,caution:book.caution}
  };
});

export function drawHexagram(random = Math.random) { return hexagrams[Math.floor(random()*hexagrams.length)]; }
