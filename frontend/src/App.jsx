import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:9050' })

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/auth/me').then(res => setProfile(res.data)).catch(() => setProfile(null))
    } else {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      setProfile(null)
    }
  }, [token])

  const login = async (email, password) => {
    setError('')
    try {
      const data = new URLSearchParams({ username: email, password })
      const res = await api.post('/auth/token', data)
      setToken(res.data.access_token)
    } catch (err) {
      setError(err.response?.data?.detail || 'Giriş başarısız')
    }
  }

  const register = async (payload) => {
    setError('')
    await api.post('/auth/register', payload)
    await login(payload.email, payload.password)
  }

  const logout = () => setToken(null)

  return { token, profile, login, register, logout, error }
}

function TransactionForm({ onCreated }) {
  const [form, setForm] = useState({ type: 'expense', amount: '', category: 'genel', note: '' })
  const submit = async (e) => {
    e.preventDefault()
    await onCreated({ ...form, amount: Number(form.amount), occurred_at: new Date().toISOString() })
    setForm({ ...form, amount: '', note: '' })
  }
  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="pill-tabs">
        <button type="button" className={form.type === 'expense' ? 'active' : ''} onClick={() => setForm({ ...form, type: 'expense' })}>Gider</button>
        <button type="button" className={form.type === 'income' ? 'active' : ''} onClick={() => setForm({ ...form, type: 'income' })}>Gelir</button>
      </div>
      <div className="grid-2">
        <input className="input" placeholder="Tutar" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
        <input className="input" placeholder="Kategori" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
      </div>
      <input className="input" placeholder="Not" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
      <button className="primary" type="submit">Kaydet</button>
    </form>
  )
}

