// Super simple debug - just check basic page structure
console.log('🚀 BASIC PAGE CHECK');
console.log('URL:', window.location.href);
console.log('Title:', document.title);
console.log('Body has children:', document.body.children.length > 0);
console.log('React root exists:', !!document.getElementById('root'));

// Check for any headings
const headings = document.querySelectorAll('h1, h2, h3, h4');
console.log('Headings found:', headings.length);
headings.forEach((h, i) => {
  console.log(`H${h.tagName[1]}:`, h.textContent.substring(0, 50));
});

// Check for any buttons
const buttons = document.querySelectorAll('button');
console.log('Buttons found:', buttons.length);
buttons.forEach((btn, i) => {
  console.log(`Button ${i}:`, btn.textContent.trim());
});

// Check for any forms
const forms = document.querySelectorAll('form');
console.log('Forms found:', forms.length);

// Check for any textareas
const textareas = document.querySelectorAll('textarea');
console.log('Textareas found:', textareas.length);

// Check for any selects
const selects = document.querySelectorAll('select');
console.log('Select dropdowns found:', selects.length);

// Check if page has any content
const allText = document.body.textContent;
console.log('Page has text content:', allText.length > 100);
console.log('Sample text:', allText.substring(0, 200));