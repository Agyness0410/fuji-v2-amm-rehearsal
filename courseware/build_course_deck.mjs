import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Presentation, PresentationFile } from "/Users/chiarachen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const WORKSPACE = "/Users/chiarachen/Documents/Codex/fuji-v2-amm-course";
const COURSEWARE = path.join(WORKSPACE, "courseware");
const BUILD_DIR = path.join(COURSEWARE, ".build");
const OUTPUT_DIR = path.join(COURSEWARE, "output");
const SKILL_DIR =
  "/Users/chiarachen/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations";
const PYTHON =
  "/Users/chiarachen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";

const FONT = "Hiragino Sans GB";
const CODE_FONT = "Arial";
const W = 1280;
const H = 720;

const C = {
  white: "#FFFFFF",
  ink: "#17191D",
  charcoal: "#25282E",
  muted: "#5F6670",
  line: "#D9DEE4",
  ice: "#F4F6F8",
  ice2: "#E9EDF1",
  red: "#E84142",
  redDark: "#B92B2F",
  redPale: "#FDEBEC",
  green: "#1E8E5A",
  greenPale: "#E8F5EE",
  amber: "#B66A00",
  amberPale: "#FFF4DE",
  blue: "#276EF1",
  bluePale: "#EAF1FF",
};

const sources = {
  avalanche:
    "https://build.avax.network/docs/primary-network",
  faucet:
    "https://build.avax.network/console/primary-network/faucet",
  explorer:
    "https://explorer-test.avax.network/c-chain",
  uniswapOverview:
    "https://developers.uniswap.org/docs/protocols/v2/overview",
  uniswapPools:
    "https://developers.uniswap.org/docs/protocols/v2/concepts/pools",
  uniswapWhitepaper:
    "https://docs.uniswap.org/whitepaper.pdf",
  githubFork:
    "https://docs.github.com/en/get-started/quickstart/fork-a-repo",
  githubActions:
    "https://docs.github.com/en/actions",
  vercelGit:
    "https://vercel.com/docs/git",
  scaffoldDocs:
    "https://docs.scaffoldeth.io",
  repo: "https://github.com/0xherstory/fuji-v2-amm-course",
};

function addRect(slide, x, y, w, h, fill, opts = {}) {
  return slide.shapes.add({
    geometry: opts.geometry ?? "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: {
      fill: opts.lineColor ?? "none",
      width: opts.lineWidth ?? 0,
      style: opts.lineStyle ?? "solid",
    },
  });
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: opts.typeface ?? FONT,
    fontSize: opts.fontSize ?? 24,
    bold: opts.bold ?? false,
    color: opts.color ?? C.ink,
    alignment: opts.alignment ?? "left",
    verticalAlignment: opts.verticalAlignment ?? "top",
    autoFit: opts.autoFit ?? "none",
    breakLine: false,
  };
  return shape;
}

function addHeader(slide, title, page, section) {
  addText(slide, title, 62, 37, 1065, 57, {
    fontSize: 34,
    bold: true,
  });
  addText(slide, String(page).padStart(2, "0"), 1166, 45, 54, 28, {
    fontSize: 16,
    bold: true,
    color: C.red,
    alignment: "right",
  });
  addRect(slide, 62, 103, 1158, 2, C.line);
  addText(slide, section, 62, 675, 760, 24, {
    fontSize: 13,
    bold: true,
    color: C.muted,
  });
  addText(slide, "Fuji Testnet · 测试资产无价值", 910, 675, 310, 24, {
    fontSize: 13,
    color: C.muted,
    alignment: "right",
  });
}

function notes(slide, lines) {
  slide.speakerNotes.textFrame.setText(lines.join("\n"));
}

function addLabel(slide, text, x, y, w, fill = C.ink, color = C.white) {
  addRect(slide, x, y, w, 32, fill, { geometry: "roundRect" });
  addText(slide, text, x + 10, y + 5, w - 20, 22, {
    fontSize: 14,
    bold: true,
    color,
    alignment: "center",
  });
}

function addPrompt(slide, prompt, x, y, w, h) {
  addRect(slide, x, y, w, h, C.charcoal, { geometry: "roundRect" });
  addText(slide, "复制给 AI", x + 18, y + 13, 115, 24, {
    fontSize: 14,
    bold: true,
    color: "#FF9A9B",
  });
  addText(slide, prompt, x + 18, y + 42, w - 36, h - 55, {
    fontSize: 17,
    color: C.white,
  });
}

