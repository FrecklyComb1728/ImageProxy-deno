import { Application, join, dirname, oakCors } from "./src/deps.ts";
import { loadConfig, AppConfig } from "./src/configLoader.ts";
import { loadStatics } from "./src/staticLoader.ts";
import { parseTime, getCacheHeaders } from "./src/cacheUtils.ts";
import { calculateUptime, formatEstablishTime } from "./src/uptimeUtils.ts";
import ImageCache from "./src/imageCache.ts";
import basicRoutes from "./src/routes/basicRoutes.ts";
import proxyRoute from "./src/routes/proxyRoute.ts";

// 定义文件路径
// 使用当前目录作为基础路径
const FAVICON_PATH = "./public/favicon.ico";
const INDEX_FILE = "./public/index.html";
const CONFIG_HTML_FILE = "./public/list.html";
const CONFIG_FILE = "./index_config.json";
const CONFIG_ENDPOINT = "/list";

// 创建应用实例
const app = new Application();

// 使用CORS中间件
app.use(oakCors());

// 设置默认配置
const fallbackConfig: AppConfig = {
  title: "MIFENG CDN代理服务",
  description: "高性能多源CDN代理解决方案",
  footer: "© 2025 Mifeng CDN服务 | 提供稳定快速的资源访问",
  proxies: []
};

// 记录启动时间
const START_TIME = new Date();

// 应用初始化函数
async function init() {
  try {
    // 加载配置文件
    const config = await loadConfig(CONFIG_FILE, fallbackConfig);
    
    // 加载静态资源
    const [homepage, configHtml, favicon] = await loadStatics({
      index: INDEX_FILE,
      configHtml: CONFIG_HTML_FILE,
      favicon: FAVICON_PATH
    });
    
    // 计算缓存配置
    const maxAgeSeconds = config.cache?.maxTime 
      ? parseTime(config.cache.maxTime) 
      : 86400;
    const cacheHeaders = getCacheHeaders(maxAgeSeconds);
    
    // 创建图像缓存实例
    const imageCache = new ImageCache(config);
    
    // 注册基本路由
    basicRoutes(
      app, 
      config, 
      START_TIME, 
      homepage, 
      favicon, 
      configHtml, 
      CONFIG_ENDPOINT, 
      maxAgeSeconds, 
      cacheHeaders
    );
    
    // 注册代理路由
    proxyRoute(app, config, cacheHeaders, imageCache);
    
    // 打印启动信息
    const port = config.port || 3000;
    const host = config.host || 'localhost';
    const cacheEnabled = config.cache?.enabled !== false;
    const minSize = config.cache?.minSize || '8MB';
    const cacheTime = config.cache?.maxTime || '86400S';
    const cacheDays = Math.floor((parseTime(cacheTime) || 86400) / 86400);
    const imageTypes = (config.cache?.imageTypes || []).join(', ');
    const proxies = config.proxies || [];
    const establishTimeStr = formatEstablishTime(config.establishTime);
    const uptimeStr = calculateUptime(config.establishTime);
    
    console.log('================= MIFENG CDN代理服务 启动信息 =================');
    console.log(`服务名称: ${config.title}`);
    console.log(`服务描述: ${config.description}`);
    console.log(`页脚信息: ${config.footer}`);
    console.log(`监听地址: http://${host}:${port}`);
    console.log(`缓存启用: ${cacheEnabled ? '是' : '否'}`);
    console.log(`最小缓存大小: ${minSize}`);
    console.log(`缓存时间: ${cacheDays}天`);
    console.log(`支持图片类型: ${imageTypes}`);
    console.log('代理配置:');
    proxies.forEach(proxy => {
      console.log(`  - 路径: ${proxy.prefix} 目标: ${proxy.target} 可见: ${proxy.visible !== false ? '是' : '否'} 描述: ${proxy.description || '无'}`);
    });
    console.log(`建站时间: ${establishTimeStr}`);
    console.log(`已运行: ${uptimeStr}`);
    console.log('============================================================');
    
    // 启动服务器
    app.addEventListener("listen", ({ hostname, port, secure }) => {
      console.log(
        `服务器运行于: ${secure ? "https://" : "http://"}${hostname || "localhost"}:${port}`
      );
    });
    
    // 监听端口
    await app.listen({ port, hostname: "localhost" });
    
  } catch (error) {
    console.error("启动失败:", error);
    Deno.exit(1);
  }
}

// 启动应用
init(); 