import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Try to load from multiple possible .env locations
const possiblePaths = [
  '.env',
  '../.env', 
  '../../.env',
  '../../../.env'
];

console.log("Searching for .env files...");
for (const envPath of possiblePaths) {
  const fullPath = path.resolve(__dirname, envPath);
  if (fs.existsSync(fullPath)) {
    console.log(`Found .env at: ${fullPath}`);
    dotenv.config({ path: fullPath });
  }
}

async function testAnthropicKey() {
  console.log("\nTesting Anthropic API key...\n");
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY is not set in environment variables");
    console.log("\nTo set your API key, either:");
    console.log("1. Create a .env file with: ANTHROPIC_API_KEY=your-key-here");
    console.log("2. Or run: export ANTHROPIC_API_KEY=your-key-here");
    process.exit(1);
  }
  
  console.log(`✓ API key found (starts with: ${apiKey.substring(0, 10)}...)`);
  
  try {
    // Make a simple completion request
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: "Say 'test successful'"
          }
        ]
      })
    });
    
    if (response.ok) {
      const data = await response.json() as any;
      console.log("✅ Anthropic API key is working!");
      console.log("Response:", data.content[0].text);
      console.log("\nKey details:");
      console.log("- Status: Active");
      console.log("- Model tested: claude-3-haiku-20240307");
    } else {
      const error = await response.text();
      console.error("❌ API key test failed");
      console.error("Status:", response.status);
      console.error("Error:", error);
    }
  } catch (error) {
    console.error("❌ Failed to connect to Anthropic API");
    console.error("Error:", error);
  }
}

testAnthropicKey();