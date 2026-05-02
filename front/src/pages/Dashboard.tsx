import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import axios from 'axios';

interface LinkData {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export default function Dashboard() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [links, setLinks] = useState<LinkData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingLinks, setFetchingLinks] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState('');

  const showToast = (message: string, type: Toast['type']) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLinks = async () => {
    try {
      const { data } = await api.get<LinkData[]>('/links');
      setLinks(data.reverse());
    } catch {
      // silently fail – o interceptor já trata 401
    } finally {
      setFetchingLinks(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGenerateLink = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setGeneratedUrl('');

    try {
      const { data } = await api.post<LinkData>('/links', { title, content });
      const url = `${window.location.origin}/view/${data.id}`;
      setGeneratedUrl(url);
      setLinks((prev) => [data, ...prev]);
      setTitle('');
      setContent('');
      showToast('Link gerado com sucesso!', 'success');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        showToast(
          (err.response?.data as { message?: string })?.message ||
            'Erro ao gerar link',
          'error'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copiado!', 'success');
    } catch {
      showToast('Erro ao copiar link', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover este link?')) return;
    try {
      await api.delete(`/links/${id}`);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      showToast('Link removido', 'success');
    } catch {
      showToast('Erro ao remover link', 'error');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <img src="/logo.svg" alt="Neo:Peptideos" className="header-logo-img" />
        <div className="header-user">
          <span>
            Olá, <strong>{username}</strong>
          </span>
          <button
            className="btn btn-secondary"
            onClick={handleLogout}
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            Sair
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Formulário para criar link */}
        <div className="card">
          <h2 className="card-title">Gerar novo link</h2>
          <form onSubmit={handleGenerateLink}>
            <div className="form-group">
              <label htmlFor="title">Título</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do conteúdo"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="content">Conteúdo</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite o conteúdo que será exibido no link compartilhado..."
                required
                rows={7}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Gerando...' : '🔗 Gerar Link'}
            </button>

            {generatedUrl && (
              <div className="generated-link-box">
                <p>Link gerado</p>
                <a href={generatedUrl} target="_blank" rel="noopener noreferrer">
                  {generatedUrl}
                </a>
              </div>
            )}
          </form>
        </div>

        {/* Lista de links */}
        <div className="card">
          <h2 className="card-title">
            Links gerados ({links.length})
          </h2>

          {fetchingLinks ? (
            <div className="loading">Carregando...</div>
          ) : links.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum link gerado ainda.</p>
              <p>Preencha o formulário ao lado para criar o primeiro!</p>
            </div>
          ) : (
            <div className="links-list">
              {links.map((link) => {
                const url = `${window.location.origin}/view/${link.id}`;
                return (
                  <div key={link.id} className="link-item">
                    <div className="link-item-header">
                      <span className="link-item-title">{link.title}</span>
                      <span className="link-item-date">
                        {formatDate(link.createdAt)}
                      </span>
                    </div>
                    <div className="link-item-url">{url}</div>
                    <div className="link-item-actions">
                      <button
                        className="btn btn-icon"
                        onClick={() => handleCopy(url)}
                      >
                        Copiar
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-icon"
                      >
                        Abrir
                      </a>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(link.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
