'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import styles from './signin.module.css';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await signIn('credentials', {
        email: email, // Changed from username to email
        password: password,
        redirect: false,
        callbackUrl: '/',
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Something went wrong. Please try again.');
    }
  };

  const handleGoogleSignIn = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await signIn('google', { callbackUrl: '/' });
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('Google sign-in failed.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        {/* Sign-in Form */}
        <form onSubmit={handleCredentialsSignIn} className="space-y-4">
          <div>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.button}>
            Sign In with Email
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Updated Google Sign-In Button */}
        <button onClick={handleGoogleSignIn} className={styles.googleButton}>
          <svg viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>

        {/* Forgot Password Link */}
        <div className="text-center mt-2">
          <Link href="/auth/reset-password">
            <span className={styles.link}>Forgot Password?</span>
          </Link>
        </div>

        {/* Sign-Up Link */}
        <div className="text-center mt-4">
          <p>Don’t have an account?</p>
          <Link href="/auth/signup">
            <span className={styles.link}>Sign up here</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
