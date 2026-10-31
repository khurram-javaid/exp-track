import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const passwordField = register('password', {
    required: 'Password is required.',
    minLength: { value: 10, message: 'Use at least 10 characters.' },
    maxLength: { value: 72, message: 'Use 72 characters or fewer.' },
    validate: value => new TextEncoder().encode(value).length <= 72 || 'Use no more than 72 UTF-8 bytes.'
  });

  const onSubmit = async data => {
    setServerError('');
    try {
      await registerUser({ name: data.name, email: data.email, password: data.password });
      navigate('/dashboard');
    } catch (error) {
      setServerError(error.response?.data?.message || 'We could not create your account. Please try again.');
    }
  };

  return (
    <main className="auth-page">
      <aside className="auth-visual">
        <div className="auth-brand"><span className="brand-symbol"><Wallet size={19} /></span><span>trackio<span className="brand-period">.</span></span></div>
        <div className="auth-visual-copy"><span>A FRESH START FOR YOUR FINANCES</span><h2>Feel good about where your money goes.</h2><p>Understand your spending, make room for what matters, and build habits that stick.</p></div>
        <div className="auth-quote"><strong>Every thoughtful choice moves you forward.</strong>A clearer financial life begins here.</div>
      </aside>
      <section className="auth-content">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><span className="brand-symbol"><Wallet size={17} /></span><span>trackio<span className="brand-period">.</span></span></div>
          <div className="auth-heading"><span className="eyebrow">YOUR NEXT CHAPTER</span><h1>Create your account</h1><p>Set up your private space in just a moment.</p></div>
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="auth-field">
              <label htmlFor="name">Your name</label>
              <div className="auth-input-wrap"><UserRound size={16} aria-hidden="true" /><input id="name" type="text" autoComplete="name" autoFocus maxLength="80" className="auth-input" placeholder="How should we address you?" aria-invalid={Boolean(errors.name)} {...register('name', { required: 'Your name is required.', maxLength: { value: 80, message: 'Please use 80 characters or fewer.' } })} /></div>
              {errors.name && <span className="inline-error">{errors.name.message}</span>}
            </div>
            <div className="auth-field">
              <label htmlFor="email">Email address</label>
              <div className="auth-input-wrap"><Mail size={16} aria-hidden="true" /><input id="email" type="email" autoComplete="email" className="auth-input" placeholder="you@example.com" aria-invalid={Boolean(errors.email)} {...register('email', { required: 'Email is required.', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' } })} /></div>
              {errors.email && <span className="inline-error">{errors.email.message}</span>}
            </div>
            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-input-wrap auth-input-wrap-password"><LockKeyhole size={16} aria-hidden="true" /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="10" maxLength="72" className="auth-input auth-input-password" placeholder="At least 10 characters" aria-invalid={Boolean(errors.password)} {...passwordField} onChange={event => { passwordField.onChange(event); setPasswordValue(event.target.value); }} /><button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(visible => !visible)}>{showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button></div>
              {errors.password && <span className="inline-error">{errors.password.message}</span>}
            </div>
            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="auth-input-wrap auth-input-wrap-password"><LockKeyhole size={16} aria-hidden="true" /><input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" className="auth-input auth-input-password" placeholder="Type your password again" aria-invalid={Boolean(errors.confirmPassword)} {...register('confirmPassword', { required: 'Please confirm your password.', deps: 'password', validate: value => value === passwordValue || 'Passwords do not match.' })} /><button type="button" className="auth-password-toggle" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword(visible => !visible)}>{showConfirmPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}</button></div>
              {errors.confirmPassword && <span className="inline-error">{errors.confirmPassword.message}</span>}
            </div>
            {serverError && <div className="auth-error" role="alert"><AlertCircle size={16} />{serverError}</div>}
            <button type="submit" className="button button-primary auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : <>Create account <ArrowRight size={16} /></>}</button>
          </form>
          <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
          <p className="auth-footnote">By creating an account, you agree to keep your password private and secure.</p>
        </div>
      </section>
    </main>
  );
}
