// Run this in the browser console to debug localStorage
console.log('=== localStorage Debug ===');
console.log('All sola keys:');
Object.keys(localStorage).filter(key => key.startsWith('sola-')).forEach(key => {
  console.log(`${key}:`, localStorage.getItem(key));
});

console.log('\n=== Global Data ===');
const globalData = localStorage.getItem('sola-global-data');
console.log('sola-global-data:', globalData ? JSON.parse(globalData) : 'NOT FOUND');

console.log('\n=== System Users ===');
const systemUsers = localStorage.getItem('sola-system-users');
console.log('sola-system-users:', systemUsers ? JSON.parse(systemUsers) : 'NOT FOUND');

console.log('\n=== Current User ===');
const currentUser = localStorage.getItem('sola-current-user');
console.log('sola-current-user:', currentUser || 'NOT FOUND');
