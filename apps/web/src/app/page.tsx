import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight, LogIn } from 'lucide-react';
import { LogoMark } from '@/components/ui/logo-mark';

export default function Home() {
  return (
    <main style={{ background: 'var(--surface-page)' }} className="landing-page min-h-screen overflow-hidden">
      {/* Navigation */}
      <nav className="landing-nav relative z-10 flex justify-between items-center px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <LogoMark className="w-10 h-10" iconClassName="w-6 h-6" />
          <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>AgentLab</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sign in
          </Link>
          <Link href="/register" className="btn btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-24 sm:pb-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="hero-kicker badge inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Open Source AI Agent Platform</span>
          </div>

          {/* Heading */}
          <h1 className="hero-title text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-bold mb-6 leading-tight" style={{ color: 'var(--text-primary)' }}>
            <span className="block">Build AI Agents{' '}</span>
            <span className="block" style={{ color: 'var(--brand-primary)' }}>That Think and Collaborate</span>
          </h1>

          {/* Subtitle */}
          <p
            className="hero-copy text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Orchestrate intelligent agents with RAG, multi-model support, and visual workflows.
            Ship production AI systems in minutes, not months.
          </p>

          {/* CTA Buttons */}
          <div className="hero-actions flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/register" className="btn btn-primary text-base px-8 py-3.5 w-full sm:w-auto">
              Start Building Free
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
            <Link href="/login" className="btn btn-secondary text-base px-8 py-3.5 w-full sm:w-auto flex items-center gap-2">
              <LogIn className="w-4 h-4" strokeWidth={2} />
              Sign in
            </Link>
          </div>

          {/* Stats */}
          <div className="hero-stats flex flex-wrap items-center justify-center gap-6 sm:gap-12 mt-14 sm:mt-16">
            <div className="stat-item text-center" style={{ '--stagger': '0ms' } as CSSProperties}>
              <p className="text-3xl font-bold" style={{ color: 'var(--brand-primary)' }}>6+</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>LLM Providers</p>
            </div>
            <div className="hidden sm:block w-px h-12" style={{ background: 'var(--border-default)' }} />
            <div className="stat-item text-center" style={{ '--stagger': '90ms' } as CSSProperties}>
              <p className="text-3xl font-bold" style={{ color: 'var(--brand-primary)' }}>12</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Database Models</p>
            </div>
            <div className="hidden sm:block w-px h-12" style={{ background: 'var(--border-default)' }} />
            <div className="stat-item text-center" style={{ '--stagger': '180ms' } as CSSProperties}>
              <p className="text-3xl font-bold" style={{ color: 'var(--brand-primary)' }}>3</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Agent Types</p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="feature-grid scroll-reveal grid md:grid-cols-3 gap-6 mt-20 sm:mt-28">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              ),
              title: 'Multi-Agent Orchestration',
              description: 'Build specialized agents that collaborate. Route tasks, delegate work, and coordinate complex workflows.',
              iconColor: '#3b82f6',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              ),
              title: 'RAG & Document Q&A',
              description: 'Upload documents and chat with your data. Hybrid vector search with pgvector and source citations.',
              iconColor: '#a855f7',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              title: 'Visual Workflow Builder',
              description: 'Design AI workflows visually with drag-and-drop. Connect agents, tools, and conditional logic.',
              iconColor: '#f59e0b',
            },
          ].map((feature, i) => (
            <div
              key={feature.title}
              className="feature-card card card-hover p-6"
              style={{ '--stagger': `${i * 120}ms` } as CSSProperties}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'var(--surface-inset)' }}
              >
                <span style={{ color: feature.iconColor }}>{feature.icon}</span>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{feature.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Tech Stack */}
        <div className="tech-stack scroll-reveal mt-24 text-center">
          <p className="text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>Built with</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            {['Next.js', 'Express', 'LangGraph.js', 'PostgreSQL', 'pgvector', 'Redis'].map((tech) => (
              <span key={tech} className="tech-pill text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{tech}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="site-footer scroll-reveal relative z-10 py-8" style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>&copy; 2026 AgentLab. Open source.</p>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}>Sign in</Link>
            <Link href="/register" className="text-sm transition-colors" style={{ color: 'var(--text-secondary)' }}>Create account</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
