'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Project {
  id: string;
  name: string;
  path: string;
}

interface ThemeConfig {
  bgColor: string;
  gridColor: string;
  gridStyle?: 'grid' | 'checker';
  gridCount?: number;
  checkerColor?: string;
  topBgColor: string;
}

const defaultTheme: ThemeConfig = {
  bgColor: '#e8decf',
  gridColor: 'rgba(20, 25, 21, 0.05)',
  gridStyle: 'grid',
  gridCount: 38,
  checkerColor: 'rgba(20, 25, 21, 0.08)',
  topBgColor: '#1a1e1b',
};

const generateColor = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 45%, 65%)`;
};

const hslToHex = (h: number, s: number, l: number) => {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const loadTheme = (): ThemeConfig => {
  try {
    const stored = localStorage.getItem('theme-config');
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultTheme;
};

const applyTheme = (theme: ThemeConfig) => {
  const root = document.documentElement;
  root.style.setProperty('--theme-bg', theme.bgColor);
  root.style.setProperty('--theme-grid', theme.gridColor);
  root.style.setProperty('--theme-checker', theme.checkerColor || 'rgba(20, 25, 21, 0.08)');
  root.style.setProperty('--theme-top-bg', theme.topBgColor);
  root.style.setProperty('--theme-grid-count', String(theme.gridCount || 38));
  root.dataset.gridStyle = theme.gridStyle === 'checker' ? 'checker' : 'grid';
};

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectPath, setNewProjectPath] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [glyphColors, setGlyphColors] = useState<Record<string, string>>({});
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>(loadTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects/add');
        if (response.ok) {
          const projectsList = await response.json();
          setProjects(projectsList);

          const stored = localStorage.getItem('glyph-colors');
          const colors: Record<string, string> = stored ? JSON.parse(stored) : {};
          let changed = false;

          projectsList.forEach((p: Project) => {
            if (!colors[p.id]) {
              colors[p.id] = generateColor();
              changed = true;
            }
          });

          if (changed) {
            localStorage.setItem('glyph-colors', JSON.stringify(colors));
          }
          setGlyphColors(colors);
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

  const handleThemeChange = (key: keyof ThemeConfig, value: string | number) => {
    const updated = { ...theme, [key]: value };
    setTheme(updated);
    localStorage.setItem('theme-config', JSON.stringify(updated));
  };

  const handleThemeReset = () => {
    setTheme(defaultTheme);
    localStorage.removeItem('theme-config');
  };

  const handleThemeRandom = () => {
    const hue = () => Math.floor(Math.random() * 360);

    const updated: ThemeConfig = {
      bgColor: hslToHex(hue(), 30, 88),
      gridColor: `${hslToHex(hue(), 25, 20)}0d`,
      gridStyle: theme.gridStyle || 'grid',
      checkerColor: `${hslToHex(hue(), 30, 45)}1a`,
      topBgColor: hslToHex(hue(), 30 + Math.floor(Math.random() * 20), 12 + Math.floor(Math.random() * 8)),
    };
    setTheme(updated);
    localStorage.setItem('theme-config', JSON.stringify(updated));
  };

  return (
    <main className="app-shell">
      <div className="layout-row">
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
                      <span
                        className="repo-glyph"
                        style={{ background: glyphColors[project.id] }}
                      >
                        {project.name.slice(0, 2)}
                      </span>
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

        {isThemeOpen && (
          <div className="modal-backdrop" role="presentation" onClick={() => setIsThemeOpen(false)}>
            <div className="modal-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">主题设置</h2>
                  <span className="panel-kicker">自定义页面背景样式</span>
                </div>
                <button onClick={() => setIsThemeOpen(false)} className="icon-button" aria-label="关闭">
                  x
                </button>
              </div>
              <div className="form-panel">
                <div className="theme-field">
                  <label className="field-label">背景色</label>
                  <input
                    type="color"
                    value={theme.bgColor}
                    onChange={(e) => handleThemeChange('bgColor', e.target.value)}
                    className="color-input"
                  />
                </div>
                <div className="theme-field">
                  <label className="field-label">网格纹理色</label>
                  <input
                    type="color"
                    value={theme.gridColor.startsWith('rgba') ? '#141915' : theme.gridColor}
                    onChange={(e) => handleThemeChange('gridColor', e.target.value + '08')}
                    className="color-input"
                  />
                </div>
                <div className="theme-field">
                  <label className="field-label">网格样式</label>
                  <div className="segmented-control">
                    <button
                      type="button"
                      className={`segment${(theme.gridStyle || 'grid') === 'grid' ? ' is-active' : ''}`}
                      onClick={() => handleThemeChange('gridStyle', 'grid')}
                    >
                      网格线
                    </button>
                    <button
                      type="button"
                      className={`segment${theme.gridStyle === 'checker' ? ' is-active' : ''}`}
                      onClick={() => handleThemeChange('gridStyle', 'checker')}
                    >
                      棋盘格
                    </button>
                  </div>
                </div>
                {theme.gridStyle === 'checker' && (
                  <div className="theme-field">
                    <label className="field-label">颜色格颜色</label>
                    <input
                      type="color"
                      value={theme.checkerColor?.startsWith('rgba') ? '#141915' : theme.checkerColor?.slice(0, 7) || '#141915'}
                      onChange={(e) => handleThemeChange('checkerColor', e.target.value + '14')}
                      className="color-input"
                    />
                  </div>
                )}
                <div className="theme-field">
                  <label className="field-label">一行格子数</label>
                  <input
                    type="number"
                    min={8}
                    max={100}
                    value={theme.gridCount || 38}
                    onChange={(e) =>
                      handleThemeChange('gridCount', Math.max(8, Math.min(100, Number(e.target.value) || 38)))
                    }
                    className="number-input"
                  />
                </div>
                <div className="theme-field">
                  <label className="field-label">顶部背景色</label>
                  <input
                    type="color"
                    value={theme.topBgColor}
                    onChange={(e) => handleThemeChange('topBgColor', e.target.value)}
                    className="color-input"
                  />
                </div>
                <div className="theme-actions">
                  <button onClick={handleThemeRandom} className="ghost-button">
                    随机主题
                  </button>
                  <button onClick={handleThemeReset} className="ghost-button">
                    恢复默认
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="side-dock">
        <button onClick={() => setIsThemeOpen(true)} className="dock-button">
          主题设置
        </button>
        <Link href="/authors/today" className="dock-button">
          作者视图
        </Link>
        <button onClick={() => setIsAddDialogOpen(true)} className="dock-button">
          添加仓库
        </button>
      </aside>
      </div>
    </main>
  );
}
