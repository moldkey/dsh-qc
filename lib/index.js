/**
 * dsh-qc — 抽检方案与质检清单
 */

export const name = "dsh-qc";
export const inject = ["tools"];

const NL = String.fromCharCode(10);
const SITE = "https://deepseekbase.com/zh/tools/";
const TEXT_OUTPUT = {
  schema: { type: "object", additionalProperties: false, properties: { text: { type: "string" } }, required: ["text"] },
  render: (_args, value) => [{ type: "text", text: (value && value.text) || "" }],
};

// GB/T 2828.1 一般检验水平 II 的样本量（近似）
const SAMPLE = [
  [2, 8, 2], [9, 15, 3], [16, 25, 5], [26, 50, 8], [51, 90, 13], [91, 150, 20],
  [151, 280, 32], [281, 500, 50], [501, 1200, 80], [1201, 3200, 125],
  [3201, 10000, 200], [10001, 35000, 315], [35001, 150000, 500],
  [150001, 500000, 800], [500001, 999999999, 1250],
];

function n(v, d) { const x = Number(v); return Number.isFinite(x) ? x : d; }

function sampleOf(lot) {
  for (const row of SAMPLE) if (lot >= row[0] && lot <= row[1]) return row[2];
  return 1250;
}

const CHECKS = {
  cnc: ["尺寸与公差（关键尺寸全检/抽检）", "表面粗糙度", "毛刺与倒角", "材料牌号证明", "螺纹通止规", "形位公差"],
  sheetmetal: ["展开尺寸", "折弯角度", "孔位", "焊接强度/外观", "表面处理（镀层/喷涂）", "毛刺与划伤"],
  plastic: ["外观（缩水/飞边/熔接线）", "关键尺寸", "装配试装", "颜色色差", "重量", "材料证明"],
  electronics: ["外观与标识", "通电功能", "绝缘/耐压", "焊点质量", "包装与配件", "老化抽测"],
};

const TOOLS = {
  qc_aql: {
    description: "抽检方案（GB/T 2828.1 水平 II 近似）：按批量与 AQL 给样本量与接收/拒收数",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        lot: { type: "number", description: "批量" },
        aql: { type: "number", description: "AQL %，常用 0.65 / 1.0 / 1.5 / 2.5 / 4.0" },
      },
      required: ["lot"],
    },
    run(args) {
      const lot = n(args.lot, 0);
      const aql = n(args.aql, 2.5);
      if (lot <= 0) throw new Error("批量必须大于 0");
      const nSample = sampleOf(lot);
      const ac = Math.max(0, Math.floor(nSample * aql / 100));
      const re = ac + 1;
      const lines = ["抽检方案", "=".repeat(52), "批量: " + lot, "AQL: " + aql + "%", "检验水平: II（一般）", "",
        "样本量: " + nSample, "接收数 Ac: " + ac, "拒收数 Re: " + re, "",
        "判定: 不合格数 ≤ " + ac + " 接收；≥ " + re + " 拒收"];
      if (nSample >= lot) lines.push("注意: 样本量接近/超过批量，实际按全检处理。");
      lines.push("");
      lines.push("Ac/Re 为按 AQL 线性近似，正式验收请查 GB/T 2828.1 表；AQL 由客户与产品风险确定。");
      lines.push("");
      lines.push("更多工具：" + SITE);
      return lines.join(NL);
    },
  },
  qc_checklist: {
    description: "质检清单：按产品类型给检验项目",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { type: { type: "string", enum: ["cnc", "sheetmetal", "plastic", "electronics"], description: "产品类型" } },
      required: ["type"],
    },
    run(args) {
      const t = String(args.type || "").toLowerCase();
      const list = CHECKS[t];
      if (!list) throw new Error("支持: " + Object.keys(CHECKS).join(" / "));
      const lines = ["质检清单 — " + t, "=".repeat(52)];
      list.forEach((x, i) => lines.push((i + 1) + ". " + x));
      lines.push("");
      lines.push("更多工具：" + SITE);
      return lines.join(NL);
    },
  },
};

export function apply(ctx, config) {
  void config;
  for (const name of Object.keys(TOOLS)) {
    const t = TOOLS[name];
    ctx.tools.register({
      name: name,
      description: t.description,
      parameters: t.parameters,
      output: TEXT_OUTPUT,
      async execute(args) { try { return { text: t.run(args || {}) }; } catch (e) { return { text: "处理失败: " + String((e && e.message) || e) }; } },
    });
  }
}
