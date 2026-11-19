import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { createComposer } from './composition.js';
import { Action, Author, Back, Field, Form, Heading, Media, Pagination, Resource, isAdmin, json } from './ui.jsx';

export function Posts({query,user,moderation,refresh,notify}) {
  const base=moderation?'/admin/posts':'/posts';
  return <Resource path={base+'?'+query}>{({data,meta})=><>
    <Heading title={moderation?'Модерация публикаций':'Сообщество'}>{user&&!moderation&&<a className="button" href="#new-post">Создать публикацию</a>}</Heading>
    {!data.length&&<div className="empty">Публикаций пока нет.</div>}
    <div className="grid">{data.map(post=><article className="card" key={post.id}>
      <a className="thumb" href={'#post/'+post.id}><Media url={post.image_url} alt={post.title}/></a>
      <div className="card-body"><span className="eyebrow"><Author user={post.author}/></span><h3><a href={'#post/'+post.id}>{post.title}</a></h3>
        <div className="muted">♡ {post.likes_count} · комментариев {post.comments_count}{!post.is_visible&&' · Скрыт'}</div>
        {moderation&&post.is_visible&&<HidePost id={post.id} {...{refresh,notify}}/>}
      </div>
    </article>)}</div><Pagination meta={meta} route={moderation?'admin-posts':'posts'} query={query}/>
  </>}</Resource>;
}
function HidePost({id,refresh,notify}) {
  return <Action className="secondary small danger" notify={notify} run={async()=>{await api('/admin/posts/'+id+'/hide',{method:'POST'});notify('Публикация скрыта');refresh();}}>Скрыть</Action>;
}
function Menu({children}) {
  const ref=useRef(null);
  useEffect(()=>{
    function close(event){if(ref.current&&!ref.current.contains(event.target))ref.current.open=false;}
    function escape(event){if(event.key==='Escape'&&ref.current?.open){ref.current.open=false;ref.current.querySelector('summary').focus();}}
    document.addEventListener('click',close);
    document.addEventListener('keydown',escape);
    return ()=>{document.removeEventListener('click',close);document.removeEventListener('keydown',escape);};
  },[]);
  return <details ref={ref} className="action-menu"><summary aria-label="Действия">⋯</summary><div>{children}</div></details>;
}
export function Post({id,user,refresh,notify}) {
  return <Resource path={'/posts/'+id}>{({data})=><Discussion post={data} {...{user,refresh,notify}}/>}</Resource>;
}
function Discussion({post,user,refresh,notify}) {
  const id=post.id,admin=isAdmin(user),manage=user&&(admin||user.id===post.user_id);
  const [reaction,setReaction]=useState({liked:post.liked,likes_count:post.likes_count});
  return <>
    <Back to="posts">Сообщество</Back><Heading title={post.title}>{manage&&<Menu>
      <a href={'#edit-post/'+id}>Редактировать</a>
      <Action notify={notify} run={async()=>{if(confirm('Удалить публикацию?')){await api('/posts/'+id,{method:'DELETE'});notify('Публикация удалена');location.hash='posts';}}}>Удалить</Action>
      {admin&&post.is_visible&&<HidePost {...{id,refresh,notify}}/>}
    </Menu>}</Heading>
    <div className="split post-layout"><Media className="post-image" url={post.image_url} alt={post.title}/><div>
      <section className="panel post-meta"><b><Author user={post.author}/></b>{post.body&&<p className="post-body">{post.body}</p>}
        <div className="post-reactions">{user&&post.is_visible
          ?<Action className="secondary" notify={notify} aria-pressed={Boolean(reaction.liked)} aria-label="Нравится" run={async()=>{
            const {data}=await api('/posts/'+id+'/like',{method:reaction.liked?'DELETE':'PUT'});
            setReaction(data);
          }}>{reaction.liked?'♥':'♡'} {reaction.likes_count}</Action>
          :<span>♡ {reaction.likes_count}</span>}</div>
      </section>
      <section className="panel discussion"><h2>Комментарии <span className="muted">{post.comments_count}</span></h2>
        {post.comments.map(comment=><article key={comment.id} className="comment"><div className="row"><b><Author user={comment.author}/></b>
          {user&&(admin||user.id===comment.user_id)&&<Menu><Action notify={notify} run={async()=>{if(confirm('Удалить комментарий?')){await api('/comments/'+comment.id,{method:'DELETE'});refresh();}}}>Удалить</Action></Menu>}
        </div><p>{comment.body}</p></article>)}
        {user&&post.is_visible?<Form id="comment-form" run={async form=>{await api('/posts/'+id+'/comments',{method:'POST',body:json(form)});refresh();}}>{errors=><><Field as="textarea" name="body" label="Комментарий" required maxLength={2000} errors={errors}/><button type="submit">Отправить</button></>}</Form>:!user&&<p><a href="#login">Войдите</a>, чтобы написать комментарий.</p>}
      </section>
    </div></div>
  </>;
}

