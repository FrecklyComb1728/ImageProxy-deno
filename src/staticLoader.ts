/**
 * 加载静态资源
 * @param paths 静态资源路径配置
 * @returns 静态资源内容数组 [index页面, 配置页面, favicon图标]
 */
export async function loadStatics(paths: { 
  index: string; 
  configHtml: string; 
  favicon: string 
}): Promise<[string | null, string | null, Uint8Array | null]> {
  const index = await Deno.readTextFile(paths.index).catch(() => null);
  const configHtml = await Deno.readTextFile(paths.configHtml).catch(() => null);
  const favicon = await Deno.readFile(paths.favicon).catch(() => null);
  
  return [index, configHtml, favicon];
} 