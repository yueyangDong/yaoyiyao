// 爻一爻 数据同步 — 小程序 ↔ H5
(function () {
  'use strict';

  var APP_USERS_KEY = 'fortune_app_users';
  var APP_CURRENT_KEY = 'fortune_app_current_user';

  // --- 从 URL 读小程序传来的档案 ---
  function readUrlProfile() {
    var s = window.location.search;
    if (!s) return null;
    var p = {};
    s.substring(1).split('&').forEach(function (kv) {
      var a = kv.split('=');
      if (a.length === 2) {
        p[decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
      }
    });
    if (!p.name && !p.birthDate) return null;

    var y = 1990, m = 1, d = 1;
    if (p.birthDate) {
      var parts = p.birthDate.split('-');
      if (parts.length === 3) {
        y = parseInt(parts[0]) || 1990;
        m = parseInt(parts[1]) || 1;
        d = parseInt(parts[2]) || 1;
      }
    }

    var province = '', city = '', district = '';
    if (p.birthplace) {
      var bp = p.birthplace.split(' ');
      province = bp[0] || '';
      city = bp[1] || '';
      district = bp[2] || '';
    }

    return {
      name: p.name || '用户',
      gender: p.gender === '女' ? '女' : '男',
      birthYear: y,
      birthMonth: m,
      birthDay: d,
      birthHour: parseInt(p.birthHour) || 0,
      birthMinute: 0,
      province: province,
      city: city,
      district: district,
    };
  }

  // --- 查找已有用户（按姓名+出生日期匹配） ---
  function findExistingUser(profile) {
    try {
      var users = JSON.parse(localStorage.getItem(APP_USERS_KEY) || '[]');
      for (var i = 0; i < users.length; i++) {
        var u = users[i];
        if (u.name === profile.name &&
            u.birthYear === profile.birthYear &&
            u.birthMonth === profile.birthMonth &&
            u.birthDay === profile.birthDay) {
          return u;
        }
      }
    } catch (e) {}
    return null;
  }

  // --- 保存到 React App 的 localStorage 格式 ---
  function saveToApp(profile) {
    var existing = findExistingUser(profile);
    var userId, storedUser, now = new Date().toISOString();

    if (existing) {
      userId = existing.id;
      storedUser = existing;
      // 更新可能变化的字段
      storedUser.birthHour = profile.birthHour;
      storedUser.birthMinute = profile.birthMinute;
      storedUser.birthplace.province = profile.province;
      storedUser.birthplace.city = profile.city;
      storedUser.birthplace.district = profile.district;
      storedUser.updatedAt = now;
    } else {
      userId = 'mp_' + Date.now();
      storedUser = {
        id: userId,
        name: profile.name,
        gender: profile.gender,
        birthYear: profile.birthYear,
        birthMonth: profile.birthMonth,
        birthDay: profile.birthDay,
        birthHour: profile.birthHour,
        birthMinute: profile.birthMinute,
        birthplace: {
          province: profile.province,
          city: profile.city,
          district: profile.district,
          longitude: 120,
        },
        birthCalendar: 'solar',
        isLeapMonth: false,
        createdAt: now,
        updatedAt: now,
      };
    }

    // 构建用户列表：匹配的用户置顶
    var users = [storedUser];
    try {
      var all = JSON.parse(localStorage.getItem(APP_USERS_KEY) || '[]');
      for (var i = 0; i < all.length; i++) {
        if (all[i].id !== userId) {
          users.push(all[i]);
        }
      }
    } catch (e) {}

    localStorage.setItem(APP_USERS_KEY, JSON.stringify(users));
    localStorage.setItem(APP_CURRENT_KEY, userId);
  }

  // --- 检查 React App 是否有档案 ---
  function appHasProfile() {
    var currentId = localStorage.getItem(APP_CURRENT_KEY);
    if (!currentId) {
      try {
        var users = JSON.parse(localStorage.getItem(APP_USERS_KEY) || '[]');
        if (users.length > 0) {
          localStorage.setItem(APP_CURRENT_KEY, users[0].id);
          return true;
        }
      } catch (e) {}
      return false;
    }
    return true;
  }

  // --- 跟小程序通信 ---
  function postToMini(data) {
    if (typeof wx !== 'undefined' && wx.miniProgram && wx.miniProgram.postMessage) {
      wx.miniProgram.postMessage({ data: data });
    }
  }

  // --- 全局 API ---
  window.YaoProfile = {
    has: function () { return appHasProfile(); },
    request: function () { postToMini({ type: 'getProfile' }); },
    save: function (p) {
      saveToApp(p);
      postToMini({ type: 'saveProfile', profile: p });
    }
  };

  // --- 页面加载时处理 ---
  var urlProfile = readUrlProfile();
  if (urlProfile) {
    saveToApp(urlProfile);
    if (window.history && window.history.replaceState) {
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {}
    }
  }

  // 如果没有档案，等一会儿向小程序请求
  if (!appHasProfile()) {
    setTimeout(function () {
      postToMini({ type: 'getProfile' });
    }, 1000);
  }
})();
