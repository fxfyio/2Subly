# Subly 订阅管理软件（SQLite 版）

这是一个本地可运行的订阅管理工具，支持：

- 订阅新增 / 编辑 / 删除
- 用户认证（注册 / 登录 / 退出，会话令牌）
- 常见币种支持（`CNY/USD/EUR/GBP/JPY/HKD/SGD/AUD/CAD/PHP`）
- 报表汇率实时转换（后端拉取实时汇率，失败时自动回退缓存）
- 下次扣费时间追踪（支持“已扣费”自动顺延）
- 汇总卡片（总订阅、活跃订阅、月均支出、未来 30 天预计扣费）
- 报表展示（按分类月均支出、未来 6 个月预计支出）
- SQLite 持久化存储

## 数据存储位置

- SQLite 文件：`/Users/zc/Desktop/Subly2/subly.db`
- 表名：`subscriptions`
- 币种字段：`currency`
- 汇率接口：`GET /api/rates?base=USD`
- 用户表：`users`
- 会话表：`sessions`

## 启动方式

在项目目录执行：

```bash
python3 /Users/zc/Desktop/Subly2/server.py
```

访问：

- [http://localhost:5173](http://localhost:5173)

## 文件结构

- `/Users/zc/Desktop/Subly2/index.html` 页面结构
- `/Users/zc/Desktop/Subly2/styles.css` 样式
- `/Users/zc/Desktop/Subly2/app.js` 前端逻辑（调用 API）
- `/Users/zc/Desktop/Subly2/server.py` 后端服务（SQLite + API + 静态文件）
