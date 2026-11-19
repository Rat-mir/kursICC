import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { createComposer, defaultLayers } from './composition.js';
import { Back, Credits, Field, FieldError, Form, Resource, categories, statuses } from './ui.jsx';

export function Editor({id, saved, user, notify, refresh, publish}) {
  if(saved)return <Resource path={'/characters/'+id}>{({data})=><OpenEditor id={data.maker_id} character={data} {...{user,notify,refresh,publish}}/>}</Resource>;
  return <OpenEditor id={id} {...{user,notify,refresh,publish}}/>;
}
function OpenEditor({id,...props}) {
  return <Resource path={'/makers/'+id}>{({data})=>data.status==='approved'
    ?<Builder maker={data} {...props}/>
    :<section className="panel"><h1>Мейкер недоступен</h1><p>{statuses[data.status]}</p></section>}</Resource>;
}
function Thumbnail({composer,asset}) {
  const [src,setSrc]=useState('');
  useEffect(()=>{
    let current=true;
    composer.thumbnail(asset).then(value=>{if(current)setSrc(value);},()=>{});
    return ()=>{current=false;};
  },[composer,asset]);
  return src?<img src={src} alt=""/>:<span className="thumbnail-placeholder" aria-hidden="true">◇</span>;
}
function Builder({maker,character,user,notify,refresh,publish}) {
  const assets=maker.assets.filter(asset=>asset.is_active);
  const vector=Boolean(maker.vector_style);
  const imported=assets.some(asset=>asset.vector?.dicebear);
  const labels={...categories,face:vector?'Глаза':'Лицо'};
  if(maker.vector_style==='furry')labels.body='Вид и шерсть';
  if(maker.vector_style==='pony')Object.assign(labels,{body:'Масть',hair:'Грива и хвост',clothes:'Украшения',accessory:'Рог и крылья'});
  for(const asset of assets)if(asset.vector?.label)labels[asset.category]=asset.vector.label;
  const groups=Object.keys(labels).filter(key=>assets.some(asset=>asset.category===key));
  const [category,setCategory]=useState(groups.includes('hair')?'hair':groups[0]);
  const [selected,setSelected]=useState(()=>character?character.assets.filter(item=>assets.some(asset=>asset.id===item.id)):defaultLayers(assets));
  const [composer]=useState(createComposer);
  const canvas=useRef(null);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let current=true;
    setReady(false);
    composer.draw(canvas.current,selected).then(()=>{if(current)setReady(true);},error=>{if(current)notify(error.message);});
    return ()=>{current=false;};
  },[composer,selected,notify]);

  const items=assets.filter(asset=>asset.category===category);
  const active=selected.find(asset=>asset.category===category);
  const furry=maker.vector_style==='furry'&&category==='body';
  const required=imported?items.some(asset=>asset.vector?.required):vector&&['body','face'].includes(category);
  const variants=new Map();
  for(const asset of items){
    if(furry&&asset.vector.coat!==(active?.vector.coat??0))continue;
    const key=asset.vector?.variant??asset.id;
    if(!variants.has(key)||asset.vector?.color===active?.vector?.color)variants.set(key,asset);
  }
  const colors=active?.vector?items.filter(asset=>asset.vector?.variant===active.vector.variant):[];
  const coats=furry&&active?items.filter(asset=>asset.vector.species===active.vector.species&&asset.vector.color===active.vector.color):[];
  function choose(asset) {
    setSelected(previous=>{
      const next=[...previous],index=next.findIndex(item=>item.category===category);
      if(index>=0)next.splice(index,1,...(asset?[asset]:[]));
      else if(asset)next.push(asset);
      return vector||index<0?next.sort((a,b)=>a.layer_order-b.layer_order):next;
    });
  }
  function move(index,delta) {
    setSelected(previous=>{
      const next=[...previous],target=index+delta;
      [next[index],next[target]]=[next[target],next[index]];
      return next;
    });
  }
  async function withPNG(done) {
    setBusy(true);
    try{await done(await composer.png(selected));}
    catch(error){notify(error.message);}
    finally{setBusy(false);}
  }
  function download(blob) {
    const link=document.createElement('a');
    link.download='icc-character.png';
    link.href=URL.createObjectURL(blob);
    link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }
  return <>
    <Back to={character?'characters':'catalog'}>{character?'Мои персонажи':'Мейкеры'}</Back>
    <div className="page-heading"><h1>{maker.title}</h1><p className="muted">{maker.description}</p><Credits maker={maker}/></div>
    <div className="editor">
      <section className="canvas-wrap">
        <canvas ref={canvas} id="character-canvas" data-ready={ready} width="512" height="512" aria-label="Предпросмотр персонажа"/>
        <div className="actions">
          <button type="button" className="secondary" onClick={()=>setSelected(groups.map(key=>{
            const options=assets.filter(asset=>asset.category===key);
            return options[Math.floor(Math.random()*options.length)];
          }).sort((a,b)=>a.layer_order-b.layer_order))}>Случайный образ</button>
          <button type="button" disabled={busy||!ready} onClick={()=>withPNG(download)}>Скачать PNG</button>
          {user&&<button type="button" className="secondary" disabled={busy||!ready} onClick={()=>withPNG(blob=>publish({blob,characterId:character?.id,name:character?.name||''}))}>Создать публикацию</button>}
        </div>
      </section>
      <section className="editor-controls">
        <div className="part-tabs" aria-label="Части образа">{groups.map(key=><button key={key} type="button" className="secondary" aria-pressed={category===key} onClick={()=>setCategory(key)}>{labels[key]}</button>)}</div>
        <div className="part-options">
          {coats.length>0&&<div className="coat-row" aria-label="Рисунок шерсти">{coats.map(asset=><button key={asset.id} type="button" className="secondary" aria-pressed={active.id===asset.id} onClick={()=>choose(asset)}>{['Однотонная','Полосы','Пятна'][asset.vector.coat]}</button>)}</div>}
          {colors.length>1&&<div className="swatch-row" aria-label="Цвет">{colors.map(asset=><button key={asset.id} type="button" className="swatch" style={{'--swatch':asset.vector.color}} aria-label={'Цвет '+asset.vector.color} aria-pressed={active.id===asset.id} onClick={()=>choose(asset)}/>)}</div>}
          <div className="part-grid">
            {!required&&<button type="button" className="part-choice" aria-pressed={!active} onClick={()=>choose(null)}>{maker.vector_style==='pony'&&category==='accessory'?'Обычный пони':'Без детали'}</button>}
            {[...variants.values()].map(asset=><button key={asset.vector?.variant??asset.id} type="button" className="part-choice" aria-pressed={asset.id===active?.id} onClick={()=>choose(asset)}><Thumbnail composer={composer} asset={asset}/><span>{furry?asset.name.split(' · ')[0]:asset.name}</span></button>)}
          </div>
        </div>
        {!vector&&<details className="layer-details"><summary>Порядок слоёв</summary>{selected.map((asset,index)=><div key={asset.id} className="layer-order"><span>{asset.name}</span><span><button type="button" className="secondary small" disabled={index===0} aria-label="Выше" onClick={()=>move(index,-1)}>↑</button> <button type="button" className="secondary small" disabled={index===selected.length-1} aria-label="Ниже" onClick={()=>move(index,1)}>↓</button></span></div>)}</details>}
        {user?<Form id="character-form" run={async form=>{
          const {data}=await api('/characters'+(character?'/'+character.id:''),{method:character?'PUT':'POST',body:{name:form.get('name'),maker_id:maker.id,asset_ids:selected.map(asset=>asset.id)}});
          notify('Персонаж сохранён');
          if(character)refresh();else location.hash='character/'+data.id;
        }}>{errors=><><Field name="name" label="Имя персонажа" defaultValue={character?.name} required maxLength={255} errors={errors}/><FieldError name="asset_ids" errors={errors}/><button type="submit">{character?'Сохранить изменения':'Сохранить персонажа'}</button></>}</Form>:<p className="hint"><a href="#login">Войдите</a>, чтобы сохранить персонажа в аккаунте.</p>}
      </section>
    </div>
  </>;
}
