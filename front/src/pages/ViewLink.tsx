import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';

interface LinkData {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

const STEPS = [
  {
    key: 'confirmed',
    label: 'Pedido Confirmado',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  {
    key: 'preparing',
    label: 'Em Preparação',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    key: 'transit',
    label: 'Saiu para Entrega',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v4h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    key: 'delivered',
    label: 'Entregue',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
];

// O step ativo é inferido do conteúdo via marcador especial "#step:N" (1-4).
// Caso não exista, assume passo 3 (saiu para entrega).
function parseStep(content: string): number {
  const match = content.match(/#step:([1-4])/);
  if (match) return parseInt(match[1], 10) - 1; // 0-indexed
  return 2; // default: "Saiu para Entrega"
}

function cleanContent(content: string): string {
  return content.replace(/#step:[1-4]/g, '').trim();
}

function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleString('pt-BR', opts ?? {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortId(id: string) {
  return id.split('-')[0].toUpperCase();
}

export default function ViewLink() {
  const { id } = useParams<{ id: string }>();
  const [link, setLink] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const { data } = await api.get<LinkData>(`/links/${id}`);
        setLink(data);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchLink();
  }, [id]);

  if (loading) {
    return (
      <div className="tr-page">
        <div className="tr-loading">
          <span className="tr-spinner" />
          Carregando rastreio...
        </div>
      </div>
    );
  }

  if (notFound || !link) {
    return (
      <div className="tr-page">
        <div className="tr-not-found">
          <div className="tr-nf-icon">📦</div>
          <h2>Rastreio não encontrado</h2>
          <p>Este código de rastreamento pode ter expirado ou nunca existiu.</p>
        </div>
      </div>
    );
  }

  const activeStep = parseStep(link.content);
  const displayContent = cleanContent(link.content);
  const progressPct = (activeStep / (STEPS.length - 1)) * 100;

  // Simula timeline de eventos baseada no passo atual
  const timeline = STEPS.slice(0, activeStep + 1)
    .map((s, i) => ({
      label: s.label,
      date: new Date(
        new Date(link.createdAt).getTime() + i * 4 * 60 * 60 * 1000
      ).toISOString(),
    }))
    .reverse();

  return (
    <div className="tr-page">
      {/* Header */}
      <header className="tr-header">
        <div className="tr-header-inner">
          <div className="tr-brand">
            <img src="/logo.svg" alt="Neo:Peptideos" className="tr-brand-logo" />
          </div>
          <span className="tr-header-tag">Acompanhamento de Pedido</span>
        </div>
      </header>

      <main className="tr-main">
        {/* Card de código de rastreio */}
        <div className="tr-code-card">
          <div className="tr-code-left">
            <span className="tr-code-label">Código de rastreio</span>
            <span className="tr-code-value">{shortId(link.id)}</span>
            <span className="tr-code-full">{link.id}</span>
          </div>
          <div className="tr-code-right">
            <div className={`tr-status-badge tr-status-step-${activeStep}`}>
              {STEPS[activeStep].label}
            </div>
            <span className="tr-code-date">
              Pedido em {formatDate(link.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="tr-progress-card">
          <h2 className="tr-section-title">Status da Entrega</h2>

          <div className="tr-steps">
            {/* Trilho de fundo */}
            <div className="tr-track">
              <div className="tr-track-fill" style={{ width: `${progressPct}%` }} />

              {/* Caminhão */}
              <div
                className="tr-truck"
                style={{ left: `calc(${progressPct}% - ${progressPct > 5 ? 24 : 0}px)` }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 5H3a1 1 0 0 0-1 1v10h2a3 3 0 0 0 6 0h4a3 3 0 0 0 6 0h2v-5l-3-6h-2zM6 17.5A1.5 1.5 0 1 1 7.5 16 1.5 1.5 0 0 1 6 17.5zm12 0a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5zM16 10l2 4h-4V8h.5z" />
                </svg>
              </div>
            </div>

            {/* Steps */}
            <div className="tr-step-nodes">
              {STEPS.map((step, i) => {
                const state =
                  i < activeStep ? 'done' : i === activeStep ? 'active' : 'pending';
                return (
                  <div key={step.key} className={`tr-step tr-step-${state}`}>
                    <div className="tr-step-dot">
                      {i < activeStep ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <span className="tr-step-icon">{step.icon}</span>
                      )}
                    </div>
                    <span className="tr-step-label">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="tr-bottom-grid">
          {/* Informações do pedido */}
          {displayContent && (
            <div className="tr-info-card">
              <h2 className="tr-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {link.title}
              </h2>
              <p className="tr-info-body">{displayContent}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="tr-timeline-card">
            <h2 className="tr-section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Histórico
            </h2>
            <ul className="tr-timeline">
              {timeline.map((evt, i) => (
                <li key={i} className={`tr-tl-item${i === 0 ? ' tr-tl-item--active' : ''}`}>
                  <div className="tr-tl-dot" />
                  <div className="tr-tl-content">
                    <span className="tr-tl-label">{evt.label}</span>
                    <span className="tr-tl-date">{formatDate(evt.date)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      <footer className="tr-footer">
        Neo:Peptideos &copy; {new Date().getFullYear()} — Todos os direitos reservados
      </footer>
    </div>
  );
}
