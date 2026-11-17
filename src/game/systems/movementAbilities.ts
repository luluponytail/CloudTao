export type MovementAbilityId='walk'|'qinggong'|'cloudRiding';
export interface MovementAbility {id:MovementAbilityId;nameZh:string;nameEn:string;fictional:boolean;unlock:{type:'initial'|'taichiMinutes'|'hiddenSecrets';value:number}}
export const movementAbilities:MovementAbility[]=[
  {id:'walk',nameZh:'普通行走',nameEn:'Walk',fictional:false,unlock:{type:'initial',value:0}},
  {id:'qinggong',nameZh:'轻身术',nameEn:'Qinggong',fictional:true,unlock:{type:'taichiMinutes',value:10}},
  {id:'cloudRiding',nameZh:'御云术',nameEn:'Cloud Riding',fictional:true,unlock:{type:'hiddenSecrets',value:3}},
];
export function unlockedMovementAbilities(taichiMinutes:number,hiddenSecrets:number){return movementAbilities.filter(item=>item.unlock.type==='initial'||(item.unlock.type==='taichiMinutes'&&taichiMinutes>=item.unlock.value)||(item.unlock.type==='hiddenSecrets'&&hiddenSecrets>=item.unlock.value))}