function addStepPanel(slide, step, title, action, checkpoint, prompt, y, h) {
  addRect(slide, 62, y, 96, h, step % 2 === 0 ? C.ink : C.red, {
    geometry: "roundRect",
  });
  addText(slide, String(step).padStart(2, "0"), 75, y + 15, 70, 48, {
    fontSize: 34,
    bold: true,
    color: C.white,
    alignment: "center",
  });
  addText(slide, title, 186, y + 5, 426, 44, {
    fontSize: 25,
    bold: true,
  });
  addText(slide, "操作", 186, y + 57, 66, 27, {
    fontSize: 15,
    bold: true,
    color: C.red,
  });
  addText(slide, action, 252, y + 54, 360, 74, {
    fontSize: 18,
    color: C.ink,
  });
  addText(slide, "检查点", 186, y + 132, 66, 27, {
    fontSize: 15,
    bold: true,
    color: C.green,
  });
  addText(slide, checkpoint, 252, y + 129, 360, 70, {
    fontSize: 18,
    color: C.ink,
  });
  addPrompt(slide, prompt, 650, y + 5, 570, h - 10);
}

function addSingleStep(slide, step, title, action, checkpoint, prompt, extra) {
  addRect(slide, 62, 141, 122, 454, step % 2 === 0 ? C.ink : C.red, {
    geometry: "roundRect",
  });
  addText(slide, String(step).padStart(2, "0"), 82, 167, 82, 66, {
    fontSize: 44,
    bold: true,
    color: C.white,
    alignment: "center",
  });
  addText(slide, title, 218, 145, 520, 52, {
    fontSize: 30,
    bold: true,
  });
  addLabel(slide, "操作", 218, 220, 78, C.red);
  addText(slide, action, 315, 219, 865, 72, { fontSize: 20 });
  addLabel(slide, "检查点", 218, 315, 92, C.green);
  addText(slide, checkpoint, 329, 314, 851, 72, { fontSize: 20 });
  if (extra) {
    addRect(slide, 218, 400, 962, 68, C.ice, {
      geometry: "roundRect",
      lineColor: C.line,
      lineWidth: 1,
    });
    addText(slide, extra, 238, 416, 922, 39, {
      fontSize: 17,
      color: C.muted,
    });
  }
  addPrompt(slide, prompt, 218, 490, 962, 126);
}

const presentation = Presentation.create({
  slideSize: { width: W, height: H },
});

// 1 — Cover
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addRect(slide, 0, 0, 26, H, C.red);
  addRect(slide, 915, 0, 365, H, C.ink);
  addText(slide, "Uniswap V2\n机制教学版", 72, 118, 760, 176, {
    fontSize: 60,
    bold: true,
  });
  addText(slide, "用 AI 在 Avalanche Fuji 完成合约、测试、部署与发布", 76, 320, 725, 64, {
    fontSize: 26,
    color: C.muted,
  });
  addRect(slide, 76, 414, 666, 2, C.red);
  addText(slide, "课堂产出", 76, 447, 115, 28, {
    fontSize: 16,
    bold: true,
    color: C.red,
  });
  addText(slide, "自己的合约地址\n自己的 GitHub 仓库\n自己的在线 DApp", 76, 481, 430, 126, {
    fontSize: 25,
    bold: true,
  });
  addText(slide, "FUJI\n43113", 966, 145, 263, 116, {
    fontSize: 53,
    bold: true,
    color: C.white,
    alignment: "center",
  });
  addText(slide, "只用测试钱包\n测试 AVAX 没有真实价值", 960, 395, 275, 84, {
    fontSize: 22,
    bold: true,
    color: "#FFB2B3",
    alignment: "center",
  });
  addText(slide, "AI 写代码与跑验证\n学员保管密钥并确认发布", 958, 544, 280, 74, {
    fontSize: 18,
    color: C.white,
    alignment: "center",
  });
  notes(slide, [
    "课程定位：教学实验，不是官方 Uniswap，不处理真实资产。",
    `Avalanche Fuji 网络参数：${sources.avalanche}`,
  ]);
}

// 2 — Outcomes and boundaries
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "一堂课的交付物与安全边界", 2, "课程目标");
  addText(slide, "下课前，每位学员应能展示三项可验证结果", 62, 129, 760, 38, {
    fontSize: 23,
    color: C.muted,
  });
  const items = [
    ["01", "合约", "Fuji 上的教学 AMM 地址\nExplorer 可查询交易"],
    ["02", "代码", "独立 fork 与清晰 diff\n合约测试和 CI 通过"],
    ["03", "产品", "Vercel 在线页面\n可完成完整交互"],
  ];
  items.forEach(([n, t, d], i) => {
    const x = 62 + i * 382;
    addText(slide, n, x, 210, 82, 46, {
      fontSize: 34,
      bold: true,
      color: C.red,
    });
    addText(slide, t, x + 92, 214, 230, 40, {
      fontSize: 28,
      bold: true,
    });
    addRect(slide, x, 274, 328, 2, C.line);
    addText(slide, d, x, 301, 328, 88, {
      fontSize: 20,
      color: C.muted,
    });
  });
  addRect(slide, 62, 456, 1158, 152, C.redPale, {
    geometry: "roundRect",
    lineColor: "#F3B6B8",
    lineWidth: 1,
  });
  addText(slide, "安全边界", 86, 478, 170, 34, {
    fontSize: 24,
    bold: true,
    color: C.redDark,
  });
  addText(
    slide,
    "AI 可以读代码、改代码、跑测试、发起部署、检查网页。助记词、私钥、钱包密码和签名只留在学员本机。提交与推送必须先得到学员明确授权。",
    86,
    526,
    1095,
    58,
    { fontSize: 21, bold: true, color: C.ink },
  );
  notes(slide, [
    "强调教学资产无价值；真实主网资金不进入课堂流程。",
    `本地项目说明：${sources.repo}`,
  ]);
}

