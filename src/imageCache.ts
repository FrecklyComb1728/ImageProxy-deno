import { AppConfig, CachedItem, MemoryCacheItem, RequestContext } from "./configLoader.ts";

/**
 * 解析大小字符串，如 "8MB"、"1024KB" 或 "1048576B"
 * @param sizeStr 大小字符串或数字
 * @returns 字节数
 */
function parseSize(sizeStr: string | number): number {
  if (typeof sizeStr === 'number') return sizeStr;
  
  const match = sizeStr.match(/^(\d+)(MB|KB|B)$/i);
  if (!match) throw new Error('Invalid size format. Use format like "8MB", "1024KB" or "1048576B"');
  
  const [, size, unit] = match;
  const multipliers: Record<string, number> = { 
    'B': 1, 
    'KB': 1024, 
    'MB': 1024 * 1024 
  };
  
  return parseInt(size) * multipliers[unit.toUpperCase()];
}

/**
 * 解析时间字符串，格式如 "86400S"
 * @param timeStr 时间字符串或数字
 * @returns 毫秒数
 */
function parseTime(timeStr: string | number): number {
  if (typeof timeStr === 'number') return timeStr;
  
  const match = timeStr.match(/^(\d+)S$/i);
  if (!match) throw new Error('Invalid time format. Use format like "86400S"');
  
  return parseInt(match[1]) * 1000;
}

/**
 * 格式化字节大小为可读字符串
 * @param bytes 字节数
 * @returns 可读字符串
 */
function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)}${units[unitIndex]}`;
}

/**
 * 内存缓存实现
 */
class MemoryCache {
  private cache: Map<string, CachedItem>;
  private maxSize: number;
  private currentSize: number;

  constructor(maxSize: string | number) {
    this.cache = new Map();
    this.maxSize = parseSize(maxSize);
    this.currentSize = 0;
  }

  /**
   * 设置缓存项
   * @param key 键
   * @param value 值
   * @param size 大小
   * @param maxAge 最大存活时间（可选）
   * @returns 是否设置成功
   */
  set(key: string, value: MemoryCacheItem, size: number, maxAge?: string | number): boolean {
    // 如果新的缓存项超过最大容量，尝试清理旧的缓存项
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      const keys = Array.from(this.cache.keys());
      if (keys.length > 0) {
        const firstKey = keys[0];
        this.delete(firstKey);
      } else {
        break;
      }
    }

    // 如果单个缓存项大小超过最大容量，则无法缓存
    if (size > this.maxSize) {
      return false;
    }

    // 计算过期时间
    const expiresAt = maxAge ? Date.now() + parseTime(maxAge) : undefined;
    
    // 存储缓存项
    this.cache.set(key, {
      data: value.data,
      contentType: value.contentType,
      size: size,
      timestamp: Date.now(),
      expiresAt
    });
    
    this.currentSize += size;
    return true;
  }

  /**
   * 获取缓存项
   * @param key 键
   * @returns 缓存项或null
   */
  get(key: string): MemoryCacheItem | null {
    const item = this.cache.get(key);
    
    if (item) {
      // 检查是否过期
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.delete(key);
        return null;
      }
      
      // 更新访问时间戳
      item.timestamp = Date.now();
      
      return {
        data: item.data,
        contentType: item.contentType
      };
    }
    
    return null;
  }

  /**
   * 删除缓存项
   * @param key 键
   */
  delete(key: string): void {
    const item = this.cache.get(key);
    
    if (item) {
      this.currentSize -= item.size;
      this.cache.delete(key);
    }
  }

  /**
   * 检查键是否存在（且未过期）
   * @param key 键
   * @returns 是否存在
   */
  has(key: string): boolean {
    if (!this.cache.has(key)) return false;
    
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 获取当前缓存大小
   * @returns 当前大小（字节）
   */
  getSize(): number {
    return this.currentSize;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }
}

/**
 * 图片缓存管理类
 */
export default class ImageCache {
  private config: AppConfig;
  private memoryCache: MemoryCache;

  constructor(config: AppConfig) {
    this.config = config;
    this.memoryCache = new MemoryCache("1024MB");
  }

  /**
   * 获取缓存键
   * @param req 请求对象
   * @returns 缓存键
   */
  getCacheKey(req: RequestContext): string {
    return req.path;
  }

  /**
   * 检查资源是否可缓存
   * @param ext 文件扩展名
   * @param bufferLength 数据长度
   * @returns 是否可缓存
   */
  isCacheable(ext: string, bufferLength: number): boolean {
    const allowedTypes = this.config.cache?.imageTypes || [
      "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "ico"
    ];
    const minSize = parseSize(this.config.cache?.minSize || "8MB");
    
    return allowedTypes.includes(ext) && bufferLength >= minSize;
  }

  /**
   * 获取缓存项
   * @param req 请求对象
   * @returns 缓存项或null
   */
  get(req: RequestContext): MemoryCacheItem | null {
    return this.memoryCache.get(this.getCacheKey(req));
  }

  /**
   * 设置缓存项
   * @param req 请求对象
   * @param buffer 数据缓冲区
   * @param contentType 内容类型
   */
  set(req: RequestContext, buffer: Uint8Array, contentType: string): void {
    const cacheKey = this.getCacheKey(req);
    const maxTime = this.config.cache?.maxTime || "86400S";
    
    this.memoryCache.set(
      cacheKey, 
      { data: buffer, contentType }, 
      buffer.length, 
      maxTime
    );
  }

  /**
   * 格式化大小
   * @param bytes 字节数
   * @returns 格式化后的大小字符串
   */
  formatSize(bytes: number): string {
    return formatSize(bytes);
  }
} 