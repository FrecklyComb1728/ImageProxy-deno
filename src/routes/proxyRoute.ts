import { Application, Context } from "../deps.ts";
import { AppConfig, ProxyConfig, RequestContext } from "../configLoader.ts";
import ImageCache from "../imageCache.ts";

/**
 * 注册代理路由
 * @param app Oak应用实例
 * @param config 应用配置
 * @param cacheHeaders 缓存头
 * @param imageCache 图像缓存实例
 */
export default function proxyRoute(
  app: Application,
  config: AppConfig,
  cacheHeaders: Record<string, string>,
  imageCache: ImageCache
): void {
  app.use(async (ctx) => {
    try {
      const req = createRequestContext(ctx);
      
      console.log(`[请求] 路径: ${req.path}, 原始URL: ${req.originalUrl}, 方法: ${req.method}`);
      
      // 查找匹配的代理配置
      let proxyConfig: ProxyConfig | undefined = undefined;
      let basePath = req.path;
      
      for (const proxy of config.proxies) {
        if (req.path.startsWith(proxy.prefix)) {
          proxyConfig = proxy;
          basePath = req.path.slice(proxy.prefix.length);
          break;
        }
      }
      
      // 如果没有找到匹配的代理配置，返回404
      if (!proxyConfig) {
        console.log(`[输出] 未匹配到代理，返回404`);
        ctx.response.status = 404;
        ctx.response.body = "Not Found";
        return;
      }
      
      // 清理路径
      const sanitizedPath = basePath
        .replace(/^[\/]+/, "") // 移除开头的斜杠
        .replace(/\|/g, "")    // 移除管道符号
        .replace(/[\/]+/g, "/"); // 将多个斜杠替换为一个
      
      // 构建目标URL
      const targetUrl = new URL(sanitizedPath, proxyConfig.target);
      console.log(`[代理] 目标URL: ${targetUrl.toString()}`);
      
      // 如果请求带有raw=true参数，重定向到原始URL
      if (req.query.get("raw") === "true") {
        let redirectUrl: string;
        
        // 使用自定义重定向模板或目标URL
        if (proxyConfig.rawRedirect) {
          redirectUrl = proxyConfig.rawRedirect.replace("{path}", sanitizedPath);
        } else {
          redirectUrl = targetUrl.toString();
        }
        
        // 添加其他查询参数（除了raw）
        const params = new URLSearchParams();
        for (const [key, value] of req.query.entries()) {
          if (key !== "raw") {
            params.append(key, value);
          }
        }
        
        if (params.toString()) {
          redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + params.toString();
        }
        
        ctx.response.redirect(redirectUrl);
        return;
      }
      
      // 尝试从缓存获取图像
      if (config.cache?.enabled) {
        const cachedImage = imageCache.get(req);
        
        if (cachedImage) {
          console.log(`[缓存] 命中 ${req.path} (${imageCache.formatSize(cachedImage.data.length)})`);
          
          ctx.response.headers.set("Content-Type", cachedImage.contentType);
          
          // 设置缓存头
          Object.entries(cacheHeaders).forEach(([key, value]) => {
            ctx.response.headers.set(key, value);
          });
          
          ctx.response.body = cachedImage.data;
          console.log(`[输出] 已从缓存返回图片，状态: 200`);
          return;
        }
      }
      
      // 请求头（排除host）
      const headers = new Headers();
      for (const [key, value] of req.headers.entries()) {
        if (key.toLowerCase() !== "host") {
          headers.set(key, value);
        }
      }
      
      // 添加查询参数到目标URL
      for (const [key, value] of req.query.entries()) {
        targetUrl.searchParams.append(key, value);
      }
      
      // 发送请求到目标服务器
      const response = await fetch(targetUrl.toString(), {
        method: req.method,
        headers,
        // 如果不是GET或HEAD请求，添加请求体
        body: req.method !== "GET" && req.method !== "HEAD" ? await ctx.request.body().value : undefined,
      });
      
      // 如果目标服务器返回错误状态码
      if (!response.ok) {
        console.log(`[输出] 远程资源获取失败，状态: ${response.status}`);
        ctx.response.status = response.status;
        ctx.response.body = response.statusText;
        return;
      }
      
      // 获取内容类型和响应数据
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const buffer = new Uint8Array(await response.arrayBuffer());
      
      // 获取文件扩展名
      const ext = targetUrl.pathname.split('.').pop()?.toLowerCase() || "";
      
      // 如果缓存启用且资源可缓存，则存入缓存
      if (config.cache?.enabled && imageCache.isCacheable(ext, buffer.length)) {
        console.log(`[缓存] 存储 ${req.path} (${imageCache.formatSize(buffer.length)})`);
        imageCache.set(req, buffer, contentType);
      }
      
      // 设置响应头
      ctx.response.headers.set("Content-Type", contentType);
      
      // 设置缓存头
      Object.entries(cacheHeaders).forEach(([key, value]) => {
        ctx.response.headers.set(key, value);
      });
      
      // 发送响应
      ctx.response.body = buffer;
      console.log(`[输出] 已返回远程图片，状态: 200`);
      
    } catch (error) {
      console.error("代理请求失败:", error);
      ctx.response.status = 500;
      ctx.response.body = "Internal Server Error";
    }
  });
}

/**
 * 从Oak上下文创建请求上下文
 * @param ctx Oak上下文
 * @returns 请求上下文
 */
function createRequestContext(ctx: Context): RequestContext {
  const url = ctx.request.url;
  return {
    path: url.pathname,
    originalUrl: url.toString(),
    method: ctx.request.method,
    headers: ctx.request.headers,
    url,
    query: url.searchParams
  };
} 