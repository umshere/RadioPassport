#!/usr/bin/env node

/**
 * Test script for OpenRouter AI provider integration
 * This script tests the /api/ai/recommend endpoint with OpenRouter
 */

const BASE_URL = "http://localhost:5174";

const testPrompts = [
  "Find me relaxing jazz stations from Europe",
  "I want upbeat Latin music from South America",
  "Show me electronic music from Asia",
];

async function testRecommendation(prompt) {
  console.log("\n" + "=".repeat(80));
  console.log(`Testing prompt: "${prompt}"`);
  console.log("=".repeat(80));

  const url = `${BASE_URL}/api/ai/recommend`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      return;
    }

    const data = await response.json();
    console.log("\n✅ Success! Response:");
    console.log(JSON.stringify(data, null, 2));

    // Validate the response structure
    if (data.descriptor) {
      console.log("\n📊 Descriptor Summary:");
      console.log(`  Visual: ${data.descriptor.visual}`);
      console.log(`  Mood: ${data.descriptor.mood}`);
      console.log(`  Animation: ${data.descriptor.animation || "none"}`);
      console.log(`  Stations: ${data.descriptor.stations?.length || 0}`);
      console.log(`  Playback Strategy: ${data.descriptor.play?.strategy}`);
      console.log(`  Reason: ${data.descriptor.reason}`);

      if (data.descriptor.stations?.length > 0) {
        console.log("\n🎵 Top 3 Stations:");
        data.descriptor.stations.slice(0, 3).forEach((station, idx) => {
          console.log(`  ${idx + 1}. ${station.name} (${station.country})`);
          console.log(`     Tags: ${station.tagList?.join(", ") || "none"}`);
          console.log(`     Bitrate: ${station.bitrate} kbps`);
        });
      }
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

async function main() {
  console.log("🚀 Testing OpenRouter AI Integration");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Provider: OpenRouter (openrouter/free)`);

  for (const prompt of testPrompts) {
    await testRecommendation(prompt);
    // Wait a bit between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ All tests completed!");
  console.log("=".repeat(80));
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
