'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Project {
  id: string;
  name: string;
  path: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectPath, setNewProjectPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects/add');
        if (response.ok) {
          const projectsList = await response.json();
          setProjects(projectsList);
        } else {
          setErrorMessage('项目列表读取失败');
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        setErrorMessage('无法连接项目列表接口');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleAddProject = async () => {
    if (!newProjectPath) return;
    setIsAdding(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/projects/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: newProjectPath }),
      });

      if (response.ok) {
        const newProject = await response.json();
        setProjects((prev) => [...prev, newProject]);
        setNewProjectPath('');
        setIsAddDialogOpen(false);
      } else {
        const data = await response.json();
        setErrorMessage(data.error || '添加项目失败');
      }
    } catch (error) {
      console.error('Error adding project:', error);
      setErrorMessage('添加项目时发生网络错误');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="workspace">
        <header className="topbar">
          <div className="brand-mark">
            <span className="brand-dot" />
            <span>Git View</span>
          </div>
          <div className="status-strip">LOCAL REPOSITORY WORKBENCH</div>
        </header>

        <section className="hero">
          <div>
            <h1>查看你的 Git 工作脉络</h1>
            <p>
              把本地仓库接入进来，按日期快速回看提交记录、作者分布和当天的工作节奏。
            </p>
          </div>
          <div className="metric-board" aria-label="项目概览">
            <div className="metric">
              <strong>{projects.length}</strong>
              <span>Repositories</span>
            </div>
            <div className="metric">
              <strong>{isLoading ? '..' : 'OK'}</strong>
              <span>Index State</span>
            </div>
          </div>
        </section>

        <section className="single-column">
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Repository Deck</h2>
              <div className="panel-actions">
                <Link href="/authors/today" className="inline-link">
                  查看今日作者
                </Link>
                <button onClick={() => setIsAddDialogOpen(true)} className="action-button">
                  添加仓库
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="empty-state">
                <strong>正在读取项目</strong>
                <span>请稍等片刻。</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <strong>还没有接入仓库</strong>
                <span>
                  在左侧输入类似 <code>/Users/name/work/repo</code> 的本地路径。
                </span>
              </div>
            ) : (
              <ul className="project-list">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link href={`/project/${project.id}`} className="project-card">
                      <span className="repo-glyph">{project.name.slice(0, 2)}</span>
                      <span>
                        <h3 className="project-name">{project.name}</h3>
                        <p className="path-line">{project.path}</p>
                      </span>
                      <span className="arrow-cell">-&gt;</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {isAddDialogOpen && (
          <div className="modal-backdrop" role="presentation">
            <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="add-repo-title">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title" id="add-repo-title">
                    Add Source
                  </h2>
                  <span className="panel-kicker">接入本地 Git 仓库</span>
                </div>
                <button onClick={() => setIsAddDialogOpen(false)} className="icon-button" aria-label="关闭">
                  x
                </button>
              </div>
              <div className="form-panel">
                <label className="field-label" htmlFor="project-path">
                  Repository path
                </label>
                <div className="input-row">
                  <input
                    id="project-path"
                    type="text"
                    value={newProjectPath}
                    onChange={(e) => setNewProjectPath(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddProject();
                      if (e.key === 'Escape') setIsAddDialogOpen(false);
                    }}
                    placeholder="/Users/name/work/project"
                    className="text-input"
                    autoFocus
                  />
                  <button
                    onClick={handleAddProject}
                    disabled={isAdding || !newProjectPath}
                    className="action-button"
                  >
                    {isAdding ? '添加中' : '添加'}
                  </button>
                </div>
                <p className="helper-text">
                  只接收有效 Git 仓库路径，添加成功后会自动回到仓库列表。
                </p>
                {errorMessage && <p className="error-text">{errorMessage}</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
