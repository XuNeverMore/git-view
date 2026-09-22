'use client';

import 'react-day-picker/style.css';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';

interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

interface ProjectCommits {
  projectId: string;
  projectBranch: string;
  projectName: string;
  projectPath: string;
  commits: Commit[];
}

interface AuthorData {
  authors: string[];
  date: string;
  projectCommits: ProjectCommits[];
  totalCommits: number;
  unavailableProjects: string[];
}

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const toDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toDateString = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TodayAuthorsPage() {
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [data, setData] = useState<AuthorData | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [copyNote, setCopyNote] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen]);

  useEffect(() => {
    const fetchAuthorCommits = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await fetch('/api/authors/today', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ date: selectedDate }),
        });

        if (response.ok) {
          const result = await response.json();
          setData(result);
          setSelectedAuthor((currentAuthor) => currentAuthor || result.authors[0] || '');
        } else {
          const result = await response.json();
          setErrorMessage(result.error || '获取作者提交信息失败');
        }
      } catch (error) {
        console.error('Error fetching author commits:', error);
        setErrorMessage('无法连接作者提交接口');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuthorCommits();
  }, [selectedDate]);

  const selectedProjectCommits = useMemo(() => {
    if (!data || !selectedAuthor) return [];

    return data.projectCommits
      .map((project) => ({
        ...project,
        commits: project.commits.filter((commit) => commit.author === selectedAuthor),
      }))
      .filter((project) => project.commits.length > 0);
  }, [data, selectedAuthor]);

  const selectedCommitCount = selectedProjectCommits.reduce(
    (count, project) => count + project.commits.length,
    0,
  );

  const handleCopySelectedAuthorCommits = async () => {
    if (!selectedAuthor || selectedProjectCommits.length === 0) return;

    const commitText = selectedProjectCommits
      .map((project) => {
        const lines = project.commits.map((commit) => `- ${commit.message}`);
        return `【${project.projectName} / ${project.projectBranch}】\n${lines.join('\n')}`;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(commitText);
      setCopyNote(`已复制 ${selectedAuthor} 的 ${selectedCommitCount} 条提交信息`);
      window.setTimeout(() => setCopyNote(''), 2200);
    } catch (error) {
      console.error('Error copying author commits:', error);
      setCopyNote('复制失败，请检查浏览器剪贴板权限');
    }
  };

  return (
    <main className="app-shell">
      <div className="workspace">
        <header className="topbar">
          <Link href="/" className="back-button">
            &lt;- 返回项目列表
          </Link>
        </header>

        <section className="detail-hero">
          <div>
            <div className="brand-mark">
              <span className="brand-dot" />
              <span>Author Radar</span>
            </div>
            <h1>按作者查看提交</h1>
            <p className="detail-subtitle">
              从所有已添加仓库里拉取指定日期的 Git log，选择一个作者后按项目分组查看他参与的提交。
            </p>
          </div>
          <div className="hero-date-block" ref={calendarRef}>
            <button
              type="button"
              className="hero-date-label"
              onClick={() => setIsCalendarOpen((v) => !v)}
            >
              <span className="hero-date-value">{selectedDate}</span>
              <span className="hero-date-hint">点击切换日期</span>
            </button>
            {isCalendarOpen && (
              <div className="hero-calendar-popover">
                <DayPicker
                  mode="single"
                  selected={toDate(selectedDate)}
                  onSelect={(day) => {
                    if (day) {
                      setSelectedDate(toDateString(day));
                      setIsCalendarOpen(false);
                    }
                  }}
                  disabled={{ after: new Date() }}
                  showOutsideDays
                />
              </div>
            )}
          </div>
        </section>

        {errorMessage && <p className="error-banner">{errorMessage}</p>}

        <section className="author-workbench">
          <aside className="panel author-picker">
            <div className="panel-header">
              <h2 className="panel-title">Authors</h2>
              <span className="panel-kicker">{data?.authors.length || 0} 位</span>
            </div>

            {isLoading ? (
              <div className="empty-state">
                <strong>正在汇总作者</strong>
                <span>正在扫描所有项目 {selectedDate} 的提交。</span>
              </div>
            ) : !data || data.authors.length === 0 ? (
              <div className="empty-state">
                <strong>该日期暂无作者</strong>
                <span>当前已添加项目在 {selectedDate} 没有提交。</span>
              </div>
            ) : (
              <div className="author-list">
                {data.authors.map((author) => {
                  const count = data.projectCommits.reduce(
                    (total, project) =>
                      total + project.commits.filter((commit) => commit.author === author).length,
                    0,
                  );

                  return (
                    <button
                      key={author}
                      className={`author-choice${selectedAuthor === author ? ' is-active' : ''}`}
                      onClick={() => setSelectedAuthor(author)}
                    >
                      <span>{author}</span>
                      <strong>{count}</strong>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">{selectedAuthor || 'Commit Scope'}</h2>
                <span className="panel-kicker">
                  {selectedCommitCount} 条提交 / {selectedProjectCommits.length} 个项目
                </span>
              </div>
              <button
                onClick={handleCopySelectedAuthorCommits}
                disabled={selectedCommitCount === 0}
                className="copy-button"
              >
                一键复制
              </button>
            </div>

            {copyNote && <p className="toast-note">{copyNote}</p>}

            {data?.unavailableProjects.length ? (
              <p className="toast-note">
                部分项目无法读取：{data.unavailableProjects.join('、')}
              </p>
            ) : null}

            {isLoading ? (
              <div className="empty-state">
                <strong>正在读取提交</strong>
                <span>稍等一下，日志正在归档。</span>
              </div>
            ) : selectedProjectCommits.length === 0 ? (
              <div className="empty-state">
                <strong>没有匹配提交</strong>
                <span>请选择左侧作者，或回到首页添加更多仓库。</span>
              </div>
            ) : (
              <div className="project-commit-stack">
                {selectedProjectCommits.map((project) => (
                  <article key={project.projectId} className="project-commit-group">
                    <div className="project-commit-heading">
                      <div>
                        <div className="project-title-row">
                          <h3>{project.projectName}</h3>
                          <span className="branch-badge">{project.projectBranch}</span>
                        </div>
                        <p className="path-line">{project.projectPath}</p>
                      </div>
                      <Link href={`/project/${project.projectId}`} className="inline-link">
                        打开项目
                      </Link>
                    </div>
                    <ul className="author-commit-list">
                      {project.commits.map((commit) => (
                        <li key={commit.hash}>
                          <span className="date-chip">{commit.date}</span>
                          <span>
                            {commit.message}
                            <small className="commit-hash">{commit.hash.slice(0, 12)}</small>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
