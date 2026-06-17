import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { projects } from '../../projects/data';

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

const readBranch = (path: string) => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: path, encoding: 'utf8' }).trim();
  } catch (error) {
    console.error('Error reading project branch:', error);
    return 'unknown';
  }
};

const getDayRange = (date: string) => {
  const startDate = new Date(`${date}T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  return {
    startDateStr: startDate.toISOString(),
    endDateStr: endDate.toISOString(),
  };
};

const parseGitLog = (output: string): Commit[] => {
  return output
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, author, date, ...messageParts] = record.split('\x1f');
      return {
        hash,
        author,
        date,
        message: messageParts.join('\x1f'),
      };
    });
};

export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json();
    const selectedDate = date || new Date().toISOString().split('T')[0];
    const { startDateStr, endDateStr } = getDayRange(selectedDate);
    const projectCommits: ProjectCommits[] = [];
    const unavailableProjects: string[] = [];

    for (const project of projects) {
      try {
        const gitCommand =
          `git log --since="${startDateStr}" --until="${endDateStr}" ` +
          '--pretty=format:"%H%x1f%an%x1f%ad%x1f%s%x1e" --date=iso';
        const output = execSync(gitCommand, { cwd: project.path, encoding: 'utf8' });
        const commits = parseGitLog(output);

        if (commits.length > 0) {
          projectCommits.push({
            projectId: project.id,
            projectBranch: readBranch(project.path),
            projectName: project.name,
            projectPath: project.path,
            commits,
          });
        }
      } catch (error) {
        console.error(`Error reading commits for ${project.name}:`, error);
        unavailableProjects.push(project.name);
      }
    }

    const authors = Array.from(
      new Set(projectCommits.flatMap((project) => project.commits.map((commit) => commit.author))),
    ).sort((a, b) => a.localeCompare(b));

    const totalCommits = projectCommits.reduce(
      (count, project) => count + project.commits.length,
      0,
    );

    return NextResponse.json({
      authors,
      date: selectedDate,
      projectCommits,
      totalCommits,
      unavailableProjects,
    });
  } catch (error) {
    console.error('Error reading author commits:', error);
    return NextResponse.json({ error: '获取作者提交信息失败' }, { status: 500 });
  }
}
