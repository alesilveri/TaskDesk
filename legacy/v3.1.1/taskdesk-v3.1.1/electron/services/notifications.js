const { Notification } = require('electron');

function showNotification({ title, body, icon }) {
  if (!Notification.isSupported()) return false;
  const notification = new Notification({
    title: title || 'TaskDesk',
    body: body || '',
    icon,
  });
  notification.show();
  return true;
}

module.exports = {
  showNotification,
};

