import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { projects } from '../../data';

interface Project {
  id: string;
  name: string;
  path: string;
}

interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

const readBranch = (path: string) => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd: path, encoding: 'utf8' }).trim();
  } catch (error) {
    console.error('Error reading project branch:', error);
    return 'unknown';
  }
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { date, sortBy } = await request.json();
    
    // 查找项目
    const project = projects.find(p => p.id === params.id);
    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }
    
    // 构建git命令
    // 查找指定日期的提交
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    const projectBranch = readBranch(project.path);
    
    // 执行git命令获取提交信息
    const gitCommand = `git log --since="${startDateStr}" --until="${endDateStr}" --pretty=format:"%H|%an|%ad|%s" --date=iso`;
    const output = execSync(gitCommand, { cwd: project.path, encoding: 'utf8' });
    
    // 解析提交信息
    const commits: Commit[] = output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, author, date, ...messageParts] = line.split('|');
        return {
          hash,
          author,
          date: date.split(' ')[0],
          message: messageParts.join('|')
        };
      });
    
    // 排序
    if (sortBy === 'author') {
      commits.sort((a, b) => a.author.localeCompare(b.author));
    } else {
      // 按时间倒序
      commits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    return NextResponse.json({ commits, projectBranch, projectName: project.name });
  } catch (error) {
    return NextResponse.json({ error: '获取提交信息失败' }, { status: 500 });
  }
}
