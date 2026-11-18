import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { drawHexagram, type Hexagram } from '../../data/hexagrams/hexagrams';
import { addPractice } from '../progress/progress';
import { ShareActions } from '../sharing/ShareActions';
import {AmazonBookLink} from '../support/SupportPanel';

type OraclePanelProps = { autoDrawKey?: number };
type GuidanceKey = keyof Hexagram['guidance'];

const guidanceLabels: Record<GuidanceKey, [string,string]> = {
  career:['事业与工作','Career'], love:['感情与关系','Love'], outlook:['发展趋势','Outlook'], money:['金钱与资源','Money'],
  well_being:['身心状态','Well-being'], family:['家庭','Family'], personal_growth:['个人成长','Personal growth'], caution:['需要避免','Caution']
};

function guidanceFor(question:string):GuidanceKey {
  const value=question.toLowerCase();
  if(/工作|事业|职业|生意|公司|老板|job|career|business|work/.test(value))return 'career';
  if(/感情|爱情|婚姻|恋爱|伴侣|love|relationship|marriage/.test(value))return 'love';
  if(/钱|财|收入|投资|买|卖|money|finance|income|invest/.test(value))return 'money';
  if(/健康|身体|睡眠|焦虑|情绪|health|body|sleep|well.?being/.test(value))return 'well_being';
  if(/家庭|父母|孩子|家人|family|parent|child/.test(value))return 'family';
  if(/成长|学习|改变自己|方向|growth|learn|myself/.test(value))return 'personal_growth';
  return 'outlook';
}

const favorableHexagrams=new Set([1,2,8,11,13,14,15,16,19,24,26,31,32,35,37,40,42,45,46,48,50,53,57,58,61]);
const obstructedHexagrams=new Set([3,6,12,23,28,29,33,36,39,47]);
const changingHexagrams=new Set([17,18,21,30,38,41,43,44,49,51,54,55,56,59,63,64]);

function tendencyZh(number:number){
  if(favorableHexagrams.has(number))return '整体趋向偏顺，但仍需以稳健行动承接时机';
  if(obstructedHexagrams.has(number))return '当前阻力较明显，宜守住根本，不宜勉强推进';
  if(changingHexagrams.has(number))return '事情正处于变化或转折期，结果尚未完全定型';
  return '走势相对平稳，后续成败取决于行动的分寸与持续性';
}

function chineseGuidance(result:Hexagram,key:GuidanceKey){
  const principle=`以“${result.keywordsZh}”为原则`;
  const advice:Record<GuidanceKey,string>={
    career:`事业与工作方面，${principle}。先处理最关键的问题，避免为了速度破坏长期基础。`,
    love:`感情与关系方面，${principle}。观察双方真实行动，以坦诚沟通代替猜测或控制。`,
    outlook:`${tendencyZh(result.number)}。${result.reflectionZh}`,
    money:`金钱与资源方面，${principle}。先保护必要储备，再决定投入；不因一时情绪作重大选择。`,
    well_being:`身心方面，${principle}。调整节奏并留意身体反馈；如涉及健康问题，应寻求专业意见。`,
    family:`家庭方面，${principle}。先厘清责任和边界，再以稳定、可持续的方式提供支持。`,
    personal_growth:`个人成长方面，${principle}。把本卦的提醒落实为一个当下能够完成的小行动。`,
    caution:`不要急于求成，也不要反复求签来寻找想听的答案。先实践本卦所提示的“${result.keywordsZh}”。`
  };
  return advice[key];
}

export function OraclePanel({ autoDrawKey }: OraclePanelProps) {
  const { i18n } = useTranslation();
  const zh = i18n.resolvedLanguage === 'zh';
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<Hexagram>();
  const [shaking, setShaking] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const guidanceKey=guidanceFor(question);

  const reveal = useCallback((delay = 850) => {
    if (timer.current) window.clearTimeout(timer.current);
    setShaking(true);
    timer.current = window.setTimeout(() => {
      setResult(drawHexagram());
      setShaking(false);
      addPractice({ oracleCount: 1 }, 20);
      timer.current = undefined;
    }, delay);
  }, []);

  useEffect(() => {
    if (!autoDrawKey) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current=undefined;setQuestion('');setResult(undefined);setShaking(false);
  }, [autoDrawKey]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return <div className="feature">
    <div className="oracle-master-dialogue"><b>{zh?'玄微道长':'Master Xuanwei'}</b><p>{zh ? '道友，竹签既已取来，请先静心写下所问之事。问题落定之后，我再为你解签。' : 'Traveler, you have brought the bamboo stick. Settle your mind and write your question; only then shall I interpret the sign.'}</p></div>
    <textarea value={question} onChange={event => setQuestion(event.target.value)} maxLength={160} placeholder={zh ? '请输入想占问的问题……' : 'Enter the question you wish to reflect on…'} />
    <button className="primary-button oracle-submit" onClick={() => reveal(420)} disabled={shaking||!question.trim()}>
      {shaking ? (zh ? '道长正在解签…' : 'The master is interpreting…') : result ? (zh?'重新解签':'Interpret again') : (zh ? '请道长解签' : 'Ask the master to interpret')}
    </button>
    {result && <article className="oracle-result">
      <span>{result.symbol}</span>
      <div className="hex-lines" aria-label={zh ? '自下而上的六爻' : 'Six lines, read bottom upward'}>
        {[...result.lines].reverse().map((line, index) => <i key={index} className={line} style={{ animationDelay: `${(5 - index) * .12}s` }}>
          {line === 'yin' && <><b /><b /></>}
        </i>)}
      </div>
      <h3>{result.number}. {zh ? result.zh : result.en}</h3>
      <b className="oracle-theme">{zh ? result.keywordsZh : `${result.themeEn} · ${result.keywordsEn}`}</b>
      <p className="oracle-reflection">{zh ? result.reflectionZh : result.reflectionEn}</p>
      <div className="oracle-guidance">
        <span>{zh ? `卦象判断 · ${guidanceLabels[guidanceKey][0]}` : guidanceLabels[guidanceKey][1]}</span>
        <p>{zh ? chineseGuidance(result,guidanceKey) : result.guidance[guidanceKey]}</p>
      </div>
      <div className="oracle-caution"><b>{zh ? '需要留意' : 'Caution'}</b><p>{zh ? chineseGuidance(result,'caution') : result.guidance.caution}</p></div>
      <small>{zh ? `依据第 ${result.number} 卦「${result.zh}」生成中文卦象启示。` : `Quoted from The I Ching Book of Answers, page ${result.bookPage}.`}</small>
      <small>{zh ? '传统文化与哲学反思体验，不用于预测未来。' : 'A cultural reflection experience, not a prediction of the future.'}</small>
      <ShareActions title={`${result.symbol} ${zh ? result.zh : result.en}`} detail={zh ? result.reflectionZh : result.reflectionEn} />
      <div className="oracle-aftercare"><AmazonBookLink compact/></div>
    </article>}
  </div>;
}
