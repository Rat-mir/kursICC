import { api } from './api.js';
import { Action, Author, Back, Badge, Canvas, Credits, Field, FieldError, Form, Heading, Media, Pagination, Resource, categories, json, statuses } from './ui.jsx';

export function Catalog({route,query,notify,refresh}) {
  const studio=route==='studio',admin=route==='admin';
  const params=new URLSearchParams(query);
  if(studio)params.set('mine','1');
  return <Resource path={(admin?'/admin':'')+'/makers?'+params}>
    {result=><>
      {studio||admin?<Heading title={studio?'Мастерская':'Заявки на модерацию'}>{studio&&<a className="button" href="#edit/new">Создать мейкер</a>}</Heading>
        :<section className="catalog-hero page-heading"><div><h1>Interactive Character Catalog</h1><p>Всем peace! Рады видеть вас, на нашем сайте.</p></div><img className="catalog-mascot" src="./mascot-peace.png" alt="Маскот ICC показывает жест мира" width="128" height="128"/></section>}
      {admin&&<Resource path="/admin/statistics">{({data})=><section className="panel"><h2>Статистика</h2><div className="stats">{[['Аккаунты',data.users],['Персонажи',data.characters],['Публикации',data.posts],['На проверке',data.makers_by_status.pending||0]].map(([label,value])=><div className="stat" key={label}><b>{value}</b>{label}</div>)}</div></section>}</Resource>}
      <Form className="toolbar catalog-filters" id="filters" run={form=>{
        const next=new URLSearchParams([...form].filter(([,value])=>value));
        if(next.get('sort')==='title')next.set('order','asc');
        location.hash=route+(next.size?'?'+next:'');
      }}>
        <Field name="search" label="Поиск" placeholder="Название мейкера" defaultValue={params.get('search')||''}/>
        {(admin||studio)&&<Field as="select" name="status" label="Статус" defaultValue={params.get('status')||''}><option value="">Все статусы</option>{Object.entries(statuses).filter(([key])=>!admin||key!=='draft').map(([key,label])=><option key={key} value={key}>{admin&&key==='approved'?'Одобрен':label}</option>)}</Field>}
        <Field as="select" name="sort" label="Сортировка" defaultValue={params.get('sort')||''}><option value="">По умолчанию</option><option value="created_at">Сначала новые</option><option value="title">По названию</option></Field>
        <button type="submit">Найти</button>
      </Form>
      <div className={'grid '+(admin?'':'maker-grid')}>{result.data.map(maker=>{
        const href='#'+(admin?'review':studio?'edit':'maker')+'/'+maker.id;
        return admin?<article key={maker.id} className="panel"><Badge status={maker.status} label={maker.status==='approved'?'Одобрен':undefined}/><h3>{maker.title}</h3><p><Author user={maker.creator}/></p><a href={href} className="button secondary">Открыть</a></article>
          :<article key={maker.id} className="card"><a className="thumb" href={href} aria-label={maker.title}><Canvas makerId={maker.id} data-maker-preview={maker.id}/></a><div className="card-body">
            <h3><a href={href}>{maker.title}</a></h3><div className="muted"><Author user={maker.creator}/></div>
            {studio&&<div className="row"><Badge status={maker.status}/>{['draft','revision'].includes(maker.status)&&!maker.vector_style&&<Action className="secondary small" notify={notify} run={async()=>{if(confirm('Удалить черновик мейкера?')){await api('/makers/'+maker.id,{method:'DELETE'});refresh();}}}>Удалить</Action>}</div>}
          </div></article>;
      })}</div>
      {!result.data.length&&<div className="empty">{admin&&!params.has('search')&&!params.has('status')?'Заявок пока нет.':'Мейкеры не найдены.'}</div>}
      <Pagination meta={result.meta} {...{route,query}}/>
    </>}
  </Resource>;
}

