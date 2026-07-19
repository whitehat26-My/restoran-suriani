/* Restoran Suriani — menu illustrations
   These are simple drawn icons, NOT photos of the actual dishes.
   Each menu item is matched to the closest icon by dish type — see
   pickMenuIcon() in script.js. Swap in real food photos later by editing
   the "photo" rendering in script.js if you'd rather use real pictures. */

const MENU_ICONS = {
  riceGravy: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="52" r="34" fill="#fff9ea" stroke="#7a1120" stroke-width="3"/><ellipse cx="42" cy="48" rx="16" ry="11" fill="#ffffff" stroke="#7a1120" stroke-width="2"/><path d="M58 38 q14 8 10 26 q-4 10 -18 6 q6 -14 8 -32 Z" fill="#c0392b" opacity="0.85"/></svg>',

  soup: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M20 46 h60 a30 30 0 0 1 -60 0 Z" fill="#fdf6e3" stroke="#7a1120" stroke-width="3"/><path d="M14 44 h72" stroke="#7a1120" stroke-width="4" stroke-linecap="round"/><path d="M38 32 q-4 -8 2 -14" stroke="#a9702c" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M52 32 q-4 -8 2 -14" stroke="#a9702c" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M66 32 q-4 -8 2 -14" stroke="#a9702c" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',

  noodle: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M18 44 h64 a28 28 0 0 1 -64 0 Z" fill="#fdf6e3" stroke="#7a1120" stroke-width="3"/><path d="M30 44 q6 -10 0 -18 M45 44 q6 -12 0 -20 M60 44 q6 -10 0 -18 M70 44 q4 -8 0 -14" stroke="#e8b923" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M12 42 h76" stroke="#7a1120" stroke-width="4" stroke-linecap="round"/></svg>',

  friedRice: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="58" rx="36" ry="16" fill="#fdf6e3" stroke="#7a1120" stroke-width="3"/><ellipse cx="50" cy="52" rx="24" ry="14" fill="#e8b923"/><circle cx="40" cy="48" r="2" fill="#7a1120"/><circle cx="50" cy="45" r="2" fill="#7a1120"/><circle cx="60" cy="49" r="2" fill="#7a1120"/><circle cx="46" cy="54" r="2" fill="#7a1120"/><circle cx="56" cy="55" r="2" fill="#7a1120"/><circle cx="66" cy="42" r="8" fill="#ffffff" stroke="#7a1120" stroke-width="2"/><circle cx="66" cy="42" r="3.5" fill="#e8b923"/></svg>',

  egg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="55" rx="32" ry="20" fill="#fdf6e3" stroke="#7a1120" stroke-width="3"/><circle cx="50" cy="55" r="13" fill="#e8b923" stroke="#7a1120" stroke-width="2"/></svg>',

  nasiLemak: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 18 L82 76 H18 Z" fill="#6b8f47" stroke="#7a1120" stroke-width="3" stroke-linejoin="round"/><path d="M50 30 L70 68 H30 Z" fill="#fdf6e3"/><circle cx="50" cy="55" r="5" fill="#e8b923"/></svg>',

  chickenRice: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="55" r="34" fill="#fff9ea" stroke="#7a1120" stroke-width="3"/><circle cx="38" cy="55" r="12" fill="#ffffff" stroke="#7a1120" stroke-width="2"/><path d="M54 42 q20 4 20 20 q0 8 -10 10 q-14 2 -16 -12 q-2 -12 6 -18 Z" fill="#e8b923" stroke="#a9702c" stroke-width="2"/><path d="M40 66 q10 4 18 0" stroke="#6b8f47" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',

  steak: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="58" rx="36" ry="16" fill="#fdf6e3" stroke="#7a1120" stroke-width="3"/><path d="M32 50 q18 -14 36 0 q6 8 -4 14 q-16 10 -30 0 q-8 -6 -2 -14 Z" fill="#8b5a2b" stroke="#5a3a1a" stroke-width="2"/><path d="M38 50 l24 8 M44 46 l20 10" stroke="#5a3a1a" stroke-width="1.5"/></svg>',

  pasta: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="58" rx="36" ry="16" fill="#fdf6e3" stroke="#7a1120" stroke-width="3"/><path d="M28 52 q22 -14 44 0 q-22 14 -44 0 Z" fill="#e8b923" stroke="#a9702c" stroke-width="2"/><circle cx="40" cy="52" r="3" fill="#c0392b"/><circle cx="55" cy="55" r="3" fill="#c0392b"/><circle cx="48" cy="48" r="3" fill="#6b8f47"/></svg>',

  fries: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M32 40 h36 l-4 40 h-28 Z" fill="#c0392b" stroke="#7a1120" stroke-width="3"/><rect x="38" y="18" width="5" height="30" fill="#e8b923" stroke="#a9702c" stroke-width="1"/><rect x="47" y="14" width="5" height="34" fill="#e8b923" stroke="#a9702c" stroke-width="1"/><rect x="56" y="20" width="5" height="28" fill="#e8b923" stroke="#a9702c" stroke-width="1"/></svg>',

  toast: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M24 70 V42 a26 26 0 0 1 52 0 v28 Z" fill="#e8b923" stroke="#7a1120" stroke-width="3"/><path d="M32 70 V44 a18 18 0 0 1 36 0 v26 Z" fill="#fdf6e3"/></svg>',

  penyet: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="56" r="30" fill="#fdf6e3" stroke="#7a1120" stroke-width="3"/><ellipse cx="50" cy="54" rx="18" ry="10" fill="#8b5a2b" stroke="#5a3a1a" stroke-width="2"/><path d="M36 46 q14 -10 28 0" stroke="#c0392b" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',

  vegetable: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="60" rx="34" ry="14" fill="#fdf6e3" stroke="#7a1120" stroke-width="3"/><path d="M34 54 q4 -14 -2 -22 M46 54 q2 -16 -4 -24 M58 54 q4 -14 -2 -22 M68 54 q2 -12 -4 -20" stroke="#6b8f47" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',

  meatball: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M18 46 h64 a30 30 0 0 1 -64 0 Z" fill="#fdf6e3" stroke="#7a1120" stroke-width="3"/><circle cx="38" cy="50" r="8" fill="#8b5a2b" stroke="#5a3a1a" stroke-width="2"/><circle cx="58" cy="52" r="7" fill="#8b5a2b" stroke="#5a3a1a" stroke-width="2"/><path d="M12 44 h76" stroke="#7a1120" stroke-width="4" stroke-linecap="round"/></svg>'
};
