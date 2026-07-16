'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Profile {
  id: string;
  email: string;
  name: string;
  theme: string;
}

export default function PerfilPage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [theme, setTheme] = useState('SYSTEM');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiFetch<Profile>('/users/me').then((p) => {
      setProfile(p);
      setName(p.name);
      setEmail(p.email);
      setTheme(p.theme);
    });
  }, []);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    await apiFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ name, email, theme }),
    });
    await refreshUser();
    setMessage('Perfil atualizado com sucesso');
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    await apiFetch('/users/me/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setCurrentPassword('');
    setNewPassword('');
    setMessage('Senha alterada com sucesso');
  };

  if (!profile) return <p>Carregando...</p>;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Perfil</h1>
      {message && <p className="text-sm text-success">{message}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">Nome</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm">Tema</label>
              <Select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="SYSTEM">Sistema</option>
                <option value="LIGHT">Claro</option>
                <option value="DARK">Escuro</option>
              </Select>
            </div>
            <Button type="submit">Salvar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">Senha atual</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">Nova senha</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit">Alterar senha</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
