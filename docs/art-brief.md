# ТЗ на растровую графику и анимацию юнитов

Задача на будущее: заменить текущую векторную графику юнитов (SVG + риг из повёрнутых частей) на растровую живопись с покадровой анимацией. Исполнитель — ИИ-сервис генерации (рекомендуемый — Scenario с моделью стиля, обученной на «библии стиля») или художник. Векторная графика остаётся рабочей до замены и служит референсом позы, пропорций и снаряжения: листы предпросмотра — `pnpm --filter @hb/assets preview -- --race <раса>`.

> Документ собирается скриптом `pnpm --filter @hb/assets art-brief` из данных игры и описаний внешности в `packages/assets/scripts/art-brief.visuals.mjs`. Правки вносить туда, а не в этот файл — иначе следующая сборка их затрёт.

Документ состоит из общей части (стиль, технические требования, анимации, порядок работ) и описания всех 112 юнитов. Описания юнитов и промпт-шаблоны — на английском: генераторы изображений лучше понимают английский.

## 1. Игра и юниты

Heroes Battles — пошаговая тактическая PvP-игра в духе Heroes of Might and Magic (телефон и web). Поле — наклонная сетка клеток, юниты стоят на клетках, ходят, бьют в ближнем бою или стреляют. 8 рас × 7 уровней × 2 варианта (основной и альтернативный) = 112 юнитов. Крупные юниты занимают 2×2 клетки.

На поле юнит виден на 100–150 px (крупный — до ~400 px), в Замке — иконкой 48–96 px. Силуэт и роль должны читаться с первого взгляда.

## 2. Стиль (единый для всех рас)

- Тёмное фэнтези, **полуреалистичная живопись** (painterly), не мультяшность и не пиксель-арт.
- Объёмная светотень: **свет слева сверху**, холодный рефлекс в тенях, мягкие тени в местах контакта.
- Читаемые фактуры материалов: металл (блики, царапины), кожа, мех, кость (поры, трещины), ткань.
- Без толстого чёрного контура: форму отделяют свет и тень.
- Пропорции реалистичные, героизированные (голова ~1/7 роста), кроме существ, для которых другие пропорции — суть (гоблины, гномы, огры).
- Все расы — одна манера письма: юниты разных рас стоят рядом на одном поле.

**Палитры рас:**

| Раса | Палитра |
|---|---|
| Некроманты | фиолетовый, кость, зелёное свечение нежити |
| Рыцари | полированная сталь, синее сукно, золото |
| Маги | лазурь, латунь, камень, голубое арканное свечение |
| Эльфы | лесная зелень, кора, серебро, светло-зелёная магия природы |
| Варвары | кожа, мех, ржавое железо, красная боевая раскраска |
| Демоны | багровая кожа, чёрное железо, пламя преисподней |
| Подземелье | фиолетовый сумрак, вороная сталь, тёмные эльфы с серо-фиолетовой кожей и белыми волосами |
| Крепость | гномья сталь, бронза, ржаво-оранжевые клановые цвета, руны, магма |

**Библия стиля:** 10–20 эталонных изображений (по 1–3 на расу, обязательно люди, звери, драконы и нежить), утверждённых владельцем до массовой генерации. На них обучается модель стиля (LoRA в Scenario); каждый следующий юнит генерируется этой моделью.

## 3. Технические требования

**Ракурс и холст**
- Вид сбоку в 3/4, юнит **смотрит вправо** (для команды слева игра отражает спрайт).
- Квадратный холст **512×512**, прозрачный фон (PNG с альфа-каналом), чистые края без ореола фона.
- Ступни (копыта, лапы) — на линии **y = 92 %** высоты холста; фигура по высоте от ~10 % до 92 %. Летающие и парящие — на 6–14 % выше линии земли.
- Крупные юниты (2×2) рисуются на таком же холсте и так же его заполняют: игра сама показывает их вдвое крупнее.
- Без тени на земле (её рисует игра), без текста, рамок, водяных знаков.

**Анимации** — спрайт-листы PNG с прозрачным фоном, кадр 512×512 (допустимо 384×384, если упрёмся в память), **12 кадров/с**:

| Анимация | Кадров | Петля | Что происходит |
|---|---|---|---|
| idle — покой | 8 | да | дыхание, лёгкое покачивание, у летающих — неторопливые взмахи |
| move — движение | 8 | да | по типу движения юнита (см. описание юнита) |
| attack — атака | 8–10 | нет | по типу атаки юнита; самый сильный кадр удара — 5–6-й |
| hit — получение удара | 4 | нет | вздрагивание, откидывание головы |
| death — гибель | 8 | нет | падение, обмякание, у нежити — рассыпание / развеивание |

**Требования к анимации**
- Юнит **не меняется между кадрами**: то же лицо, доспех, оружие, цвета, пропорции.
- Точка опоры (ступни на y = 92 %) не уезжает по горизонтали; ракурс не поворачивается.
- Петли бесшовные: последний кадр переходит в первый без скачка.
- Перемещение по клеткам делает игра — анимация движения идёт «на месте».

**Иконка-портрет:** 256×256, голова и плечи (у зверей — голова), тот же ракурс, прозрачный фон.

**Имена файлов:** `<id>/idle.png`, `<id>/move.png`, `<id>/attack.png`, `<id>/hit.png`, `<id>/death.png`, `<id>/portrait.png`, где `<id>` — идентификатор юнита из списка ниже (например, `necro_skeleton`). Спрайт-лист — кадры в один ряд слева направо, плюс JSON с размером кадра и числом кадров.

## 4. Шаблон промпта

Основной кадр (поза готовности):

```
<UNIT DESCRIPTION>. Dark fantasy painterly game character art, semi-realistic,
strong volumetric lighting from the upper left, cool rim light in shadows,
detailed material textures, no black outlines. Side 3/4 view, facing right,
full body, feet on the ground line at 92% of the canvas height, figure fills
the frame vertically. Transparent background, no ground shadow, no text.
Color palette: <RACE PALETTE>.
```

Анимация (по основному кадру как исходнику):

```
Animate this exact character: <ANIMATION: idle breathing loop | MOTION | ATTACK | hit reaction | death>.
Keep the character identical in every frame (face, armor, weapon, colors, proportions),
same side 3/4 view facing right, fixed camera, feet anchored on the same ground line,
<N> frames, seamless loop (for idle/move), transparent background.
```

## 5. Порядок работ и приёмка

