import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async data => {
    setServerError('');
    try {
      await login(data);
      navigate('/dashboard');
    } catch (error) {
      setServerError(error.response?.data?.message || 'We could not sign you in. Please try again.');
    }
  };

  return (
    <main className="auth-page">
      <aside className="auth-visual">
        <div className="auth-brand"><span className="brand-symbol"><Wallet size={19} /></span><span>trackio<span className="brand-period">.</span></span></div>
        <div className="auth-visual-copy"><span>MAKE YOUR MONEY MAKE SENSE</span><h2>A little more clarity. A lot more confidence.</h2><p>Bring your spending, saving, and goals together in one calm, clear place.</p></div>
        <div className="auth-quote"><strong>“Small steps every day add up to big change.”</strong>Your financial picture, all in one place.</div>
      </aside>
      <section className="auth-content">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><span className="brand-symbol"><Wallet size={17} /></span><span>trackio<span className="brand-period">.</span></span></div>
          <div className="auth-heading"><span className="eyebrow">WELCOME BACK</span><h1>Sign in to Trackio</h1><p>Your money dashboard is right where you left it.</p></div>
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="auth-field">
              <label htmlFor="email">Email address</label>
              <div className="auth-input-wrap"><Mail size={16} aria-hidden="true" /><input id="email" type="email" autoComplete="email" autoFocus className="auth-input" placeholder="you@example.com" aria-invalid={Boolean(errors.email)} {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' } })} /></div>
              {errors.email && <span className="inline-error">{errors.email.message}</span>}
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-input-wrap auth-input-wrap-password"><LockKeyhole size={16} aria-hidden="true" /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="auth-input auth-input-password" placeholder="Enter your password" aria-invalid={Boolean(errors.password)} {...register('password', { required: 'Password is required' })} /><button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(visible => !visible)}>{showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button></div>
              {errors.password && <span className="inline-error">{errors.password.message}</span>}
            </div>
            {serverError && <div className="auth-error" role="alert"><AlertCircle size={16} />{serverError}</div>}
            <button type="submit" className="button button-primary auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}</button>
          </form>
          <p className="auth-switch">New to Trackio? <Link to="/register">Create an account</Link></p>
          <p className="auth-footnote">Your finances are private and accessible only to you.</p>
        </div>
      </section>
    </main>
  );
}
