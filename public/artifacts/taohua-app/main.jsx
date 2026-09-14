// main.jsx — 入口，挂载 React 应用到 #root。
// 业务代码请从 App.jsx 开始，按需要拆 pages/ 与 components/。
//
// 使用 HashRouter：URL 形如 /app/{aid}/#/students/cls1
// hash 部分不会发给服务器，用户复制链接在新标签页打开也能正常访问。
// 不要修改本文件——HashRouter 包装是骨架基建。

import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <HashRouter>
    <App />
  </HashRouter>
)
