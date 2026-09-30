#!/usr/bin/env node

/**
 * Test script for AI Atlas Integration
 * 
 * This script tests the /api/ai/recommend endpoint with various prompts
 * to ensure the Gemini AI integration is working correctly.
 * 
 * Usage: node test-ai-atlas.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const TEST_PROMPTS = [
  {
    name: 'Jazz from New York',
    prompt: 'jazz from New York',
    expectedTags: ['jazz'],
    expectedCountries: ['United States', 'USA'],
  },
  {
    name: 'Brazilian Bossa Nova',
    prompt: 'relaxing bossa nova from Brazil',
    expectedTags: ['bossa', 'brazil'],
    expectedCountries: ['Brazil'],
  },
  {
    name: 'Electronic from Berlin',
    prompt: 'electronic music from Berlin',
    expectedTags: ['electronic', 'techno', 'house'],
    expectedCountries: ['Germany', 'DE'],
  },
  {
    name: 'Ambient for late night',
    prompt: 'ambient music for late night relaxation',
    expectedTags: ['ambient', 'chill', 'downtempo'],
  },
  {
    name: 'Default (no prompt)',
    visual: 'atlas',
  },
];

async function testPrompt(test) {
  console.log(`\n📡 Testing: ${test.name}`);
  console.log(`   Prompt: "${test.prompt || 'default'}"`);

  const url = `${BASE_URL}/api/ai/recommend`;
  const body = {
    prompt: test.prompt,
    visual: test.visual || 'atlas',
  };

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.log(`   ❌ Failed: HTTP ${response.status}`);
      const errorText = await response.text();
      console.log(`   Error: ${errorText.slice(0, 200)}`);
      return false;
    }

    const data = await response.json();
    const descriptor = data.descriptor;

    if (!descriptor) {
      console.log('   ❌ Failed: No descriptor in response');
      return false;
    }

    console.log(`   ✅ Success (${duration}ms)`);
    console.log(`   Visual: ${descriptor.visual}`);
    console.log(`   Mood: ${descriptor.mood || 'N/A'}`);
    console.log(`   Stations: ${descriptor.stations?.length || 0}`);
    console.log(`   Reason: ${descriptor.reason?.slice(0, 60) || 'N/A'}...`);

    if (descriptor.stations && descriptor.stations.length > 0) {
      console.log('\n   📻 Stations:');
      descriptor.stations.slice(0, 3).forEach((station, idx) => {
        const tags = station.tagList?.join(', ') || 'none';
        console.log(`      ${idx + 1}. ${station.name} (${station.country})`);
        console.log(`         Tags: ${tags}`);
        console.log(`         Bitrate: ${station.bitrate} kbps`);
      });
      
      if (descriptor.stations.length > 3) {
        console.log(`      ... and ${descriptor.stations.length - 3} more`);
      }
    }

    // Validation
    const issues = [];
    
    if (!descriptor.stations || descriptor.stations.length < 3) {
      issues.push('Too few stations (expected at least 3)');
    }

    if (test.expectedCountries && descriptor.stations) {
      const countries = new Set(descriptor.stations.map(s => s.country?.toLowerCase()));
      const hasExpectedCountry = test.expectedCountries.some(expected => 
        [...countries].some(country => country?.includes(expected.toLowerCase()))
      );
      if (!hasExpectedCountry) {
        issues.push(`Expected countries not found: ${test.expectedCountries.join(', ')}`);
      }
    }

    if (test.expectedTags && descriptor.stations) {
      const allTags = new Set();
      descriptor.stations.forEach(station => {
        station.tagList?.forEach(tag => allTags.add(tag.toLowerCase()));
      });
      const hasExpectedTag = test.expectedTags.some(expected =>
        [...allTags].some(tag => tag.includes(expected.toLowerCase()))
      );
      if (!hasExpectedTag) {
        issues.push(`Expected tags not found: ${test.expectedTags.join(', ')}`);
      }
    }

    if (issues.length > 0) {
      console.log('\n   ⚠️  Validation Issues:');
      issues.forEach(issue => console.log(`      - ${issue}`));
    }

    return issues.length === 0;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 AI Atlas Integration Test Suite');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log('=' .repeat(60));

  // Wait for server to be ready
  console.log('\n⏳ Waiting for server...');
  let serverReady = false;
  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) {
        serverReady = true;
        console.log('✅ Server is ready\n');
        break;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!serverReady) {
    console.log('❌ Server not ready. Please start with: npm run dev');
    process.exit(1);
  }

  const results = [];
  for (const test of TEST_PROMPTS) {
    const success = await testPrompt(test);
    results.push({ test: test.name, success });
    
    // Rate limiting - wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.test}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Review output above.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