function Dashboard({ profile }) {
  const [transactions, setTransactions] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const [txRes, anaRes] = await Promise.all([
      api.get('/transactions/'),
      api.get('/transactions/analytics')
    ])
    setTransactions(txRes.data)
    setAnalytics(anaRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const createTransaction = async (payload) => {
    await api.post('/transactions/', payload)
    await load()
  }

  const deleteTx = async (id) => {
    await api.delete(`/transactions/${id}`)
    await load()
  }

  const balanceBadge = useMemo(() => {
    if (!analytics) return null
    const positive = analytics.balance >= 0
    return <span className="badge" style={{ background: positive ? '#dcfce7' : '#fee2e2', color: positive ? '#166534' : '#991b1b' }}>{analytics.balance.toFixed(2)} ₺</span>
  }, [analytics])

  return (
    <div className="content">
      <div className="welcome">
        <div>
          <p className="eyebrow">Hoş geldin</p>
          <h2>{profile?.full_name}</h2>
          <p className="muted">Gerçek zamanlı gelir-gider takibi, öneriler ve admin yönetimi tek panelde.</p>
          <div className="chips">
            <span className="chip">Akıllı öneriler</span>
            <span className="chip">Gerçek zamanlı bakiye</span>
            <span className="chip">Admin kontrolü</span>
          </div>
        </div>
        {balanceBadge}
      </div>

      {loading && <div className="alert">Yükleniyor...</div>}

      <div className="grid-2 gap">
        <div className="card">
          <div className="row-space">
            <div>
              <p className="eyebrow">Yeni kayıt</p>
              <h3>Gelir ve gider ekle</h3>
            </div>
            <span className="pill">Anında analiz</span>
          </div>
          <TransactionForm onCreated={createTransaction} />
        </div>

        {analytics && (
          <div className="card">
            <div className="row-space">
              <div>
                <p className="eyebrow">Özet</p>
                <h3>Finans fotoğrafı</h3>
              </div>
              <span className="pill accent">{transactions.length} kayıt</span>
            </div>
            <div className="metrics">
              <div className="metric">
                <strong>Gelir</strong>
                <div className="metric-value">{analytics.total_income.toFixed(2)} ₺</div>
              </div>
              <div className="metric">
                <strong>Gider</strong>
                <div className="metric-value">{analytics.total_expense.toFixed(2)} ₺</div>
              </div>
              <div className="metric">
                <strong>Tasarruf Oranı</strong>
                <div className="metric-value">{(analytics.savings_rate * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div className="suggestions">
              <div className="row-space">
                <h4>Öneriler</h4>
                <span className="pill subtle">Yapay zeka ipuçları</span>
              </div>
              <ul>
                {analytics.suggestions.map((s, idx) => <li key={idx}>{s}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="row-space">
          <div>
            <p className="eyebrow">Hareketler</p>
            <h3>Son işlemler</h3>
          </div>
          <span className="pill">{transactions.length} kayıt</span>
        </div>
        <table className="table">
          <thead>
            <tr><th>Tip</th><th>Tutar</th><th>Kategori</th><th>Tarih</th><th></th></tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td><span className={`badge ${tx.type === 'income' ? 'success' : 'danger'}`}>{tx.type}</span></td>
                <td className="mono">{tx.amount.toFixed(2)} ₺</td>
                <td>{tx.category}</td>
                <td>{new Date(tx.occurred_at).toLocaleDateString('tr-TR')}</td>
                <td><button className="ghost" onClick={() => deleteTx(tx.id)}>Sil</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AuthPanel({ onLogin, onRegister, error }) {
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })

  const submit = async (e) => {
    e.preventDefault()
    if (tab === 'login') await onLogin(form.email, form.password)
    else await onRegister({ email: form.email, password: form.password, full_name: form.full_name })
  }

  return (
    <div className="auth-shell">
      <div className="auth-copy">
        <p className="eyebrow">Bütçe yönetimi 2.0</p>
        <h1>Modern finans panosu</h1>
        <p className="muted">Akıcı arayüz, akıllı öneriler ve admin kontrolüyle gelir-gider takibini kolaylaştırın.</p>
        <div className="chips">
          <span className="chip">JWT güvenliği</span>
          <span className="chip">Docker Compose</span>
          <span className="chip">Analitik</span>
        </div>
      </div>
      <div className="card auth-card">
        <div className="pill-tabs">
          <button type="button" className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>Giriş</button>
          <button type="button" className={tab === 'register' ? 'active' : ''} onClick={() => setTab('register')}>Kayıt</button>
        </div>
        {error && <div className="alert">{error}</div>}
        <form className="form-grid" onSubmit={submit}>
          {tab === 'register' && (
            <input className="input" placeholder="Ad Soyad" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
          )}
          <input className="input" type="email" placeholder="E-posta" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input className="input" type="password" placeholder="Parola" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <button className="primary" type="submit">{tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</button>
          {tab === 'login' && <p className="muted tiny">Varsayılan admin: admin@example.com / admin1234</p>}
        </form>
      </div>
    </div>
  )
}

function AdminPanel() {
  const [overview, setOverview] = useState(null)
  const load = async () => {
    const res = await api.get('/admin/overview')
    setOverview(res.data)
  }
  useEffect(() => { load() }, [])
  if (!overview) return null
  return (
    <div className="card">
      <h3>Admin Yönetimi</h3>
      <div className="metrics">
        <div className="card metric"><strong>Kullanıcı</strong><div>{overview.user_count}</div></div>
        <div className="card metric"><strong>Toplam Gelir</strong><div>{overview.total_income.toFixed(2)} ₺</div></div>
        <div className="card metric"><strong>Toplam Gider</strong><div>{overview.total_expense.toFixed(2)} ₺</div></div>
      </div>
      <h4>Son İşlemler</h4>
      <ul>
        {overview.recent_transactions.map((tx, idx) => (
          <li key={idx}>{tx.user} - {tx.amount} ₺ - {tx.category} ({tx.type})</li>
        ))}
      </ul>
    </div>
  )
}

export default function App() {
  const auth = useAuth()

  if (!auth.token) {
    return <AuthPanel onLogin={auth.login} onRegister={auth.register} error={auth.error} />
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">Bütçe Paneli</div>
        <p>Gerçek zamanlı gelir-gider, öneriler ve admin kontrolü tek docker-compose ile.</p>
        <div className="sidebar-card">
          <p className="eyebrow">Profil</p>
          <h4>{auth.profile?.full_name}</h4>
          <p className="muted">{auth.profile?.email}</p>
          <button className="ghost" onClick={auth.logout}>Çıkış</button>
        </div>
        {auth.profile?.is_admin && <div className="pill success">Admin</div>}
      </aside>
      <main>
        {auth.profile ? <Dashboard profile={auth.profile} /> : <div className="content">Profil yükleniyor...</div>}
        {auth.profile?.is_admin && <AdminPanel />}
      </main>
    </div>
  )
}
