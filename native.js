// 原生壳桥接(仅在 Capacitor iOS 壳内生效;纯网页/PWA 下全程 no-op,不影响现有行为)。
// 职责:
//   ① 原生环境跳过 Service Worker 注册(WKWebView 里 SW 常致首屏白屏,是 Apple 高频拒因;
//      原生壳的静态资源本就打包在本地,不需要 SW)——实际拦截在 index.html 的注册处。
//   ② 「重点日」→ 系统级本地通知(iOS 上 PWA 推送不可靠,原生 LocalNotifications 才稳),
//      与现有 .ics 导出互补:当天上午 9 点提醒。
(function () {
  'use strict';
  var Cap = window.Capacitor;
  var isNative = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());
  window.__IS_NATIVE = isNative;
  if (!isNative) return; // 网页/PWA:什么都不做

  function LN() { return (window.Capacitor && window.Capacitor.Plugins) ? window.Capacitor.Plugins.LocalNotifications : null; }
  // 由 mark.id 稳定派生一个 32 位内正整数通知 id(同一重点日重排时覆盖而非重复)
  function nid(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return Math.abs(h) % 2000000000 || 1; }

  // 重点日的「下一次发生」当天 9:00(repeat 取今年/明年最近一次,与 MARKS.daysTo 同口径)
  function nextAt(m) {
    var now = new Date();
    var dt;
    if (m.repeat) {
      var md = String(m.date).slice(5).split('-');
      dt = new Date(now.getFullYear(), (+md[0]) - 1, +md[1], 9, 0, 0);
      if (dt < now) dt = new Date(now.getFullYear() + 1, (+md[0]) - 1, +md[1], 9, 0, 0);
    } else {
      var p = String(m.date).split('-');
      dt = new Date(+p[0], (+p[1]) - 1, +p[2], 9, 0, 0);
    }
    return dt;
  }

  function scheduleAll(ln) {
    var marks = (window.MARKS && window.MARKS.all) ? window.MARKS.all() : [];
    var now = new Date();
    var list = [];
    marks.forEach(function (m) {
      var at = nextAt(m);
      if (!at || at < now) return;
      list.push({
        id: nid(m.id),
        title: '顺时黄历',
        body: '今天是你记的重点日：' + (m.name || ''),
        schedule: { at: at, allowWhileIdle: true }
      });
    });
    if (list.length) ln.schedule({ notifications: list.slice(0, 60) }).catch(function () {});
  }

  function reschedule() {
    var ln = LN(); if (!ln) return;
    ln.requestPermissions().then(function () {
      // 先撤已排的(避免删了重点日后旧通知还响),再全量重排
      ln.getPending().then(function (res) {
        var ids = ((res && res.notifications) || []).map(function (n) { return { id: n.id }; });
        var clear = ids.length ? ln.cancel({ notifications: ids }) : Promise.resolve();
        clear.then(function () { scheduleAll(ln); }).catch(function () { scheduleAll(ln); });
      }).catch(function () { scheduleAll(ln); });
    }).catch(function () {});
  }

  // 等 MARKS(index.html 内)就绪后首次排 + 订阅其变化(增删重点日即重排)
  var tries = 0;
  function init() {
    if (!window.MARKS) { if (tries++ < 40) setTimeout(init, 300); return; }
    reschedule();
    if (window.MARKS.onChange) window.MARKS.onChange(reschedule);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
