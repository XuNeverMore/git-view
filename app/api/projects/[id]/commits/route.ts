import { NextRequest, NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import { projects } from '../../data';

interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

interface ContributionDay {
  date: string;
  count: number;
  isFuture: boolean;
}

const readBranch = (path: string) => {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: path,
      encoding: 'utf8',
    }).trim();
  } catch (error) {
    console.error('Error reading project branch:', error);
    return 'unknown';
  }
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const parseDateKey = (date: string) => new Date(`${date}T00:00:00`);

const readContributionCalendar = (path: string) => {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  const startDate = addDays(endDate, -364);
  const gridStartDate = addDays(startDate, -startDate.getDay());
  const gridEndDate = addDays(endDate, 6 - endDate.getDay());

  const output = execFileSync(
    'git',
    [
      'log',
      `--since=${gridStartDate.toISOString()}`,
      `--until=${addDays(endDate, 1).toISOString()}`,
      '--pretty=format:%cd',
      '--date=short',
    ],
    { cwd: path, encoding: 'utf8' },
  );

  const counts = new Map<string, number>();
  output
    .split('\n')
    .filter((line) => line.trim())
    .forEach((date) => {
      counts.set(date, (counts.get(date) || 0) + 1);
    });

  const days: ContributionDay[] = [];
  for (let current = gridStartDate; current <= gridEndDate; current = addDays(current, 1)) {
    const date = formatDateKey(current);
    const isFuture = current > endDate;
    days.push({
      date,
      count: isFuture ? 0 : counts.get(date) || 0,
      isFuture,
    });
  }

  const visibleDays = days.filter((day) => day.date >= formatDateKey(startDate) && !day.isFuture);
  const activeDays = visibleDays.filter((day) => day.count > 0).length;
  const totalCommits = visibleDays.reduce((total, day) => total + day.count, 0);
  const maxCount = Math.max(0, ...visibleDays.map((day) => day.count));

  return {
    days,
    startDate: formatDateKey(startDate),
    endDate: formatDateKey(endDate),
    activeDays,
    totalCommits,
    maxCount,
  };
};

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { date, sortBy } = await request.json();

    const project = projects.find((project) => project.id === params.id);
    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    const selectedDate = typeof date === 'string' ? date : formatDateKey(new Date());
    const startDate = parseDateKey(selectedDate);
    const endDate = addDays(startDate, 1);

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    const projectBranch = readBranch(project.path);
    const contributionCalendar = readContributionCalendar(project.path);

    const output = execFileSync(
      'git',
      [
        'log',
        `--since=${startDateStr}`,
        `--until=${endDateStr}`,
        '--pretty=format:%H%x1f%an%x1f%cd%x1f%s',
        '--date=iso',
      ],
      { cwd: project.path, encoding: 'utf8' },
    );

    const commits: Commit[] = output
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const [hash, author, commitDate, ...messageParts] = line.split('\x1f');
        return {
          hash,
          author,
          date: commitDate.split(' ')[0],
          message: messageParts.join('\x1f'),
        };
      });

    if (sortBy === 'author') {
      commits.sort((a, b) => a.author.localeCompare(b.author));
    } else {
      commits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return NextResponse.json({
      commits,
      contributionCalendar,
      projectBranch,
      projectName: project.name,
    });
  } catch (error) {
    console.error('Error fetching commits:', error);
    return NextResponse.json({ error: '获取提交信息失败' }, { status: 500 });
  }
}
