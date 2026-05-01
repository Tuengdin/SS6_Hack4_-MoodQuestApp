import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY ||
  "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";

const FREE_MODELS = [
  "openai/gpt-oss-20b:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
];

// Cache AQI results in memory (province -> { data, timestamp })
const aqiCache = new Map<string, { data: AqiResult; ts: number }>();
const CACHE_TTL = 3600_000; // 1 hour

interface AqiResult {
  aqi: number;
  level: string;
  levelTh: string;
  color: string;
  advice: string;
  adviceTh: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const province = searchParams.get("province") || "กรุงเทพ";

    // Check cache
    const cached = aqiCache.get(province);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Get current date info for AI
    const now = new Date();
    const month = now.toLocaleString("en", { month: "long" });
    const season =
      now.getMonth() >= 10 || now.getMonth() <= 1
        ? "cool/dry season"
        : now.getMonth() >= 2 && now.getMonth() <= 4
        ? "hot season (burning season in north)"
        : "rainy season";

    const prompt = `Estimate the current Air Quality Index (AQI) for ${province}, Thailand.
Date: ${month} ${now.getFullYear()}, Season: ${season}

Based on typical AQI patterns for this province and season, respond with ONLY a JSON object:
{
  "aqi": estimated AQI number (0-500),
  "level": "Good" or "Moderate" or "Unhealthy for Sensitive" or "Unhealthy" or "Very Unhealthy" or "Hazardous",
  "levelTh": Thai translation of level,
  "color": hex color for the AQI level (#00E400 green, #FFFF00 yellow, #FF7E00 orange, #FF0000 red, #8F3F97 purple, #7E0023 maroon),
  "advice": short English advice for travelers (1 sentence),
  "adviceTh": short Thai advice for travelers (1 sentence)
}

Be realistic based on known pollution patterns. Northern Thailand has worse AQI in Feb-Apr (burning season). Bangkok is typically moderate. Southern/coastal areas are usually good.
Return ONLY JSON, no markdown.`;

    let content: string | null = null;
    for (const model of FREE_MODELS) {
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You respond with JSON only. No markdown, no code blocks, no thinking tags." },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 300,
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        content = data.choices?.[0]?.message?.content;
        if (content) break;
      } catch {
        continue;
      }
    }

    if (!content) {
      // Fallback: return estimated AQI based on province
      const fallback = getFallbackAqi(province);
      aqiCache.set(province, { data: fallback, ts: Date.now() });
      return NextResponse.json(fallback);
    }

    // Clean and parse
    let clean = content.trim();
    clean = clean.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
    }

    const result: AqiResult = JSON.parse(jsonMatch[0]);

    // Cache it
    aqiCache.set(province, { data: result, ts: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error("AQI API error:", error);
    const province = new URL(request.url).searchParams.get("province") || "กรุงเทพ";
    return NextResponse.json(getFallbackAqi(province));
  }
}

function getFallbackAqi(province: string): AqiResult {
  // Estimate AQI based on province and current month
  const month = new Date().getMonth(); // 0-11
  const isBurningSeason = month >= 1 && month <= 3; // Feb-Apr
  const isNorth = /เชียงใหม่|เชียงราย|น่าน|Chiang|Nan/i.test(province);
  const isCoastal = /ภูเก็ต|กระบี่|Phuket|Krabi|หัวหิน|Hua Hin|พัทยา|Pattaya/i.test(province);

  let aqi: number;
  if (isNorth && isBurningSeason) aqi = 120;
  else if (isNorth) aqi = 65;
  else if (isCoastal) aqi = 35;
  else aqi = 55; // Bangkok and others

  const level = aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : "Unhealthy for Sensitive";
  const levelTh = aqi <= 50 ? "ดี" : aqi <= 100 ? "ปานกลาง" : "เริ่มมีผลต่อสุขภาพ";
  const color = aqi <= 50 ? "#00E400" : aqi <= 100 ? "#FFFF00" : "#FF7E00";

  return {
    aqi,
    level,
    levelTh,
    color,
    advice: aqi > 100 ? "Wear a mask outdoors" : "Air quality is acceptable",
    adviceTh: aqi > 100 ? "สวมหน้ากากเมื่ออยู่กลางแจ้ง" : "คุณภาพอากาศอยู่ในเกณฑ์ที่ยอมรับได้",
  };
}