1. **Библия стиля** — 10–20 эталонов, утверждает владелец.
2. **Пилот на 3 юнитах:** `necro_skeleton` (пеший 1×1), `knight_cavalier` (всадник 2×2), `elf_silver_dragon` (летающий дракон 2×2) — основной кадр, все 5 анимаций и портрет.
3. **Приёмка пилота:**
   - стиль одинаков у всех трёх юнитов;
   - кадры не «плывут» (лицо, детали, цвета стабильны);
   - юниты читаются на 120 px, роль понятна по силуэту;
   - фон чистый, края без ореола;
   - опора на месте, петли бесшовные.
4. Если анимации «плывут» сильнее допустимого — запасной путь: растровые **части тела по слоям** текущего рига (корпус, голова, руки, ноги, крылья, хвост) с прежними шарнирами. Анимация останется поворотами частей, зато живопись станет растровой.
5. **Массовая генерация** по расам, каждая раса — на утверждение владельцем.
6. **Встраивание в игру** (делает разработка): проигрыватель спрайт-листов вместо рига, загрузка только юнитов текущего боя, сжатие. Ориентир по памяти: в бою до 14 типов юнитов — кадры 384–512 px с атласом и сжатием.

## 6. Юниты

Формат: **уровень · русское / английское название** (`id`) — вариант, роль, размер, перемещение; тип движения и атаки — для анимаций move и attack; способности — для понимания образа; затем описание для промпта.

### Некроманты

Палитра: фиолетовый, кость, зелёное свечение нежити.

