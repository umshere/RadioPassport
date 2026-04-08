// Test different OpenRouter models for speed comparison
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("OPENROUTER_API_KEY environment variable not set");
  process.exit(1);
}

const SYSTEM_PROMPT = `You are Radio Passport's music curator. Return JSON with visual, mood (2-4 words), animation, selectedStationIds (pick 6), reason (max 200 chars).`;

const userPrompt = `Pick 6 jazz stations from: 
1. Classic Vinyl [d1a54d2e]|USA
2. Jazz Underground [ea8059be]|USA
3. Groove Salad [960cf833]|USA
4. Deutschlandfunk [1c3e8be2]|Germany
5. ORF Ö3 [e723f7f8]|Austria
6. JOE [529b71b3]|Belgium
7. Jazz FM [abc123]|UK
8. TSF Jazz [def456]|France
9. Swiss Jazz [ghi789]|Switzerland
10. Smooth Florida [jkl012]|USA

Return ONLY JSON.`;

// Models to test - focusing on router-first free options
const MODELS = [
  "openrouter/free", // Dynamic free router
  "z-ai/glm-4.5-air:free", // Controlled fallback candidate
  "meta-llama/llama-3.3-8b-instruct:free", // Controlled fallback candidate
];

async function testModel(modelName) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🧪 Testing: ${modelName}`);
  console.log("=".repeat(60));

  const startTotal = Date.now();

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 1000, // Limit tokens to reduce latency
          response_format: { type: "json_object" },
        }),
      }
    );

    const startText = Date.now();
    const responseText = await response.text();
    const textDuration = Date.now() - startText;

    const totalDuration = Date.now() - startTotal;

    if (!response.ok) {
      console.log(`❌ FAILED: ${response.status}`);
      console.log(`Error: ${responseText.substring(0, 200)}`);
      console.log(`⏱️  Total time: ${(totalDuration / 1000).toFixed(2)}s`);
      return { model: modelName, success: false, duration: totalDuration };
    }

    const data = JSON.parse(responseText);
    const content = data.choices?.[0]?.message?.content;

    console.log(`✅ SUCCESS`);
    console.log(`⏱️  Text download: ${(textDuration / 1000).toFixed(2)}s`);
    console.log(`⏱️  Total time: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`📊 Tokens: ${data.usage?.total_tokens || "N/A"}`);
    console.log(`📄 Response: ${content?.substring(0, 150)}...`);

    return {
      model: modelName,
      success: true,
      duration: totalDuration,
      tokens: data.usage?.total_tokens,
    };
  } catch (error) {
    const totalDuration = Date.now() - startTotal;
    console.log(`❌ ERROR: ${error.message}`);
    console.log(`⏱️  Failed after: ${(totalDuration / 1000).toFixed(2)}s`);
    return {
      model: modelName,
      success: false,
      duration: totalDuration,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log("\n🚀 OpenRouter Model Speed Comparison");
  console.log(`Testing ${MODELS.length} models...\n`);

  const results = [];

  for (const model of MODELS) {
    const result = await testModel(model);
    results.push(result);
    // Wait 2 seconds between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Summary
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 RESULTS SUMMARY");
  console.log("=".repeat(60));

  const successful = results
    .filter((r) => r.success)
    .sort((a, b) => a.duration - b.duration);

  if (successful.length > 0) {
    console.log("\n🏆 Fastest to Slowest:");
    successful.forEach((r, i) => {
      console.log(`${i + 1}. ${r.model}`);
      console.log(
        `   ⏱️  ${(r.duration / 1000).toFixed(2)}s | 📊 ${r.tokens} tokens`
      );
    });

    const fastest = successful[0];
    const current = results.find((r) => r.model === "openrouter/free");

    if (fastest.model !== "openrouter/free" && current?.success) {
      const speedup = (current.duration / fastest.duration).toFixed(1);
      console.log(`\n💡 RECOMMENDATION: Switch to ${fastest.model}`);
      console.log(`   🚀 ${speedup}x faster than current model`);
    }
  }

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    console.log("\n❌ Failed models:");
    failed.forEach((r) => {
      console.log(`   ${r.model}: ${r.error || "Unknown error"}`);
    });
  }
}

runTests();
