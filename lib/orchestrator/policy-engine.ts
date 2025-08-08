import { PolicyMatrix, PolicyRule } from './types';
import { db } from '@/lib/db';
// import { policyViolations } from '@/lib/db/orchestration-schema'; // Removed - no policy checks

class PolicyEngine {
  private policyMatrix: PolicyMatrix = {
    privacy: [
      { pattern: /harvest.*real\s+personal\s+(data|information)/i, action: 'block', message: 'Real personal data harvesting is not allowed' },
      { pattern: /track\s+real\s+(user|person|individual)/i, action: 'block', message: 'Tracking real people is not permitted' },
      { pattern: /spy|surveillance.*real\s+people/i, action: 'block', message: 'Real surveillance activities are prohibited' },
      { pattern: /real\s+password|actual\s+credential/i, action: 'warn', message: 'Handle real credentials with care' },
    ],
    
    self_harm: [
      { pattern: /suicide\s+instructions|how\s+to\s+kill\s+yourself/i, action: 'block', message: 'Self-harm instructions are not allowed' },
      { pattern: /instructions.*self[\s-]harm/i, action: 'block', message: 'Self-harm instructions are not allowed' },
    ],
    
    illicit: [
      { pattern: /how\s+to\s+(hack|crack)\s+into/i, action: 'block', message: 'Hacking instructions are illegal' },
      { pattern: /commit\s+fraud|scam\s+people/i, action: 'block', message: 'Fraud instructions are prohibited' },
      { pattern: /make\s+(bomb|explosive|weapon)/i, action: 'block', message: 'Weapon creation instructions are illegal' },
      { pattern: /sell\s+(drugs|narcotics)/i, action: 'block', message: 'Drug trafficking is illegal' },
    ],
    
    pii: [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, action: 'block', message: 'SSN detected - PII protection enforced' },
      { pattern: /\b[A-Z]{2}\d{6,8}\b/, action: 'warn', message: 'Possible passport number detected' },
      { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, action: 'warn', message: 'Credit card pattern detected' },
      { pattern: /(home|residential)\s+address/i, action: 'warn', message: 'Be careful with residential addresses' },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, action: 'warn', message: 'Email addresses detected' },
    ]
  };

  async checkContent(content: string, userId?: string, runId?: string): Promise<{
    allowed: boolean;
    violations: Array<{
      category: string;
      rule: string;
      action: string;
    }>;
    reason?: string;
  }> {
    const violations: Array<{
      category: string;
      rule: string;
      action: string;
    }> = [];
    
    let blocked = false;
    let blockReason = '';

    // Check each policy category
    for (const [category, rules] of Object.entries(this.policyMatrix)) {
      for (const rule of rules) {
        const pattern = typeof rule.pattern === 'string' 
          ? new RegExp(rule.pattern, 'i') 
          : rule.pattern;
        
        if (pattern.test(content)) {
          violations.push({
            category,
            rule: rule.pattern.toString(),
            action: rule.action
          });

          if (rule.action === 'block') {
            blocked = true;
            blockReason = rule.message || `Policy violation: ${category}`;
            
            // Log to database if user and run IDs provided
            if (userId && runId) {
              await this.logViolation(
                runId,
                userId,
                category,
                content,
                true
              );
            }
          }
        }
      }
    }

    return {
      allowed: !blocked,
      violations,
      reason: blocked ? blockReason : undefined
    };
  }

  async checkUrl(url: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    // Basic URL validation
    try {
      const parsed = new URL(url);
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /phishing/i,
        /malware/i,
        /virus/i,
        /\.exe$/i,
        /\.dll$/i,
        /\.bat$/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(parsed.href)) {
          return {
            allowed: false,
            reason: 'URL contains suspicious patterns'
          };
        }
      }

      // Check for private/internal URLs
      const privatePatterns = [
        /^https?:\/\/localhost/i,
        /^https?:\/\/127\.0\.0\.1/i,
        /^https?:\/\/192\.168\./i,
        /^https?:\/\/10\./i,
        /^https?:\/\/172\.(1[6-9]|2[0-9]|3[01])\./i,
      ];

      for (const pattern of privatePatterns) {
        if (pattern.test(parsed.href)) {
          return {
            allowed: false,
            reason: 'Private or internal URLs are not allowed'
          };
        }
      }

      return { allowed: true };
      
    } catch (error) {
      return {
        allowed: false,
        reason: 'Invalid URL format'
      };
    }
  }

  private async logViolation(
    runId: string,
    userId: string,
    violationType: string,
    content: string,
    wasBlocked: boolean
  ) {
    // Policy logging disabled - no policy checks
    // try {
    //   await db.insert(policyViolations).values({
    //     runId,
    //     userId,
    //     violationType,
    //     content: content.substring(0, 500), // Truncate for storage
    //     wasBlocked,
    //     context: {
    //       timestamp: new Date().toISOString(),
    //       action: wasBlocked ? 'blocked' : 'warned'
    //     }
    //   });
    // } catch (error) {
    //   console.error('Failed to log policy violation:', error);
    // }
  }

  // Allow adding custom rules at runtime
  addRule(category: keyof PolicyMatrix, rule: PolicyRule) {
    this.policyMatrix[category].push(rule);
  }

  // Export current policy matrix for inspection
  exportPolicyMatrix(): PolicyMatrix {
    return JSON.parse(JSON.stringify(this.policyMatrix));
  }
}

export const policyEngine = new PolicyEngine();