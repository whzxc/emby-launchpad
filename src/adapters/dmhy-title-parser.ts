/**
 * DMHY Title Parser
 *
 * Parses torrent titles from dmhy.org into structured data:
 * group, cleaned title, resolution, codec, audio, source, subtitle, format, episode, season.
 */

export interface ParsedDmhyTitle {
  /** Cleaned anime title (Chinese preferred) */
  title: string;
  /** Subtitle group name */
  group: string;
  /** Resolution: 1080p, 720p, 2160p, 4K, etc */
  resolution: string;
  /** Video codec: HEVC, AVC, x264, x265, AV1, 10bit, etc */
  codec: string;
  /** Audio codec: AAC, FLAC, OPUS, etc */
  audio: string;
  /** Media source: WebRip, BDRip, WEB-DL, Baha, IQIYI, BD, etc */
  source: string;
  /** Subtitle info: 简繁内封, CHS, CHT, etc */
  subtitle: string;
  /** Container format: MP4, MKV */
  format: string;
  /** Episode indicator: 06, 01-12, etc */
  episode: string;
  /** Season indicator: S2, 第二季, etc */
  season: string;
}

// ─── Pattern definitions ──────────────────────────────────────────────────

const RESOLUTION_RE = /(?:3840x2160|1920x1080|1280x720|2160[pP]|1080[pP]|720[pP]|4[kK])/i;

const CODEC_KEYWORDS = [
  'HEVC-10bit', 'HEVC 10bit', 'AVC 8bit', 'AVC-8bit',
  'HEVC', 'AVC', 'H\\.?265', 'H\\.?264',
  'x265', 'x264', 'AV1',
  '10bit', '10-bit', '8bit', '8-bit',
];
const CODEC_RE = new RegExp(`(?:${CODEC_KEYWORDS.join('|')})`, 'gi');

const AUDIO_KEYWORDS = ['AACx3', 'AACx2', 'AAC', 'FLAC', 'OPUS', 'DTS', 'AC3', 'TrueHD', 'Atmos'];
const AUDIO_RE = new RegExp(`(?:${AUDIO_KEYWORDS.join('|')})`, 'gi');

const SOURCE_KEYWORDS = [
  'WEB-DL', 'WebRip', 'Web-Rip', 'BDRip', 'BD-Rip', 'BDRIP',
  'Baha', 'B-Global', 'IQIYI', 'Bilibili', 'TVRip',
  'Remux', 'BD', 'DVD',
];
const SOURCE_RE = new RegExp(`(?:${SOURCE_KEYWORDS.join('|')})`, 'gi');

const FORMAT_KEYWORDS = ['MKV', 'MP4', 'AVI'];
const FORMAT_RE = new RegExp(`\\b(?:${FORMAT_KEYWORDS.join('|')})\\b`, 'gi');

const SUBTITLE_KEYWORDS_BLOCK = [
  '简繁日内封字幕', '简繁内封字幕', '简繁日内封', '繁簡日內封',
  '简繁内封', '繁简日内封', '繁简内封',
  '简体内嵌', '繁体内嵌', '简体内封', '繁体内封',
  '简日内嵌', '繁日内嵌', '简日双语', '繁日雙語',
  '简日内封', '繁日内封', '粵日雙語', '粵日國三語',
  '内封繁体中文字幕', '内封繁體中文字幕',
  '外挂繁體中文', '外挂简中字幕', '外掛繁體中文',
  '简中字幕', '繁中字幕', '英文字幕',
  'CHS', 'CHT', 'BIG5', 'GB',
];
const SUBTITLE_BLOCK_RE = new RegExp(`(?:${SUBTITLE_KEYWORDS_BLOCK.map(escapeRegex).join('|')})`, 'gi');

const SEASON_RE = /(?:第([0-9一二三四五六七八九十百]+)[季期部]|[Ss](?:eason\s*)?(\d+))/;
const EPISODE_RE = /(?:\s-\s*(\d{2,3})-(\d{2,3})(?:\s*(?:Fin|END|完))?\b|\s-\s*(\d+(?:v\d)?)\b|\b(\d{2,3})-(\d{2,3})(?:\s*(?:Fin|END|完))?\b)/i;

