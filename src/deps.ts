// 从Deno标准库和第三方库导入依赖
export { serve } from "https://deno.land/std@0.178.0/http/server.ts";
export { serveFile } from "https://deno.land/std@0.178.0/http/file_server.ts";
export { 
  Status,
  STATUS_TEXT,
} from "https://deno.land/std@0.178.0/http/http_status.ts";
export { parse as parseURL } from "https://deno.land/std@0.178.0/path/mod.ts";
export { join, dirname } from "https://deno.land/std@0.178.0/path/mod.ts";
export { exists } from "https://deno.land/std@0.178.0/fs/exists.ts";
export { copy as readAll } from "https://deno.land/std@0.178.0/streams/copy.ts";
export { contentType } from "https://deno.land/std@0.178.0/media_types/mod.ts";
export { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

// oak框架，类似Express的Deno Web框架
export {
  Application,
  Router,
  Context,
  Request,
  Response
} from "https://deno.land/x/oak@v12.1.0/mod.ts"; 