// 3 — Why contracts matter
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "合约决定交易规则，前端只负责发出请求", 3, "机制基础");
  const xs = [82, 346, 610, 874];
  const labels = [
    ["学员", "输入数量\n点击 Swap"],
    ["前端", "读取余额\n组装交易"],
    ["合约", "验算规则\n更新储备"],
    ["资金池", "AVAX\nCOURSE"],
  ];
  labels.forEach(([t, d], i) => {
    addRect(slide, xs[i], 210, 205, 210, i === 2 ? C.red : C.ice, {
      geometry: "roundRect",
      lineColor: i === 2 ? C.red : C.line,
      lineWidth: 1,
    });
    addText(slide, t, xs[i] + 18, 244, 169, 38, {
      fontSize: 28,
      bold: true,
      color: i === 2 ? C.white : C.ink,
      alignment: "center",
    });
    addText(slide, d, xs[i] + 18, 316, 169, 66, {
      fontSize: 19,
      color: i === 2 ? C.white : C.muted,
      alignment: "center",
    });
    if (i < 3) {
      addText(slide, "›", xs[i] + 219, 281, 33, 50, {
        fontSize: 42,
        bold: true,
        color: C.red,
        alignment: "center",
      });
    }
  });
  addText(slide, "改前端", 198, 489, 120, 32, {
    fontSize: 18,
    bold: true,
    color: C.muted,
  });
  addText(slide, "可能只改变显示", 310, 488, 280, 34, {
    fontSize: 23,
    bold: true,
  });
  addText(slide, "改合约", 198, 550, 120, 32, {
    fontSize: 18,
    bold: true,
    color: C.red,
  });
  addText(slide, "会改变每一笔链上交易的结果", 310, 548, 650, 36, {
    fontSize: 23,
    bold: true,
  });
  notes(slide, [
    "教学重点：合约是链上可执行规则，UI 不能绕过合约约束。",
    `Uniswap v2 architecture: ${sources.uniswapOverview}`,
  ]);
}

// 4 — Constant product curve
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "x × y = k：一次 Swap 会移动储备点", 4, "机制基础");
  const curveX = [20, 25, 33, 40, 50, 67, 80, 100, 125, 160, 200];
  const curveY = curveX.map(x => Number((10000 / x).toFixed(3)));
  const chart = slide.charts.add("scatter", {
    position: { left: 54, top: 145, width: 676, height: 470 },
    series: [
      {
        name: "k = 10,000",
        xValues: curveX,
        values: curveY,
        line: { fill: C.red, width: 3, style: "solid" },
        marker: { symbol: "none", size: 5 },
      },
    ],
    scatterOptions: { style: "smooth" },
    hasLegend: false,
    xAxis: {
      title: "AVAX 储备 x",
      minimumScale: 0,
      maximumScale: 210,
      majorUnit: 50,
      majorGridlines: { fill: C.line, width: 1, style: "solid" },
    },
    yAxis: {
      title: "COURSE 储备 y",
      minimumScale: 0,
      maximumScale: 210,
      majorUnit: 50,
      majorGridlines: { fill: C.line, width: 1, style: "solid" },
    },
    chartFill: C.white,
    chartLine: { fill: "none", width: 0 },
    plotAreaFill: C.white,
    plotAreaLine: { fill: "none", width: 0 },
  });
  chart.title = "";
  const { applyPresentationChartFont } = await import(
    pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href
  );
  applyPresentationChartFont(chart, { fontFamily: FONT });

  addText(slide, "初始储备", 790, 159, 180, 30, {
    fontSize: 17,
    bold: true,
    color: C.muted,
  });
  addText(slide, "100 AVAX ×\n100 COURSE", 790, 198, 390, 72, {
    fontSize: 27,
    bold: true,
  });
  addText(slide, "k = 10,000", 790, 277, 260, 32, {
    fontSize: 21,
    color: C.red,
  });
  addRect(slide, 790, 327, 392, 2, C.line);
  addText(slide, "买入 COURSE 后", 790, 355, 240, 30, {
    fontSize: 17,
    bold: true,
    color: C.muted,
  });
  addText(slide, "AVAX 增加，COURSE 减少", 790, 395, 390, 40, {
    fontSize: 25,
    bold: true,
  });
  addText(slide, "池越浅，同样输入造成的价格移动越大", 790, 463, 390, 70, {
    fontSize: 21,
    color: C.ink,
  });
  addRect(slide, 790, 548, 392, 54, C.ink, { geometry: "roundRect" });
  addText(slide, "合约负责让交易后仍满足不变量", 808, 561, 356, 29, {
    fontSize: 18,
    bold: true,
    color: C.white,
    alignment: "center",
  });
  notes(slide, [
    "图表为本课示例数据，k=10,000；不包含费用时储备点沿恒定乘积曲线移动。",
    `Uniswap v2 whitepaper: ${sources.uniswapWhitepaper}`,
  ]);
}

