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
     * Duas colunas: o hero da marca Nuvita ocupa 2/3 à esquerda e a coluna de
     * acesso 1/3 à direita. Abaixo de lg o hero fica oculto (não comporta o
     * gradiente + slogan numa tela estreita) e o formulário ganha um logo no
     * topo, mostrando a largura inteira.
     */
    <div className="relative flex min-h-screen w-full flex-col bg-background lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* Esquerda — hero da marca (2/3) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-bg-dark to-brand-cobalt p-12 lg:flex lg:w-2/3">
        {/* Halos decorativos */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-cobalt/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-accent-gold/10 blur-3xl" />

        <div className="relative flex items-center">
          <Logo
            width={260}
            iconColor="#FFB800"
            textColor="#FFFFFF"
            className="drop-shadow-[0_2px_16px_rgba(255,184,0,0.35)]"
          />
        </div>

        <div className="relative max-w-2xl">
          <h1 className="mb-4 text-[3rem] font-medium leading-tight text-white">
            Gestão clínica
            <br />
            <span className="text-accent-gold">que cuida</span> de
            <br />
            quem cuida.
          </h1>
          <p className="text-lg leading-relaxed text-blue-100/90">
            Prontuário eletrônico, agenda, pacientes e documentos em uma
            plataforma segura, multi-tenant e em conformidade com a LGPD.
          </p>
        </div>

        <p className="relative text-sm text-blue-300/70">
          © {new Date().getFullYear()} Nuvita · Plataforma de saúde
        </p>
      </div>

      {/* Direita — formulário de acesso (1/3) */}
      <div
        className="relative flex w-full flex-1 flex-col bg-white px-6 py-10 sm:px-10
                   lg:h-full lg:w-1/3 lg:flex-none lg:overflow-y-auto
                   lg:border-l lg:border-slate-200 lg:px-12"
      >
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          {/* Logo no topo apenas no mobile — o hero à esquerda some abaixo de lg */}
          <div className="mb-8 flex items-center lg:hidden">
            <Logo width={150} iconColor="#E6A600" textColor="#1F2937" />
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
        </div>

        {/* Assinatura discreta no pé da coluna de acesso. */}
        <footer className="mx-auto mt-10 flex w-full max-w-sm flex-col items-end gap-0.5 text-right">
          <p className="text-[9px] leading-tight text-slate-400">
            Plataforma de gestão clínica · versão 2.1
          </p>
          <p className="text-[9px] leading-tight text-slate-400">
            © {new Date().getFullYear()} · CNPJ 55.747.955/0001-07
          </p>
        </footer>
      </div>
    </div>
  );
}
