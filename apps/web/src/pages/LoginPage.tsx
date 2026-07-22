import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import fundoWoundcare from '@/assets/login-woundcare.webp';
import fundoWoundcareSm from '@/assets/login-woundcare-sm.webp';

const loginSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
  totpCode: z.string().optional(),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginForm) {
    setLoading(true);
    try {
      await login(values.email, values.password, values.totpCode || undefined);
      toast.success('Bem-vindo ao Nuvita.');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = apiErrorMessage(err, 'Não foi possível entrar.');
      if (/2fa|totp|c[óo]digo|two.?factor/i.test(msg)) {
        setNeeds2fa(true);
        toast.info('Informe o código de verificação (2FA).');
      } else {
        toast.error('Erro ao entrar', msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    /*
     * A arte da Woundcare ocupa a tela inteira; a coluna de acesso ancora na
     * direita, sobre a faixa clara e sem conteudo da imagem (so marcas d'agua),
     * deixando a cena clinica dos ~2/3 da esquerda inteiramente visivel. Abaixo
     * de lg a coluna vira largura total, porque 1/3 de tela estreita nao
     * comportaria o formulario.
     */
    <div className="relative flex min-h-screen w-full flex-col lg:h-screen lg:overflow-hidden">
      {/* Ate lg a arte vira um banner no topo (a foto e horizontal e nao caberia
          ao lado do formulario); de lg em diante ocupa a tela inteira por tras. */}
      <picture>
        <source media="(max-width: 640px)" srcSet={fundoWoundcareSm} />
        <img
          src={fundoWoundcare}
          alt=""
          aria-hidden="true"
          className="h-44 w-full shrink-0 object-cover object-top sm:h-56
                     lg:absolute lg:inset-0 lg:h-full lg:object-center"
        />
      </picture>

      <div
        className="relative flex w-full flex-1 flex-col justify-center bg-white px-6 py-10 sm:px-10
                   lg:ml-auto lg:h-full lg:w-1/3 lg:min-w-[400px] lg:max-w-[560px] lg:flex-none
                   lg:overflow-y-auto lg:border-l lg:border-white/60 lg:bg-white/90
                   lg:shadow-[-16px_0_48px_rgba(11,17,32,0.10)] lg:backdrop-blur-xl"
      >
        <div className="mx-auto w-full max-w-sm">
          {/* Marca do software — unico ponto onde o Nuvita aparece nesta tela. */}
          <div className="mb-9">
            <Logo width={168} iconColor="#E6A600" textColor="#0B1120" />
            <p className="mt-2 text-[0.8rem] leading-snug text-slate-500">
              Plataforma de gestão clínica · versão 2.1
            </p>
          </div>

          <h2 className="text-[1.6rem] font-semibold leading-tight text-slate-900">Acessar painel</h2>
          <p className="mb-7 mt-1 text-sm text-slate-500">Entre com suas credenciais corporativas.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  placeholder="voce@clinica.com.br"
                  autoComplete="username"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <PasswordInput
                  id="password"
                  className="pl-9"
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            {needs2fa && (
              <div className="space-y-2">
                <Label htmlFor="totpCode">Código de verificação (2FA)</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="totpCode"
                    className="pl-9"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    {...register('totpCode')}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <p className="mt-10 text-xs text-slate-400">
            © {new Date().getFullYear()} Nuvita · Plataforma de saúde
          </p>
        </div>
      </div>
    </div>
  );
}
