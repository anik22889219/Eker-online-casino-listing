import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface LoginFormProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  isLoading = false,
  errorMessage,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email.trim() || !password.trim()) {
      setValidationError('Please enter both email and password.');
      return;
    }

    try {
      await onLogin(email, password);
    } catch (_) {
      // Handled higher up
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-slate-900 px-6 py-8 text-center text-white flex flex-col items-center gap-2">
        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight mt-2">Administrative Entrance</h2>
        <p className="text-xs text-slate-400">Authorized personnel secure credential verification portal</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
        {validationError && (
          <div className="p-3.5 rounded-lg text-xs font-semibold bg-rose-50 border border-rose-100 text-rose-800">
            {validationError}
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-lg text-xs font-semibold bg-rose-50 border border-rose-100 text-rose-800">
            {errorMessage}
          </div>
        )}

        <Input
          label="Administrator Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@domain.com"
          leftIcon={<Mail className="w-4 h-4" />}
          disabled={isLoading}
        />

        <Input
          label="Secure Security Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
          disabled={isLoading}
        />

        <Button type="submit" className="w-full mt-2" loading={isLoading}>
          Verify & Sign In
        </Button>
      </form>
    </div>
  );
};
