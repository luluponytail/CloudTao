import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {isSafeExternalUrl,paypalAmountUrl,supportConfig} from '../../config/support';

type SupportContext='oracle'|'wish'|'sanqing'|'wealth'|'taichi'|'meditation';
const amounts=[{value:3,zh:'一盏清茶',en:'Offer a cup of tea'},{value:5,zh:'添一盏灯',en:'Light a lantern'},{value:10,zh:'助建云上道观',en:'Help build Cloud Tao'}] as const;
const copy:Record<SupportContext,{icon:string;zh:string;en:string;detailZh:string;detailEn:string}>={
  meditation:{icon:'静',zh:'支持静心体验继续完善',en:'Support the meditation experience',detailZh:'静坐与呼吸引导始终免费。自愿支持将用于洞府美术、自然音景、双语引导与网站维护。',detailEn:'Meditation and breathing guidance remain free. Optional support helps fund grotto art, natural soundscapes, bilingual guidance, and maintenance.'},
  oracle:{icon:'卦',zh:'支持问道内容创作',en:'Support the Oracle experience',detailZh:'如果这次问道带来启发，可以自愿支持美术、文化内容和新卦象体验的开发。',detailEn:'If this reflection helped, you may support new art, cultural writing, and future oracle experiences.'},
  wish:{icon:'愿',zh:'许下心愿',en:'Make a wish',detailZh:'选择一份自愿支持，在 PayPal 官方页面完成后返回这里挂上祈福纸。',detailEn:'Choose a voluntary contribution, complete it on PayPal, then return here to hang your wish paper.'},
  sanqing:{icon:'道',zh:'支持云上道观继续建设',en:'Support the continued building of Cloud Tao',detailZh:'参观与观礼始终免费。自愿支持将用于新殿宇、像素角色、双语内容与网站维护。',detailEn:'Visiting and contemplation remain free. Voluntary support helps fund new halls, pixel characters, bilingual content, and maintenance.'},
  wealth:{icon:'财',zh:'添香支持道观建设',en:'Support Cloud Tao',detailZh:'上香与求愿无需付费。自愿支持将用于财神殿互动、美术资源、双语内容与网站维护。',detailEn:'Offering incense and making a wish are free. Optional support helps fund hall interactions, art, bilingual content, and maintenance.'},
  taichi:{icon:'极',zh:'支持太极教学内容',en:'Support the Tai Chi experience',detailZh:'跟练功能始终免费。自愿支持将用于动作美术、双语教学内容和后续课程开发。',detailEn:'Tai Chi practice remains free. Optional support helps fund movement art, bilingual instruction, and future lessons.'},
};

export function SupportPanel({context,onPaymentOpen}:{context:SupportContext;onPaymentOpen?:()=>void}){
  const {i18n}=useTranslation();const zh=i18n.resolvedLanguage==='zh';
  const [open,setOpen]=useState(false);const [amount,setAmount]=useState<number>(5);
  const item=copy[context],paypalReady=isSafeExternalUrl(supportConfig.paypalUrl),paymentUrl=paypalAmountUrl(amount);
  return <section className={`support-panel support-panel--${context}`} aria-label={zh?'支持项目开发':'Support project development'}>
    <button className="support-trigger" onClick={()=>setOpen(value=>!value)} aria-expanded={open}><i>{item.icon}</i><span><b>{zh?item.zh:item.en}</b><small>{zh?'完全自愿，不影响任何体验':'Entirely optional; no feature is affected'}</small></span></button>
    {open&&<div className="support-drawer"><p>{zh?item.detailZh:item.detailEn}</p><div className="support-amounts" role="group" aria-label={zh?'选择支持金额':'Choose an amount'}>{amounts.map(option=><button key={option.value} className={amount===option.value?'active':''} onClick={()=>setAmount(option.value)}><b>${option.value}</b><small>{zh?option.zh:option.en}</small></button>)}</div>
      {paypalReady?<a className="paypal-button" href={paymentUrl} target="_blank" rel="noopener noreferrer" onClick={onPaymentOpen}>PayPal · ${amount} USD</a>:<button className="paypal-button" disabled>{zh?'PayPal 支持即将开放':'PayPal support coming soon'}</button>}
      <small className="support-disclaimer">{zh?'支持款用于网站维护、美术资源与新内容开发；这不是慈善捐款或宗教功德交易。支付将在 PayPal 官方页面完成。':'Support funds website maintenance, art, and new content. This is not a charitable donation or religious transaction. Payment will be completed on PayPal.'}</small></div>}
  </section>;
}

export function AmazonBookLink({compact=false}:{compact?:boolean}){
  const {i18n}=useTranslation();const zh=i18n.resolvedLanguage==='zh';
  if(!isSafeExternalUrl(supportConfig.amazonBookUrl))return null;
  return <a className={`amazon-book-link ${compact?'compact':''}`} href={supportConfig.amazonBookUrl} target="_blank" rel="noopener noreferrer"><span>易</span><span><b>The I Ching Book of Answers</b><small>{zh?'在 Amazon 查看本书':'View the book on Amazon'}</small></span><i aria-hidden="true">↗</i></a>;
}
