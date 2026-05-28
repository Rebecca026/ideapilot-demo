exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const input = JSON.parse(event.body || "{}");
    const audience = clean(input.audience);
    const scenario = clean(input.scenario);
    const pain = clean(input.pain);

    if (!audience || !scenario || !pain) {
      return json({ error: "Missing required fields" }, 400);
    }

    const brief = buildBrief({ audience, scenario, pain });
    const saved = await saveBrief({ audience, scenario, pain, brief });

    return json({ ...brief, saved });
  } catch (error) {
    return json({ error: "Failed to generate brief" }, 500);
  }
};

function buildBrief({ audience, scenario, pain }) {
  return {
    title: `${audience}的上线方案`,
    sections: [
      {
        label: "一句话定位",
        text: `帮助${audience}在${scenario}时，快速产出可讨论、可迭代、可上线的首版产品方案。`,
      },
      {
        label: "前端负责",
        text: "收集用户输入、展示生成结果、处理加载和错误状态，让用户知道流程是否完成。",
      },
      {
        label: "后端负责",
        text: "接收表单数据，生成结构化方案，并统一处理数据库写入和未来的 AI API 调用。",
      },
      {
        label: "数据负责",
        text: `保存“${pain}”这类真实输入，方便后续分析用户需求、筛选高频痛点和复盘转化。`,
      },
      {
        label: "上线指标",
        text: "公网链接能打开，提交后能返回方案，Supabase 表里能看到新记录。",
      },
    ],
  };
}

async function saveBrief(record) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return false;
  }

  const response = await fetch(`${url}/rest/v1/briefs`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      audience: record.audience,
      scenario: record.scenario,
      pain: record.pain,
      result: record.brief,
    }),
  });

  return response.ok;
}

function clean(value) {
  return String(value || "").trim().slice(0, 600);
}

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
