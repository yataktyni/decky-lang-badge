# 🌐 Localization Badge (`decky-lang-badge`)

[![Latest Release](https://img.shields.io/github/v/release/yataktyni/decky-lang-badge?label=latest%20release&color=green)](https://github.com/yataktyni/decky-lang-badge/releases/latest)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

---

## 🇺🇦 Українська

Плагін для **Decky Loader** на Steam Deck (**Localization Badge**), який додає значок наявності локалізації на сторінки ігор, мініатюри у Бібліотеці/Головній та сторінки Steam Store.

Підтримує **29 мов Steam** із автоматичним визначенням за мовою інтерфейсу Steam Deck (для української та англійської мови інтерфейсу за замовчуванням показує 🇺🇦 Українську) або примусовим вибором будь-якої мови в налаштуваннях, а для **української мови** додатково інтегрується з **Kuli.com.ua** та **LBK Launcher**.

### ✨ Можливості

- **🌐 29 мов Steam** — автовизначення мови інтерфейсу Steam Deck + ручний вибір у налаштуваннях (🇺🇦 Українська, 🇵🇱 Polski, 🇨🇿 Čeština, 🇹🇷 Türkçe, 🇧🇷 Português (BR), 🇩🇪 Deutsch, 🇫🇷 Français, 🇪🇸 Español, 🇯🇵 日本語, 🇰🇷 한국어 та інші) із нативними підписами та прапором.
- **✅ Офіційна** — гра має офіційну підтримку вибраної мови в Steam.
- **✅ Встановлено (LBK)** *(для 🇺🇦)* — українізатор вже встановлено через [LBK Launcher](https://lbklauncher.com/) (із позначкою `⬆ LBK`, якщо доступне оновлення перекладу, та `🎙` за наявності озвучки).
- **🤝 Спільнота / LBK** *(для 🇺🇦)* — переклад доступний у [LBK Launcher](https://lbklauncher.com/) або на [kuli.com.ua](https://kuli.com.ua/).
- **🧩 Інтеграція з LBK Launcher** *(для 🇺🇦)* — перегляд доступних перекладів (команда, версія, % тексту/озвучки/досягнень), запуск LBK Launcher прямо в Gaming Mode для встановлення в один клік та встановлення самого LBK Launcher (Flatpak) із налаштувань плагіна.
- **🖼️ Мініатюри у Бібліотеці та на Головній** — компактні позначки (прапор мови, `✓`, `⬆`, `LBK`) прямо на обкладинках ігор із миттєвою локальною перевіркою та вибором кута.
- **🛒 Відображення в магазині** — значок автоматично з'являється на сторінках Steam Store.
- **❌ Відсутня** — офіційна (або спільнотна для 🇺🇦) локалізація для цієї гри не знайдена.
- **📖 Корисні посилання** — швидкий доступ до Kuli.com.ua, LBK Launcher, X (Twitter) автора, відеоінструкцій та посібників Steam.

### ⚙️ Налаштування

- **Мова локалізації**: `Авто (мова Steam)` або примусовий вибір будь-якої з 29 підтримуваних мов Steam.
- **Тип значка**: вибір між "Лише іконка" або "Іконка + Текст".
- **Позиція**: можливість вибору кута (Вгорі зліва/Вгорі справа) з автоматичним уникненням накладання на Badge від ProtonDB.
- **Зміщення (Offsets)**: точне налаштування координат X та Y для бібліотеки та магазину окремо.
- **Мініатюри**: увімкнення/вимкнення бейджів на обкладинках у бібліотеці та вибір одного з 4 кутів.
- **Інтеграція з LBK Launcher** *(для 🇺🇦)*: перемикач, статус бази, кнопка швидкого запуску, оновлення кешу або встановлення LBK Launcher (Flatpak).

---

### 📥 Встановлення

#### Спосіб 1: Через меню Decky Loader (рекомендовано)

1. Завантажте файл `release.zip` з [останнього релізу](https://github.com/yataktyni/decky-lang-badge/releases/latest).
2. На Steam Deck відкрийте **Decky Loader** (кнопка `...`).
3. Перейдіть до ⚙️ **Налаштування** → **Developer**.
4. Виберіть **Install Plugin From File**.
5. Знайдіть та виберіть завантажений `release.zip`.
6. Перезавантажте Decky Loader.

#### Спосіб 2: Ручне встановлення

1. Завантажте `release.zip` з [релізів](https://github.com/yataktyni/decky-lang-badge/releases/latest).
2. Розпакуйте архів.
3. Скопіюйте папку `decky-lang-badge` до:

   ```
   /home/deck/homebrew/plugins/
   ```
4. Перезавантажте Decky Loader або Steam Deck.

#### Спосіб 3: Через термінал (Консоль)

1. Відкрийте Консоль (Konsole) в режимі робочого столу (Desktop Mode).
2. Вставте та виконайте команду:

   ```bash
   curl -fsSL https://bit.ly/4vDDIab | sh
   ```

#### Спосіб 4: Decky → Developer via URL (найшвидший)

1. На Steam Deck відкрийте **Decky Loader** (кнопка `...`).
2. Перейдіть до ⚙️ **Налаштування** → **Developer**.
3. Вставте коротке посилання в поле "Install Plugin from ZIP URL":

   ```text
   https://tinyurl.com/decky-ukr
   ```

   *(або повне пряме посилання: `https://github.com/yataktyni/decky-lang-badge/releases/latest/download/release.zip`)*

---

### 🛠️ Збірка з вихідного коду (для розробників)

**Вимоги:**
- Node.js 18+
- pnpm або npm

**Кроки:**

```bash
# Клонуйте репозиторій
git clone https://github.com/yataktyni/decky-lang-badge.git
cd decky-lang-badge

# Встановіть залежності
pnpm install

# Зберіть плагін
pnpm build

# Створіть release.zip
pnpm zip
```

---

### 🔗 Посилання

- ❤️ [Підтримати на Ko-fi](https://ko-fi.com/yataktyni/tip)
- 💚 [Підтримати криптою (NOWPayments)](https://nowpayments.io/donation/yataktyni)
- 🐦 [X (Twitter)](https://x.com/yataktyni)
- 📦 [Код на GitHub](https://github.com/yataktyni/decky-lang-badge)
- 🎈 [Kuli.com.ua — каталог української локалізації ігор](https://kuli.com.ua/)
- 🧩 [LBK Launcher — лаунчер українських локалізацій](https://lbklauncher.com/) ([GitHub](https://github.com/Vadko/lbk-launcher))

---

### ⚖️ Подяки та відмова від відповідальності

- **[LBK Launcher](https://lbklauncher.com/)** створений [Vadko](https://github.com/Vadko/lbk-launcher) та українською спільнотою локалізаторів і поширюється за ліцензією **GNU GPL v3.0**. Цей плагін є незалежним стороннім проєктом, не афілійований із LBK Launcher і не включає, не змінює та не розповсюджує його код або файли — інтеграція працює виключно через локальну базу користувача, офіційні `lbk://` посилання та офіційний Flatpak (`com.lbk.launcher`).
- **[Kuli.com.ua](https://kuli.com.ua/)** — незалежний каталог українських локалізацій ігор.
- Усі права на переклади, каталоги, назви та торговельні марки (включно з Steam, Steam Deck, Valve та Decky Loader) належать їхнім відповідним авторам і правовласникам.

---

### 📝 Плани на майбутнє

- [ ] Розширення для браузера (Chromium) для https://store.steampowered.com
- [ ] Додаткові мови з власними локалізованими інструкціями
- [x] Інтеграція з LBK Launcher для встановлення перекладів із Gaming Mode
- [x] Мініатюрні бейджі на обкладинках ігор у Бібліотеці та на Головній

---
---

## 🇬🇧 English

A **Decky Loader** plugin for Steam Deck (**Localization Badge**) that displays language localization badges on game pages, Library/Home thumbnails, and Steam Store pages.

Supports **29 Steam languages** with automatic detection from your Steam Deck UI language (defaulting to 🇺🇦 Ukrainian on English/Ukrainian UI) or manual override in settings — plus deep community integration with **Kuli.com.ua** and **LBK Launcher** for Ukrainian.

### ✨ Features

- **🌐 29 Steam Languages** — automatic detection from Steam Deck UI or manual selection (🇺🇦 Ukrainian, 🇵🇱 Polish, 🇨🇿 Czech, 🇹🇷 Turkish, 🇧🇷 Portuguese-BR, 🇩🇪 German, 🇫🇷 French, 🇪🇸 Spanish, 🇯🇵 Japanese, 🇰🇷 Korean, and more) with native badge labels and flags.
- **✅ Official** — the game has official support for the selected language on Steam.
- **✅ Installed (LBK)** *(for 🇺🇦)* — Ukrainian translation is installed via [LBK Launcher](https://lbklauncher.com/) (with `⬆ LBK` when an update is available and `🎙` when voiceover exists).
- **🤝 Community / LBK** *(for 🇺🇦)* — translations available via [LBK Launcher](https://lbklauncher.com/) or [kuli.com.ua](https://kuli.com.ua/).
- **🧩 LBK Launcher Integration** *(for 🇺🇦)* — view available translations (team, version, text/voice/achievements progress), launch LBK Launcher directly inside Gaming Mode, and install LBK Launcher (Flatpak) from plugin settings.
- **🖼️ Library & Home Thumbnails** — compact badges (language flag, `✓`, `⬆`, `LBK`) on game covers with instant local detection and customizable corner placement.
- **🛒 Store Overlay** — the badge automatically appears on Steam Store pages.
- **❌ None** — no official (or community for 🇺🇦) localization found for this game yet.
- **📖 Useful Links** — quick access to Kuli.com.ua, LBK Launcher, author's X (Twitter), video guides, and Steam Community guides.

### ⚙️ Settings

- **Target Language**: `Auto (Steam Language)` or manually select any of the 29 supported Steam languages.
- **Badge Type**: switch between "Icon Only" or "Icon + Text".
- **Position**: choose between "Top Left"/"Top Right" with automatic ProtonDB badge avoidance.
- **Offsets**: fine-tune X and Y coordinates for Library and Store pages separately.
- **Thumbnails**: toggle badges on Library & Home game covers and choose any of the 4 corners.
- **LBK Launcher Integration** *(for 🇺🇦)*: toggle integration, view database status, open LBK Launcher, refresh cache, or install LBK Launcher (Flatpak).

---

### 📥 Installation

#### Method 1: Via Decky Loader Menu (Recommended)

1. Download `release.zip` from the [latest release](https://github.com/yataktyni/decky-lang-badge/releases/latest).
2. On your Steam Deck, open **Decky Loader** (press `...` button).
3. Go to ⚙️ **Settings** → **Developer**.
4. Select **Install Plugin From File**.
5. Find and select the downloaded `release.zip`.
6. Restart Decky Loader.

#### Method 2: Manual Installation

1. Download `release.zip` from [releases](https://github.com/yataktyni/decky-lang-badge/releases/latest).
2. Extract the archive.
3. Copy the `decky-lang-badge` folder to:

   ```
   /home/deck/homebrew/plugins/
   ```
4. Restart Decky Loader or your Steam Deck.

#### Method 3: Via Terminal (Konsole)

1. Open Konsole in Desktop Mode.
2. Paste and run this command:

   ```bash
   curl -fsSL https://bit.ly/4vDDIab | sh
   ```

#### Method 4: Decky → Developer via URL (Fastest)

1. On your Steam Deck, open **Decky Loader** (press `...` button).
2. Go to ⚙️ **Settings** → **Developer**.
3. Paste this short link into the "Install Plugin from ZIP URL" field:

   ```text
   https://tinyurl.com/decky-ukr
   ```

   *(or full direct URL: `https://github.com/yataktyni/decky-lang-badge/releases/latest/download/release.zip`)*

---

### ✅ Tests (Backend + Frontend)

```bash
# Backend tests
python3 -m pip install -r requirements-dev.txt
pytest -q

# Frontend tests
pnpm install
pnpm test:frontend
```

Covered areas include:

Backend:
- settings load/save/default merge
- current version read from `plugin.json`
- latest version check via GitHub API response handling
- update flow:
  - already up-to-date
  - successful zip extraction (both wrapped-root and flat archives)
  - invalid zip error path

Frontend:
- utility functions (`src/utils.ts`)
- badge rendering/click/position behavior (`src/components/Badge.tsx`)
- update button/version/status behavior (`src/components/LinksSection.tsx`)
- settings hook load/persist behavior (`src/hooks/useSettings.ts`)
- badge status hook Steam/Kuli/error paths (`src/hooks/useBadgeStatus.ts`)

CI/CD:
- `.github/workflows/ci.yml` runs backend + frontend tests on push and pull requests.
- `.github/workflows/release.yml` runs backend + frontend tests before building and publishing tagged releases.

---

### 🛠️ Building from Source (For Developers)

**Requirements:**
- Node.js 18+
- pnpm or npm

**Steps:**

```bash
# Clone the repository
git clone https://github.com/yataktyni/decky-lang-badge.git
cd decky-lang-badge

# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Create release.zip
pnpm zip
```

---

### 🔗 Links

- ❤️ [Support on Ko-fi](https://ko-fi.com/yataktyni/tip)
- 💚 [Crypto Donation (NOWPayments)](https://nowpayments.io/donation/yataktyni)
- 🐦 [X (Twitter)](https://x.com/yataktyni)
- 📦 [GitHub Source](https://github.com/yataktyni/decky-lang-badge)
- 🎈 [Kuli.com.ua — Catalog of Ukrainian game translations](https://kuli.com.ua/)
- 🧩 [LBK Launcher — Ukrainian game localization launcher](https://lbklauncher.com/) ([GitHub](https://github.com/Vadko/lbk-launcher))

---

### ⚖️ Credits & Disclaimer

- **[LBK Launcher](https://lbklauncher.com/)** is created by [Vadko](https://github.com/Vadko/lbk-launcher) and the Ukrainian localization community under the **GNU GPL v3.0** license. `decky-lang-badge` is an independent, unofficial plugin and is not affiliated with or endorsed by LBK Launcher. It does not bundle, modify, or redistribute any LBK Launcher code or binaries — it only reads the user's local database, opens official `lbk://` deep links, or invokes Flatpak using the official `com.lbk.launcher` flatpakref.
- **[Kuli.com.ua](https://kuli.com.ua/)** is an independent catalog of Ukrainian game translations.
- All translations, catalogs, and trademarks (including Steam, Steam Deck, Valve, and Decky Loader) remain the property of their respective authors and owners.

---

### 📝 Roadmap

- [ ] Browser extension (Chromium) for https://store.steampowered.com
- [ ] Additional language badges with localized guides
- [x] LBK Launcher integration for installing translations directly from Gaming Mode
- [x] Library & Home game cover thumbnail badges

---

## 📄 License

Copyright © 2025–2026 Yataktyni.

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE). Any forks or derivative works must preserve copyright notices and remain open source under GPL-3.0.