// 5 — Fees and slippage
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "手续费留下价值，滑点反映池子的深度", 5, "机制基础");
  addText(slide, "示例：池中有 100 AVAX 与 100 COURSE，输入 10 AVAX", 62, 134, 940, 42, {
    fontSize: 23,
    color: C.muted,
  });
  const rows = [
    ["输入", "10.000 AVAX", C.ice],
    ["扣除 0.3% 费用后参与定价", "9.970 AVAX", C.redPale],
    ["预计得到", "≈ 9.066 COURSE", C.greenPale],
  ];
  rows.forEach(([label, value, fill], i) => {
    const y = 212 + i * 100;
    addRect(slide, 62, y, 650, 76, fill, {
      geometry: "roundRect",
      lineColor: C.line,
      lineWidth: 1,
    });
    addText(slide, label, 84, y + 22, 350, 33, {
      fontSize: 20,
      bold: i === 1,
    });
    addText(slide, value, 445, y + 20, 240, 36, {
      fontSize: 23,
      bold: true,
      alignment: "right",
      color: i === 1 ? C.redDark : C.ink,
    });
  });
  addRect(slide, 766, 210, 454, 278, C.ink, { geometry: "roundRect" });
  addText(slide, "amountOut =", 796, 241, 370, 36, {
    fontSize: 22,
    bold: true,
    color: "#FFB2B3",
  });
  addText(slide, "y × amountInFee\n──────────────\nx + amountInFee", 808, 291, 350, 137, {
    fontSize: 28,
    bold: true,
    color: C.white,
    alignment: "center",
  });
  addText(slide, "滑点不是额外收费；它来自交易改变了储备比例", 766, 525, 454, 70, {
    fontSize: 21,
    bold: true,
    color: C.ink,
  });
  notes(slide, [
    "计算：amountInWithFee=10×0.997=9.97；amountOut=100×9.97/(100+9.97)≈9.066。",
    `Uniswap v2 pools and 0.3% fee: ${sources.uniswapPools}`,
  ]);
}

// 6 — Scope mapping
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "教学版保留核心机制，删去生产协议复杂度", 6, "机制基础");
  addText(slide, "课堂要看懂机制，也要看见删减带来的边界", 62, 131, 780, 38, {
    fontSize: 23,
    color: C.muted,
  });
  addText(slide, "教学版", 82, 205, 240, 40, {
    fontSize: 28,
    bold: true,
    color: C.red,
  });
  addText(slide, "完整 Uniswap V2", 700, 205, 330, 40, {
    fontSize: 28,
    bold: true,
  });
  const pairs = [
    ["一个 AVAX / COURSE 池", "Factory 可创建多个 Pair"],
    ["恒定乘积 + 手续费", "Pair 合约执行核心不变量"],
    ["Claim / Approve / Add / Swap / Remove", "Router 处理路径与流动性操作"],
    ["课堂测试钱包", "生产钱包、审计与治理边界"],
  ];
  pairs.forEach(([left, right], i) => {
    const y = 275 + i * 77;
    addRect(slide, 82, y, 442, 55, i === 0 ? C.redPale : C.ice, {
      geometry: "roundRect",
    });
    addText(slide, left, 101, y + 14, 404, 29, {
      fontSize: 19,
      bold: i === 0,
    });
    addText(slide, "对应", 552, y + 14, 82, 28, {
      fontSize: 16,
      bold: true,
      color: C.muted,
      alignment: "center",
    });
    addRect(slide, 658, y, 500, 55, C.ice, { geometry: "roundRect" });
    addText(slide, right, 678, y + 14, 460, 29, { fontSize: 19 });
  });
  addText(slide, "课堂禁止：真实资产、主网部署、把教学代码包装成生产交易所", 82, 612, 1076, 35, {
    fontSize: 20,
    bold: true,
    color: C.redDark,
    alignment: "center",
  });
  notes(slide, [
    `Uniswap v2 architecture and repositories: ${sources.uniswapOverview}`,
    `本课实现范围：${sources.repo}`,
  ]);
}

