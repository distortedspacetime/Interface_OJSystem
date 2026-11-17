import logo from '../assets/interface-logo.png'

export default function AppHeader({ user, screen, group, onNavigate, onChangeUser }) {
  const active = ['detail', 'submit'].includes(screen) ? 'list' : screen
  return <header className="topbar"><div className="topbar-inner">
    <button className="brand" type="button" onClick={() => onNavigate(user ? 'groups' : 'entry')} aria-label="Interface Online Judge 홈">
      <img src={logo} alt="IF" width="49" height="49" /><span className="brand-label">Interface Online Judge</span>
    </button>
    {user && <>
      <nav className="nav" aria-label="주 메뉴">
        {[['groups', '그룹 선택'], ['list', '문제 목록'], ['sets', '문제집 목록'], ['submissions', '내 제출']].map(([key, label]) => <button type="button" key={key} className={`nav-item ${active === key ? 'active' : ''}`} aria-current={active === key ? 'page' : undefined} disabled={['list', 'sets'].includes(key) && !group} onClick={() => onNavigate(key)}>{label}</button>)}
      </nav>
      <div className="account"><span className="account-name">{user.username} 님</span><button type="button" className="account-button" onClick={onChangeUser}>사용자 변경</button></div>
    </>}
  </div></header>
}
