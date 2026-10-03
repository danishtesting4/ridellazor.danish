// Discord presence via the Lanyard API (https://lanyard.live).
//
// initLanyard(el, discordId, fallbackName) renders a status line — a colored
// dot, the discord avatar, username, and current activity into el. It fetches
// https://api.lanyard.live, whose responses carry Access-Control-Allow-Origin: *,
// so this works from the browser on GitHub Pages with no proxy.
//
// Loaded by both the home page (script.js) and profile pages (term.js), which
// previously each carried a copy of this logic.

(function (global) {
  'use strict';

  const API = 'https://api.lanyard.live/v1/users/';
  const STATUS_COLOR = { online: '#2db544', idle: '#b3ad30', dnd: '#b0413e', offline: '#8a8578' };
  const ACTIVITY_ICON = { LISTENING: '🎧', STREAMING: '📺', PLAYING: '🎮', WATCHING: '📺', COMPETING: '🏆' };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function render(el, discordId, fallbackName) {
    if (!el) return;
    if (!discordId) {
      el.textContent = 'no discord id';
      return;
    }

    el.innerHTML = '<span class="muted">discord: checking…</span>';

    fetch(API + discordId)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const player = data && data.data;
        if (!player) {
          el.textContent = 'discord: presence unavailable';
          return;
        }

        const state = player.status || 'offline';
        const dot = '<span class="dot" style="background:' + (STATUS_COLOR[state] || STATUS_COLOR.offline) + '"></span>';
        const name = player.username || fallbackName || 'someone';

        const avatar = player.avatar
          ? '<img src="https://cdn.discordapp.com/avatars/' + discordId + '/' + player.avatar + '.' + (String(player.avatar).startsWith('a_') ? 'gif' : 'png') + '?size=32" alt="' + esc(name) + '" loading="lazy">'
          : '';

        // the first non-custom-status activity (a song, a game, whatever).
        const act = Array.isArray(player.activities)
          ? player.activities.find(a => a.type !== 'CUSTOM_STATUS')
          : null;
        let activity = '';
        if (act) {
          const icon = ACTIVITY_ICON[act.type] || '•';
          const val = act.state || act.details || act.name || '';
          activity = '  ' + icon + ' ' + (act.name || '') + (val ? ' — ' + val : '');
        }

        const stateLabel = player.online ? 'online (' + state + ')' : 'offline';
        el.innerHTML = dot + ' ' + avatar + esc(name) + ' — ' + stateLabel +
          (activity ? '<span class="muted">' + esc(activity) + '</span>' : '');
      })
      .catch(() => {
        el.textContent = 'discord: could not load presence';
      });
  }

  global.initLanyard = render;
})(typeof window !== 'undefined' ? window : this);
