import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {loadProgress,saveProgress} from '../progress/progress';
import {AmazonBookLink,SupportPanel} from '../support/SupportPanel';
import {gameEvents} from '../../game/events';

export function WishPanel(){
  const {i18n}=useTranslation();const zh=i18n.resolvedLanguage==='zh';
  const [text,setText]=useState('');const [paymentOpened,setPaymentOpened]=useState(false);const [hung,setHung]=useState(false);
  const finish=()=>{if(!text.trim()||!paymentOpened||hung)return;const wish=text.trim(),theme='blessing';const p=loadProgress();p.wishes.unshift({text:wish,theme,date:new Date().toISOString()});p.xp+=10;saveProgress(p);setHung(true);gameEvents.emit('wishHung',{text:wish,theme})};
  return <div className={`feature wish ${hung?'wish-complete':''}`}>
    <div className={`wish-lantern ${hung?'hung':''}`}>{hung?text.slice(0,18):(zh?'愿':'WISH')}</div>
    {!hung&&<><p>{zh?'在刚刚取下的祈福纸上写下心愿：':'Write your wish on the paper you have just taken:'}</p><textarea value={text} onChange={event=>{setText(event.target.value);setPaymentOpened(false)}} maxLength={80} autoFocus placeholder={zh?'写下一句只保存在此设备上的心愿…':'Write a wish kept only on this device…'}/>{text.trim()&&<SupportPanel context="wish" onPaymentOpen={()=>setPaymentOpened(true)}/>} {paymentOpened&&<button className="primary-button wish-confirm" onClick={finish}>{zh?'我已完成支持，挂上心愿':'I have completed support — hang my wish'}</button>}<small>{zh?'PayPal.Me 暂不提供自动支付回调，请在完成支持后返回确认。心愿不会公开。':'PayPal.Me does not provide an automatic payment callback. Return to confirm after supporting. Your wish remains private.'}</small></>}
    {hung&&<div className="wish-blessing" role="status"><b>✦ {zh?'心愿已挂上云中祈福树':'Your wish now rests upon the cloud-blessing tree'}</b><p>{zh?'愿山风护送此念，愿你在行动中与所愿相逢。':'May the mountain wind carry this intention, and may your actions meet it halfway.'}</p></div>}
    {hung&&<AmazonBookLink compact/>}
  </div>;
}