// 7 — Repository map
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "代码仓结构：修改合约，测试守门，前端读取部署结果", 7, "项目地图");
  const dirs = [
    ["CourseToken.sol + FujiV2AMM.sol", "教学币与 AMM 合约", C.red],
    ["test/FujiV2AMM.ts", "17 个合约行为场景", C.ink],
    ["packages/hardhat/deploy", "部署脚本", C.ink],
    ["packages/nextjs", "页面与钱包交互", C.blue],
    ["deployedContracts.ts", "自动生成 ABI 与地址", C.green],
  ];
  dirs.forEach(([dir, desc, color], i) => {
    const y = 160 + i * 90;
    addRect(slide, 92, y, 450, 62, C.ice, {
      geometry: "roundRect",
      lineColor: C.line,
      lineWidth: 1,
    });
    addRect(slide, 92, y, 9, 62, color, { geometry: "roundRect" });
    addText(slide, dir, 121, y + 17, 398, 30, {
      fontSize: 18,
      bold: true,
      typeface: CODE_FONT,
    });
    addText(slide, desc, 610, y + 15, 400, 34, {
      fontSize: 23,
      bold: true,
    });
  });
  addRect(slide, 1020, 160, 138, 422, C.ink, { geometry: "roundRect" });
  addText(slide, "AI\n沿着\n测试\n修改\n验证", 1041, 222, 96, 302, {
    fontSize: 25,
    bold: true,
    color: C.white,
    alignment: "center",
  });
  notes(slide, [
    "目录名与命令在最终版生成前应再次对照仓库。",
    `Scaffold-ETH docs: ${sources.scaffoldDocs}`,
    `本地项目：${sources.repo}`,
  ]);
}

// 8 — 13-step overview
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "13 步工作流：每一次改动都有证据", 8, "学员流程");
  const stages = [
    ["A · 理解", ["01 Fork", "02 读仓库", "03 定需求"]],
    ["B · 修改", ["04 失败测试", "05 改合约", "06 全量验证"]],
    ["C · 上链", ["07 发起部署", "08 本机密码", "09 地址同步"]],
    ["D · 发布", ["10 查 diff", "11 授权推送", "12 CI / Vercel", "13 全链路验收"]],
  ];
  stages.forEach(([stage, steps], i) => {
    const x = 62 + i * 290;
    addText(slide, stage, x, 152, 246, 35, {
      fontSize: 22,
      bold: true,
      color: i === 2 ? C.red : C.ink,
    });
    addRect(slide, x, 201, 252, 6, i === 2 ? C.red : C.line);
    steps.forEach((s, j) => {
      const y = 243 + j * 88;
      addText(slide, s.slice(0, 2), x, y, 66, 36, {
        fontSize: 25,
        bold: true,
        color: i === 2 ? C.red : C.muted,
      });
      addText(slide, s.slice(3), x + 72, y + 2, 178, 34, {
        fontSize: 21,
        bold: true,
      });
      if (j < steps.length - 1) addRect(slide, x + 72, y + 49, 160, 1, C.line);
    });
  });
  addRect(slide, 62, 615, 1158, 39, C.ice, { geometry: "roundRect" });
  addText(slide, "证据链：失败测试记录 · 通过的质量门禁 · Fuji 交易哈希 · Explorer 地址 · 在线 URL", 80, 623, 1120, 23, {
    fontSize: 17,
    bold: true,
    alignment: "center",
  });
  notes(slide, ["13 步来自本课程学员实际操作流程。"]);
}

// 9 — Steps 1-2
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "开始：拥有自己的仓库，再让 AI 建立上下文", 9, "学员流程 · 理解");
  addStepPanel(
    slide,
    1,
    "Fork 教学模板",
    "在 GitHub 点击 Fork，创建到自己的账号；再让 Codex 打开仓库。",
    "浏览器地址显示自己的用户名；默认分支与上游一致。",
    "请只读检查当前仓库是否来自课程模板，告诉我默认分支、项目结构和未提交文件。不要修改代码。",
    130,
    247,
  );
  addStepPanel(
    slide,
    2,
    "读取规则与核心文件",
    "让 AI 先读 AGENTS.md、CourseToken.sol、FujiV2AMM.sol、测试、部署脚本和前端配置。",
    "AI 能说清改哪份合约、用哪条测试命令、部署后地址写到哪里。",
    "先不要改代码。完整阅读 AGENTS.md、两份合约、FujiV2AMM.ts、部署脚本和前端配置，画出从合约到页面的数据路径，并列出安全限制。",
    392,
    247,
  );
  notes(slide, [
    `GitHub fork guide: ${sources.githubFork}`,
    `本地项目：${sources.repo}`,
  ]);
}

// 10 — Steps 3-4
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "需求先变成测试，AI 才有明确终点", 10, "学员流程 · 理解与修改");
  addStepPanel(
    slide,
    3,
    "选择一个合约需求",
    "从手续费、Claim 规则或单笔限额中选一个最小合约改动。",
    "需求写成输入、预期结果、错误条件；不顺手重构无关代码。",
    "我要把【需求】改成【具体数值或规则】。请先定位影响的函数与测试，写出验收标准和最小修改范围，不要动代码。",
    130,
    247,
  );
  addStepPanel(
    slide,
    4,
    "先补一个会失败的测试",
    "AI 只添加测试并运行目标测试，保留失败输出作为修改前证据。",
    "测试因新需求未实现而失败，不是语法、依赖或环境错误。",
    "只为上述需求添加一个最小测试。先不要改合约。运行目标测试，确认它因预期行为尚未实现而失败，并概括失败证据。",
    392,
    247,
  );
  notes(slide, [`本地测试约定：${sources.repo}`]);
}

