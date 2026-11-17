import {useTranslation} from 'react-i18next';
import {hexagrams} from '../../data/hexagrams/hexagrams';
import {AmazonBookLink} from '../support/SupportPanel';
import './library.css';

export function LibraryPanel(){
  const {i18n}=useTranslation();const zh=i18n.resolvedLanguage==='zh';
  return <div className="feature library">
    <blockquote>“{zh?'知人者智，自知者明。':'Knowing others is intelligence; knowing yourself is true clarity.'}”<small>— {zh?'《道德经》第三十三章':'Tao Te Ching, Chapter 33'}</small></blockquote>
    <div className="book-teaser"><span>易</span><div><b>The I Ching Book of Answers</b><small>{zh?'六十四卦，为现代生活提供沉静的反思入口。':'Sixty-four timeless perspectives for modern reflection.'}</small></div></div>
    <section className="library-book-cta"><span className="library-book-arrow">↓</span><b>{zh?'点击下方书籍卡片，前往 Amazon 查看或购买':'Select the book card below to view or buy it on Amazon'}</b><AmazonBookLink/></section>
    <h3>{zh?'六十四卦索引':'Index of 64 Hexagrams'}</h3><div className="hex-index">{hexagrams.map(h=><span key={h.number}>{h.symbol}<small>{h.number}. {zh?h.zh:h.en}</small></span>)}</div>
  </div>;
}
