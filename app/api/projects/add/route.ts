import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { projects, writeProjects } from '../data';

interface Project {
  id: string;
  name: string;
  path: string;
}

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();
    
    // 验证路径是否是git仓库
    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd: path });
    } catch (error) {
      return NextResponse.json({ error: '不是有效的Git仓库路径' }, { status: 400 });
    }
    
    // 获取项目名称
    const projectName = path.split('/').pop() || '未命名项目';
    
    // 创建新项目
    const newProject: Project = {
      id: Date.now().toString(),
      name: projectName,
      path
    };
    
    projects.push(newProject);
    writeProjects(projects);
    
    return NextResponse.json(newProject);
  } catch (error) {
    return NextResponse.json({ error: '添加项目失败' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(projects);
}