/**
 * 解析时间字符串，格式如 "86400S"
 * @param timeStr 时间字符串或数字
 * @returns 秒数
 */
export function parseTime(timeStr: string | number): number {
  if (typeof timeStr === 'number') return timeStr;
  
  const match = timeStr.match(/^(\d+)S$/i);
  if (!match) throw new Error('Invalid time format. Use format like "86400S"');
  
  return parseInt(match[1]);
}

/**
 * 获取缓存HTTP头
 * @param maxAgeSeconds 最大缓存时间（秒）
 * @returns 缓存头对象
 */
export function getCacheHeaders(maxAgeSeconds: number): Record<string, string> {
  return {
    "Cache-Control": `public, max-age=${maxAgeSeconds}`,
    "CDN-Cache-Control": `max-age=${maxAgeSeconds}`
  };
} 