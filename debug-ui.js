// Debug script to check what's actually rendered
console.log('🔍 DEBUGGING RENDERED CONTENT');

console.log('Current URL:', window.location.href);
console.log('Page title:', document.title);

// Check if we're on the right pages
if (window.location.pathname === '/') {
  console.log('📍 ON DASHBOARD PAGE');

  // Check for department selector
  const deptSelect = document.querySelector('select[name="selectedDept"]') || document.querySelector('select');
  if (deptSelect) {
    console.log('✅ Department selector found:', deptSelect);
    console.log('Options:', Array.from(deptSelect.options).map(opt => opt.text));
  } else {
    console.log('❌ Department selector NOT found');
  }

  // Check for department overview
  const deptOverview = document.querySelector('[class*="department-overview"]') ||
                      document.querySelector('h3');
  if (deptOverview && deptOverview.textContent.includes('Overview')) {
    console.log('✅ Department overview section found');
  } else {
    console.log('❌ Department overview section NOT found');
  }

} else if (window.location.pathname === '/risks/new') {
  console.log('📍 ON ADD RISK PAGE');

  // Check for Magic Risk Articulation
  const magicSection = document.querySelector('[class*="magic-risk"]') ||
                      document.querySelector('h3');
  if (magicSection && magicSection.textContent.includes('Magic')) {
    console.log('✅ Magic Risk Articulation section found');
  } else {
    console.log('❌ Magic Risk Articulation section NOT found');
  }

  // Check for risk context textarea
  const riskContext = document.getElementById('risk_context');
  if (riskContext) {
    console.log('✅ Risk context textarea found');
  } else {
    console.log('❌ Risk context textarea NOT found');
  }

  // Check for articulate button
  const articulateBtn = document.getElementById('articulate_risk');
  if (articulateBtn) {
    console.log('✅ Articulate risk button found');
  } else {
    console.log('❌ Articulate risk button NOT found');
  }

} else if (window.location.pathname === '/test') {
  console.log('📍 ON TEST PAGE');

  const testHeader = document.querySelector('h1');
  if (testHeader && testHeader.textContent.includes('Test Add Risk')) {
    console.log('✅ Test page header found');
  } else {
    console.log('❌ Test page header NOT found');
  }
}

console.log('🔍 PAGE STRUCTURE:');
console.log('Body children:', document.body.children.length);
console.log('Main content areas found:', document.querySelectorAll('main, [role="main"], .main-content').length);

// Check for any React root
const reactRoot = document.getElementById('root');
if (reactRoot) {
  console.log('✅ React root found, children:', reactRoot.children.length);
} else {
  console.log('❌ React root NOT found');
}