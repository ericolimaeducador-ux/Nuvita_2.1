import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, Users, Calendar, Bell, DollarSign,
  Video, Building2, LogOut, ChevronLeft, ChevronRight, Shield, Bandage, Menu, X, Stethoscope,
  FolderOpen, BarChart3, ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/auth/AuthContext';
import { superAdminApi } from '@/api/resources';
import { Modulo, Papel } from '@/types';
import { Logo, LogoIcon } from '@/components/Logo';

// Cada item é gateado pelo módulo correspondente (permissões efetivas do usuário,
// ajustáveis por checkbox no Super Admin). `roles` fica só como trava dura extra.
const navItems: { to: string; icon: React.ElementType; label: string; modulo: Modulo; roles?: Papel[] }[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', modulo: Modulo.DASHBOARD },
  { to: '/atendimento-enfermagem', icon: Stethoscope, label: 'Atendimento', modulo: Modulo.TELEMEDICINA },
  { to: '/pacientes', icon: Users, label: 'Pacientes', modulo: Modulo.PACIENTES },
  { to: '/agenda', icon: Calendar, label: 'Agenda', modulo: Modulo.AGENDA },
  { to: '/feridas', icon: Bandage, label: 'Feridas', modulo: Modulo.FERIDAS },
  { to: '/planos-cuidados', icon: ClipboardList, label: 'Planos de cuidados', modulo: Modulo.PLANO_CUIDADOS },
  { to: '/documentos', icon: FolderOpen, label: 'Documentos', modulo: Modulo.DOCUMENTOS },
  { to: '/notificacoes', icon: Bell, label: 'Notificações', modulo: Modulo.NOTIFICACOES },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro', modulo: Modulo.FINANCEIRO },
  { to: '/indicadores', icon: BarChart3, label: 'Indicadores', modulo: Modulo.ANALYTICS },
  { to: '/telemedicina', icon: Video, label: 'Telemedicina', modulo: Modulo.TELEMEDICINA },
  { to: '/clinica', icon: Building2, label: 'Clínica', modulo: Modulo.CLINICA },
  { to: '/super-admin', icon: Shield, label: 'Super Admin', modulo: Modulo.SUPER_ADMIN, roles: [Papel.SUPER_ADMIN] },
];

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  // Em telas pequenas a sidebar vira um menu off-canvas (fixed + overlay) em
  // vez de disputar espaço com o conteúdo — fechado por padrão, some ao
  // trocar de rota.
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, permissoes, clinicaAtiva, trocarClinica, logout } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // SUPER_ADMIN é papel de plataforma (sem clínica no token): opera os dados
  // clínicos "assumindo" uma clínica, enviada em toda chamada via x-clinica-id.
  const ehSuperAdmin = user?.papel === Papel.SUPER_ADMIN;
  const clinicasQ = useQuery({
    queryKey: ['super-admin', 'clinicas'],
    queryFn: superAdminApi.listClinicas,
    enabled: ehSuperAdmin,
    staleTime: 5 * 60 * 1000,
  });
  const clinicas = clinicasQ.data?.items ?? [];

  // Com uma única clínica cadastrada, assume automaticamente — o seletor só
  // exige escolha manual quando há mais de uma.
  useEffect(() => {
    if (ehSuperAdmin && !clinicaAtiva && clinicas.length === 1) {
      trocarClinica(clinicas[0].id);
    }
  }, [ehSuperAdmin, clinicaAtiva, clinicas, trocarClinica]);

  function selecionarClinica(id: string) {
    trocarClinica(id);
    // Todos os dados em cache pertencem à clínica anterior (ou a nenhuma).
    void qc.invalidateQueries();
  }

  const initials = user?.nome
    ? user.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Backdrop do menu mobile — clique fora fecha */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — cobalto sólido, item ativo em pílula dourada.
          Mobile (<lg): off-canvas fixo, entra/sai por translate-x.
          Desktop (lg+): sempre em fluxo, recolhe por width (collapsed). */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-brand-cobalt overflow-hidden shrink-0',
          'transition-transform duration-200 lg:relative lg:z-auto lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo (sem slogan) — ícone recolhido quando a sidebar está colapsada */}
        <div className="flex items-center justify-between h-[68px] px-4 border-b border-white/10">
          {collapsed ? (
            <LogoIcon size={32} iconColor="#FFB800" className="mx-auto" />
          ) : (
            <Logo width={150} iconColor="#FFB800" textColor="#FFFFFF" />
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 text-blue-100/85 hover:text-white"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems
            .filter(({ modulo, roles }) =>
              permissoes.includes(modulo) &&
              (!roles || (user?.papel && roles.includes(user.papel as Papel))))
            .map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 group relative',
                  active
                    ? 'bg-accent-gold text-[#1F2937] font-semibold shadow-[0_0_18px_rgba(255,184,0,0.4)]'
                    : 'text-blue-100/85 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="shrink-0 h-5 w-5" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-3 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs bg-white/15 text-white">{initials}</AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-medium text-white truncate">{user?.nome ?? 'Usuário'}</p>
                  <p className="text-xs text-blue-200/70 truncate">{user?.papel ?? 'Admin'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            className="w-full text-blue-100/85 hover:text-white hover:bg-white/10"
            onClick={() => { void logout(); navigate('/login'); }}
          >
            <LogOut className="h-4 w-4" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-2">
                  Sair
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>

        {/* Collapse toggle — só desktop; no mobile a sidebar é off-canvas (abre/fecha, não recolhe) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-8 z-10 h-6 w-6 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition-colors shadow-sm"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header superior — sino + perfil do usuário logado */}
        <header className="flex items-center justify-end gap-4 px-4 sm:px-6 py-3 bg-card border-b border-border shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden mr-auto p-2 -ml-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {ehSuperAdmin && (
            <div className="flex items-center gap-2 mr-auto">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={clinicaAtiva ?? undefined} onValueChange={selecionarClinica}>
                <SelectTrigger className="w-[220px] h-9">
                  <SelectValue placeholder="Selecione a clínica…" />
                </SelectTrigger>
                <SelectContent>
                  {clinicas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <button
            onClick={() => navigate('/notificacoes')}
            className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent-gold" />
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground leading-tight">{user?.nome ?? 'Usuário'}</p>
              <p className="text-xs text-muted-foreground leading-tight">{user?.papel ?? ''}</p>
            </div>
            <Avatar className="h-9 w-9 ring-2 ring-accent-gold/60">
              <AvatarFallback className="text-xs bg-brand-cobalt text-white">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
