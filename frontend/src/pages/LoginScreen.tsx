import { useState } from 'react';
import { signIn } from '../lib/supabase';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message);
      } else {
        onLogin();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--surface)',
    }}>
      <div className="fade-in" style={{
        width: 380, padding: 40, background: '#fff',
        borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <img src="/logo.svg" alt="Headout" style={{ height: 28 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--slate)' }}>
            Listing Agent
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          Sign in
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink60)', marginBottom: 28 }}>
          Internal tool — catalog associates only.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink60)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@headout.com"
              style={{
                width: '100%', height: 40, border: '1.5px solid var(--border)',
                borderRadius: 8, padding: '0 12px', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 150ms',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--purps)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink60)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', height: 40, border: '1.5px solid var(--border)',
                borderRadius: 8, padding: '0 12px', fontSize: 14,
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 150ms',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--purps)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--red)', margin: '-4px 0' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              marginTop: 4, height: 44, background: loading || !email || !password ? 'var(--ink30)' : 'var(--purps)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600,
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              transition: 'background 150ms',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