// 11 — Step 5
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "第 5 步：只修改合约需要改变的部分", 11, "学员流程 · 修改");
  addSingleStep(
    slide,
    5,
    "AI 修改合约",
    "让 AI 根据失败测试做最小实现；保留 x × y = k、权限、余额检查和事件。",
    "刚才的目标测试通过；旧测试没有回归；diff 能用几句话解释。",
    "现在根据失败测试实现需求。只改必要的合约代码；不要改测试来迎合实现。完成后先运行目标测试，再解释每一处 diff 为什么必要。",
    "审查问题：这个改动会不会绕过余额检查、扩大权限、破坏不变量，或让前端 ABI 失配？",
  );
  notes(slide, [
    `Uniswap v2 security and architecture references: ${sources.uniswapOverview}`,
    `本地合约：${sources.repo}`,
  ]);
}

// 12 — Step 6
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "质量门禁：同时检查合约与网页", 12, "学员流程 · 修改");
  addSingleStep(
    slide,
    6,
    "运行完整验证",
    "依次运行 yarn hardhat:compile、yarn hardhat:test、yarn ci:contracts、yarn next:check-types 和 yarn next:build。",
    "所有命令退出码为 0；没有把跳过的测试当作通过；构建产物不含秘密。",
    "请依次运行 yarn hardhat:compile、yarn hardhat:test、yarn ci:contracts、yarn next:check-types、yarn next:build。只报告 PASSED / FAILED / BLOCKED / NOT_RUN，并附失败命令与最小错误摘要。",
    "本地冒烟：三个终端依次运行 yarn chain、yarn deploy、yarn start；浏览器打开根路径 /。",
  );
  notes(slide, [`当前命令清单：${sources.repo}`]);
}

// 13 — Steps 7-8
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "部署分工：AI 发起流程，学员掌握密码", 13, "学员流程 · 上链");
  addStepPanel(
    slide,
    7,
    "发起 Fuji 部署",
    "确认网络为 Fuji、Chain ID 43113；AI 运行部署命令并等待交互。",
    "终端显示 Fuji；部署钱包只有少量测试 AVAX；没有主网地址。",
    "检查 Fuji 配置和部署账户余额，然后运行 yarn deploy --network fuji。遇到加密账户密码提示时停下等我操作，不要读取或输出任何秘密。",
    130,
    247,
  );
  addStepPanel(
    slide,
    8,
    "本机输入部署密码",
    "学员在自己设备输入隔离测试账户的加密密码；Hardhat 仅在内存中签名。",
    "聊天、终端回显、截图、Git diff 中都没有助记词或私钥。",
    "我会在本机输入隔离测试账户的加密密码，Hardhat 只在内存中签名。你只继续观察公开交易状态；不要要求我粘贴任何秘密。",
    392,
    247,
  );
  notes(slide, [
    `Fuji chain ID, RPC, explorer and faucet: ${sources.avalanche}`,
    `Official faucet: ${sources.faucet}`,
    `本地部署规则：${sources.repo}`,
  ]);
}

// 14 — Step 9
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "第 9 步：部署结果自动成为前端配置", 14, "学员流程 · 上链");
  addSingleStep(
    slide,
    9,
    "同步 ABI 与地址",
    "部署脚本生成 packages/nextjs/contracts/deployedContracts.ts，前端从同一份记录读取合约。",
    "文件包含 Chain ID 43113、新合约地址和匹配 ABI；网页链接指向 Fuji Explorer。",
    "检查部署输出和 deployedContracts.ts。确认 chainId 是 43113、地址与部署回执一致、ABI 包含本次改动。不要手工复制长 ABI；若生成失败，先修部署流程。",
    "为什么自动生成：地址和 ABI 来自同一次部署，可减少复制错误，也避免前端继续调用旧函数。",
  );
  notes(slide, [
    `Scaffold-ETH deployment flow: ${sources.scaffoldDocs}`,
    `本地部署产物：${sources.repo}`,
  ]);
}

// 15 — Step 10
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "第 10 步：发布前审查", 15, "学员流程 · 发布");
  addSingleStep(
    slide,
    10,
    "AI 做发布前审查",
    "查看 git status、完整 diff、未跟踪文件和忽略规则；扫描钱包与部署材料。",
    "提交范围只含需求、测试和生成的公开 ABI/地址；没有 .env、私钥、助记词、密码或账户文件。",
    "请审查 git status 和完整 diff，再做秘密扫描。不要打印任何秘密值，只报告可疑文件路径、变量名和风险。列出计划提交与必须排除的文件，然后停下等我确认。",
    "高风险文件：.env*、部署账户 JSON、助记词、私钥、访问令牌、截图中的钱包信息、包含真实身份的钱包名单。",
  );
  notes(slide, [`仓库忽略与安全约定：${sources.repo}`]);
}

