const { Notification, dialog } = require('electron');
const path = require('path');

class Tools {
  constructor() {}

  // alert 弹窗
  static dialog(
    win,
    {
      type = 'info',
      title = '消息',
      message = '',
      detail = '',
      buttons = ['确定'],
    }
  ) {
    return dialog.showMessageBox(win, {
      type,
      title,
      message,
      detail,
      buttons,
    });
  }

  // 发送通知方法
  static showNotification({ title, body }) {
    if (!title && !body) {
      return;
    }
    new Notification({
      title,
      body,
    }).show();
  }

  // 判断是否是音频文件
  static isAudio(fileName = '') {
    const all = [
      'avi',
      'wmv',
      'mpg',
      'mpeg',
      'mov',
      'rm',
      'ram',
      'swf',
      'flv',
      'mp4',
      'mp3',
      'wma',
      'avi',
      'rm',
      'rmvb',
      'flv',
      'mpg',
      'mkv',
      'flac',
    ];

    const suffix = fileName.split('.').pop();
    return all.includes(suffix);
  }
}

module.exports = Tools;