export function Characters({query,notify,refresh}) {
  return <Resource path={'/characters?'+query}>{({data,meta})=><>
    <Heading title="Мои персонажи"/>
    {!data.length&&<div className="empty">Создайте первого героя в <a href="#catalog">каталоге мейкеров</a>.</div>}
    <div className="grid">{data.map(character=><article className="panel" key={character.id}><h3>{character.name}</h3><p className="muted">{character.maker?.title}</p><div className="actions">
      <a className="button" href={'#character/'+character.id}>Открыть</a>
      <Action className="secondary danger" notify={notify} run={async()=>{if(confirm('Удалить сохранённого персонажа?')){await api('/characters/'+character.id,{method:'DELETE'});refresh();}}}>Удалить</Action>
    </div></article>)}</div><Pagination meta={meta} route="characters" query={query}/>
  </>}</Resource>;
}
function AssetFields({asset,errors,upload}) {
  return <>
    <Field name="name" label="Название слоя" errors={errors} defaultValue={asset?.name} required/>
    <Field as="select" name="category" label="Категория" errors={errors} defaultValue={asset?.category}>{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</Field>
    <Field name="layer_order" label="Порядок слоя" errors={errors} type="number" min="0" max="1000" defaultValue={asset?.layer_order??10} required/>
    {upload?<Field name="image" label="PNG-файл" errors={errors} type="file" accept="image/png" required/>:<label><input type="checkbox" name="is_active" defaultChecked={asset.is_active}/> Активен</label>}
  </>;
}
export function MakerEditor({id,user,admin,refresh,syncUser,notify}) {
  const props={id,refresh,syncUser,notify};
  if(id==='new')return <MakerForm {...props}/>;
  return <Resource path={'/makers/'+id}>{({data})=>data.vector_style||(!admin&&data.user_id!==user.id)
    ?<section className="panel"><h1>Редактирование недоступно</h1><Back to="studio">Мастерская</Back></section>
    :<MakerForm maker={data} {...props}/>}</Resource>;
}
function MakerForm({id,maker,refresh,syncUser,notify}) {
  const base='/makers/'+id;
  return <>
    <Back to="studio">Мастерская</Back><Heading title={maker?.title||'Новый мейкер'}>{maker&&<Badge status={maker.status}/>}</Heading>
    {maker?.review_comment&&<div className="review">{maker.review_comment}</div>}
    <div className="split">
      <section className="panel"><h2>О мейкере</h2>
        <Form id="maker-form" run={async form=>{
          const {data}=await api(maker?base:'/makers',{method:maker?'PATCH':'POST',body:json(form)});
          notify('Мейкер сохранён');
          if(maker)refresh();else location.hash='edit/'+data.id;
        }}>{errors=><><Field name="title" label="Название" errors={errors} defaultValue={maker?.title} required maxLength={255}/><Field as="textarea" name="description" label="Описание" errors={errors} defaultValue={maker?.description} required maxLength={5000}/><button type="submit">Сохранить</button></>}</Form>
        <p className="hint">Изменение опубликованного набора снимает его с публикации до новой проверки.</p>
        {maker&&<Form id="submit-maker" run={async()=>{await api(base+'/submit',{method:'POST'});await syncUser();notify('Заявка отправлена администратору');refresh();}}>{errors=><><FieldError name="assets" errors={errors}/><button type="submit">Отправить на проверку →</button></>}</Form>}
      </section>
      <section className="panel"><h2>PNG-слои</h2><p className="muted">До 5 МБ · 16–2048 px · одинаковый размер всех PNG. Для проверки обязательны body и face.</p>
        {maker?<Form id="asset-form" run={async form=>{await api(base+'/assets',{method:'POST',body:form});notify('PNG загружен');refresh();}}>{errors=><><AssetFields errors={errors} upload/><button type="submit">Загрузить PNG</button></>}</Form>:<p>Сначала сохраните мейкер.</p>}
      </section>
    </div>
    {maker&&<section className="panel"><h2>Элементы набора</h2><div className="asset-list">{maker.assets.map(asset=><Form key={asset.id} className="asset-box" run={async form=>{
      await api(base+'/assets/'+asset.id,{method:'PATCH',body:{...json(form),is_active:form.has('is_active')}});
      notify('Слой обновлён');refresh();
    }}>{errors=><><Media url={asset.image_url} alt={asset.name}/><AssetFields asset={asset} errors={errors}/><div className="actions"><button className="small" type="submit">Обновить</button><Action className="danger small" notify={notify} run={async()=>{if(confirm('Удалить PNG-элемент?')){await api(base+'/assets/'+asset.id,{method:'DELETE'});refresh();}}}>Удалить</Action></div></>}</Form>)}</div></section>}
  </>;
}

export function Review({id,refresh,notify}) {
  const base='/admin/makers/'+id;
  return <Resource path={'/makers/'+id}>{({data:maker})=><>
    <Back to="admin">Все заявки</Back><Heading title={maker.title}><Badge status={maker.status}/></Heading><p>{maker.description}</p><p className="muted">Автор: <Author user={maker.creator}/></p>
    <div className="split"><section className="panel"><h2>Содержимое набора</h2>
      {maker.dicebear_meta?<><Canvas assets={maker.assets} id="review-preview" className="post-image" aria-label="Предпросмотр мейкера"/><Credits maker={maker}/></>:<div className="asset-list">{maker.assets.map(asset=><div key={asset.id} className="asset-box"><Media url={asset.image_url} alt={asset.name}/><b>{asset.name}</b><p className="muted">{asset.category} · слой {asset.layer_order}</p></div>)}</div>}
    </section><section className="panel"><h2>Решение администратора</h2>
      {maker.review_comment&&<div className="review">{maker.review_comment}</div>}
      {maker.status==='pending'?<Form id="review-form" run={async form=>{await api(base+'/review',{method:'POST',body:json(form)});notify('Решение сохранено');refresh();}}>{errors=><>
        <Field as="select" name="decision" label="Решение" errors={errors}><option value="approve">Одобрить</option>{!maker.dicebear_meta&&<option value="request-revision">Вернуть на доработку</option>}<option value="reject">Отклонить</option></Field>
        <Field as="textarea" name="review_comment" label="Комментарий" errors={errors} maxLength={2000}/><p className="hint">При отказе укажите причину.</p><button type="submit">Сохранить решение</button>
      </>}</Form>:<p>{maker.status==='approved'?'Одобрен':statuses[maker.status]}</p>}
      {maker.status==='approved'&&<Action className="danger" notify={notify} run={async()=>{await api(base+'/hide',{method:'POST'});notify('Мейкер скрыт');refresh();}}>Скрыть мейкер</Action>}
    </section></div>
  </>}</Resource>;
}
export function Users({query,user,refresh,notify}) {
  return <Resource path={'/admin/users?'+query}>{({data,meta})=><>
    <Heading title="Аккаунты и роли"/><p className="muted">Смена роли и блокировка завершают активные сеансы аккаунта.</p>
    <section className="panel">{data.map(account=><Form key={account.id} className="user-row" run={async form=>{
      await api('/admin/users/'+account.id,{method:'PATCH',body:{role:form.get('role'),is_blocked:form.has('is_blocked')}});
      notify('Аккаунт обновлён');refresh();
    }}>{errors=><><span><b><Author user={account}/></b><br/><small>{account.email}</small></span>
      <Field as="select" name="role" label="Роль" errors={errors} defaultValue={account.role} disabled={account.id===user.id}>{Object.entries({user:'Пользователь',creator:'Креатор',admin:'Администратор'}).map(([key,label])=><option key={key} value={key}>{label}</option>)}</Field>
      <div><label><input type="checkbox" name="is_blocked" defaultChecked={account.is_blocked} disabled={account.id===user.id}/> Заблокирован</label><button className="small" disabled={account.id===user.id}>Сохранить</button></div></>}</Form>)}</section>
    <Pagination meta={meta} route="users" query={query}/>
  </>}</Resource>;
}