// 16 — Steps 11-12
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "发布：人确认代码边界，平台验证构建结果", 16, "学员流程 · 发布");
  addStepPanel(
    slide,
    11,
    "授权后 commit / push",
    "AI 先展示提交文件和英文 commit message；学员明确回复允许后再执行。",
    "GitHub 显示新提交；没有 force push；远端仓库属于学员账号。",
    "先展示将提交的文件、diff 摘要和英文 commit message。不要提交或推送。等我回复“允许提交并推送”后，再执行普通 commit 和 push，禁止 force push。",
    130,
    247,
  );
  addStepPanel(
    slide,
    12,
    "Actions 通过后发布 Vercel",
    "等待 GitHub Actions 全绿；在 Vercel 导入仓库，Root Directory 选择仓库根目录。",
    "CI 通过；Vercel build 成功；Production URL 可公开访问。",
    "检查本次 GitHub Actions。若失败，定位根因并提出最小修复；全部通过后，按 README 从仓库根目录运行 yarn vercel，或配置 yarn next:build。未经我确认不要改线上环境变量。",
    392,
    247,
  );
  notes(slide, [
    `GitHub Actions: ${sources.githubActions}`,
    `Vercel Git deployment: ${sources.vercelGit}`,
    `本地发布配置：${sources.repo}`,
  ]);
}

// 17 — Step 13
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "第 13 步：网页、链和 Explorer 三方对账", 17, "学员流程 · 验收");
  addSingleStep(
    slide,
    13,
    "完成端到端验证",
    "打开线上页面，连接 Fuji 测试钱包，依次完成 Claim、Approve、Add、Swap、Remove。",
    "每步都有成功状态或交易哈希；储备与 k 合理变化；Explorer 的合约、钱包和交易都属于 Fuji。",
    "请对线上 URL 做端到端验收：确认网络 43113，并验证 Claim、Approve、Add Liquidity、Swap、Remove Liquidity。逐项给出 PASSED / FAILED / BLOCKED / NOT_RUN，附公开交易哈希或 Explorer 链接；不要泄露钱包秘密。",
    "最终交付证据：GitHub 仓库链接 · Actions 绿色记录 · Fuji 合约地址 · 至少一笔 Swap 哈希 · Vercel URL。",
  );
  notes(slide, [
    `Fuji explorer: ${sources.explorer}`,
    `Avalanche network parameters: ${sources.avalanche}`,
    `本地交互流程：${sources.repo}`,
  ]);
}

// 18 — Troubleshooting
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "常见故障：先判断发生在哪一层", 18, "排障");
  const issues = [
    ["钱包不弹窗", "网络或连接", "确认 Fuji 43113；断开后重连"],
    ["余额不足", "测试币", "用官方 Faucet 获取少量测试 AVAX"],
    ["测试失败", "代码", "先运行单个测试；不要绕过断言"],
    ["部署 reverted", "合约或参数", "读取错误原因与构造参数；保留交易哈希"],
    ["页面找不到合约", "ABI / 地址", "核对 deployedContracts.ts 的 43113 与地址"],
    ["Vercel 构建失败", "发布配置", "检查 Root Directory、Node/Yarn 与构建日志"],
  ];
  addText(slide, "现象", 70, 145, 280, 30, { fontSize: 17, bold: true, color: C.muted });
  addText(slide, "层级", 410, 145, 210, 30, { fontSize: 17, bold: true, color: C.muted });
  addText(slide, "第一步", 670, 145, 500, 30, { fontSize: 17, bold: true, color: C.muted });
  issues.forEach(([a, b, c], i) => {
    const y = 185 + i * 72;
    addRect(slide, 62, y, 1158, 56, i % 2 === 0 ? C.ice : C.white, {
      geometry: "roundRect",
      lineColor: C.line,
      lineWidth: 1,
    });
    addText(slide, a, 82, y + 14, 290, 30, { fontSize: 19, bold: true });
    addText(slide, b, 410, y + 14, 210, 30, { fontSize: 18, color: C.redDark });
    addText(slide, c, 670, y + 14, 520, 30, { fontSize: 18 });
  });
  notes(slide, [
    `Fuji faucet: ${sources.faucet}`,
    `Vercel Git docs: ${sources.vercelGit}`,
    `本地排障规则：${sources.repo}`,
  ]);
}

