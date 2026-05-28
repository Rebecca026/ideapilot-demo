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

    const brief = await generateBrief({ audience, scenario, pain });
    const saved = await saveBrief({ audience, scenario, pain, brief });

    return json({ ...brief, saved });
  } catch (error) {
    return json({ error: "Failed to generate brief" }, 500);
  }
};

async function generateBrief(input) {
  if (!process.env.OPENAI_API_KEY) {
    return buildBrief(input, "fallback");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",
        instructions:
          "你是一个务实的 AI 产品经理。请生成适合 demo 评审的一页产品方案，语言简洁、具体、可执行。",
        input: `目标用户：${input.audience}\n使用场景：${input.scenario}\n核心痛点：${input.pain}`,
        max_output_tokens: 900,
        text: {
          format: {
            type: "json_schema",
            name: "product_brief",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["title", "sections"],
              properties: {
                title: {
                  type: "string",
                },
                sections: {
                  type: "array",
                  minItems: 5,
                  maxItems: 5,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["label", "text"],
                    properties: {
                      label: {
                        type: "string",
                      },
                      text: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error", response.status, errorText);
      return buildBrief(input, "fallback");
    }

    const data = await response.json();
    const output = getOutputText(data);
    const brief = JSON.parse(output);

    if (!brief.title || !Array.isArray(brief.sections)) {
      return buildBrief(input, "fallback");
    }

    return {
      title: clean(brief.title),
      source: "openai",
      sections: brief.sections.slice(0, 5).map((section) => ({
        label: clean(section.label),
        text: clean(section.text),
      })),
    };
  } catch (error) {
    console.error("OpenAI generation failed", error);
    return buildBrief(input, "fallback");
  }
}

function buildBrief({ audience, scenario, pain }) {
  return {
    title: `${audience}的上线方案`,
    source: "fallback",
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

function getOutputText(data) {
  if (data.output_text) {
    return data.output_text;
  }

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("")
    .trim();
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
