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
      <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
        <option value="income">Gelir</option>
        <option value="expense">Gider</option>
      </select>
      <input className="input" placeholder="Tutar" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
      <input className="input" placeholder="Kategori" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
      <input className="input" placeholder="Not" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
      <button type="submit">Ekle</button>
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
      <div className="card row-space">
        <div>
          <h2>Merhaba, {profile?.full_name}</h2>
          <p>Gelir - gider, öneriler ve analitik tek ekranda.</p>
        </div>
        {balanceBadge}
      </div>

      {loading && <div className="alert">Yükleniyor...</div>}

      <div className="card">
        <h3>Yeni Kayıt</h3>
        <TransactionForm onCreated={createTransaction} />
      </div>

      {analytics && (
        <div className="card">
          <h3>Özet</h3>
          <div className="metrics">
            <div className="card metric"><strong>Gelir</strong><div>{analytics.total_income.toFixed(2)} ₺</div></div>
            <div className="card metric"><strong>Gider</strong><div>{analytics.total_expense.toFixed(2)} ₺</div></div>
            <div className="card metric"><strong>Tasarruf Oranı</strong><div>{(analytics.savings_rate * 100).toFixed(1)}%</div></div>
          </div>
          <div className="suggestions">
            <h4>Öneriler</h4>
            <ul>
              {analytics.suggestions.map((s, idx) => <li key={idx}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row-space">
          <h3>Hareketler</h3>
          <span className="badge">{transactions.length} kayıt</span>
        </div>
        <table className="table">
          <thead>
            <tr><th>Tip</th><th>Tutar</th><th>Kategori</th><th>Tarih</th><th></th></tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td><span className="badge" style={{ background: tx.type === 'income' ? '#dcfce7' : '#fee2e2', color: tx.type === 'income' ? '#166534' : '#991b1b' }}>{tx.type}</span></td>
                <td>{tx.amount.toFixed(2)} ₺</td>
                <td>{tx.category}</td>
                <td>{new Date(tx.occurred_at).toLocaleDateString('tr-TR')}</td>
                <td><button className="secondary" onClick={() => deleteTx(tx.id)}>Sil</button></td>
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
    <div className="card" style={{ maxWidth: 420, margin: '3rem auto' }}>
      <div className="row-space">
        <button className={tab === 'login' ? '' : 'secondary'} onClick={() => setTab('login')}>Giriş</button>
        <button className={tab === 'register' ? '' : 'secondary'} onClick={() => setTab('register')}>Kayıt</button>
      </div>
      {error && <div className="alert">{error}</div>}
      <form className="form-grid" onSubmit={submit}>
        {tab === 'register' && (
          <input className="input" placeholder="Ad Soyad" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
        )}
        <input className="input" type="email" placeholder="E-posta" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <input className="input" type="password" placeholder="Parola" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        <button type="submit">{tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</button>
      </form>
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
        <h1>Bütçe Paneli</h1>
        <p>Gelir-gider yönetimi, öneri ve analitik tek docker-compose ile.</p>
        <button onClick={auth.logout}>Çıkış</button>
      </aside>
      <main>
        {auth.profile ? <Dashboard profile={auth.profile} /> : <div className="content">Profil yükleniyor...</div>}
        {auth.profile?.is_admin && <AdminPanel />}
      </main>
    </div>
  )
}
