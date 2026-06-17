import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface Project {
  id: string;
  name: string;
  path: string;
}

// 项目数据文件路径
const projectsFile = join(process.cwd(), 'projects.json');

// 读取项目数据
const readProjects = (): Project[] => {
  if (existsSync(projectsFile)) {
    try {
      const data = readFileSync(projectsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading projects file:', error);
      return [];
    }
  }
  return [];
};

// 写入项目数据
const writeProjects = (projects: Project[]) => {
  try {
    writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
  } catch (error) {
    console.error('Error writing projects file:', error);
  }
};

// 存储项目的数据库
let projects: Project[] = readProjects();

// 导出项目数据和操作方法
export { projects, writeProjects };