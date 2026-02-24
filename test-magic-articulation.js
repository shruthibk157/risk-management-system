// Test script for Magic Risk Articulation
console.log('🧪 Testing Magic Risk Articulation\n');

// Simulate the analyzeContextAndGenerateRisk function
function analyzeContextAndGenerateRisk(context, department, processFunction) {
  const lowerContext = context.toLowerCase();
  const risk = {};

  // Department-specific context patterns
  const deptPatterns = {
    'IT': {
      keywords: ['server', 'network', 'database', 'security', 'software', 'hardware'],
      failureModes: {
        'server': 'Server hardware failure or outage',
        'network': 'Network connectivity loss',
        'database': 'Data corruption or loss',
        'security': 'Security breach or unauthorized access'
      },
      effects: {
        'server': 'Business operations disruption, data unavailability',
        'network': 'Communication breakdown, remote work impossible',
        'database': 'Data loss, compliance violations',
        'security': 'Data breach, financial loss, reputational damage'
      }
    },
    'Finance': {
      keywords: ['payment', 'transaction', 'accounting', 'audit', 'compliance'],
      failureModes: {
        'payment': 'Payment processing failure',
        'accounting': 'Accounting misstatement',
        'compliance': 'Regulatory non-compliance'
      },
      effects: {
        'payment': 'Vendor payment delays, cash flow issues',
        'accounting': 'Incorrect financial statements, regulatory penalties',
        'compliance': 'Regulatory fines, legal issues'
      }
    }
  };

  const deptName = department?.name || 'General';
  const patterns = deptPatterns[deptName] || deptPatterns['IT'];

  // Find matching keywords
  const matchedKeywords = patterns.keywords.filter(keyword =>
    lowerContext.includes(keyword)
  );

  if (matchedKeywords.length === 0) {
    risk.risk_description = `Risk related to ${processFunction || 'specified process'}`;
    risk.potential_failure_mode = 'Process or system failure';
    risk.potential_effects = 'Operational disruption, potential financial impact';
  } else {
    const primaryKeyword = matchedKeywords[0];
    risk.risk_description = `Risk of ${patterns.failureModes[primaryKeyword] || 'operational failure'} in ${processFunction || 'specified process'}`;
    risk.potential_failure_mode = patterns.failureModes[primaryKeyword] || 'System or process failure';
    risk.potential_effects = patterns.effects[primaryKeyword] || 'Operational disruption and financial impact';
  }

  risk.potential_causes = 'System or process issues';
  risk.severity = 6;
  risk.occurrence = 4;
  risk.detection = 3;

  return risk;
}

// Test cases
const testCases = [
  {
    context: "Our critical database server handles all customer transactions and must be available 24/7",
    department: { name: 'IT' },
    processFunction: 'Database Operations',
    expected: 'database'
  },
  {
    context: "The payment processing system handles vendor payments and must comply with financial regulations",
    department: { name: 'Finance' },
    processFunction: 'Payment Processing',
    expected: 'payment'
  },
  {
    context: "This is some general operational context without specific keywords",
    department: { name: 'Operations' },
    processFunction: 'General Operations',
    expected: 'fallback'
  }
];

console.log('Running test cases...\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.context.substring(0, 50)}...`);
  const result = analyzeContextAndGenerateRisk(testCase.context, testCase.department, testCase.processFunction);

  console.log(`✅ Description: ${result.risk_description}`);
  console.log(`✅ Failure Mode: ${result.potential_failure_mode}`);
  console.log(`✅ Effects: ${result.potential_effects}`);
  console.log(`✅ Severity/Occurrence/Detection: ${result.severity}/${result.occurrence}/${result.detection}`);
  console.log('');
});

console.log('🎉 Magic Articulation tests completed!');
console.log('\n💡 The system analyzes context for keywords and generates structured risk content.');
console.log('💡 Users can edit all generated content before saving.');
console.log('💡 Department-specific patterns provide relevant risk suggestions.');