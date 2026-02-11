
import { ParsedTitle } from '@/types/common';

export const SEASON_REGEX = /(?:[\s:：(（\[【]|^)(?:第[0-9一二三四五六七八九十]+季|Season\s*\d+|S\d+).*/i;

export function removeSeasonInfo(title: string): string {
  return title.replace(SEASON_REGEX, '').trim();
}

export function hasSeasonInfo(title: string): boolean {
  return SEASON_REGEX.test(title);
}

export function cleanTitle(title: string): string {
  return title
    .replace(/[【】\[\]()（）]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseDmhyTitle(raw: string): ParsedTitle {
  let title = raw;
  let group = '';
  let res = '';
  let sub = '';
  let fmt = '';

  const groupMatch = title.match(/^(?:\[|【)([^\]】]+)(?:\]|】)/);
  if (groupMatch) {
    group = groupMatch[1];
    title = title.replace(groupMatch[0], ' ');
  }

  const resMatch = title.match(/(?:1080[pP]|720[pP]|2160[pP]|4[kK])/);
  if (resMatch) {
    res = resMatch[0];
    title = title.replace(new RegExp(resMatch[0], 'i'), ' ');
  }

  const fmtKeywords = ['AVC', 'HEVC', 'x264', 'x265', 'MP4', 'MKV', 'WebRip', 'BDRip', 'AAC', 'OPUS', '10bit', '8bit'];
  const foundFmts: string[] = [];
  fmtKeywords.forEach(k => {
    const regex = new RegExp(k, 'i');
    if (regex.test(title)) {
      foundFmts.push(k);
      title = title.replace(regex, ' ');
    }
  });
  fmt = foundFmts.join(' ');

  const subKeywords = ['CHS', 'CHT', 'GB', 'BIG5', 'JPN', 'ENG', '简', '繁', '日', '双语', '内封', '外挂'];
  title = title.replace(/(?:\[|【|\()([^\]】)]+)(?:\]|】|\))/g, (match, content: string) => {
    const up = content.toUpperCase();
    if (subKeywords.some(k => up.includes(k))) {
      sub += ' ' + content;
      return ' ';
    }
    return match;
  });

  const scoreStr = (str: string): number => {
    let s = 0; if (!str) return -999;
    const lower = str.toLowerCase();
    if (/[\u4e00-\u9fa5]/.test(str)) s += 15;
    if (str.includes('/')) s += 5;
    const len = str.length;
    if (len >= 2) s += Math.min(len, 20) * 0.5;
    let techCount = 0;
    if (/(?:1080p|720p|mkv|mp4|avc|hevc|aac|opus|bdrip|web-dl|remux|fin|v\d|av1)/.test(lower)) techCount = 1;
    if (/(?:字幕组|搬运|新番|合集|整理|发布|制作|招募|staff)/i.test(str)) s -= 20;
    if (techCount > 0) s -= 5;
    return s;
  };

  const blockRegex = /(?:\[[^\]]+\]|【[^】]+】|★[^★]+★|\([^\)]+\))/g;
  const blocks = title.match(blockRegex) || [];
  const naked = title.replace(blockRegex, ' ').trim();

  let bestStr = naked;
  let maxScore = scoreStr(naked);
  if (naked.length < 2 && !/[\u4e00-\u9fa5]/.test(naked)) maxScore -= 10;

  blocks.forEach(b => {
    const content = b.slice(1, -1);
    const score = scoreStr(content);
    if (score > maxScore) { maxScore = score; bestStr = content; }
  });
  title = bestStr;

  title = title.replace(/[|／_]/g, '/');
  const techKeywords = /(?:1080p|720p|2160p|4k|web|bdrip|avc|hevc|aac|mp4|mkv|big5|chs|cht|jpn|eng|s\d+|season|fin|opus|x264|x265|10bit|tv动画|剧场版|ova|cd|others)/gi;
  title = title.replace(techKeywords, ' ');
  title = title.replace(/第\s*[\d一二三四五六七八九十]+\s*[话集季期部]/g, ' ');
  title = title.replace(/Season\s*\d+/gi, ' ');
  title = title.replace(/\s\d+-\d+/g, ' ');
  title = title.replace(/\[\d+(?:-\d+)?\]/g, ' ');

  if (title.includes('/')) {
    const parts = title.split('/').map(p => p.trim());
    const cnPart = parts.find(p => /[\u4e00-\u9fa5]/.test(p) && p.length > 1);
    if (cnPart) title = cnPart; else title = parts[0];
  }

  title = title.split('：')[0];
  const parenMatch = title.match(/^([\u4e00-\u9fa5\s\w:-]+)\s*[\(（]/);
  if (parenMatch) title = parenMatch[1];

  title = title.replace(/[\[\]【】()（）★]/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    title,
    group: group.trim(),
    resolution: res.trim(),
    subtitle: sub.trim(),
    format: fmt.trim()
  };
}
