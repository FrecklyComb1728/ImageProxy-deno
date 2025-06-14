import { Application, Context } from "../deps.ts";
import { AppConfig } from "../configLoader.ts";
import { getCacheHeaders } from "../cacheUtils.ts";
import { logBuffer } from "../logBuffer.ts";
import { calculateUptime, formatEstablishTime } from "../uptimeUtils.ts";

/**
 * 注册基础路由
 * @param app Oak应用实例
 * @param config 应用配置
 * @param START_TIME 服务启动时间
 * @param homepage 首页HTML内容
 * @param favicon favicon图标
 * @param configHtml 配置页HTML内容
 * @param CONFIG_ENDPOINT 配置端点路径
 * @param maxAgeSeconds 最大缓存时间
 * @param cacheHeaders 缓存头
 */
export default function basicRoutes(
  app: Application,
  config: AppConfig,
  START_TIME: Date,
  homepage: string | null,
  favicon: Uint8Array | null,
  configHtml: string | null,
  CONFIG_ENDPOINT: string,
  maxAgeSeconds: number,
  cacheHeaders: Record<string, string>
): void {
  // 配置页 - 直接返回JSON格式数据
  app.use(async (ctx, next) => {
    if (ctx.request.url.pathname === CONFIG_ENDPOINT) {
      const uptime = Date.now() - START_TIME.getTime();
      const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
      const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
      
      // 构建配置信息
      const configInfo = {
        服务状态: "运行中",
        版本信息: "v1.0",
        运行时间: calculateUptime(config.establishTime),
        建站时间: formatEstablishTime(config.establishTime),
        缓存时间: `${Math.floor(maxAgeSeconds / 86400)}天`,
        服务配置: {
          服务名称: config.title,
          服务描述: config.description,
          页脚信息: config.footer
        },
        代理配置: config.proxies
          .filter(proxy => proxy.visible !== false)
          .map(proxy => ({
            代理路径: proxy.prefix,
            目标地址: proxy.target,
            代理说明: proxy.description || "未提供描述",
            重定向模板: proxy.rawRedirect || "使用默认目标URL",
            使用示例: {
              代理访问: `${ctx.request.url.protocol}//${ctx.request.url.host}${proxy.prefix}`,
              直接重定向: `${ctx.request.url.protocol}//${ctx.request.url.host}${proxy.prefix}?raw=true`
            }
          }))
      };
      
      // 设置响应头和内容
      ctx.response.headers.set("Content-Type", "application/json; charset=utf-8");
      
      // 设置缓存头
      Object.entries(getCacheHeaders(maxAgeSeconds)).forEach(([key, value]) => {
        ctx.response.headers.set(key, value);
      });
      
      ctx.response.body = JSON.stringify(configInfo, null, 2);
      return;
    }
    
    // 继续处理其他路由
    await next();
  });

  // favicon
  app.use(async (ctx, next) => {
    if (ctx.request.url.pathname === '/favicon.ico') {
      if (!favicon) {
        ctx.response.status = 404;
        ctx.response.body = "Not Found";
        return;
      }
      
      // 设置响应头
      ctx.response.headers.set("Content-Type", "image/x-icon");
      
      // 设置缓存头
      Object.entries(cacheHeaders).forEach(([key, value]) => {
        ctx.response.headers.set(key, value);
      });
      
      ctx.response.body = favicon;
      return;
    }
    
    // 继续处理其他路由
    await next();
  });

  // 首页
  app.use(async (ctx, next) => {
    if (ctx.request.url.pathname === '/') {
      if (!homepage) {
        ctx.response.status = 503;
        ctx.response.body = "Service Unavailable";
        return;
      }
      
      // 设置响应头
      ctx.response.headers.set("Content-Type", "text/html; charset=utf-8");
      
      // 设置缓存头
      Object.entries(cacheHeaders).forEach(([key, value]) => {
        ctx.response.headers.set(key, value);
      });
      
      ctx.response.body = homepage;
      return;
    }
    
    // 继续处理其他路由
    await next();
  });

  // 日志
  app.use(async (ctx, next) => {
    if (ctx.request.url.pathname === '/logs') {
      ctx.response.headers.set("Content-Type", "text/plain; charset=utf-8");
      ctx.response.body = logBuffer.join('\n');
      return;
    }
    
    // 继续处理其他路由
    await next();
  });
} 