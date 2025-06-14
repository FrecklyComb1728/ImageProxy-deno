// 配置文件结构定义
export interface ProxyConfig {
  prefix: string;
  target: string;
  rawRedirect?: string;
  description?: string;
  visible?: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  minSize: string;
  maxTime: string;
  imageTypes: string[];
}

export interface AppConfig {
  title: string;
  description: string;
  footer: string;
  establishTime?: string;
  port?: number;
  cache?: CacheConfig;
  host?: string;
  proxies: ProxyConfig[];
}

// 缓存相关类型
export interface CachedItem {
  data: Uint8Array;
  contentType: string;
  size: number;
  timestamp: number;
  expiresAt?: number;
}

export interface MemoryCacheItem {
  data: Uint8Array;
  contentType: string;
}

export interface RequestContext {
  path: string;
  originalUrl: string;
  method: string;
  headers: Headers;
  url: URL;
  query: URLSearchParams;
}

export interface ResponseContext {
  status: number;
  body: Uint8Array | string;
  headers: Headers;
}

/**
 * 加载配置文件
 * @param configPath 配置文件路径
 * @param fallback 默认配置
 * @returns 配置对象
 */
export async function loadConfig(configPath: string, fallback: AppConfig): Promise<AppConfig> {
  try {
    const configText = await Deno.readTextFile(configPath);
    return JSON.parse(configText) as AppConfig;
  } catch (e) {
    console.error("加载配置文件失败，使用默认配置", e);
    return fallback;
  }
} 