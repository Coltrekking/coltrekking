function openTab(tabId, event) {
  const contents = document.querySelectorAll('.tab-content');
  const buttons = document.querySelectorAll('.tab-button');

  contents.forEach(c => c.classList.remove('active'));
  buttons.forEach(b => b.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  event.currentTarget.classList.add('active');
}