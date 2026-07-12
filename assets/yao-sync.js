// ==========================================
// 爻一爻 小程序↔H5 数据同步
// ==========================================
(function() {
  'use strict';

  var PROFILE_KEY = 'yaoyiyao_profile';

  function saveProfile(p) {
    if (p && p.name) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
      return true;
    }
    return false;
  }

  function getProfile() {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY));
    } catch (e) {
      return null;
    }
  }

  function postToMini(data) {
    if (typeof wx !== 'undefined' && wx.miniProgram && wx.miniProgram.postMessage) {
      wx.miniProgram.postMessage({ data: data });
    }
  }

  function readUrlProfile() {
    var s = window.location.search;
    if (!s) return null;
    var p = {};
    s.substring(1).split('&').forEach(function(kv) {
      var a = kv.split('=');
      if (a.length === 2) p[decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
    });
    if (!p.name) return null;
    return {
      name: p.name || '',
      gender: p.gender || '',
      birthDate: p.birthDate || '',
      birthHour: parseInt(p.birthHour) || 0,
      birthplace: p.birthplace || ''
    };
  }

  window.YaoProfile = {
    get: getProfile,
    has: function() { return !!getProfile(); },
    save: function(p) {
      saveProfile(p);
      postToMini({ type: 'saveProfile', profile: p });
    },
    request: function() {
      postToMini({ type: 'getProfile' });
    }
  };

  var urlProfile = readUrlProfile();
  if (urlProfile) {
    saveProfile(urlProfile);
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  if (!getProfile()) {
    setTimeout(function() {
      postToMini({ type: 'getProfile' });
    }, 800);
  }

  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el) return;
    var href = el.getAttribute('href') || '';
    if (href.indexOf('/profile') !== -1 || href.indexOf('/setup') !== -1) {
      e.preventDefault();
      e.stopPropagation();
      var p = getProfile();
      if (p) {
        alert('档案信息：\n' + p.name + ' ' + p.gender + ' ' + p.birthDate);
      } else {
        postToMini({ type: 'getProfile' });
      }
      return false;
    }
  }, true);
})();
