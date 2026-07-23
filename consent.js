// ===========================================================================
// consent.js · 首次启动·单独同意弹窗（PIPL 合规）
//   在 localStorage 无 shihe_consent 时注入一个阻断式遮罩，要求用户在使用前
//   明示同意《隐私政策》与《用户协议》，并对出生日期/时间等敏感个人信息的
//   本机处理单独取得同意。同意后写入 {v,ts} 并移除遮罩。
//   用法：在 index.html 与 onboarding.html 中 <script src="consent.js"></script>
//   —— 自包含、硬编码配色（不依赖各页面 CSS 变量），确保跨页面一致。
// ===========================================================================
(function () {
  'use strict';
  var KEY = 'shihe_consent', VER = '1.0';

  var agreed = false;
  try { agreed = !!localStorage.getItem(KEY); } catch (e) { agreed = false; }
  if (agreed) return;

  var CSS =
    '.shc-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;' +
    'justify-content:center;padding:22px;background:rgba(6,6,7,.88);' +
    '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);' +
    'font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","HarmonyOS Sans SC","Source Han Sans SC","Noto Sans CJK SC","Microsoft YaHei",system-ui,sans-serif;' +
    'font-weight:300;line-height:1.8;-webkit-font-smoothing:antialiased;' +
    'animation:shc-fade .28s ease both;}' +
    '@keyframes shc-fade{from{opacity:0}to{opacity:1}}' +
    '@keyframes shc-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
    '.shc-card{width:100%;max-width:380px;max-height:88vh;overflow-y:auto;-webkit-overflow-scrolling:touch;' +
    'background:#17161A;border:1px solid #33323A;border-radius:18px;padding:24px 22px 20px;' +
    'box-shadow:0 24px 60px -20px rgba(0,0,0,.7);animation:shc-rise .34s cubic-bezier(.2,.7,.2,1) both;}' +
    '.shc-seal{width:44px;height:44px;border-radius:12px;margin:0 auto 14px;display:flex;align-items:center;' +
    'justify-content:center;font-family:"Songti SC","STSong","Source Han Serif SC",Georgia,serif;font-size:22px;' +
    'color:#231A0C;background:linear-gradient(135deg,#E6CF9E,#C8AC78);box-shadow:0 8px 22px -8px rgba(205,168,98,.55);}' +
    '.shc-title{font-family:"Songti SC","STSong","Source Han Serif SC",Georgia,serif;font-size:20px;font-weight:500;' +
    'letter-spacing:1.5px;color:#F1EDE6;text-align:center;margin-bottom:14px;}' +
    '.shc-body{font-size:13.5px;color:#C2BDB3;}' +
    '.shc-body p{margin:9px 0;}' +
    '.shc-body b{color:#E6CF9E;font-weight:500;}' +
    '.shc-note-box{background:#201C14;border:1px solid #4A4028;border-radius:11px;padding:12px 14px;margin:12px 0;font-size:12.5px;color:#C2BDB3;}' +
    '.shc-links{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:14px 0 4px;font-size:13px;}' +
    '.shc-links a{color:#E6CF9E;text-decoration:none;border-bottom:1px solid #4A4028;padding-bottom:1px;}' +
    '.shc-links a:active{opacity:.6;}' +
    '.shc-acts{margin-top:16px;display:flex;flex-direction:column;gap:10px;}' +
    '.shc-btn{border:0;border-radius:12px;padding:13px 16px;font-size:15px;font-weight:500;cursor:pointer;' +
    'font-family:inherit;letter-spacing:1px;transition:opacity .15s,transform .1s;}' +
    '.shc-btn:active{transform:scale(.985);}' +
    '.shc-primary{color:#231A0C;background:linear-gradient(135deg,#E6CF9E,#C8AC78);box-shadow:0 8px 22px -10px rgba(205,168,98,.6);}' +
    '.shc-ghost{color:#948F86;background:transparent;border:1px solid #33323A;font-weight:400;font-size:14px;}' +
    '.shc-deny-note{display:none;margin-top:12px;text-align:center;font-size:12.5px;color:#C89A6E;line-height:1.7;}';

  var HTML =
    '<div class="shc-card" role="dialog" aria-modal="true" aria-label="使用前必读">' +
      '<div class="shc-seal">时</div>' +
      '<div class="shc-title">使用前必读</div>' +
      '<div class="shc-body">' +
        '<p>欢迎使用「顺时黄历」。开始前，请你阅读并同意我们的' +
        '《隐私政策》与《用户协议》。</p>' +
        '<div class="shc-note-box">' +
          '<p style="margin:0 0 6px"><b>关于你的信息</b></p>' +
          '你输入的出生日期、出生时间、出生地与性别，仅用于在<b>你的设备本地</b>推算，' +
          '<b>不上传服务器、不对外共享</b>。其中出生日期、出生时间属敏感个人信息，需经你' +
          '<b>单独同意</b>后方在本机处理。' +
        '</div>' +
        '<div class="shc-note-box">' +
          '<p style="margin:0 0 6px"><b>关于内容性质</b></p>' +
          '黄历宜忌、节气时令、个人节律等内容，是<b>传统历法与民俗文化的整理</b>，全部按公开历法规则在你的设备本机计算，' +
          '<b>不构成医疗、健康、投资、婚恋、法律等专业建议，也不承诺任何结果</b>。本应用不提供算命、占卜或任何有偿测算服务。' +
        '</div>' +
        '<div class="shc-links">' +
          '<a href="./privacy.html">《隐私政策》</a>' +
          '<a href="./terms.html">《用户协议》</a>' +
        '</div>' +
      '</div>' +
      '<div class="shc-acts">' +
        '<button class="shc-btn shc-primary" id="shc-agree">同意并开始</button>' +
        '<button class="shc-btn shc-ghost" id="shc-deny">暂不同意</button>' +
      '</div>' +
      '<div class="shc-deny-note" id="shc-deny-note">需同意上述条款后方可使用本应用。<br>你可关闭页面，或在阅读后点击「同意并开始」。</div>' +
    '</div>';

  function mount() {
    if (document.getElementById('shc-root')) return;

    var st = document.createElement('style');
    st.id = 'shc-style';
    st.textContent = CSS;
    document.head.appendChild(st);

    var root = document.createElement('div');
    root.id = 'shc-root';
    root.className = 'shc-overlay';
    root.innerHTML = HTML;
    document.body.appendChild(root);

    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function dismiss() {
      try { document.body.style.overflow = prevOverflow; } catch (e) {}
      if (root.parentNode) root.parentNode.removeChild(root);
      if (st.parentNode) st.parentNode.removeChild(st);
    }

    root.querySelector('#shc-agree').addEventListener('click', function () {
      try { localStorage.setItem(KEY, JSON.stringify({ v: VER, ts: Date.now() })); } catch (e) {}
      dismiss();
    });
    root.querySelector('#shc-deny').addEventListener('click', function () {
      var n = root.querySelector('#shc-deny-note');
      if (n) n.style.display = 'block';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
