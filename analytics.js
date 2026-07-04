/* 时和 · 轻量埋点 beacon —— 隐私优先,默认关闭
 * ---------------------------------------------------------------------------
 * 设计原则(与「数据本机计算·绝不上传」承诺一致):
 *   1) 默认完全静默:未配置 window.SHIHE_ANALYTICS_URL 时,track() 是空操作,
 *      一个字节都不会发出。线上要不要开,由你在 index.html 里一行配置决定。
 *   2) 只上报「运营/业务」事件:匿名设备ID、平台、版本、事件类型。
 *   3) 绝不上报出生年月日时、八字、测算内容。出生「年份」与性别属于敏感项,
 *      仅当你额外打开 window.SHIHE_ANALYTICS_PROFILE = true 时才会上报(且只报年份,
 *      用于粗粒度年龄段,绝不含月/日/时)。
 *
 * 用法:
 *   <script>
 *     window.SHIHE_ANALYTICS_URL = 'https://你的后台域名/api/collect'; // 不配=不采集
 *     window.SHIHE_APP_VERSION   = '1.1.0';        // 可选
 *     // window.SHIHE_ANALYTICS_PROFILE = true;    // 可选:额外上报粗粒度性别+出生年
 *   </script>
 *   <script src="analytics.js"></script>
 *   然后在业务代码里:  window.shihe.track('report_open', { tab:'natal' });
 * ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var URL_ = (typeof window !== 'undefined' && window.SHIHE_ANALYTICS_URL) || '';

  // 未配置上报地址 → 提供空壳 API,全程零网络、零副作用。
  if (!URL_) {
    window.shihe = { track: function () {}, enabled: false };
    return;
  }

  var VER = String(window.SHIHE_APP_VERSION || '1.0.0').slice(0, 24);

  // —— 匿名设备标识(仅本地随机串,非账号、非设备指纹)——
  var UID_KEY = 'shihe_uid';
  function getUid() {
    try {
      var v = localStorage.getItem(UID_KEY);
      if (!v) {
        v = 'dev_' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
        localStorage.setItem(UID_KEY, v);
      }
      return v;
    } catch (e) { return 'dev_anon'; }
  }
  var UID = getUid();

  // —— 平台识别(与后端 platformFromUA 对齐)——
  function detectPlatform() {
    var ua = (navigator && navigator.userAgent) || '';
    if (/MicroMessenger/i.test(ua)) return 'wechat';
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    return 'web';
  }
  var PLAT = detectPlatform();

  // —— 字段白名单:只放行运营字段,从源头杜绝把敏感数据带出去 ——
  var ALLOW = ['tier', 'orderId', 'channel', 'tab', 'tool', 'upgrade', 'plan', 'source', 'v'];
  function sanitize(type, meta) {
    var out = {};
    if (meta && typeof meta === 'object') {
      for (var k in meta) {
        if (Object.prototype.hasOwnProperty.call(meta, k) && ALLOW.indexOf(k) >= 0) out[k] = meta[k];
      }
      // 性别 + 出生「年」:敏感,双重开关,且永远不含月/日/时。
      if (type === 'onboard_complete' && window.SHIHE_ANALYTICS_PROFILE) {
        if (meta.gender === '男' || meta.gender === '女') out.gender = meta.gender;
        var y = Number(meta.birthYear);
        if (y >= 1900 && y <= 2100) out.birthYear = y;
      }
    }
    return out;
  }

  // —— 发送(批量 + sendBeacon 优先,失败回退 fetch keepalive)——
  // 关键:跨域上报必须用 CORS「简单请求」内容类型(text/plain)。
  //   若用 application/json,浏览器需先发 OPTIONS 预检;而 sendBeacon 无法预检,
  //   会「返回 true(已入队)却被静默丢弃」,导致线上看似在跑、实则一条都收不到。
  //   后端按原始文本 JSON.parse、不校验 Content-Type,故 text/plain 完全兼容。
  function post(events) {
    if (!events.length) return;
    var body = JSON.stringify({ events: events });
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
        if (navigator.sendBeacon(URL_, blob)) return;
      }
    } catch (e) { /* fall through */ }
    try {
      fetch(URL_, {
        method: 'POST', body: body, keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        mode: 'cors', credentials: 'omit',
      }).catch(function () {});
    } catch (e) { /* 静默失败:埋点绝不影响主应用 */ }
  }

  var queue = [];
  var timer = null;
  function schedule() { if (!timer) timer = setTimeout(flush, 1500); }
  function flush() {
    timer = null;
    if (!queue.length) return;
    post(queue.splice(0, 20));
    if (queue.length) schedule();
  }
  function flushNow() {
    if (timer) { clearTimeout(timer); timer = null; }
    while (queue.length) post(queue.splice(0, 20));
  }

  function track(type, meta) {
    if (!type) return;
    var ev = { uid: UID, type: String(type), ts: Date.now(), platform: PLAT, appVersion: VER };
    var m = sanitize(type, meta);
    for (var _ in m) { ev.meta = m; break; } // 仅在有字段时附 meta
    queue.push(ev);
    // 关键转化事件即时发送,其余批量
    if (type === 'pay_success' || type === 'order_created') flushNow(); else schedule();
  }

  // 页面隐藏/卸载时把残留事件冲刷出去
  function onHide() { if (document.visibilityState === 'hidden') flushNow(); }
  window.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', flushNow);

  window.shihe = { track: track, enabled: true, uid: UID, platform: PLAT };

  // 启动即记一次「打开」
  track('app_open', { v: VER });
})();
