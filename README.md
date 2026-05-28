# IdeaPilot 全栈 Demo 部署手册

这个 demo 用来练习 AI 产品经理必须会的完整上线链路：

想法 → 前端页面 → 后端接口 → 数据库存储 → 公网部署 → 发链接收反馈。

## 这个项目里每层负责什么

- 前端：`index.html`、`styles.css`、`app.js`
- 后端：`netlify/functions/generate-brief.js`
- 数据库：Supabase 里的 `briefs` 表
- 部署：Netlify

前端负责输入和展示，后端负责处理请求和保护密钥，数据库负责保存真实用户提交。

## 本地能验证什么

直接打开 `index.html` 可以看到页面，但因为浏览器不能直接运行 Netlify Functions，本地直接打开时后端接口不会工作。

要完整本地预览，需要安装 Netlify CLI 后运行：

```bash
npx netlify dev
```

第一次学习部署时，可以先跳过本地后端预览，直接部署到 Netlify 验证线上接口。

## 第一步：创建 Supabase 数据表

1. 打开 [Supabase](https://supabase.com/)。
2. 新建一个 project。
3. 进入 SQL Editor。
4. 执行下面的 SQL：

```sql
create table briefs (
  id uuid primary key default gen_random_uuid(),
  audience text not null,
  scenario text not null,
  pain text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
```

这张表会保存每一次用户提交和后端生成的方案。

## 第二步：找到 Supabase 密钥

在 Supabase 项目里进入 Project Settings → API，复制：

- `Project URL`
- `service_role` key

注意：`service_role` 不能写进前端代码，只能放在 Netlify 的环境变量里。

## 第三步：部署到 Netlify

如果你已经有站点：

1. 打开 Netlify。
2. 进入当前站点。
3. 找到 Site configuration → Environment variables。
4. 添加两个变量：
   - `SUPABASE_URL`：填 Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`：填 Supabase service_role key
5. 重新部署站点。

如果你重新发布：

1. 把整个项目文件夹压缩成 zip。
2. 打开 [Netlify Drop](https://app.netlify.com/drop)。
3. 拖入 zip。
4. 生成公网链接后测试。

## 第四步：验证是否真的全栈跑通

上线后打开公网链接，按顺序检查：

- 页面能打开。
- 点击“生成方案”后，页面不是自己生成，而是请求后端接口。
- 页面提示“已通过后端生成，并保存到数据库。”
- Supabase 的 `briefs` 表里出现一条新记录。

如果页面能生成，但提示数据库未配置，说明后端已经工作，但 Netlify 环境变量还没配好。

## 第五步：接入真实 OpenAI API

在 Netlify 的 Environment variables 里继续添加：

- `OPENAI_API_KEY`：填 OpenAI Platform 创建的 API Key
- `OPENAI_MODEL`：可选，默认使用 `gpt-5-mini`

保存后重新部署。上线页面点击“生成方案”后，如果提示：

```text
已通过 OpenAI API 生成，并保存到数据库。
```

说明真实 AI 调用、后端接口和数据库保存都跑通了。

如果提示“后端备用逻辑生成”，说明后端能运行，但 OpenAI Key、模型名、余额或网络调用有问题，需要去 Netlify 的函数日志里查看错误。

## 你现在应该理解的开发概念

- 前端：用户看见和操作的界面。
- 后端：浏览器请求的接口，负责处理逻辑和保护密钥。
- 数据库：保存用户输入、生成结果、反馈记录。
- 环境变量：上线平台保存的秘密配置，不能直接写进前端。
- API Key：调用 OpenAI 这类服务的钥匙，只能放在后端环境变量里。
- 部署：把代码放到公网服务器，让任何人通过链接访问。

## 下一步升级

- 把后端里的规则生成换成真实 OpenAI API 调用。
- 增加历史记录页面，让用户看到过去生成过的方案。
- 增加反馈按钮，记录用户是否觉得方案有用。
- 用 GitHub 连接 Netlify，实现每次提交代码后自动部署。
