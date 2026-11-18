import {useTranslation} from 'react-i18next';
import {isSafeExternalUrl,supportConfig} from '../../config/support';

export function AmazonBookLink({compact=false}:{compact?:boolean}){
  const {i18n}=useTranslation();
  const zh=i18n.resolvedLanguage==='zh';
  if(!isSafeExternalUrl(supportConfig.amazonBookUrl))return null;
  return <a className={`amazon-book-link ${compact?'compact':''}`} href={supportConfig.amazonBookUrl} target="_blank" rel="noopener noreferrer">
    <span>易</span><span><b>The I Ching Book of Answers</b><small>{zh?'在 Amazon 查看本书':'View the book on Amazon'}</small></span><i aria-hidden="true">↗</i>
  </a>;
}
