import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ShieldCheck, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';

// TODO: trocar pela URL da landing page do módulo Estomaterapia quando definida.
// Enquanto for '#', o CTA "Conhecer a plataforma" fica desabilitado (não navega
// para lugar nenhum), evitando um link quebrado no ar.
const LANDING_URL = '#';
const PILARES = ['Feridas', 'Ostomias', 'Incontinência'];

const loginSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
  totpCode: z.string().optional(),
});
type LoginForm = z.infer<typeof loginSchema>;

// Entrada suave em cascata dos elementos da vitrine.
const surgir = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 + i * 0.09, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';
  const landingAtiva = LANDING_URL !== '#';

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
    <div className="relative flex min-h-screen w-full flex-col bg-white lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* ───────── Formulário (esquerda no desktop) ───────── */}
      <div className="order-2 flex w-full flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:order-1 lg:w-[42%] lg:flex-none lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo width={150} iconColor="#E6A600" textColor="#1F2937" />
          </div>

          <h2 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-900">Acessar painel</h2>
          <p className="mb-9 mt-2 text-[0.9rem] leading-relaxed text-slate-500">Entre com suas credenciais corporativas.</p>

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

            <Button type="submit" className="mt-2 h-11 w-full text-base" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <p className="mt-12 text-[11px] leading-relaxed tracking-wide text-slate-400">
            Plataforma de gestão clínica · versão 2.1 · © {new Date().getFullYear()} · CNPJ 55.747.955/0001-07
          </p>
        </div>
      </div>

      {/* ───────── Vitrine da marca (direita no desktop) ───────── */}
      <div className="relative order-1 flex flex-col justify-center overflow-hidden bg-gradient-to-br from-bg-dark via-[#0a1a4d] to-brand-cobalt px-8 py-14 sm:px-12 lg:order-2 lg:w-[58%] lg:px-20 lg:py-0">
        {/* Halos e glow decorativos */}
        <div className="pointer-events-none absolute -top-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-accent-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[26rem] w-[26rem] rounded-full bg-brand-cobalt/40 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto flex w-full max-w-xl flex-col">
          {/* Badge do módulo */}
          <motion.div custom={0} variants={surgir} initial="hidden" animate="show">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-gold/40 bg-accent-gold/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-gold">
              <Sparkles className="h-3.5 w-3.5" /> Módulo Estomaterapia
            </span>
          </motion.div>

          {/* Logo grande */}
          <motion.div custom={1} variants={surgir} initial="hidden" animate="show" className="mt-7">
            <Logo
              width={340}
              iconColor="#FFB800"
              textColor="#FFFFFF"
              className="max-w-full drop-shadow-[0_4px_24px_rgba(255,184,0,0.32)]"
            />
          </motion.div>

          {/* Slogan */}
          <motion.h1
            custom={2}
            variants={surgir}
            initial="hidden"
            animate="show"
            className="mt-8 font-display text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-white sm:text-[3.15rem]"
          >
            Gestão clínica <span className="text-accent-gold">que cuida</span>
            <br /> de quem cuida.
          </motion.h1>

          <motion.p
            custom={3}
            variants={surgir}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-lg text-[1.05rem] leading-relaxed tracking-[-0.005em] text-blue-100/80"
          >
            Prontuário, avaliação de feridas com escalas validadas, agenda e
            documentos — seguro, multi-tenant e em conformidade com a LGPD.
          </motion.p>

          {/* Chips dos pilares */}
          <motion.div custom={4} variants={surgir} initial="hidden" animate="show" className="mt-7 flex flex-wrap gap-2.5">
            {PILARES.map((p) => (
              <span key={p} className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 text-[0.8rem] font-medium tracking-wide text-blue-50/90">
                {p}
              </span>
            ))}
          </motion.div>

          {/* Claim + CTA para a landing */}
          <motion.div
            custom={5}
            variants={surgir}
            initial="hidden"
            animate="show"
            className="mt-11 rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm sm:p-6"
          >
            <p className="font-display text-[0.95rem] font-semibold tracking-tight text-white">Ainda não conhece o Nuvita?</p>
            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-blue-100/75">
              Descubra como o módulo de Estomaterapia apoia a assistência do primeiro
              atendimento à alta.
            </p>
            <a
              href={LANDING_URL}
              {...(landingAtiva ? { target: '_blank', rel: 'noreferrer' } : {})}
              onClick={(e) => {
                if (!landingAtiva) {
                  e.preventDefault();
                  toast.info('Página em breve', 'A landing do módulo Estomaterapia está a caminho.');
                }
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-gold px-4 py-2.5 text-sm font-semibold text-bg-dark shadow-lg shadow-accent-gold/20 transition hover:bg-accent-gold-hover"
            >
              Conhecer a plataforma
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>

          <motion.p custom={6} variants={surgir} initial="hidden" animate="show" className="mt-11 text-[0.8rem] tracking-wide text-blue-300/60">
            © {new Date().getFullYear()} Nuvita · Plataforma de saúde
          </motion.p>
        </div>
      </div>
    </div>
  );
}
