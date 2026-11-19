import { useEffect, useRef, useState } from 'react';
import { api, imageBlob } from './api.js';
import { createComposer, defaultLayers } from './composition.js';

export const statuses = {draft:'Черновик',pending:'На проверке',approved:'Опубликован',revision:'На доработке',rejected:'Отклонён',hidden:'Скрыт'};
export const categories = {background:'Фон',body:'Основа',clothes:'Одежда',face:'Лицо',hair:'Причёска',accessory:'Аксессуар'};
export const json = form => Object.fromEntries(form);
export const isAdmin = user => user?.role === 'admin';
export function Author({user}) {
  return <>{user?.name}{user?.is_creator && <span className="creator-mark" title="Креатор" aria-label="Креатор"> ✦</span>}</>;
}
export function Badge({status, label}) {
  return <span className={'badge '+status}>{label || statuses[status] || status}</span>;
}
export function Denied() {
  return <section className="panel"><h1>Нужен доступ</h1><p>Войдите в аккаунт с подходящей ролью.</p><a className="button" href="#login">Войти</a></section>;
}
export function Heading({title,children}) {
  return <div className="row page-heading"><h1>{title}</h1>{children}</div>;
}
export function Back({to,children}) {
  return <a className="back-link" href={'#'+to}>← {children}</a>;
}
export function useResource(path) {
  const [state,setState]=useState({path:null,value:null,error:null});
  useEffect(()=>{
    if(!path)return;
    let current=true;
    api(path).then(value=>{if(current)setState({path,value,error:null});},
      error=>{if(current)setState({path,value:null,error});});
    return ()=>{current=false;};
  },[path]);
  return state.path===path?state:{value:null,error:null};
}
export function Resource({path,children}) {
  const {value,error}=useResource(path);
  if(error)return <section className="panel"><h1>Не удалось загрузить данные</h1><p role="alert">{error.message}</p><a href="#catalog">В каталог</a></section>;
  return value?children(value):<p className="muted" role="status">Загрузка…</p>;
}
export function Form({run,children,className,id}) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState(null);
  async function submit(event) {
    event.preventDefault();
    if(busy)return;
    const data=new FormData(event.currentTarget);
    setError(null);
    setBusy(true);
    try{await run(data);}
    catch(failure){setError(failure);}
    finally{setBusy(false);}
  }
  return <form id={id} className={className} onSubmit={submit}>
    {error && <div className="form-error" role="alert">{error.message}</div>}
    <fieldset disabled={busy}>{typeof children==='function'?children(error?.errors || {}):children}</fieldset>
  </form>;
}
export function FieldError({errors,name}) {
  const messages=Object.entries(errors || {}).filter(([key])=>key===name || key.startsWith(name+'.')).flatMap(([,value])=>value);
  return messages.length>0 && <span className="field-error">{messages.join(' ')}</span>;
}
export function Field({label,errors,name,as:Tag='input',children,...props}) {
  return <label>{label}<Tag name={name} aria-invalid={Boolean(errors?.[name]) || undefined} {...props}>{children}</Tag><FieldError errors={errors} name={name}/></label>;
}
export function Action({run,notify,children,className='',...props}) {
  const [busy,setBusy]=useState(false);
  return <button type="button" className={className} disabled={busy} {...props} onClick={async()=>{
    setBusy(true);
    try{await run();}catch(error){notify(error.message);}
    finally{setBusy(false);}
  }}>{children}</button>;
}
export function Pagination({meta,route,query}) {
  if(!meta)return null;
  const href=page=>{const params=new URLSearchParams(query);params.set('page',page);return '#'+route+'?'+params;};
  return <div className="pagination">
    {meta.current_page>1 && <a className="button secondary small" href={href(meta.current_page-1)}>← Назад</a>}
    <span className="muted">Страница {meta.current_page} из {meta.last_page} · всего {meta.total}</span>
    {meta.current_page<meta.last_page && <a className="button secondary small" href={href(meta.current_page+1)}>Далее →</a>}
  </div>;
}
export function Media({url,alt='',...props}) {
  const [src,setSrc]=useState(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(!url)return;
    let current=true, objectUrl;
    setSrc(null);setFailed(false);
    imageBlob(url).then(value=>{
      if(!current){URL.revokeObjectURL(value);return;}
      objectUrl=value;setSrc(value);
    },()=>{if(current)setFailed(true);});
    return ()=>{current=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[url]);
  return src?<img src={src} alt={alt} {...props}/>:<span className="placeholder" aria-label={failed?'Изображение недоступно':alt}>◇</span>;
}
export function Canvas({makerId,assets,id,...props}) {
  const canvas=useRef(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    let current=true;
    const target=canvas.current;
    const composer=createComposer();
    setReady(false);
    const fetchAssets=assets?Promise.resolve(assets):api('/makers/'+makerId).then(({data})=>data.assets);
    fetchAssets.then(list=>{
      if(current)return composer.draw(target,defaultLayers(list || []),false);
    }).then(()=>{if(current)setReady(true);}).catch(()=>{});
    return ()=>{current=false;};
  },[makerId,assets]);
  return <>{!ready && <span className="placeholder">◇</span>}<canvas id={id} ref={canvas} hidden={!ready} width="512" height="512" {...props}/></>;
}
export function Credits({maker}) {
  const meta=maker.dicebear_meta;
  if(!meta)return null;
  const link=(title,url)=>/^https?:\/\//i.test(url||'')?<a href={url}>{title}</a>:title;
  return <p className="muted">Адаптация для ICC · {link(meta.creator.name,meta.creator.url)} · {link(meta.license.name,meta.license.url)} · {link('Оригинальный стиль','https://www.dicebear.com/styles/'+maker.vector_style+'/')}</p>;
}