**1 · Скелет / Skeleton** (`necro_skeleton`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Нежить — Не боится яда и ослепления.  
> Animated human skeleton warrior, yellowed cracked bones, glowing green eye sockets, rusty notched sword raised, round wooden shield with iron rim and boss. Move: walk cycle; attack: overhead swing attack.

**1 · Скелет-лучник / Skeleton Archer** (`necro_skeleton_archer`) — альтернативный, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
Способности: Нежить — Не боится яда и ослепления.  
> Skeleton archer in a tattered dark purple hood, drawing a bow made of bone, quiver of black-fletched arrows on the back, green glowing eyes. Move: walk cycle; attack: ranged shot / throw.

**2 · Зомби / Zombie** (`necro_zombie`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Нежить — Не боится яда и ослепления.  
> Bloated obese zombie butcher, rotting grey-green skin with bruises and stretch marks, short torn stained shirt over a hanging belly, bloody leather butcher apron, double chin, milky eye, holding a rusty bloody meat cleaver. Move: walk cycle; attack: overhead swing attack.

**2 · Чумной зомби / Plague Zombie** (`necro_plague_zombie`) — альтернативный, мобильный, 1×1, пеший.  
Движение: шаг (пеший). Атака: удар когтями / руками.  
Способности: Яд — Отравляет цель на 3 раунда; Нежить — Не боится яда и ослепления.  
> Emaciated plague zombie sprinting hunched forward, sickly yellow-grey skin covered in swollen buboes and burst sores, black necrotic fingers reaching out, ragged peasant tunic with rope belt, red rag around the neck, drooling green bile, flies and a faint toxic green miasma. Move: walk cycle; attack: claw slash attack.

**3 · Призрак / Ghost** (`necro_ghost`) — основной, мобильный, 1×1, летает.  
Движение: парение без шагов. Атака: удар когтями / руками.  
Способности: Бесплотность — Шанс 30% избежать урона в ближнем бою; Нежить — Не боится яда и ослепления.  
> Translucent teal ghost in a hooded shroud that fades into wisps at the bottom, spectral skull face with gaping jaw inside the hood, skeletal hands reaching forward, faint green glow. Move: hovering float without steps; attack: claw slash attack.

**3 · Банши / Banshee** (`necro_banshee`) — альтернативный, мобильный, 1×1, летает.  
Движение: парение без шагов. Атака: заклинание (жест рукой, вспышка магии).  
Способности: Похищение инициативы — Цель теряет 2 инициативы на 2 раунда; Нежить — Не боится яда и ослепления.  
> Translucent pale-blue spectral woman screaming, long violet-grey hair streaming far behind her, tattered gown dissolving into mist, arm outstretched with long fingers, visible sound-wave rings from the mouth. Move: hovering float without steps; attack: spellcasting gesture with a magic burst.

**4 · Вампир / Vampire** (`necro_vampire`) — основной, мобильный, 1×1, летает.  
Движение: парение без шагов. Атака: укол / выпад вперёд.  
Способности: Высасывание жизни — Восстанавливает HP в размере половины нанесённого урона, поднимая павших; Без ответа — Цель не отвечает на удар; Нежить — Не боится яда и ослепления.  
> Aristocratic vampire floating above the ground, pale gaunt face, slicked-back black hair with widow's peak, red glowing eyes, black tailcoat, crimson waistcoat, white jabot with a ruby brooch, high-collared black cape with blood-red lining, slender rapier with gold swept hilt in en-garde pose. Move: hovering float without steps; attack: forward thrust / lunge attack.

**4 · Мумия / Mummy** (`necro_mummy`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: удар когтями / руками.  
Способности: Проклинающий удар — Цель теряет 3 атаки на 2 раунда; Нежить — Не боится яда и ослепления.  
> Ancient mummy wrapped in layered yellowed linen bandages with dark gaps of dried skin, loose strips hanging, gold scarab amulet with green gem, one glowing green eye through a gap, shambling with one arm reaching forward. Move: walk cycle; attack: claw slash attack.

**5 · Лич / Lich** (`necro_lich`) — основной, стрелок, 1×1, пеший.  
Движение: парение без шагов. Атака: заклинание (жест рукой, вспышка магии).  
Способности: Удар по области — Бьёт цель и всех юнитов вокруг неё, включая своих; Нежить — Не боится яда и ослепления.  
> Skeletal lich mage in a deep violet robe with gold trim, gold circlet crown over the hood, skull deep in shadow with green glowing eye, gnarled wooden staff topped with a glowing green orb held by bone claws, casting green fire from a bony hand. Move: hovering float without steps; attack: spellcasting gesture with a magic burst.

**5 · Рыцарь смерти / Death Knight** (`necro_death_knight`) — альтернативный, мобильный, 2×2, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Разбег — +5% урона за каждую клетку пути перед атакой (до +50%); Смертельный удар — Шанс 20% нанести двойной урон; Нежить — Не боится яда и ослепления.  
> Death knight in black spiked plate armor with horned helmet and green-glowing visor slit, riding a skeletal horse with ghostly green flaming mane and tail, purple caparison with gold trim, raising a runed glowing sword. Move: gallop / run cycle on four legs; attack: overhead swing attack.

**6 · Мерзость / Abomination** (`necro_abomination`) — основной, тяжёлый, 2×2, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Яд — Отравляет цель на 3 раунда; Нежить — Не боится яда и ослепления.  
> Huge flesh-golem abomination stitched from patches of different skin tones, enormous hunched torso, tiny head sunk between shoulders, crude stitches and iron staples, open wound with ribs and green ooze, wide leather belt, big rusty cleaver in one hand and a hook on a chain in the other. Move: walk cycle; attack: overhead swing attack.

**6 · Теневая виверна / Shadow Wyvern** (`necro_shadow_wyvern`) — альтернативный, мобильный, 2×2, летает.  
Движение: полёт на крыльях. Атака: укус (бросок головы вперёд).  
Способности: Яд — Отравляет цель на 3 раунда; Нежить — Не боится яда и ослепления.  
> Shadow wyvern, dark purple-black scaled body, membranous bat wings with finger bones, horned reptilian head with fangs dripping green venom, long tail ending in a glowing green stinger, bone spikes along the spine. Move: flying with wing flaps; attack: lunging bite attack.

**7 · Костяной дракон / Bone Dragon** (`necro_bone_dragon`) — основной, мобильный, 2×2, летает.  
Движение: полёт на крыльях. Атака: укус (бросок головы вперёд).  
Способности: Аура ужаса — Соседние враги получают −1 к инициативе; Нежить — Не боится яда и ослепления.  
> Skeletal dragon, bare bleached bones, ribcage with a glowing green undead heart inside, tattered purple membrane remnants on finger-bone wings, horned dragon skull with green glowing eye, vertebrae tail with bone spikes. Move: flying with wing flaps; attack: lunging bite attack.

**7 · Повелитель личей / Lich Lord** (`necro_lich_lord`) — альтернативный, стрелок, 2×2, пеший.  
Движение: парение без шагов. Атака: заклинание (жест рукой, вспышка магии).  
Способности: Удар по области — Бьёт цель и всех юнитов вокруг неё, включая своих; Сжигание маны — При атаке сжигает ману вражеского героя; Нежить — Не боится яда и ослепления.  
> Lich lord archmage floating, skull in a golden horned crown, rich violet robes with gold rune stripe, gold pauldrons with small skulls, belt of skulls, tall dark staff topped with a skull wreathed in green flame, green fire in the other hand, ghostly green aura ring. Move: hovering float without steps; attack: spellcasting gesture with a magic burst.

### Рыцари

Палитра: полированная сталь, синее сукно, золото.

**1 · Крестьянин / Peasant** (`knight_peasant`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: укол / выпад вперёд.  
> Humble medieval peasant militia, brown homespun tunic, rope belt, short brown hair and beard, holding a pitchfork forward like a spear. Move: walk cycle; attack: forward thrust / lunge attack.

**1 · Пращник / Slinger** (`knight_slinger`) — альтернативный, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
> Young peasant slinger in a leather jerkin and cloth cap, blue trousers, whirling a leather sling above his head. Move: walk cycle; attack: ranged shot / throw.

**2 · Копейщик / Spearman** (`knight_spearman`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: укол / выпад вперёд.  
Способности: Бесконечный ответ — Отвечает на каждую атаку ближнего боя.  
> Spearman in chainmail with blue tabard bearing a gold cross, steel kettle helmet, beard, long spear held forward, round blue shield with gold emblem. Move: walk cycle; attack: forward thrust / lunge attack.

**2 · Лучник / Archer** (`knight_archer`) — альтернативный, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
> Longbowman in a green hood, leather armor with blue tabard, drawing a yew longbow. Move: walk cycle; attack: ranged shot / throw.

**3 · Грифон / Griffin** (`knight_griffin`) — основной, мобильный, 1×1, летает.  
Движение: полёт на крыльях. Атака: удар когтями / руками.  
Способности: Бесконечный ответ — Отвечает на каждую атаку ближнего боя.  
> Majestic griffin, white eagle head with golden beak, white feathered wings spread, tawny lion body and tail with a tuft, eagle talons on front legs. Move: flying with wing flaps; attack: claw slash attack.

**3 · Мечник / Swordsman** (`knight_swordsman`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Аура защиты — Соседние союзники получают +20% защиты.  
> Heavy swordsman in polished steel full plate, blue tabard with gold cross, barbute helmet with blue plume, arming sword raised, blue kite shield with gold cross. Move: walk cycle; attack: overhead swing attack.

**4 · Монах / Monk** (`knight_monk`) — основной, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
Способности: Без штрафа вплотную — Нет штрафа при стрельбе вплотную.  
> Old warrior monk in a brown hooded robe with rope belt, long grey beard, holding a wooden staff, casting a ball of holy golden light from his palm. Move: walk cycle; attack: spellcasting gesture with a magic burst.

**4 · Инквизитор / Inquisitor** (`knight_inquisitor`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Развеивающий удар — Снимает с цели положительные эффекты.  
> Grim inquisitor in chainmail under a crimson tabard with gold cross, crimson hood, grey beard, flanged steel mace and a glowing holy book. Move: walk cycle; attack: overhead swing attack.

**5 · Кавалерист / Cavalier** (`knight_cavalier`) — основной, тяжёлый, 2×2, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укол / выпад вперёд.  
Способности: Разбег — +5% урона за каждую клетку пути перед атакой (до +50%).  
> Heavy cavalier in full plate with great helm and white plume, blue tabard with gold cross, riding an armored warhorse with blue caparison and gold trim, couched long lance, kite shield. Move: gallop / run cycle on four legs; attack: forward thrust / lunge attack.

**5 · Паладин / Paladin** (`knight_paladin`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Заклинатель — Раз в бой вместо атаки применяет заклинание.  
> Paladin in gleaming steel plate with gold pauldrons and trim, winged golden helmet, white tabard with gold cross, white cape, two-handed greatsword glowing with holy light. Move: walk cycle; attack: overhead swing attack.

**6 · Ангел / Angel** (`knight_angel`) — основной, мобильный, 1×1, летает.  
Движение: полёт на крыльях. Атака: рубящий удар (замах над головой и удар вниз).  
> Female warrior angel hovering, large white feathered wings, golden breastplate, long blond hair with gold circlet, white skirt, shining sword, soft golden aura. Move: flying with wing flaps; attack: overhead swing attack.

**6 · Серафим / Seraph** (`knight_seraph`) — альтернативный, стрелок, 1×1, летает.  
Движение: полёт на крыльях. Атака: выстрел / бросок.  
> Female seraph archer hovering, six-feathered white wings, white flowing robe with gold trim, platinum hair with gold circlet, drawing a golden bow of light. Move: flying with wing flaps; attack: ranged shot / throw.

**7 · Архангел / Archangel** (`knight_archangel`) — основной, мобильный, 2×2, летает.  
Движение: полёт на крыльях. Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Заклинатель — Раз в бой вместо атаки применяет заклинание.  
> Towering archangel in golden full plate, huge white wings, winged golden helmet, long golden hair, white tabard with gold cross, enormous radiant two-handed greatsword, bright holy aura. Move: flying with wing flaps; attack: overhead swing attack.

**7 · Золотой дракон / Gold Dragon** (`knight_gold_dragon`) — альтернативный, мобильный, 2×2, летает.  
Движение: полёт на крыльях. Атака: укус (бросок головы вперёд).  
Способности: Огненное дыхание — Обжигает и клетку за целью; Сопротивление магии — Вражеские заклинания наносят вдвое меньше урона и действуют вдвое короче.  
> Majestic gold dragon with shining golden scales, cream belly plates, wide golden membrane wings, ivory horns, white glowing eyes, breathing golden fire. Move: flying with wing flaps; attack: lunging bite attack.

### Маги

Палитра: лазурь, латунь, камень, голубое арканное свечение.

**1 · Гремлин / Gremlin** (`wizard_gremlin`) — основной, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
> Small mischievous gremlin with grey-blue skin, huge bat-like ears, yellow glowing eyes, leather work apron with brass buckle, firing a small crackling magic spark from its hand. Move: walk cycle; attack: spellcasting gesture with a magic burst.

**1 · Латунный страж / Brass Sentry** (`wizard_brass_sentry`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: укол / выпад вперёд.  
> Clockwork brass sentry construct, riveted brass body, glowing blue eye slits, brass spear and round brass shield with an azure emblem. Move: walk cycle; attack: forward thrust / lunge attack.

**2 · Горгулья / Gargoyle** (`wizard_gargoyle`) — основной, мобильный, 1×1, летает.  
Движение: полёт на крыльях. Атака: удар когтями / руками.  
Способности: Иммунитет к яду — Не может быть отравлен.  
> Stone gargoyle with grey cracked stone skin, small horns, stone bat wings, long tail, clawed hands, glowing blue eyes, hovering. Move: flying with wing flaps; attack: claw slash attack.

**2 · Каменный пёс / Stone Hound** (`wizard_stone_hound`) — альтернативный, мобильный, 1×1, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укус (бросок головы вперёд).  
> Stone hound, wolf-like construct carved from grey stone with cracks, glowing blue eyes, short stub tail. Move: gallop / run cycle on four legs; attack: lunging bite attack.

**3 · Железный голем / Iron Golem** (`wizard_iron_golem`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Сопротивление магии — Вражеские заклинания наносят вдвое меньше урона и действуют вдвое короче.  
> Massive iron golem, dark riveted iron plates, blocky head with glowing orange eyes, huge iron fists. Move: walk cycle; attack: overhead swing attack.

**3 · Глиняный голем / Clay Golem** (`wizard_clay_golem`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Регенерация — В начале хода исцеляет верхнее существо стака.  
> Clay golem of reddish fired clay, smooth bulky body with golden glowing cracks, blocky head with yellow glowing eyes, heavy fists. Move: walk cycle; attack: overhead swing attack.

**4 · Маг / Mage** (`wizard_mage`) — основной, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
Способности: Без штрафа вплотную — Нет штрафа при стрельбе вплотную.  
> Old human mage in an azure hooded robe with gold trim, long grey beard, wooden staff topped with a glowing blue crystal orb, casting arcane energy. Move: walk cycle; attack: spellcasting gesture with a magic burst.

**4 · Чародей / Enchanter** (`wizard_enchanter`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
Способности: Заклинатель — Раз в бой вместо атаки применяет заклинание.  
> Elegant female enchantress in a violet robe with gold trim, long black hair, gold circlet, holding a glowing spellbook and casting violet light. Move: walk cycle; attack: spellcasting gesture with a magic burst.

**5 · Джинн / Genie** (`wizard_genie`) — основной, мобильный, 1×1, летает.  
Движение: парение без шагов. Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Заклинатель — Раз в бой вместо атаки применяет заклинание.  
> Blue-skinned muscular genie floating on a swirl of blue smoke instead of legs, white turban with a gem, black beard, gold belt, curved scimitar. Move: hovering float without steps; attack: overhead swing attack.

**5 · Нага / Naga** (`wizard_naga`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: парение без шагов. Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Без ответа — Цель не отвечает на удар.  
> Naga warrior woman with a green-scaled serpent tail instead of legs, teal-green skin, golden breastplate and crown, long black hair, golden scimitar and small buckler. Move: hovering float without steps; attack: overhead swing attack.

**6 · Каменный колосс / Stone Colossus** (`wizard_stone_colossus`) — основной, тяжёлый, 2×2, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
> Colossal stone golem, huge bulky body of grey granite blocks, glowing blue rune cracks, small head with blue glowing eyes, giant stone fists. Move: walk cycle; attack: overhead swing attack.

**6 · Элементаль бури / Storm Elemental** (`wizard_storm_elemental`) — альтернативный, мобильный, 1×1, летает.  
Движение: парение без шагов. Атака: удар когтями / руками.  
Способности: Цепная атака — Атака перескакивает ещё на 2 врагов с уроном 50% и 25%.  
> Storm elemental, humanoid of swirling grey-blue storm clouds with white wild hair of wind, lower body a vortex, lightning crackling around it, glowing white eyes, clawed hands. Move: hovering float without steps; attack: claw slash attack.

**7 · Титан / Titan** (`wizard_titan`) — основной, стрелок, 2×2, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
Способности: Без штрафа вплотную — Нет штрафа при стрельбе вплотную.  
> Giant titan in golden armor with azure tabard, long white hair and beard, gold circlet, hurling a bolt of lightning from his raised hand. Move: walk cycle; attack: spellcasting gesture with a magic burst.

**7 · Магический дракон / Arcane Dragon** (`wizard_arcane_dragon`) — альтернативный, мобильный, 2×2, летает.  
Движение: полёт на крыльях. Атака: укус (бросок головы вперёд).  
Способности: Иммунитет к магии — Заклинания на него не действуют.  
> Arcane dragon with violet-blue scales, glowing light-blue belly and wing membranes, crystal-white horns, breathing a stream of shimmering arcane energy. Move: flying with wing flaps; attack: lunging bite attack.

### Эльфы

Палитра: лесная зелень, кора, серебро, светло-зелёная магия природы.

**1 · Фея / Sprite** (`elf_sprite`) — основной, мобильный, 1×1, летает.  
Движение: полёт на крыльях. Атака: укол / выпад вперёд.  
Способности: Без ответа — Цель не отвечает на удар.  
> Tiny forest sprite girl with translucent dragonfly wings, leaf dress, green hair, pale green skin, holding a tiny glowing dagger, sparkles around her. Move: flying with wing flaps; attack: forward thrust / lunge attack.

**1 · Лесной разведчик / Wood Scout** (`elf_wood_scout`) — альтернативный, мобильный, 1×1, пеший.  
Движение: шаг (пеший). Атака: укол / выпад вперёд.  
> Elven wood scout in a moss-green hooded cloak, leather armor, short silver sword, light agile stance. Move: walk cycle; attack: forward thrust / lunge attack.

**2 · Эльфийский лучник / Elven Archer** (`elf_elven_archer`) — основной, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
Способности: Двойная атака — Атакует дважды.  
> Elven archer with long blond hair and silver circlet, green tunic over leather armor, green cloak, drawing an elegant silver longbow. Move: walk cycle; attack: ranged shot / throw.

**2 · Дриада / Dryad** (`elf_dryad`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
Способности: Опутывание — Цель не может двигаться до конца своего следующего хода.  
> Dryad, female tree spirit with bark-textured brown skin, hair of green leaves, skirt of leaves, eyes glowing green, casting nature magic. Move: walk cycle; attack: spellcasting gesture with a magic burst.

**3 · Друид / Druid** (`elf_druid`) — основной, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
Способности: Без штрафа вплотную — Нет штрафа при стрельбе вплотную.  
> Old elven druid with long white hair and beard, antler-like branches growing from his head, moss-green robe, wooden staff with a glowing green orb. Move: walk cycle; attack: spellcasting gesture with a magic burst.

**3 · Лютоволк / Dire Wolf** (`elf_dire_wolf`) — альтернативный, мобильный, 1×1, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укус (бросок головы вперёд).  
Способности: Двойная атака — Атакует дважды.  
> Huge grey dire wolf with thick fur, pale belly, yellow eyes, bared fangs. Move: gallop / run cycle on four legs; attack: lunging bite attack.

**4 · Единорог / Unicorn** (`elf_unicorn`) — основной, мобильный, 2×2, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укол / выпад вперёд.  
Способности: Аура сопротивления магии — Соседние союзники сопротивляются магии.  
> White unicorn with a spiral pearly horn, silver-lilac mane and tail, faint magical aura. Move: gallop / run cycle on four legs; attack: forward thrust / lunge attack.

**4 · Кентавр / Centaur** (`elf_centaur`) — альтернативный, стрелок, 1×1, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: выстрел / бросок.  
> Centaur archer, chestnut horse body, elven human torso in leather armor, long brown hair, drawing a wooden bow. Move: gallop / run cycle on four legs; attack: ranged shot / throw.

**5 · Энт / Treant** (`elf_treant`) — основной, тяжёлый, 2×2, пеший.  
Движение: шаг (пеший). Атака: удар когтями / руками.  
Способности: Опутывание — Цель не может двигаться до конца своего следующего хода.  
> Ancient treant, giant walking tree with gnarled bark body, branch arms with twig claws, leafy crown, glowing green eyes in the bark face. Move: walk cycle; attack: claw slash attack.

**5 · Следопыт / Ranger** (`elf_ranger`) — альтернативный, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
Способности: Без штрафа за дальность — Нет штрафа за дальний выстрел.  
> Elven ranger in a dark leather armor and green hooded cloak, long brown hair, drawing a longbow. Move: walk cycle; attack: ranged shot / throw.

**6 · Феникс / Phoenix** (`elf_phoenix`) — основной, мобильный, 1×1, летает.  
Движение: полёт на крыльях. Атака: укус (бросок головы вперёд).  
Способности: Возрождение — Раз в бой возрождается с 30% начальной численности.  
> Phoenix, large firebird with orange and golden flaming feathers, long fiery tail plumes, blazing wings, white-hot eyes. Move: flying with wing flaps; attack: lunging bite attack.

**6 · Страж леса / Forest Guardian** (`elf_forest_guardian`) — альтернативный, тяжёлый, 2×2, пеший.  
Движение: шаг (пеший). Атака: укол / выпад вперёд.  
Способности: Удар по области — Бьёт цель и всех юнитов вокруг неё, включая своих.  
> Giant elven forest guardian in green wood-and-leaf plate armor, great helm with leaf plume, long white hair, green cape, long glaive glowing with nature magic. Move: walk cycle; attack: forward thrust / lunge attack.

**7 · Серебряный дракон / Silver Dragon** (`elf_silver_dragon`) — основной, мобильный, 2×2, летает.  
Движение: полёт на крыльях. Атака: укус (бросок головы вперёд).  
Способности: Огненное дыхание — Обжигает и клетку за целью.  
> Silver dragon with gleaming silver-white scales, pale blue wing membranes, light blue eyes, breathing frost. Move: flying with wing flaps; attack: lunging bite attack.

**7 · Изумрудный дракон / Emerald Dragon** (`elf_emerald_dragon`) — альтернативный, мобильный, 2×2, летает.  
Движение: полёт на крыльях. Атака: укус (бросок головы вперёд).  
Способности: Огненное дыхание — Обжигает и клетку за целью; Яд — Отравляет цель на 3 раунда.  
> Emerald dragon with deep green scales, light green belly, bright green wing membranes, yellow-green eyes, breathing poisonous green fire. Move: flying with wing flaps; attack: lunging bite attack.

### Варвары

Палитра: кожа, мех, ржавое железо, красная боевая раскраска.

**1 · Гоблин / Goblin** (`barbarian_goblin`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
> Scrawny green goblin with huge ears and long nose, leather vest, wooden club and small wooden buckler. Move: walk cycle; attack: overhead swing attack.

**1 · Гоблин-метатель / Goblin Spearthrower** (`barbarian_goblin_spearthrower`) — альтернативный, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
> Green goblin with a black mohawk, fur vest, throwing a crude rusty javelin. Move: walk cycle; attack: ranged shot / throw.

**2 · Всадник на волке / Wolf Rider** (`barbarian_wolf_rider`) — основной, мобильный, 1×1, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Двойная атака — Атакует дважды.  
> Goblin in a leather cap riding a dark grey wolf, swinging a rusty hand axe. Move: gallop / run cycle on four legs; attack: overhead swing attack.

**2 · Орк-воин / Orc Warrior** (`barbarian_orc_warrior`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
> Muscular green orc warrior with tusks and black mohawk, fur armor, rusty axe and round wooden shield with red war paint. Move: walk cycle; attack: overhead swing attack.

**3 · Орк-метатель топоров / Orc Axe Thrower** (`barbarian_orc_axe_thrower`) — основной, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
> Orc axe thrower with long black hair and tusks, leather armor, throwing a hand axe. Move: walk cycle; attack: ranged shot / throw.

**3 · Берсерк / Berserker** (`barbarian_berserker`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
> Human berserker with wild red hair and braided red beard, bare muscular chest with red war paint, fur trousers, huge two-handed rusty greataxe, rage-red eyes. Move: walk cycle; attack: overhead swing attack.

**4 · Огр / Ogre** (`barbarian_ogre`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
> Huge fat ogre with tusks and small eyes, bare chest, loincloth, giant wooden club held with both hands. Move: walk cycle; attack: overhead swing attack.

**4 · Огр-шаман / Ogre Shaman** (`barbarian_ogre_shaman`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
Способности: Заклинатель — Раз в бой вместо атаки применяет заклинание.  
> Ogre shaman with small horns and tusks, fur cloak, bone fetishes, staff with a glowing blue orb, casting. Move: walk cycle; attack: spellcasting gesture with a magic burst.

**5 · Птица грома / Thunderbird** (`barbarian_thunderbird`) — основной, мобильный, 2×2, летает.  
Движение: полёт на крыльях. Атака: укус (бросок головы вперёд).  
Способности: Оглушение — Шанс 20%: цель теряет половину инициативы на раунд.  
> Giant thunderbird with dark blue-black feathers, golden crest, lightning crackling along its wings, white glowing eyes. Move: flying with wing flaps; attack: lunging bite attack.

**5 · Боевой тролль / War Troll** (`barbarian_war_troll`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Регенерация — В начале хода исцеляет верхнее существо стака.  
> Tall grey-green war troll with long arms, tusks, wild black hair, loincloth, heavy club. Move: walk cycle; attack: overhead swing attack.

**6 · Циклоп / Cyclops** (`barbarian_cyclops`) — основной, стрелок, 2×2, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
Способности: Удар по области — Бьёт цель и всех юнитов вокруг неё, включая своих.  
> One-eyed giant cyclops in fur loincloth, huge single eye, lifting a boulder to throw. Move: walk cycle; attack: ranged shot / throw.

**6 · Холмовой великан / Hill Giant** (`barbarian_hill_giant`) — альтернативный, тяжёлый, 2×2, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Оглушение — Шанс 20%: цель теряет половину инициативы на раунд.  
> Hill giant with long brown hair and beard, fur clothing, enormous tree-trunk club held with both hands. Move: walk cycle; attack: overhead swing attack.

**7 · Мамонт / Mammoth** (`barbarian_mammoth`) — основной, тяжёлый, 2×2, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укол / выпад вперёд.  
Способности: Удар по области — Бьёт цель и всех юнитов вокруг неё, включая своих.  
> Woolly war mammoth with shaggy brown fur, long curved ivory tusks, raised trunk. Move: gallop / run cycle on four legs; attack: forward thrust / lunge attack.

**7 · Боевой носорог / War Rhino** (`barbarian_war_rhino`) — альтернативный, тяжёлый, 2×2, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укол / выпад вперёд.  
Способности: Разбег — +5% урона за каждую клетку пути перед атакой (до +50%).  
> Armored war rhino with grey hide, rusty iron barding with red war-paint trim, large front horn. Move: gallop / run cycle on four legs; attack: forward thrust / lunge attack.

### Демоны

Палитра: багровая кожа, чёрное железо, пламя преисподней.

**1 · Бес / Imp** (`demon_imp`) — основной, мобильный, 1×1, пеший.  
Движение: шаг (пеший). Атака: удар когтями / руками.  
> Small red imp with little horns, big pointed ears, bat wings, spaded tail, goat hooves, glowing orange eyes, clawed hands. Move: walk cycle; attack: claw slash attack.

**1 · Фамильяр / Familiar** (`demon_familiar`) — альтернативный, мобильный, 1×1, пеший.  
Движение: парение без шагов. Атака: заклинание (жест рукой, вспышка магии).  
Способности: Сжигание маны — При атаке сжигает ману вражеского героя.  
> Small purple demon familiar floating on purple smoke, curled ram horns, glowing violet eyes, casting violet magic. Move: hovering float without steps; attack: spellcasting gesture with a magic burst.

**2 · Адская гончая / Hellhound** (`demon_hellhound`) — основной, мобильный, 1×1, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укус (бросок головы вперёд).  
Способности: Двойная атака — Атакует дважды.  
> Black hellhound with fiery mane, burning orange eyes, tail of flame, embers around it. Move: gallop / run cycle on four legs; attack: lunging bite attack.

**2 · Рогатый демон / Horned Demon** (`demon_horned_demon`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: укол / выпад вперёд.  
> Muscular red horned demon with curled ram horns and tusks, goat legs with hooves, demon tail, wielding a black iron trident. Move: walk cycle; attack: forward thrust / lunge attack.

**3 · Суккуб / Succubus** (`demon_succubus`) — основной, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
> Succubus with rose-tinted skin, long black hair, long black horns, bat wings, demon tail, dark leather outfit, casting pink-red fire. Move: walk cycle; attack: spellcasting gesture with a magic burst.

**3 · Огнехлыст / Flame Lasher** (`demon_flame_lasher`) — альтернативный, мобильный, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Без ответа — Цель не отвечает на удар.  
> Red demon with bull horns and a flaming crown of fire hair, goat legs, dark leather harness, cracking a whip of fire. Move: walk cycle; attack: overhead swing attack.

**4 · Кошмар / Nightmare** (`demon_nightmare`) — основной, мобильный, 2×2, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укол / выпад вперёд.  
Способности: Разбег — +5% урона за каждую клетку пути перед атакой (до +50%).  
> Nightmare, black demonic horse with a mane and tail of fire, burning orange eyes, smouldering hooves. Move: gallop / run cycle on four legs; attack: forward thrust / lunge attack.

**4 · Цербер / Cerberus** (`demon_cerberus`) — альтернативный, мобильный, 1×1, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укус (бросок головы вперёд).  
Способности: Удар по области — Бьёт цель и всех юнитов вокруг неё, включая своих.  
> Cerberus, three-headed hellhound with dark reddish-black fur, fiery manes, burning eyes, snarling fangs. Move: gallop / run cycle on four legs; attack: lunging bite attack.

**5 · Изверг преисподней / Infernal Fiend** (`demon_infernal_fiend`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: удар когтями / руками.  
Способности: Огненная аура — В начале хода обжигает соседних врагов.  
> Hulking dark red infernal fiend with long horns, tusks, glowing magma cracks on the chest, hooves, burning aura, huge claws. Move: walk cycle; attack: claw slash attack.

**5 · Метатель серы / Brimstone Thrower** (`demon_brimstone_thrower`) — альтернативный, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
Способности: Удар по области — Бьёт цель и всех юнитов вокруг неё, включая своих.  
> Red demon with ram horns in black iron armor, hurling a flaming brimstone rock. Move: walk cycle; attack: ranged shot / throw.

**6 · Ифрит / Efreet** (`demon_efreet`) — основной, мобильный, 1×1, летает.  
Движение: парение без шагов. Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Иммунитет к огню — Не получает урона от огня; Огненная аура — В начале хода обжигает соседних врагов.  
> Efreet, fire genie with orange-gold glowing skin, hair and beard of flame, lower body a column of fire, golden scimitar, burning aura. Move: hovering float without steps; attack: overhead swing attack.

**6 · Лавовый громила / Lava Brute** (`demon_lava_brute`) — альтернативный, тяжёлый, 2×2, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Иммунитет к огню — Не получает урона от огня.  
> Huge lava brute, body of dark cooled magma with bright glowing lava cracks, small horns, glowing eyes, massive fists. Move: walk cycle; attack: overhead swing attack.

**7 · Архидемон / Archfiend** (`demon_archfiend`) — основной, мобильный, 2×2, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Телепортация — Перемещается в любую свободную клетку в пределах скорости; Без ответа — Цель не отвечает на удар.  
> Archfiend demon lord, tall dark red demon with long horns and black hair, black iron plate armor, huge bat wings, demon tail, burning black greatsword. Move: walk cycle; attack: overhead swing attack.

**7 · Владыка рока / Doom Lord** (`demon_doom_lord`) — альтернативный, тяжёлый, 2×2, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Удар по области — Бьёт цель и всех юнитов вокруг неё, включая своих; Иммунитет к огню — Не получает урона от огня.  
> Doom lord, massive demon in black iron full plate with ram horns on a great helm, gold trim, crimson cape, huge flaming black greataxe. Move: walk cycle; attack: overhead swing attack.

### Подземелье

Палитра: фиолетовый сумрак, вороная сталь, тёмные эльфы с серо-фиолетовой кожей и белыми волосами.

**1 · Троглодит / Troglodyte** (`dungeon_troglodyte`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: укол / выпад вперёд.  
Способности: Иммунитет к ослеплению — Не может быть ослеплён.  
> Blind troglodyte, lizard-like humanoid with olive scaly skin and no eyes, loincloth, bone-tipped spear, reptile tail. Move: walk cycle; attack: forward thrust / lunge attack.

**1 · Пещерный паук / Cave Spider** (`dungeon_cave_spider`) — альтернативный, мобильный, 1×1, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укус (бросок головы вперёд).  
Способности: Яд — Отравляет цель на 3 раунда.  
> Giant black cave spider with a red mark on the abdomen, eight long legs, cluster of glowing red eyes, fangs. Move: gallop / run cycle on four legs; attack: lunging bite attack.

**2 · Гарпия / Harpy** (`dungeon_harpy`) — основной, мобильный, 1×1, летает.  
Движение: полёт на крыльях. Атака: удар когтями / руками.  
Способности: Удар с возвратом — После атаки возвращается на свою клетку.  
> Harpy, wild-haired woman with dark violet feathered wings and bird talons for feet, yellow eyes, clawed hands. Move: flying with wing flaps; attack: claw slash attack.

**2 · Тёмный разведчик / Dark Scout** (`dungeon_dark_scout`) — альтернативный, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
> Dark elf scout with grey-violet skin and white hair, dark hood and cloak, leather armor, black bow, red eyes. Move: walk cycle; attack: ranged shot / throw.

**3 · Теневой арбалетчик / Shadow Crossbowman** (`dungeon_shadow_crossbowman`) — основной, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
> Dark elf crossbowman in dark steel chainmail and purple tabard, kettle helmet, white hair, heavy crossbow. Move: walk cycle; attack: ranged shot / throw.

**3 · Ассасин / Assassin** (`dungeon_assassin`) — альтернативный, мобильный, 1×1, пеший.  
Движение: шаг (пеший). Атака: укол / выпад вперёд.  
Способности: Двойная атака — Атакует дважды.  
> Dark elf assassin in black hood and leather, face in shadow with violet glowing eyes, poisoned dagger dripping green. Move: walk cycle; attack: forward thrust / lunge attack.

**4 · Медуза / Medusa** (`dungeon_medusa`) — основной, стрелок, 1×1, пеший.  
Движение: парение без шагов. Атака: выстрел / бросок.  
Способности: Окаменение — Шанс 20%: цель пропускает следующий ход.  
> Medusa, green-skinned woman with a crown of living snakes, serpent tail instead of legs, bronze breastplate, drawing a bronze bow, petrifying yellow eyes. Move: hovering float without steps; attack: ranged shot / throw.

**4 · Всадник на ящере / Lizard Rider** (`dungeon_lizard_rider`) — альтернативный, мобильный, 1×1, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укол / выпад вперёд.  
Способности: Разбег — +5% урона за каждую клетку пути перед атакой (до +50%).  
> Dark elf lancer in dark steel and purple tabard riding a giant olive-green lizard, spear forward. Move: gallop / run cycle on four legs; attack: forward thrust / lunge attack.

**5 · Минотавр / Minotaur** (`dungeon_minotaur`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
> Minotaur with bull head and big horns, brown fur, muscular bare torso, hooves, huge two-handed dark steel greataxe, red eyes. Move: walk cycle; attack: overhead swing attack.

**5 · Ведьма глубин / Deep Witch** (`dungeon_deep_witch`) — альтернативный, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
Способности: Заклинатель — Раз в бой вместо атаки применяет заклинание.  
> Dark elf witch in a purple robe, white hair, violet circlet, holding a glowing violet orb and casting shadow magic. Move: walk cycle; attack: spellcasting gesture with a magic burst.

**6 · Мантикора / Manticore** (`dungeon_manticore`) — основной, мобильный, 2×2, летает.  
Движение: полёт на крыльях. Атака: укус (бросок головы вперёд).  
Способности: Яд — Отравляет цель на 3 раунда.  
> Manticore, red-brown lion body and mane, dark red bat wings, segmented scorpion tail with a green venom stinger, yellow eyes. Move: flying with wing flaps; attack: lunging bite attack.

**6 · Гидра / Hydra** (`dungeon_hydra`) — альтернативный, тяжёлый, 2×2, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: укус (бросок головы вперёд).  
Способности: Круговая атака — В ближнем бою бьёт и всех остальных соседних врагов; Без ответа — Цель не отвечает на удар.  
> Five-headed hydra, green-scaled serpentine lizard body, five long snake necks with fanged heads. Move: gallop / run cycle on four legs; attack: lunging bite attack.

**7 · Теневой дракон / Shadow Dragon** (`dungeon_shadow_dragon`) — основной, мобильный, 2×2, летает.  
Движение: полёт на крыльях. Атака: укус (бросок головы вперёд).  
Способности: Огненное дыхание — Обжигает и клетку за целью.  
> Shadow dragon with black-violet scales, dark membrane wings, violet glowing eyes, breathing violet shadow fire. Move: flying with wing flaps; attack: lunging bite attack.

**7 · Матриарх теней / Shadow Matriarch** (`dungeon_shadow_matriarch`) — альтернативный, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
Способности: Удар по области — Бьёт цель и всех юнитов вокруг неё, включая своих; Сжигание маны — При атаке сжигает ману вражеского героя.  
> Dark elf shadow matriarch queen, tall regal woman with white hair and violet crown, dark robes with gold trim and steel pauldrons, purple cape, staff of shadow magic, violet aura. Move: walk cycle; attack: spellcasting gesture with a magic burst.

### Крепость

Палитра: гномья сталь, бронза, ржаво-оранжевые клановые цвета, руны, магма.

**1 · Гном-защитник / Dwarf Defender** (`fortress_dwarf_defender`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
> Stout dwarf defender with braided red beard, horned steel helmet, chainmail with rust-orange clan tabard, axe and round bronze shield with an orange rune. Move: walk cycle; attack: overhead swing attack.

**1 · Метатель молотов / Hammer Hurler** (`fortress_hammer_hurler`) — альтернативный, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
> Dwarf with brown beard and bronze cap, leather armor, throwing a rune-glowing hammer. Move: walk cycle; attack: ranged shot / throw.

**2 · Всадник на вепре / Boar Rider** (`fortress_boar_rider`) — основной, мобильный, 1×1, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Разбег — +5% урона за каждую клетку пути перед атакой (до +50%).  
> Dwarf in chainmail and kettle helmet riding a bristly brown war boar with tusks, swinging an axe. Move: gallop / run cycle on four legs; attack: overhead swing attack.

**2 · Щитоносец / Shieldbearer** (`fortress_shieldbearer`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Аура защиты — Соседние союзники получают +20% защиты.  
> Dwarf shieldbearer in full steel plate and great helm, braided beard, huge bronze tower shield with orange rune, warhammer. Move: walk cycle; attack: overhead swing attack.

**3 · Рунный жрец / Rune Caster** (`fortress_rune_caster`) — основной, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: заклинание (жест рукой, вспышка магии).  
Способности: Без штрафа вплотную — Нет штрафа при стрельбе вплотную.  
> Old dwarf rune caster with long white beard, rust-orange robe with bronze trim, glowing orange runes, staff with glowing rune orb. Move: walk cycle; attack: spellcasting gesture with a magic burst.

**3 · Старейшина клана / Clan Elder** (`fortress_clan_elder`) — альтернативный, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Бесконечный ответ — Отвечает на каждую атаку ближнего боя.  
> Dwarf clan elder with long braided white beard and golden crown, bronze plate with clan tabard, two-handed rune warhammer. Move: walk cycle; attack: overhead swing attack.

**4 · Железный страж / Ironguard** (`fortress_ironguard`) — основной, тяжёлый, 1×1, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
> Dwarf ironguard in heavy dark iron full plate, great helm with rust plume, braided beard, two-handed greataxe. Move: walk cycle; attack: overhead swing attack.

**4 · Расчёт баллисты / Ballista Crew** (`fortress_ballista_crew`) — альтернативный, стрелок, 1×1, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
Способности: Без штрафа за дальность — Нет штрафа за дальний выстрел.  
> Dwarf engineer with red beard and bronze kettle helmet operating a heavy crossbow ballista. Move: walk cycle; attack: ranged shot / throw.

**5 · Рух / Roc** (`fortress_roc`) — основной, мобильный, 2×2, летает.  
Движение: полёт на крыльях. Атака: укус (бросок головы вперёд).  
> Giant roc, enormous brown eagle-like bird with cream crest, golden beak and talons. Move: flying with wing flaps; attack: lunging bite attack.

**5 · Горный медведь / Mountain Bear** (`fortress_mountain_bear`) — альтернативный, тяжёлый, 2×2, пеший.  
Движение: галоп / бег на четырёх лапах. Атака: удар когтями / руками.  
Способности: Двойная атака — Атакует дважды.  
> Huge brown mountain bear wearing bronze armor plates with orange rune trim. Move: gallop / run cycle on four legs; attack: claw slash attack.

**6 · Магмовый голем / Magma Golem** (`fortress_magma_golem`) — основной, тяжёлый, 2×2, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Огненная аура — В начале хода обжигает соседних врагов.  
> Magma golem, body of dark basalt with glowing yellow-orange lava cracks, massive fists, heat aura. Move: walk cycle; attack: overhead swing attack.

**6 · Рунный голем / Rune Golem** (`fortress_rune_golem`) — альтернативный, тяжёлый, 2×2, пеший.  
Движение: шаг (пеший). Атака: рубящий удар (замах над головой и удар вниз).  
Способности: Иммунитет к магии — Заклинания на него не действуют.  
> Rune golem of grey carved stone covered in glowing blue dwarven runes, massive fists. Move: walk cycle; attack: overhead swing attack.

**7 · Магмовый дракон / Magma Dragon** (`fortress_magma_dragon`) — основной, тяжёлый, 2×2, пеший.  
Движение: шаг (пеший). Атака: укус (бросок головы вперёд).  
Способности: Огненное дыхание — Обжигает и клетку за целью.  
> Magma dragon walking on the ground, red-black scales, molten glowing belly, folded wings, dark horns, breathing lava fire. Move: walk cycle; attack: lunging bite attack.

**7 · Паровой джаггернаут / Steam Juggernaut** (`fortress_steam_juggernaut`) — альтернативный, стрелок, 2×2, пеший.  
Движение: шаг (пеший). Атака: выстрел / бросок.  
Способности: Удар по области — Бьёт цель и всех юнитов вокруг неё, включая своих.  
> Steam juggernaut, dwarven brass-and-iron war machine walker with a smoking chimney on its back, riveted plates, glowing orange eyes, cannon arm. Move: walk cycle; attack: ranged shot / throw.