// Common group names for validation
const KNOWN_GROUP_PREFIXES = [
  'LoliHouse', 'ANi', 'VCB-Studio', 'SweetSub', 'GMTeam', 'GM-Team',
  '桜都字幕组', '樱都字幕组', '幻樱字幕组', '幻櫻字幕組', '喵萌奶茶屋',
  '百冬练习组', '百冬練習組', '绿茶字幕组', '綠茶字幕組', '冷番补完字幕组',
  '萝莉社活动室', '六四位元字幕組',
  '沸班亚马制作组', 'jibaketa',
  '整理搬运',
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Main parser ──────────────────────────────────────────────────────────

export function parseDmhyTitle(raw: string): ParsedDmhyTitle {
  const result: ParsedDmhyTitle = {
    title: '',
    group: '',
    resolution: '',
    codec: '',
    audio: '',
    source: '',
    subtitle: '',
    format: '',
    episode: '',
    season: '',
  };

  let text = raw.trim();
  // Remove zero-width characters
  text = text.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // --- 1. Extract group (first [...] or 【...】) ---
  text = extractGroup(text, result);

  // --- 2. Handle star-delimited format (六四位元字幕組★...★) ---
  if (text.includes('★')) {
    return parseStarFormat(text, result);
  }

  // --- 3. Handle 整理搬运 / collection format ---
  if (result.group === '整理搬运') {
    return parseCollectionFormat(text, result);
  }

  // --- 4. Remove search-aid annotations（检索用：...）---
  text = text.replace(/[（(]检索用[：:].*?[）)]/g, '');

  // --- 5. Extract bracketed blocks and classify them ---
  const { naked, tags } = extractBracketedBlocks(text);

  // Classify each tag block
  for (const tag of tags) {
    classifyTagBlock(tag, result);
  }

  // --- 5. Extract inline tech keywords from naked text ---
  extractInlineTech(naked, result);

  // --- 6. Clean and extract the title from naked text ---
  let title = cleanTitle(naked, result);

  // --- 7. If naked text produced no title, find it among bracket blocks ---
  if (!title && tags.length > 0) {
    title = findTitleFromTags(tags, result);
  }

  result.title = title;
  return result;
}

/**
 * Extract the group from the first bracket block.
 * Returns the remaining text after group extraction.
 */
function extractGroup(text: string, result: ParsedDmhyTitle): string {
  // Match first [...] or 【...】
  const groupMatch = text.match(/^(?:\[|【)([^\]】]+)(?:\]|】)/);
  if (groupMatch) {
    const candidate = groupMatch[1].trim();
    // Validate it looks like a group name (not a pure tech tag or title)
    if (isGroupName(candidate)) {
      result.group = candidate;
      text = text.slice(groupMatch[0].length).trim();
    }
  }
  return text;
}

/**
 * Check if a string looks like a subtitle group name.
 */
function isGroupName(str: string): boolean {
  // Known groups
  if (KNOWN_GROUP_PREFIXES.some(g => str.includes(g))) return true;
  // Contains & (merged groups like 三明治摆烂组&LoliHouse)
  if (str.includes('&')) return true;
  // Short alphanumeric (likely a group)
  if (/^[\w\-\.]+$/.test(str) && str.length <= 30) return true;
  // Contains 字幕 or 制作 or 压制
  if (/(?:字幕|制作|压制|壓制|合成|練習|练习|搬运|搬運|活动室)/.test(str)) return true;
  // Has both Chinese and English characters (typical group name)
  if (/[\u4e00-\u9fa5]/.test(str) && /[a-zA-Z]/.test(str) && str.length <= 20) return true;
  return false;
}

/**
 * Parse star-delimited format: 六四位元字幕組★标题★episode range★resolution★source codec audio format★subtitle
 */
function parseStarFormat(text: string, result: ParsedDmhyTitle): ParsedDmhyTitle {
  const parts = text.split('★').map(p => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    // If no group was extracted (star format doesn't use brackets for group),
    // the first part is the group name, second is title
    let titleIdx = 0;
    if (!result.group && isGroupName(parts[0])) {
      result.group = parts[0];
      titleIdx = 1;
    }

    // Title part
    if (titleIdx < parts.length) {
      result.title = extractChineseTitle(parts[titleIdx]);
    }

    // Process remaining parts as tags
    for (let i = titleIdx + 1; i < parts.length; i++) {
      classifyTagBlock(parts[i], result);
    }
  }

  // Fallback
  if (!result.title && parts.length > 0) {
    result.title = parts[0];
  }

  return result;
}

/**
 * Parse collection/整理搬运 format:
 * 标题 (日文) (罗马字)：TV动画+剧场版+...
 */
