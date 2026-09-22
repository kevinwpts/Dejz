
export function clearDemoData() {
  localStorage.removeItem('dejz_demo_session');
  localStorage.removeItem('demo_settings');
  localStorage.removeItem('demo_transactions');
  localStorage.removeItem('demo_incomes');
  localStorage.removeItem('demo_fixed');
  localStorage.removeItem('demo_accounts');
  localStorage.removeItem('demo_profile');
  localStorage.removeItem('demo_savings_pot');
  localStorage.removeItem('demo_total_saved_lifetime');
  localStorage.removeItem('demo_data_version');
  // Add any other demo-related keys here
}

export function isDemoMode() {
  return !!localStorage.getItem('dejz_demo_session');
}
