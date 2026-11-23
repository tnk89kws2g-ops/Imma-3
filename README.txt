EASYPAY - HOME SCREEN
=====================

Files
-----
index.html     App markup (app screen only: no phone frame, dynamic island or status bar)
style.css      Styles: green frosted top fade, rounded money font, floating liquid-glass tab bar
script.js      Balance, transactions list, Add money / Withdraw sheet, account show/hide, tab bar, toasts
manifest.json  Web app manifest

How to run
----------
Open index.html in a browser (use mobile view), or host the folder on any static host.
If you use it as a Telegram Mini App, serve it over HTTPS and add
<script src="https://telegram.org/js/telegram-web-app.js"></script> before script.js.

Easy edits
----------
- Starting balance, saving and the sample transactions: the `state` object at the top of script.js.
- Money font: --money-font in style.css :root (applied through the .money class on every amount).
  It loads "Nunito" from Google Fonts (link in index.html) and falls back to the system rounded font.
- Glass look of the tab bar: --glass-bg, --glass-border, --glass-active in style.css :root.
- Green fade colour: --green-fade (RGB values) in style.css :root.
- Grey cents colour: --cents in style.css :root.
- Transactions are saved in the browser (localStorage). To reset, clear site data.
- Add app icons to manifest.json "icons" when you have them.

Send money flow (Payment tab)
-----------------------------
Payment tab -> full page with pill search + recent usernames -> amount/description page ->
confirm popup -> 7 second processing popup -> success + confetti -> Done returns home.
- The people list is the DIRECTORY array in script.js (sample users). Replace the lookup in
  renderPeople() with your real Telegram username search. Recents are saved in localStorage.
- Haptics: Telegram HapticFeedback inside Telegram, navigator.vibrate on Android, and a hidden
  iOS switch trick on iPhone Safari (iOS 17.4+). Older iPhones have no web vibration at all.
- Dark mode is removed. The rubber band colour is handled by .top-fade (style.css) plus tint() in script.js.
