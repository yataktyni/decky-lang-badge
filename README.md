# 🌐 Decky Localization Badge (`decky-lang-badge`)

[![Latest Release](https://img.shields.io/github/v/release/yataktyni/decky-lang-badge?color=brightgreen&label=latest%20release)](https://github.com/yataktyni/decky-lang-badge/releases/latest)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

[🇬🇧 English](#-english) • [🇺🇦 Українська](#-українська)

---

## 🇬🇧 English

A **Decky Loader** plugin for Steam Deck that displays game localization badges across **Library & Home thumbnails**, **game detail pages**, and **Steam Store** — supporting **29 Steam languages** with full UI localization, automatic Steam Deck language detection, and deep community translation integration for Ukrainian (**Kuli.com.ua** & **LBK Launcher**).

### ✨ Features

- **🌐 29 Steam Languages + Full UI Translation** — automatically detects your Steam Deck UI language (or lets you pick any of 29 languages manually) and translates the entire plugin interface and badge statuses.
- **🖼️ Library & Home Cover Badges** — compact corner badges on game covers using instant local Steam `bitfield_supported_languages` detection (zero API spam), compatible with Home, Library, Search, Carousel/Gallery themes, and configurable to any of the 4 corners.
- **🎮 Game Page Badge** — clear status indicator (**Official**, **Installed**, **Community**, **None**) with customizable position, X/Y offsets, and automatic ProtonDB badge avoidance.
- **🛒 Steam Store Overlay** — automatically injects the localization badge on Steam Store pages inside Gaming Mode.
- **🧩 Deep Ukrainian Community Integration (for 🇺🇦)** — detects local [LBK Launcher](https://lbklauncher.com/) database (`lbk.db`) & installed translations, shows `✓` (installed), `⬆` (translation update available), and `🎙` (voiceover available), opens an in-Steam modal with team/version/progress details, launches LBK Launcher visibly inside Gaming Mode, and supports 1-click Flatpak installation right from settings; falls back to [Kuli.com.ua](https://kuli.com.ua/).
- **🌍 Community Portals**: quick links in the Info tab for selected translation communities and guides for the chosen language.
- **🧭 Compact 3-Tab Settings UI** — organized into **General**, **Layout**, and **Info** tabs so you never have to scroll through long lists in the Quick Access Menu.

### 🌐 Supported Languages (29)

🇺🇦 Ukrainian • 🇵🇱 Polish • 🇨🇿 Czech • 🇹🇷 Turkish • 🇧🇷 Portuguese (Brazil) • 🇵🇹 Portuguese • 🇪🇸 Spanish • 🌎 Spanish (LatAm) • 🇩🇪 German • 🇫🇷 French • 🇮🇹 Italian • 🇯🇵 Japanese • 🇰🇷 Korean • 🇨🇳 Simplified Chinese • 🇹🇼 Traditional Chinese • 🇳🇱 Dutch • 🇸🇪 Swedish • 🇩🇰 Danish • 🇫🇮 Finnish • 🇳🇴 Norwegian • 🇭🇺 Hungarian • 🇷🇴 Romanian • 🇧🇬 Bulgarian • 🇬🇷 Greek • 🇸🇦 Arabic • 🇹🇭 Thai • 🇻🇳 Vietnamese • 🇮🇩 Indonesian • 🇬🇧 English

### 📥 Installation

#### Method 1: Decky Loader → Install from ZIP URL (Fastest, Recommended)

1. On Steam Deck, open **Decky Loader** (press `...`).
2. Go to ⚙️ **Settings** → **Developer** (enable Developer Mode if needed).
3. Under **Install Plugin from ZIP URL**, paste:

   ```text
   https://tinyurl.com/decky-lang-badge
   ```

   *(Direct GitHub URL: `https://github.com/yataktyni/decky-lang-badge/releases/latest/download/release.zip`)*

#### Method 2: Install Plugin From File

1. Download `release.zip` from the [latest release](https://github.com/yataktyni/decky-lang-badge/releases/latest).
2. Open **Decky Loader** → ⚙️ **Settings** → **Developer** → **Install Plugin From File**.
3. Select the downloaded `release.zip`.

#### Method 3: Konsole (Desktop Mode)

```bash
curl -fsSL https://raw.githubusercontent.com/yataktyni/decky-lang-badge/main/install.sh | sh
```

#### Method 4: Manual Installation

1. Download and extract `release.zip` from [Releases](https://github.com/yataktyni/decky-lang-badge/releases/latest).
2. Copy the `decky-lang-badge` folder to `/home/deck/homebrew/plugins/`.
3. Restart Decky Loader or your Steam Deck.

### ⚙️ Settings Overview

- **⚙️ General**: Localization language (`Auto` or manual choice of 29 languages), Badge Type (`Icon + Text` / `Icon Only`), Library thumbnails toggle, Steam Store overlay toggle, and *(when 🇺🇦 Ukrainian is active)* LBK Launcher integration, 1-click install/launch, and catalog/cache refresh.
- **📍 Layout**: Game page badge corner & X/Y offsets, Thumbnail badge corner (4 corners), and Store badge X/Y offsets.
- **🔗 Info**: Language-specific translation portals & guides, GitHub source, contact link, credits, and auto-synced release version.

### Installing community translations on Steam Deck

Community patches are made by independent authors, and installation differs by game. Check the patch's instructions and compatibility with your game version first. Back up saved games and files that the patch asks you to replace.

1. Switch to Desktop Mode, open the translation author's page, and download the patch for your game and language.
2. In Steam, open the game's properties and use **Installed Files > Browse** to find its files. Follow the patch author's instructions for copying files or running an installer. Some Windows installers need a compatible Proton environment; their instructions may be game-specific.
3. Start the game and check its language settings. Keep a copy of the original files so you can undo the patch if needed.

The plugin links to community resources but does not verify every patch or automatically install translations outside its Ukrainian LBK integration. Some patches or installers may not work on Steam Deck.

Community resources include [Kuli](https://kuli.com.ua/) and [LBK Launcher](https://lbklauncher.com/) (Ukrainian), [Graj Po Polsku](https://grajpopolsku.pl/) (Polish), [Lokalizace.net](https://lokalizace.net/) and [Herní Překlady](https://hernipreklady.cz/) (Czech), [Sirius Çeviri](https://siriusceviri.com/) (Turkish), [TraduSquare](https://tradusquare.es/) (Spanish), [Tribo Gamer](https://tribogamer.com/) (Brazilian Portuguese), and [Magyarítások Portál](https://magyaritasok.hu/) (Hungarian). See the [Turkish Steam Deck video guide](https://www.youtube.com/watch?v=lgaaOG7Avw8) and [Brazilian Portuguese video guide](https://www.youtube.com/watch?v=Gcs0ZD4eaWU) for examples.

### 🛠️ Building & Testing from Source

**Requirements:** Node.js 20+, pnpm, Python 3.11+ (for backend tests).

```bash
git clone https://github.com/yataktyni/decky-lang-badge.git
cd decky-lang-badge

# Frontend dependencies, tests & build
pnpm install
pnpm test:frontend
pnpm build

# Backend tests
python3 -m pip install -r requirements-dev.txt
pytest -q
```

Automated CI/CD (`.github/workflows/ci.yml` and `.github/workflows/release.yml`) runs frontend and backend tests on every push and before publishing tagged releases.

To release, commit and push all changes to `main` first. Run `pnpm release patch` (or `minor` / `major`) to update both manifest versions, commit them, and push the new tag. To release the version already committed in both manifests, run `pnpm release` without a bump argument. The workflow validates the tag against both manifests before building. Check GitHub Actions and the uploaded `release.zip` to confirm publication.

### 🔗 Support & Links

- ❤️ [Support on Ko-fi](https://ko-fi.com/yataktyni/tip)
- 💚 [Crypto Donation (NOWPayments)](https://nowpayments.io/donation/yataktyni)
- 🐦 [X (Twitter)](https://x.com/yataktyni)
- 📦 [GitHub Repository](https://github.com/yataktyni/decky-lang-badge)
- 🎈 [Kuli.com.ua](https://kuli.com.ua/) • 🧩 [LBK Launcher](https://lbklauncher.com/) ([GitHub](https://github.com/Vadko/lbk-launcher))

### ⚖️ Credits & Disclaimer

- **[LBK Launcher](https://lbklauncher.com/)** is created by [Vadko](https://github.com/Vadko/lbk-launcher) and the Ukrainian localization community under **GNU GPL v3.0**. `Decky Localization Badge` (`decky-lang-badge`) is an independent, unofficial plugin and is not affiliated with or endorsed by LBK Launcher. It does not bundle, modify, or redistribute any LBK Launcher code or binaries — it only reads the user's local database, opens official `lbk://` deep links, or invokes Flatpak with the official `com.lbk.launcher` flatpakref.
- **[Kuli.com.ua](https://kuli.com.ua/)**, **Graj Po Polsku**, **Lokalizace.net**, **Herní Překlady**, **Sirius Çeviri**, **Tribo Gamer**, and **Magyarítások Portál** are independent community localization portals.
- All translations, catalogs, and trademarks (including Steam, Steam Deck, Valve, and Decky Loader) belong to their respective authors and owners.

---

## 🇺🇦 Українська

Плагін **Decky Localization Badge** (`decky-lang-badge`) для **Decky Loader** на Steam Deck, який показує бейджі локалізації на **мініатюрах у Бібліотеці та на Головній**, на **сторінках ігор** та в **магазині Steam**.

Підтримує **29 мов Steam** із повним перекладом інтерфейсу, автовизначенням мови Steam Deck та глибокою інтеграцією з українською спільнотою локалізаторів (**Kuli.com.ua** і **LBK Launcher**).

### ✨ Можливості

- **🌐 29 мов Steam + повний переклад інтерфейсу** — автоматичне визначення мови Steam Deck або ручний вибір у налаштуваннях; інтерфейс плагіна та підписи статусів одразу перекладаються на вибрану мову.
- **🖼️ Мініатюри у Бібліотеці та на Головній** — компактні позначки на обкладинках ігор із миттєвою локальною перевіркою через `bitfield_supported_languages` Steam (працює на Головній, у Бібліотеці, Пошуку та з темами каруселі/галереї, вибір будь-якого з 4 кутів).
- **🎮 Бейдж на сторінці гри** — чіткий статус (**Офіційна**, **Встановлено**, **Спільнота**, **Відсутня**) із гнучкими координатами X/Y та автоматичним уникненням накладання на ProtonDB.
- **🛒 Відображення в Steam Store** — автоматично показує бейдж локалізації на сторінках магазину в Gaming Mode.
- **🧩 Інтеграція з LBK Launcher та Kuli.com.ua (для 🇺🇦)** — читає локальну базу `lbk.db` і встановлені українізатори, показує `✓` (встановлено), `⬆` (є оновлення перекладу) та `🎙` (є українська озвучка), відкриває модальне вікно з командами/прогресом, запускає LBK Launcher прямо в Gaming Mode та вміє встановлювати LBK Launcher (Flatpak) в один клік із налаштувань плагіна.
- **🌍 Портали спільнот**: швидкі посилання у вкладці «Інфо» для відповідної мови, зокрема `Kuli.com.ua`, `LBK Launcher`, `Graj Po Polsku`, `Lokalizace.net`, `Herní Překlady`, `Sirius Çeviri`, `Tribo Gamer` і `Magyarítások Portál`.
- **🧭 Компактні налаштування у 3 табах** — **Загальні**, **Позиція**, **Інфо** без нескінченного скролу в Quick Access Menu.

### 📥 Встановлення

#### Спосіб 1: Decky → Developer → Install Plugin from ZIP URL (найшвидший, рекомендовано)

1. На Steam Deck відкрийте **Decky Loader** (кнопка `...`).
2. Перейдіть у ⚙️ **Налаштування** → **Developer**.
3. Вставте в поле **Install Plugin from ZIP URL**:

   ```text
   https://tinyurl.com/decky-lang-badge
   ```

   *(Пряме посилання GitHub: `https://github.com/yataktyni/decky-lang-badge/releases/latest/download/release.zip`)*

#### Спосіб 2: Встановлення з файлу

1. Завантажте `release.zip` з [останнього релізу](https://github.com/yataktyni/decky-lang-badge/releases/latest).
2. Відкрийте **Decky Loader** → ⚙️ **Налаштування** → **Developer** → **Install Plugin From File**.
3. Виберіть завантажений `release.zip`.

#### Спосіб 3: Через термінал (Konsole у Desktop Mode)

```bash
curl -fsSL https://raw.githubusercontent.com/yataktyni/decky-lang-badge/main/install.sh | sh
```

#### Спосіб 4: Ручне встановлення

1. Завантажте й розпакуйте `release.zip` із [релізів](https://github.com/yataktyni/decky-lang-badge/releases/latest).
2. Скопіюйте папку `decky-lang-badge` до `/home/deck/homebrew/plugins/`.
3. Перезапустіть Decky Loader або Steam Deck.

### ⚖️ Подяки та відмова від відповідальності

- **[LBK Launcher](https://lbklauncher.com/)** створений [Vadko](https://github.com/Vadko/lbk-launcher) та українською спільнотою локалізаторів за ліцензією **GNU GPL v3.0**. Цей плагін є незалежним стороннім проєктом, не афілійований із LBK Launcher і не включає, не змінює та не розповсюджує його код або файли — інтеграція працює виключно через локальну базу користувача, офіційні `lbk://` посилання та офіційний Flatpak (`com.lbk.launcher`).
- **[Kuli.com.ua](https://kuli.com.ua/)** та інші портали спільнот є незалежними ресурсами.
- Усі права на переклади, каталоги та торговельні марки (включно з Steam, Steam Deck, Valve та Decky Loader) належать їхнім відповідним авторам і правовласникам.

---

## 📄 License

Copyright © 2025–2026 Yataktyni.

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE). Any forks or derivative works must preserve copyright notices and remain open source under GPL-3.0.
