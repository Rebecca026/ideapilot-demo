const form = document.querySelector("#ideaForm");
const title = document.querySelector("#briefTitle");
const meta = document.querySelector("#briefMeta");
const content = document.querySelector("#briefContent");

function renderBrief(brief) {
  title.textContent = brief.title;
  meta.textContent = brief.saved
    ? "已通过后端生成，并保存到数据库。"
    : "已通过后端生成。数据库未配置时，记录不会持久保存。";
  content.innerHTML = brief.sections
    .map((section, index) => {
      const className =
        index === brief.sections.length - 1 ? "brief-card highlight" : "brief-card";
      return `
        <section class="${className}">
          <strong>${section.label}</strong>
          <p>${section.text}</p>
        </section>
      `;
    })
    .join("");
}

function renderError(message) {
  meta.textContent = message;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const payload = {
    audience: data.get("audience").trim(),
    scenario: data.get("scenario").trim(),
    pain: data.get("pain").trim(),
  };

  form.querySelector("button").disabled = true;
  meta.textContent = "正在请求后端生成方案...";

  try {
    const response = await fetch("/.netlify/functions/generate-brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("后端接口返回异常");
    }

    const brief = await response.json();
    renderBrief(brief);
  } catch (error) {
    renderError("暂时无法连接后端。上线后请确认 Netlify Functions 已部署。");
  } finally {
    form.querySelector("button").disabled = false;
  }
});

renderBrief({
  title: "刚开始做 AI 产品的产品经理的上线方案",
  saved: false,
  sections: [
    {
      label: "一句话定位",
      text: "帮助刚开始做 AI 产品的产品经理把想法变成可讨论、可分享、可上线的首版 demo。",
    },
    {
      label: "首版功能",
      text: "用户填写背景信息，系统生成方案卡，并通过公网链接交给同事或面试官查看。",
    },
    {
      label: "核心体验",
      text: "把输入、后端处理、数据保存、页面展示和部署发布串成一条完整链路。",
    },
    {
      label: "上线指标",
      text: "确认公网链接能打开、核心流程能完成、数据库里能看到真实提交记录。",
    },
    {
      label: "下一步升级",
      text: "接入真实大模型 API，让后端调用模型生成内容，并继续把结果保存下来。",
    },
  ],
});