export function PostEditor({id,user,draft,clearDraft}) {
  if(id)return <Resource path={'/posts/'+id}>{({data})=>data.user_id===user.id||isAdmin(user)
    ?<Composer existing={data} chars={[]}/>
    :<section className="panel"><h1>Редактирование недоступно</h1><Back to="posts">Сообщество</Back></section>}</Resource>;
  return <Resource path="/characters?per_page=100">{({data})=><Composer chars={data.filter(character=>character.user_id===user.id)} {...{draft,clearDraft}}/>}</Resource>;
}
function Composer({existing,chars,draft,clearDraft}) {
  const [source,setSource]=useState(draft?'draft':'file');
  const [character,setCharacter]=useState('');
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState({blob:null,url:null,error:null,busy:false});
  useEffect(()=>{
    if(existing)return;
    let current=true, url;
    setPreview({blob:null,url:null,error:null,busy:true});
    async function prepare() {
      if(source==='file')return file;
      if(source==='draft')return draft?.blob;
      if(character){
        const {data}=await api('/characters/'+character);
        return createComposer().png(data.assets);
      }
    }
    prepare().then(blob=>{
      if(!current)return;
      url=blob?URL.createObjectURL(blob):null;
      setPreview({blob,url,error:null,busy:false});
    },error=>{if(current)setPreview({blob:null,url:null,error,busy:false});});
    return ()=>{current=false;if(url)URL.revokeObjectURL(url);};
  },[existing,source,character,file,draft]);
  return <>
    <Back to={existing?'post/'+existing.id:'posts'}>{existing?'Публикация':'Сообщество'}</Back>
    <Heading title={existing?'Редактировать публикацию':'Новая публикация'}/>
    <div className="split compose">
      <section className="panel"><h2>Изображение</h2>{existing?<Media className="post-image" url={existing.image_url} alt="Предпросмотр"/>
        :preview.url?<img className="post-image" src={preview.url} alt="Предпросмотр"/>
        :<div className="empty">{preview.error?.message||(preview.busy?'Загрузка…':'Выберите изображение')}</div>}</section>
      <Form className="panel" id="post-form" run={async form=>{
        if(existing){await api('/posts/'+existing.id,{method:'PATCH',body:json(form)});location.hash='post/'+existing.id;return;}
        if(!preview.blob||preview.busy)throw Error('Выберите изображение.');
        const characterId=source==='character'?character:source==='draft'?draft?.characterId:null;
        form.delete('source');form.delete('character_id');
        if(characterId)form.set('character_id',characterId);
        form.set('image',preview.blob,'character.png');
        const {data}=await api('/posts',{method:'POST',body:form});
        clearDraft();location.hash='post/'+data.id;
      }}>{errors=><>
        <Field name="title" label="Название" required maxLength={255} defaultValue={existing?.title||draft?.name||''} errors={errors}/>
        <Field as="textarea" name="body" label="Описание" maxLength={3000} defaultValue={existing?.body} errors={errors}/>
        {!existing&&<>
          <Field as="select" name="source" label="Источник изображения" value={source} onChange={event=>{setSource(event.target.value);setFile(null);}} errors={errors}>
            {draft&&<option value="draft">Образ из редактора</option>}{chars.length>0&&<option value="character">Сохранённый персонаж</option>}<option value="file">Загрузить PNG</option>
          </Field>
          {source==='character'&&<Field as="select" name="character_id" label="Персонаж" required value={character} onChange={event=>setCharacter(event.target.value)} errors={errors}><option value="">Выберите персонажа</option>{chars.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</Field>}
          {source==='file'&&<Field name="image" label="PNG до 5 МБ" type="file" accept="image/png" required onChange={event=>setFile(event.target.files[0]||null)} errors={errors}/>}
        </>}
        <button type="submit" disabled={!existing&&preview.busy}>{existing?'Сохранить':'Опубликовать'}</button>
      </>}</Form>
    </div>
  </>;
}
