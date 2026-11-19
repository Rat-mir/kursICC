import { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, session } from './api.js';
import { Catalog, Characters, MakerEditor, Review, Users } from './catalog.jsx';
import { Editor } from './editor.jsx';
import { Post, PostEditor, Posts } from './posts.jsx';
import { Action, Author, Denied, Field, Form, isAdmin, json } from './ui.jsx';
import './style.css';

const routes=[
  {links:[['catalog','▦','Мейкеры',['maker']],['posts','▤','Сообщество',['post','new-post','edit-post']]]},
  {title:'Личное',access: user=>Boolean(user),links:[['characters','◇','Мои персонажи',['character']],['studio','✎','Мастерская',['edit']]]},
  {title:'Управление',access:isAdmin,links:[['admin','☷','Заявки',['review']],['admin-posts','▤','Публикации',[]],['users','♙','Аккаунты',[]]]},
];
const authRoutes=['studio','edit','characters','character','new-post','edit-post'];
const adminRoutes=['admin','review','admin-posts','users'];

function Sidebar({user,page,logout,notify}) {
  return <aside className="sidebar">
    <a className="brand" href="#catalog"><img className="brand-mark" src="./mascot.png" width="46" height="46" alt=""/>ICC</a>
    <nav id="nav" aria-label="Основное меню">
      {routes.filter(group=>!group.access||group.access(user)).map(group=><div className="nav-group" key={group.title||'public'}>
        {group.title&&<strong>{group.title}</strong>}
        {group.links.map(([route,icon,title,children])=><a key={route} href={'#'+route} aria-current={route===page||children.includes(page)?'page':undefined}><span aria-hidden="true">{icon}</span>{title}</a>)}
      </div>)}
    </nav>
    <div id="account">{user?<><span className="account-name"><Author user={user}/>{isAdmin(user)&&<span className="badge">Администратор</span>}</span><Action id="logout" className="secondary small" run={logout} notify={notify}>Выйти</Action></>:<><a href="#login">Войти</a><a className="button small" href="#register">Регистрация</a></>}</div>
  </aside>;
}
function Auth({register,onAuth}) {
  return <section className="panel auth"><h1>{register?'Регистрация':'Вход'}</h1>
    <Form id="auth" run={async form=>{
      const result=await api(register?'/register':'/login',{method:'POST',body:json(form)});
      onAuth(result,register);
    }}>{errors=><>
      {register&&<Field name="name" label="Ваше имя" required maxLength={100} autoComplete="name" errors={errors}/>}
      <Field name="email" label="Электронная почта" type="email" required autoComplete="email" errors={errors}/>
      <Field name="password" label="Пароль" type="password" required minLength={8} maxLength={128} autoComplete={register?'new-password':'current-password'} errors={errors}/>
      {register&&<Field name="password_confirmation" label="Повторите пароль" type="password" required minLength={8} autoComplete="new-password" errors={errors}/>}
      <button type="submit">{register?'Зарегистрироваться':'Войти'}</button>
    </>}</Form>
    <p className="hint">{register?<>Уже есть аккаунт? <a href="#login">Войти</a></>:<>Нет аккаунта? <a href="#register">Создать</a></>}</p>
  </section>;
}
function Screen({page,id,query,user,notify,refresh,draft,publish,clearDraft,syncUser,onAuth}) {
  const admin=isAdmin(user);
  if((authRoutes.includes(page)&&!user)||(adminRoutes.includes(page)&&!admin))return <Denied/>;
  switch(page) {
    case 'login':case 'register':return <Auth register={page==='register'} onAuth={onAuth}/>;
    case 'catalog':case 'studio':case 'admin':return <Catalog route={page} {...{query,notify,refresh}}/>;
    case 'edit':return <MakerEditor {...{id,user,admin,notify,refresh,syncUser}}/>;
    case 'maker':case 'character':return <Editor saved={page==='character'} {...{id,user,notify,refresh,publish}}/>;
    case 'characters':return <Characters {...{query,notify,refresh}}/>;
    case 'posts':case 'admin-posts':return <Posts moderation={page==='admin-posts'} {...{query,user,notify,refresh}}/>;
    case 'post':return <Post {...{id,user,notify,refresh}}/>;
    case 'new-post':case 'edit-post':return <PostEditor id={page==='edit-post'?id:null} {...{user,draft,clearDraft}}/>;
    case 'review':return <Review {...{id,notify,refresh}}/>;
    case 'users':return <Users {...{query,user,notify,refresh}}/>;
    default:return <section className="panel"><h1>Страница не найдена</h1><a href="#catalog">В каталог</a></section>;
  }
}

function App() {
  const [hash,setHash]=useState(location.hash.slice(1)||'catalog');
  const [user,setUser]=useState(null);
  const [starting,setStarting]=useState(Boolean(session.token));
  const [version,setVersion]=useState(0);
  const [draft,setDraft]=useState(null);
  const [notice,setNotice]=useState(null);
  const notify=useCallback(message=>setNotice({message}),[]);
  const refresh=()=>setVersion(value=>value+1);
  useEffect(()=>{
    function navigate(){setHash(location.hash.slice(1)||'catalog');window.scrollTo(0,0);}
    function unauthorized(){setUser(null);setDraft(null);notify('Сессия завершена. Войдите снова.');}
    window.addEventListener('hashchange',navigate);
    window.addEventListener('icc:unauthorized',unauthorized);
    if(session.token)api('/user').then(({data})=>setUser(data)).catch(()=>{session.token=null;}).finally(()=>setStarting(false));
    return ()=>{window.removeEventListener('hashchange',navigate);window.removeEventListener('icc:unauthorized',unauthorized);};
  },[notify]);
  useEffect(()=>{
    if(!notice)return;
    const timer=setTimeout(()=>setNotice(null),4500);
    return ()=>clearTimeout(timer);
  },[notice]);
  async function logout() {
    try{await api('/logout',{method:'POST'});}catch(error){notify(error.message);}
    session.token=null;setUser(null);setDraft(null);location.hash='catalog';refresh();
  }
  function onAuth({user,token},register) {
    session.token=token;setUser(user);notify(register?'Аккаунт создан':'Вы вошли в ICC');location.hash='catalog';
  }
  const publish=value=>{setDraft(value);location.hash='new-post';};
  const syncUser=async()=>setUser((await api('/user')).data);
  const [path,query='']=hash.split('?');
  const [page,id]=path.split('/');
  return <>
    <Sidebar {...{user,page,logout,notify}}/>
    <main id="app">{starting?<p role="status">Загрузка…</p>:<Screen key={hash+'@'+version} {...{page,id,query,user,notify,refresh,draft,publish,syncUser,onAuth}} clearDraft={()=>setDraft(null)}/>}</main>
    <footer className="site-footer"><div><strong>Creators</strong><br/>Nedosekova Alexandra · frontend<br/>Ibragimov Ratmir · backend</div><div>Курсовое задание · IS-24-22b<br/>© 2026 Interactive Character Catalog</div></footer>
    <div id="toast" role="status" hidden={!notice}>{notice?.message}</div>
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
