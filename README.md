# 🌐 Decky Localization Badge (`decky-lang-badge`)

[![Latest Release](https://img.shields.io/github/v/release/yataktyni/decky-lang-badge?color=brightgreen&label=latest%20release)](https://github.com/yataktyni/decky-lang-badge/releases/latest)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

[🇬🇧 English](#-english) • [🇺🇦 Українська](#-українська)

---

## 🇬🇧 English

A **Decky Loader** plugin for Steam Deck that displays game localization badges across **Library & Home thumbnails**, **game detail pages**, and **Steam Store**. It supports **29 Steam languages** with full UI localization, automatic Steam Deck language detection, and deep community translation integration for Ukrainian (**Kuli.com.ua** & **LBK Launcher**).

### ✨ Features

- **🌐 29 Steam Languages + Full UI Translation**: automatically detects your Steam Deck UI language (or lets you pick any of 29 languages manually) and translates the entire plugin interface and badge statuses.
- **🖼️ Library & Home Cover Badges**: compact corner badges on game covers using instant local Steam `bitfield_supported_languages` detection (zero API spam), compatible with Home, Library, Search, Carousel/Gallery themes, and configurable to any of the 4 corners.
- **🎮 Game Page Badge**: clear status indicator (**Official**, **Installed**, **Community**, **None**) with customizable position, X/Y offsets, and automatic ProtonDB badge avoidance.
- **🛒 Steam Store Overlay**: displays a localization badge on game pages and supported Store and wishlist covers in Gaming Mode. Cover badges require both Store and thumbnail badges to be enabled. They show official support, available LBK translations, and previously cached community results; uncached official results load gradually as covers become visible.
- **🧩 Deep Ukrainian Community Integration (for 🇺🇦)**: detects local [LBK Launcher](https://lbklauncher.com/) database (`lbk.db`) & installed translations, shows `✓` (installed), `⬆` (translation update available), and `🎙` (voiceover available), opens an in-Steam modal with team/version/progress details, launches LBK Launcher visibly inside Gaming Mode, and supports 1-click Flatpak installation right from settings; falls back to [Kuli.com.ua](https://kuli.com.ua/).
- **🌍 Community Portals**: quick links in the Info tab for selected translation communities and guides for the chosen language.
- **🧭 Compact 3-Tab Settings UI**: organized into **General**, **Layout**, and **Info** tabs so you never have to scroll through long lists in the Quick Access Menu.

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

Community resources include [Kuli](https://kuli.com.ua/) and [LBK Launcher](https://lbklauncher.com/) (Ukrainian), [Graj Po Polsku](https://grajpopolsku.pl/) (Polish), [Lokalizace.net](https://lokalizace.net/), [PřekladyHer.eu](https://prekladyher.eu/), and [Herní Překlady](https://hernipreklady.cz/) (Czech), [Sirius Çeviri](https://siriusceviri.com/) and [Oyun Çeviri](https://www.oyunceviri.net/) (Turkish), [TraduSquare](https://tradusquare.es/) (Spanish), [Tribo Gamer](https://tribogamer.com/) and [Central de Traduções](https://www.centraldetraducoes.net.br/) (Brazilian Portuguese), [schote.biz](https://www.schote.biz/) (German), [TraductionJeux.com](https://traductionjeux.com/) (French), [RPG Italia](https://www.rpgitalia.net/) (Italian), [Magyarítások Portál](https://magyaritasok.hu/) (Hungarian), and [Việt Hóa Game](https://viethoagame.com/) (Vietnamese). See the [Turkish Steam Deck video guide](https://www.youtube.com/watch?v=lgaaOG7Avw8) and [Brazilian Portuguese video guide](https://www.youtube.com/watch?v=Gcs0ZD4eaWU) for examples.

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

### 🔗 Support & Links

- ❤️ [Support on Ko-fi](https://ko-fi.com/yataktyni/tip)
- 💚 [Crypto Donation (NOWPayments)](https://nowpayments.io/donation/yataktyni)
- 🐦 [X (Twitter)](https://x.com/yataktyni)
- 📦 [GitHub Repository](https://github.com/yataktyni/decky-lang-badge)
- 🎈 [Kuli.com.ua](https://kuli.com.ua/) • 🧩 [LBK Launcher](https://lbklauncher.com/) ([GitHub](https://github.com/Vadko/lbk-launcher))

### ⚖️ Credits & Disclaimer

- **[LBK Launcher](https://lbklauncher.com/)** is created by [Vadko](https://github.com/Vadko/lbk-launcher) and the Ukrainian localization community under **GNU GPL v3.0**. `Decky Localization Badge` (`decky-lang-badge`) is an independent, unofficial plugin and is not affiliated with or endorsed by LBK Launcher. It does not bundle, modify, or redistribute any LBK Launcher code or binaries; it only reads the user's local database, opens official `lbk://` deep links, or invokes Flatpak with the official `com.lbk.launcher` flatpakref.
- **[Kuli.com.ua](https://kuli.com.ua/)**, **Graj Po Polsku**, **Lokalizace.net**, **PřekladyHer.eu**, **Herní Překlady**, **Sirius Çeviri**, **Oyun Çeviri**, **TraduSquare**, **Tribo Gamer**, **Central de Traduções**, **schote.biz**, **TraductionJeux.com**, **RPG Italia**, **Magyarítások Portál**, and **Việt Hóa Game** are independent community localization portals.
- All translations, catalogs, and trademarks (including Steam, Steam Deck, Valve, and Decky Loader) belong to their respective authors and owners.

---

## 🇺🇦 Українська

Плагін **Decky Localization Badge** (`decky-lang-badge`) для **Decky Loader** на Steam Deck, який показує бейджі локалізації на **мініатюрах у Бібліотеці та на Головній**, на **сторінках ігор** та в **магазині Steam**.

Підтримує **29 мов Steam** із повним перекладом інтерфейсу, автовизначенням мови Steam Deck та глибокою інтеграцією з українською спільнотою локалізаторів (**Kuli.com.ua** і **LBK Launcher**).

### ✨ Можливості

- **🌐 29 мов Steam + повний переклад інтерфейсу**: автоматичне визначення мови Steam Deck або ручний вибір у налаштуваннях; інтерфейс плагіна та підписи статусів одразу перекладаються на вибрану мову.
- **🖼️ Мініатюри у Бібліотеці та на Головній**: компактні позначки на обкладинках ігор із миттєвою локальною перевіркою через `bitfield_supported_languages` Steam (працює на Головній, у Бібліотеці, Пошуку та з темами каруселі/галереї, вибір будь-якого з 4 кутів).
- **🎮 Бейдж на сторінці гри**: чіткий статус (**Офіційна**, **Встановлено**, **Спільнота**, **Відсутня**) із гнучкими координатами X/Y та автоматичним уникненням накладання на ProtonDB.
- **🛒 Відображення в Steam Store**: показує бейдж локалізації на сторінках ігор і підтримуваних обкладинках магазину та списку бажаного в Gaming Mode. Для бейджів на обкладинках потрібно ввімкнути відображення і в магазині, і на мініатюрах. Вони показують офіційну підтримку, доступні переклади LBK та раніше закешовані результати спільноти; незакешовані офіційні результати завантажуються поступово для видимих обкладинок.
- **🧩 Інтеграція з LBK Launcher та Kuli.com.ua (для 🇺🇦)**: читає локальну базу `lbk.db` і встановлені українізатори, показує `✓` (встановлено), `⬆` (є оновлення перекладу) та `🎙` (є українська озвучка), відкриває модальне вікно з командами/прогресом, запускає LBK Launcher прямо в Gaming Mode та вміє встановлювати LBK Launcher (Flatpak) в один клік із налаштувань плагіна.
- **🌍 Портали спільнот**: швидкі посилання у вкладці «Інфо» на окремі спільноти перекладачів та посібники для вибраної мови.
- **🧭 Компактні налаштування у 3 табах**: **Загальні**, **Позиція**, **Інфо** без нескінченного скролу в Quick Access Menu.

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

### ⚙️ Налаштування

- **⚙️ Загальні**: мова локалізації, тип бейджа, відображення на мініатюрах і в магазині Steam. Для української також доступні інтеграція з LBK Launcher, його встановлення та запуск і оновлення каталогу й кешу.
- **📍 Позиція**: розташування й відступи бейджа на сторінці гри та в магазині, кут бейджа на мініатюрах.
- **🔗 Інфо**: ресурси перекладацьких спільнот і посібники для вибраної мови, GitHub, контакт автора, подяки та версія плагіна.

### Встановлення перекладів спільноти на Steam Deck

Переклади створюють незалежні автори, а спосіб встановлення залежить від гри. Перевірте інструкції та сумісність перекладу з вашою версією гри. Збережіть резервні копії збережень і файлів, які потрібно замінити.

1. Перейдіть у Desktop Mode, відкрийте сторінку автора перекладу та завантажте потрібний переклад для своєї гри.
2. У Steam відкрийте властивості гри й виберіть **Встановлені файли > Огляд**, щоб знайти її файли. Дотримуйтеся інструкцій автора щодо копіювання файлів або запуску інсталятора. Деяким інсталяторам Windows потрібне сумісне середовище Proton, а кроки можуть відрізнятися залежно від гри.
3. Запустіть гру та перевірте її налаштування мови. Зберігайте копії оригінальних файлів, щоб за потреби скасувати зміни.

Плагін надає посилання на ресурси спільнот, але не перевіряє кожен переклад і не встановлює переклади автоматично, окрім української інтеграції з LBK. Деякі переклади й інсталятори можуть не працювати на Steam Deck.

Ресурси спільнот: [Kuli](https://kuli.com.ua/) і [LBK Launcher](https://lbklauncher.com/) (українська), [Graj Po Polsku](https://grajpopolsku.pl/) (польська), [Lokalizace.net](https://lokalizace.net/), [PřekladyHer.eu](https://prekladyher.eu/) і [Herní Překlady](https://hernipreklady.cz/) (чеська), [Sirius Çeviri](https://siriusceviri.com/) і [Oyun Çeviri](https://www.oyunceviri.net/) (турецька), [TraduSquare](https://tradusquare.es/) (іспанська), [Tribo Gamer](https://tribogamer.com/) і [Central de Traduções](https://www.centraldetraducoes.net.br/) (бразильська португальська), [schote.biz](https://www.schote.biz/) (німецька), [TraductionJeux.com](https://traductionjeux.com/) (французька), [RPG Italia](https://www.rpgitalia.net/) (італійська), [Magyarítások Portál](https://magyaritasok.hu/) (угорська) та [Việt Hóa Game](https://viethoagame.com/) (в'єтнамська). Приклади відеопосібників: [турецькою](https://www.youtube.com/watch?v=lgaaOG7Avw8) та [бразильською португальською](https://www.youtube.com/watch?v=Gcs0ZD4eaWU).

### 🛠️ Збірка й тестування з вихідного коду

**Вимоги:** Node.js 20+, pnpm, Python 3.11+ для тестів backend.

```bash
git clone https://github.com/yataktyni/decky-lang-badge.git
cd decky-lang-badge

# Залежності, тести та збірка frontend
pnpm install
pnpm test:frontend
pnpm build

# Тести backend
python3 -m pip install -r requirements-dev.txt
pytest -q
```

### 🔗 Підтримка та посилання

- ❤️ [Підтримати на Ko-fi](https://ko-fi.com/yataktyni/tip)
- 💚 [Підтримати криптовалютою через NOWPayments](https://nowpayments.io/donation/yataktyni)
- 🐦 [X (Twitter)](https://x.com/yataktyni)
- 📦 [Репозиторій на GitHub](https://github.com/yataktyni/decky-lang-badge)
- 🎈 [Kuli.com.ua](https://kuli.com.ua/) • 🧩 [LBK Launcher](https://lbklauncher.com/) ([GitHub](https://github.com/Vadko/lbk-launcher))

### ⚖️ Подяки та відмова від відповідальності

- **[LBK Launcher](https://lbklauncher.com/)** створений [Vadko](https://github.com/Vadko/lbk-launcher) та українською спільнотою локалізаторів за ліцензією **GNU GPL v3.0**. Цей плагін є незалежним стороннім проєктом, не афілійований із LBK Launcher і не включає, не змінює та не розповсюджує його код або файли; інтеграція працює виключно через локальну базу користувача, офіційні `lbk://` посилання та офіційний Flatpak (`com.lbk.launcher`).
- **[Kuli.com.ua](https://kuli.com.ua/)** та інші портали спільнот є незалежними ресурсами.
- Усі права на переклади, каталоги та торговельні марки (включно з Steam, Steam Deck, Valve та Decky Loader) належать їхнім відповідним авторам і правовласникам.

---

## 📊 Project statistics / Статистика проєкту

[![Release downloads / Завантаження релізів](https://img.shields.io/github/downloads/yataktyni/decky-lang-badge/total)](https://github.com/yataktyni/decky-lang-badge/releases)

[![Star history / Історія зірок](https://repostars.dev/api/embed?repo=yataktyni/decky-lang-badge&theme=dark)](https://repostars.dev/?repos=yataktyni/decky-lang-badge&theme=dark)

---

## 📄 License

Copyright © 2025–2026 Yataktyni.

This project is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE). Any forks or derivative works must preserve copyright notices and remain open source under GPL-3.0.