// 19 — Challenge and assessment
{
  const slide = presentation.slides.add();
  slide.background.fill = C.white;
  addHeader(slide, "合约挑战菜单与评价标准", 19, "课堂挑战");
  addText(slide, "只选一个需求，完整走完测试与发布流程", 62, 131, 750, 38, {
    fontSize: 23,
    color: C.muted,
  });
  const tasks = [
    ["A", "手续费实验", "比较 0.3% 与自定义费率的 amountOut 和 k"],
    ["B", "Claim 数量", "改变领取数量，并讨论每地址一次的边界"],
    ["C", "Claim 规则", "修改领取条件，并用失败测试说明新规则"],
    ["D", "单笔限额", "超过阈值时 revert，并给出可读错误"],
  ];
  tasks.forEach(([n, t, d], i) => {
    const y = 202 + i * 83;
    addText(slide, n, 80, y, 54, 42, {
      fontSize: 30,
      bold: true,
      color: i === 0 ? C.red : C.ink,
    });
    addText(slide, t, 150, y + 2, 205, 36, { fontSize: 23, bold: true });
    addText(slide, d, 385, y + 4, 650, 34, { fontSize: 18, color: C.muted });
  });
  addRect(slide, 62, 552, 1158, 82, C.ink, { geometry: "roundRect" });
  addText(slide, "评分看证据", 86, 574, 160, 32, {
    fontSize: 21,
    bold: true,
    color: "#FFB2B3",
  });
  addText(slide, "需求清楚 · 失败测试真实 · 合约改动最小 · 质量门禁通过 · Fuji 与网页均可验证", 260, 573, 920, 34, {
    fontSize: 19,
    bold: true,
    color: C.white,
  });
  notes(slide, [
    "挑战题仅用于教学测试网；修改 Claim 时要讨论女巫攻击与身份边界。",
    `Uniswap v2 mechanics: ${sources.uniswapOverview}`,
  ]);
}

// 20 — Resources
{
  const slide = presentation.slides.add();
  slide.background.fill = C.ink;
  addText(slide, "资源与最终交付", 62, 45, 900, 55, {
    fontSize: 36,
    bold: true,
    color: C.white,
  });
  addText(slide, "20", 1160, 52, 60, 25, {
    fontSize: 16,
    bold: true,
    color: "#FF9A9B",
    alignment: "right",
  });
  const resources = [
    ["课程仓库", sources.repo],
    ["Fuji 参数", sources.avalanche],
    ["测试 AVAX", sources.faucet],
    ["Fuji Explorer", sources.explorer],
    ["Uniswap V2", sources.uniswapOverview],
    ["Vercel 发布", sources.vercelGit],
  ];
  resources.forEach(([label, value], i) => {
    const y = 132 + i * 72;
    addText(slide, label, 62, y, 190, 30, {
      fontSize: 17,
      bold: true,
      color: "#FF9A9B",
    });
    addText(slide, value, 255, y, 900, 41, {
      fontSize: value.startsWith("http") ? 17 : 19,
      bold: !value.startsWith("http"),
      color: C.white,
      typeface: value.startsWith("http") ? CODE_FONT : FONT,
    });
    addRect(slide, 62, y + 49, 1094, 1, "#41454E");
  });
  addRect(slide, 62, 589, 1094, 68, C.red, { geometry: "roundRect" });
  addText(slide, "带走三样东西：合约地址、代码仓库、在线 DApp", 86, 607, 1046, 35, {
    fontSize: 24,
    bold: true,
    color: C.white,
    alignment: "center",
  });
  notes(slide, [
    `Avalanche primary network: ${sources.avalanche}`,
    `Official Fuji faucet: ${sources.faucet}`,
    `Fuji explorer: ${sources.explorer}`,
    `Uniswap v2 developer docs: ${sources.uniswapOverview}`,
    `Vercel Git deployments: ${sources.vercelGit}`,
  ]);
}

await fs.mkdir(BUILD_DIR, { recursive: true });
await fs.mkdir(OUTPUT_DIR, { recursive: true });

const candidatePath = path.join(BUILD_DIR, "fuji-v2-amm-course-candidate-v5.pptx");
const finalPath = path.join(
  OUTPUT_DIR,
  "final.pptx",
);
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const { finalizePresentation } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href
);

const requirements = {
  explicitTotalSlideCount: 20,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [4],
};

const result = await finalizePresentation({
  ...requirements,
  workspaceDir: WORKSPACE,
  candidatePath,
  finalPath,
  pythonExecutable: PYTHON,
  integrityValidatorPath: path.join(
    SKILL_DIR,
    "container_tools/inspect_presentation_package_integrity.py",
  ),
  layoutValidatorPath: path.join(
    SKILL_DIR,
    "container_tools/inspect_presentation_layout_geometry.py",
  ),
  layoutArgs: [
    "--expected-slide-size-emu",
    "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
  ],
  requiredNativeTableOwnerSlides: [],
  materializeLiteralChartWorkbooks: true,
  fontPolicy: {
    basis: "design",
    families: [FONT, CODE_FONT],
  },
  verifyArtifactToolImport: true,
  receiptPath: path.join(
    BUILD_DIR,
    "final.validation.json",
  ),
});

console.log(
  JSON.stringify(
    {
      candidatePath,
      finalPath,
      slideCount: presentation.slides.count,
      finalizer: result,
    },
    null,
    2,
  ),
);
