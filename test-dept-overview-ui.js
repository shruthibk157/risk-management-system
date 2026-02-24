// Test department overview implementation
console.log('🔍 TESTING DEPARTMENT OVERVIEW IMPLEMENTATION');

// Check if department overview element exists
const deptOverviewEl = document.getElementById('department-overview');
if (deptOverviewEl) {
  console.log('✅ Department overview element found in DOM');
  console.log('Element content:', deptOverviewEl.textContent);
} else {
  console.log('❌ Department overview element NOT found in DOM');
}

// Check current URL
console.log('Current URL:', window.location.href);

// Check if user is logged in
console.log('User logged in:', !!window.localStorage.getItem('token'));

// Check React root
const reactRoot = document.getElementById('root');
if (reactRoot) {
  console.log('✅ React root exists');
  console.log('React root children:', reactRoot.children.length);
} else {
  console.log('❌ React root NOT found');
}

// Check for any error messages
const errors = document.querySelectorAll('.error, [style*="color: #ef4444"]');
console.log('Error elements found:', errors.length);

// Check for loading states
const loadingEls = document.querySelectorAll('[class*="loading"], [class*="Loading"]');
console.log('Loading elements found:', loadingEls.length);

console.log('🎯 If department overview element is found, the implementation is working!');
console.log('🎯 If NOT found, there may be a React rendering issue.');