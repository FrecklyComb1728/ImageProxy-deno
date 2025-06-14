// 日志缓冲区大小
const LOG_BUFFER_SIZE = 2000;

// 日志缓冲区
export const logBuffer: string[] = [];

/**
 * 添加日志到缓冲区
 * @param msg 日志消息
 */
function pushLog(msg: string): void {
  const time = new Date().toISOString();
  logBuffer.push(`[${time}] ${msg}`);
  
  if (logBuffer.length > LOG_BUFFER_SIZE) {
    logBuffer.shift();
  }
}

// 保存原始控制台函数
const rawLog = console.log;
const rawError = console.error;

// 重写控制台函数以捕获日志
console.log = (...args: unknown[]): void => {
  pushLog(args.map(String).join(' '));
  rawLog.apply(console, args as [any, ...any[]]);
};

console.error = (...args: unknown[]): void => {
  pushLog('[ERROR] ' + args.map(String).join(' '));
  rawError.apply(console, args as [any, ...any[]]);
}; 