function parseCollectionFormat(text: string, result: ParsedDmhyTitle): ParsedDmhyTitle {
  // Match Chinese title before first parenthesis or colon
  const colonIdx = text.indexOf('：');
  let titlePart = colonIdx > 0 ? text.substring(0, colonIdx) : text;

  // Extract just the Chinese title (before first parenthesis)
  const parenIdx = titlePart.search(/[（(]/);
  if (parenIdx > 0) {
    titlePart = titlePart.substring(0, parenIdx);
  }

  // Clean up the title
  titlePart = titlePart.replace(/[／\/]/g, '/');
  if (titlePart.includes('/')) {
    const parts = titlePart.split('/').map(p => p.trim());
    const cnPart = parts.find(p => /[\u4e00-\u9fa5]/.test(p) && p.length > 1);
    titlePart = cnPart || parts[0];
  }

  result.title = titlePart.trim();

  // Extract subtitle/audio info from the description portion
  if (colonIdx > 0) {
    const desc = text.substring(colonIdx + 1);
    if (/华日|日语|粤语/.test(desc)) {
      const audioMatch = desc.match(/(华日|日语|粤语|华日英)[音轨,;，；\s]/);
      if (audioMatch) result.audio = audioMatch[1];
    }
    if (/字幕/.test(desc)) {
      const subMatch = desc.match(/(外挂简中字幕|外挂简中|外掛繁體中文|内封简中字幕|外挂简中,\s*英文字幕)/);
      if (subMatch) result.subtitle = subMatch[1];
    }
  }

  return result;
}

/**
 * Find the best title from bracket blocks when naked text is empty.
 * Scores each tag block and picks the most likely title.
 */
function findTitleFromTags(tags: string[], result: ParsedDmhyTitle): string {
  // Filter out tags that are already classified as tech/meta
  const isTechOrMeta = (tag: string): boolean => {
    // Pure resolution
    if (RESOLUTION_RE.test(tag) && tag.match(RESOLUTION_RE)?.[0] === tag) return true;
    // Pure format
    if (/^(?:MP4|MKV|AVI)$/i.test(tag)) return true;
    // Pure episode
    if (/^\d{1,3}(?:v\d)?$/.test(tag)) return true;
    if (/^\d{2,3}-\d{2,3}/.test(tag)) return true;
    // Pure season
    if (/^[Ss]\d{1,2}$/.test(tag)) return true;
    // Pure year
    if (/^(?:19|20)\d{2}$/.test(tag)) return true;
    // Pure codec/audio/source (single keyword)
    const upperTag = tag.toUpperCase();
    if (['HEVC', 'AVC', 'X264', 'X265', 'AV1', 'AAC', 'FLAC', 'OPUS',
      'WEBRIP', 'BDRIP', 'WEB-DL', 'BD', 'GB', 'BIG5'].includes(upperTag)) return true;
    // Contains only tech keywords
    if (/^[\w\s\-.]+$/i.test(tag) && RESOLUTION_RE.test(tag)) return true;
    // 月新番
    if (/^\d+月新番$/.test(tag)) return true;
    // Is a subtitle tag
    if (SUBTITLE_BLOCK_RE.test(tag)) {
      SUBTITLE_BLOCK_RE.lastIndex = 0;
      return true;
    }
    // Category tag like 国漫, 動畫
    if (/^(?:国漫|動畫|动画|日漫)$/.test(tag)) return true;
    // 检索用 (search-aid annotation)
    if (/检索用/.test(tag)) return true;
    return false;
  };

  const scoreTag = (tag: string): number => {
    let score = 0;
    // Chinese characters are a strong signal for title
    const cnChars = (tag.match(/[\u4e00-\u9fa5]/g) || []).length;
    if (cnChars > 0) score += cnChars * 3;
    // Longer is better (but not too long)
    if (tag.length >= 2 && tag.length <= 40) score += tag.length;
    // Contains '/' (multi-language title separator)
    if (tag.includes('/') || tag.includes('_')) score += 5;
    // Penalize purely English/numbers (more likely tech)
    if (/^[\w\s\-.']+$/.test(tag) && !/[\u4e00-\u9fa5]/.test(tag)) score -= 10;
    // Penalize if it looks like a tech block
    if (isTechOrMeta(tag)) score -= 100;
    return score;
  };

  let bestTag = '';
  let bestScore = -Infinity;

  for (const tag of tags) {
    const score = scoreTag(tag);
    if (score > bestScore) {
      bestScore = score;
      bestTag = tag;
    }
  }

  if (bestTag) {
    return extractChineseTitle(bestTag);
  }
  return '';
}

/**
 * Extract all bracketed blocks from text.
 * Returns the naked text (without brackets) and the list of tag contents.
 */
function extractBracketedBlocks(text: string): { naked: string; tags: string[] } {
  const tags: string[] = [];
  const blockRegex = /(?:\[([^\]]+)\]|【([^】]+)】|（([^）]+)）)/g;
  let match;

  while ((match = blockRegex.exec(text)) !== null) {
    const content = (match[1] || match[2] || match[3]).trim();
    if (content) tags.push(content);
  }

  const naked = text.replace(/(?:\[[^\]]+\]|【[^】]+】|（[^）]+）)/g, ' ').trim();
  return { naked, tags };
}

/**
 * Classify a tag block and assign it to the appropriate result field.
 */
function classifyTagBlock(tag: string, result: ParsedDmhyTitle): void {
  const tagUpper = tag.toUpperCase();

  // Resolution
  if (!result.resolution && RESOLUTION_RE.test(tag)) {
    const m = tag.match(RESOLUTION_RE);
    if (m) result.resolution = m[0];
  }

  // Subtitle info
  if (SUBTITLE_BLOCK_RE.test(tag)) {
    const matches = tag.match(SUBTITLE_BLOCK_RE);
    if (matches) {
      result.subtitle = result.subtitle
        ? result.subtitle + ' ' + matches.join(' ')
        : matches.join(' ');
    }
    // If the whole block is a subtitle block, we're done
    return;
  }

  // Pure format
  if (/^(?:MP4|MKV|AVI)$/i.test(tag)) {
    result.format = tag.toUpperCase();
    return;
  }

  // Episode/Season number block: [06], [01-12], [19], [01-12 Fin], [01-12修正合集]
  // Check range first (01-12), then single (06)
  const epRangeMatch = tag.match(/^(\d{2,3}-\d{2,3})/);
  if (epRangeMatch && !result.episode) {
    result.episode = epRangeMatch[1];
    return;
  }
  if (/^\d{1,3}(?:v\d)?$/.test(tag) && !result.episode) {
    result.episode = tag;
    return;
  }

  // Season block like [S2], but not if it's part of a title
  if (/^[Ss]\d{1,2}$/.test(tag)) {
    result.season = tag;
    return;
  }

  // Source keyword
  if (SOURCE_RE.test(tag)) {
    const m = tag.match(SOURCE_RE);
    if (m && !result.source) result.source = m[0];
    // Reset lastIndex
    SOURCE_RE.lastIndex = 0;
  }

  // Codec in block
  if (CODEC_RE.test(tag)) {
    const m = tag.match(CODEC_RE);
    if (m) {
      const codecs = [...new Set(m.map(c => normalizeCodec(c)))];
      result.codec = result.codec
        ? result.codec + ' ' + codecs.join(' ')
        : codecs.join(' ');
    }
    CODEC_RE.lastIndex = 0;
  }

  // Audio in block
  if (AUDIO_RE.test(tag)) {
    const m = tag.match(AUDIO_RE);
    if (m && !result.audio) result.audio = m.join(' ');
    AUDIO_RE.lastIndex = 0;
  }

  // Format in block
  if (FORMAT_RE.test(tag)) {
    const m = tag.match(FORMAT_RE);
    if (m && !result.format) result.format = m[0].toUpperCase();
    FORMAT_RE.lastIndex = 0;
  }

  // Check for season in tag content like "10月新番"
  // (these are not seasons, just new-season labels)
}

/**
 * Extract tech keywords from the naked (non-bracketed) text.
 */
function extractInlineTech(text: string, result: ParsedDmhyTitle): void {
  // Resolution
  if (!result.resolution) {
    const m = text.match(RESOLUTION_RE);
    if (m) result.resolution = m[0];
  }

  // Source
  if (!result.source) {
    const m = text.match(SOURCE_RE);
    if (m) result.source = m[0];
    SOURCE_RE.lastIndex = 0;
  }

  // Codec
  if (!result.codec) {
    const m = text.match(CODEC_RE);
    if (m) {
      result.codec = [...new Set(m.map(c => normalizeCodec(c)))].join(' ');
    }
    CODEC_RE.lastIndex = 0;
  }

  // Audio
  if (!result.audio) {
    const m = text.match(AUDIO_RE);
    if (m) result.audio = m.join(' ');
    AUDIO_RE.lastIndex = 0;
  }

  // Format
  if (!result.format) {
    const m = text.match(FORMAT_RE);
    if (m) result.format = m[0].toUpperCase();
    FORMAT_RE.lastIndex = 0;
  }

  // Season
  if (!result.season) {
    const m = text.match(SEASON_RE);
    if (m) {
      result.season = m[0].trim();
    }
  }

  // Episode from `- 04-07` (range) or `- 06` (single) patterns
  if (!result.episode) {
    const m = text.match(EPISODE_RE);
    if (m) {
      // m[1]+m[2] = range from `- XX-XX`
      if (m[1] && m[2]) result.episode = `${m[1]}-${m[2]}`;
      // m[3] = single from `- XX`
      else if (m[3]) result.episode = m[3];
      // m[4]+m[5] = range from standalone `XX-XX`
      else if (m[4] && m[5]) result.episode = `${m[4]}-${m[5]}`;
    }
  }
}

/**
 * Normalize codec names.
 */
function normalizeCodec(codec: string): string {
  const c = codec.replace(/[\s-]/g, '').toUpperCase();
  if (c === 'H265' || c === 'H.265') return 'HEVC';
  if (c === 'H264' || c === 'H.264') return 'AVC';
  if (c === 'HEVC10BIT') return 'HEVC 10bit';
  if (c === 'AVC8BIT') return 'AVC 8bit';
  // Preserve standard names
  return codec;
}

/**
 * Clean the naked text to extract just the anime title.
 */
function cleanTitle(naked: string, result: ParsedDmhyTitle): string {
  let title = naked;

  // Remove tech keywords
  title = title.replace(RESOLUTION_RE, ' ');
  title = title.replace(SOURCE_RE, ' ');
  SOURCE_RE.lastIndex = 0;
  title = title.replace(CODEC_RE, ' ');
  CODEC_RE.lastIndex = 0;
  title = title.replace(AUDIO_RE, ' ');
  AUDIO_RE.lastIndex = 0;
  title = title.replace(FORMAT_RE, ' ');
  FORMAT_RE.lastIndex = 0;
  title = title.replace(SUBTITLE_BLOCK_RE, ' ');
  SUBTITLE_BLOCK_RE.lastIndex = 0;

  // Remove episode markers: "- 06", "- 04-07"
  title = title.replace(/\s+-\s+\d+(?:v\d)?(?:\s|$)/g, ' ');
  title = title.replace(/\s+-\s+\d{2,3}-\d{2,3}(?:\s+(?:Fin|END|完))?\s*/gi, ' ');

  // Remove season info that we've already captured
  if (result.season) {
    title = title.replace(SEASON_RE, ' ');
  }

  // Remove [Fin], [END], (完) markers
  title = title.replace(/\b(?:Fin|END|完)\b/gi, ' ');

  // Remove year indicators like [2025]
  title = title.replace(/\b(19|20)\d{2}\b/g, ' ');

  // Remove episode range patterns in naked text
  title = title.replace(/\b\d{2,3}-\d{2,3}\b/g, ' ');

  // Remove trailing version indicators like v2
  title = title.replace(/\bv\d\b/gi, ' ');

  // Remove 月新番 prefixes like "10月新番"
  title = title.replace(/\d+月新番/, ' ');

  // Remove （检索用：...） or (检索用：...)
  title = title.replace(/[（(]检索用[：:].*?[）)]/g, ' ');

  // Now extract the Chinese title
  title = extractChineseTitle(title);

  return title;
}

/**
 * From a cleaned string, extract the best Chinese title.
 * Handles patterns like "中文 / Romaji", "中文 / English / 日文".
 */
function extractChineseTitle(text: string): string {
  let title = text.trim();

  // Normalize separators
  title = title.replace(/[／_]/g, '/');

  // If contains '/', try to pick the Chinese part
  if (title.includes('/')) {
    const parts = title.split('/').map(p => p.trim()).filter(p => p.length > 0);

    // Prefer Chinese segments
    const cnPart = parts.find(p => /[\u4e00-\u9fa5]/.test(p) && p.length > 1);
    if (cnPart) {
      title = cnPart;
    } else {
      // Fall back to first non-empty part
      title = parts[0] || title;
    }
  }

  // Clean up residual brackets and special chars
  title = title.replace(/[【】\[\]（）()★]/g, ' ');

  // Remove leading/trailing non-title chars
  title = title.replace(/^[\s\-–—:：.·,，]+/, '');
  title = title.replace(/[\s\-–—:：.·,，]+$/, '');

  // Collapse whitespace
  title = title.replace(/\s+/g, ' ').trim();

  return title;
}
