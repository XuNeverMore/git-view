'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sortBy, setSortBy] = useState<'author' | 'date'>('date');
  const [projectName, setProjectName] = useState('');
  const [projectBranch, setProjectBranch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [copyNote, setCopyNote] = useState('');

  useEffect(() => {
    const fetchCommits = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await fetch(`/api/projects/${params.id}/commits`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ date: selectedDate, sortBy }),
        });

        if (response.ok) {
          const data = await response.json();
          setCommits(data.commits);
          setProjectBranch(data.projectBranch);
          setProjectName(data.projectName);
        } else {
          const data = await response.json();
          setErrorMessage(data.error || '获取提交信息失败');
        }
      } catch (error) {
        console.error('Error fetching commits:', error);
        setErrorMessage('无法连接提交记录接口');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommits();
  }, [params.id, selectedDate, sortBy]);

  const handleCopyCommits = async (author: string) => {
    const authorCommits = commits.filter((commit) => commit.author === author);
    const commitMessages = authorCommits.map((commit) => `- ${commit.message}`).join('\n');

    try {
      await navigator.clipboard.writeText(commitMessages);
      setCopyNote(`已复制 ${author} 的 ${authorCommits.length} 条提交信息`);
      window.setTimeout(() => setCopyNote(''), 2200);
    } catch (error) {
      console.error('Error copying commits:', error);
      setCopyNote('复制失败，请检查浏览器剪贴板权限');
    }
  };

  const authors = Array.from(new Set(commits.map((commit) => commit.author)));

  return (
    <main className="app-shell">
      <div className="workspace">
        <header className="topbar">
          <button onClick={() => router.back()} className="back-button">
            &lt;- 返回项目列表
          </button>
          <div className="status-strip">{selectedDate}</div>
        </header>

        <section className="detail-hero">
          <div>
            <div className="brand-mark">
              <span className="brand-dot" />
              <span>Commit Ledger</span>
            </div>
            <h1>{projectName || 'Git 项目'} 的提交记录</h1>
            {projectBranch && (
              <div className="branch-line">
                <span className="branch-badge">{projectBranch}</span>
              </div>
            )}
            <p className="detail-subtitle">
              用日期切片查看当天提交，按时间追踪节奏，或按作者整理成可复制的日报素材。
            </p>
          </div>
          <div className="metric-board" aria-label="提交概览">
            <div className="metric">
              <strong>{isLoading ? '..' : commits.length}</strong>
              <span>Commits</span>
            </div>
            <div className="metric">
              <strong>{authors.length}</strong>
              <span>Authors</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Filters</h2>
            <span className="panel-kicker">日期与排序</span>
          </div>
          <div className="control-deck">
            <label>
              <span className="field-label">Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-input"
              />
            </label>
            <label>
              <span className="field-label">Sort by</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'author' | 'date')}
                className="select-input"
              >
                <option value="date">按时间排序</option>
                <option value="author">按作者排序</option>
              </select>
            </label>
            <div className="mini-stat">
              <strong>{sortBy === 'author' ? authors.length : commits.length}</strong>
              <span>{sortBy === 'author' ? '当前作者分组' : '当前时间线条目'}</span>
            </div>
          </div>
        </section>

        <section className="panel" style={{ marginTop: 18 }}>
          <div className="panel-header">
            <h2 className="panel-title">
              {sortBy === 'author' ? 'Author Groups' : 'Commit Timeline'}
            </h2>
            <span className="panel-kicker">{isLoading ? '同步中' : `${commits.length} 条提交`}</span>
          </div>

          {copyNote && <p className="toast-note">{copyNote}</p>}
          {errorMessage && <p className="error-text" style={{ padding: '0 18px' }}>{errorMessage}</p>}

          {isLoading ? (
            <div className="empty-state">
              <strong>正在读取提交记录</strong>
              <span>正在从本地仓库拉取日志。</span>
            </div>
          ) : commits.length === 0 ? (
            <div className="empty-state">
              <strong>该日期没有提交</strong>
              <span>换一天试试，或者确认仓库当天是否有 Git log。</span>
            </div>
          ) : sortBy === 'author' ? (
            <div className="author-groups">
              {authors.map((author) => {
                const authorCommits = commits.filter((commit) => commit.author === author);
                return (
                  <article key={author} className="author-group">
                    <div className="author-heading">
                      <div>
                        <h3>{author}</h3>
                        <span className="panel-kicker">{authorCommits.length} 条提交</span>
                      </div>
                      <button onClick={() => handleCopyCommits(author)} className="copy-button">
                        复制提交
                      </button>
                    </div>
                    <ul className="author-commit-list">
                      {authorCommits.map((commit) => (
                        <li key={commit.hash}>
                          <span className="date-chip">{commit.date}</span>
                          <span>{commit.message}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          ) : (
            <ul className="timeline">
              {commits.map((commit) => (
                <li key={commit.hash} className="commit-item">
                  <div className="commit-meta">
                    <span className="commit-author">{commit.author}</span>
                    <span>{commit.date}</span>
                  </div>
                  <div>
                    <p className="commit-message">{commit.message}</p>
                    <div className="commit-hash">{commit.hash.slice(0, 12)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
