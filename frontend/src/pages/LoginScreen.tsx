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
  const [imgLoaded, setImgLoaded] = useState(false);

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
    <div className="login-page">
      <div className="login-shell fade-in">
        <div className="login-visual" aria-hidden="true" style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 300ms ease' }}>
          <picture>
            <source srcSet="/create.webp" type="image/webp" />
            <img src="/create.png" alt="" onLoad={() => setImgLoaded(true)} />
          </picture>
        </div>

        <section className="login-panel" aria-label="Sign in">
          <div className="login-brand">
            <img src="/headoutlogo.png" alt="Headout" />
            <span>Listing Agent</span>
          </div>

          <div className="login-heading">
            <h1>Sign in</h1>
            <p>Internal tool — catalog associates only.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div>
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@headout.com"
              />
            </div>

            <div>
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="login-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
