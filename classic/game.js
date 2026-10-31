'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const STORAGE_KEY = 'remembering-manor-classic-v1';
  const rooms = {
    hall: {name:'Вестибюль', chapter:'I · ПРОБУЖДЕНИЕ', icon:'door', image:'vestibule', description:'Сквозняк касается шеи. Входная дверь заперта изнутри.', spots:[
      {id:'clock',name:'Остановленные часы',x:28,y:43}, {id:'door',name:'Входная дверь',x:53,y:46},
      {id:'letter',name:'Письмо на столе',x:90,y:64}, {id:'portrait',name:'Портрет незнакомки',x:93,y:33}
    ]},
    library: {name:'Библиотека',chapter:'II · ЧУЖИЕ СЛОВА',icon:'book',image:'library',description:'Пахнет воском и старой бумагой. Кто-то не дочитал эту ночь.',spots:[
      {id:'shelves',name:'Зашифрованный корешок',x:37,y:38}, {id:'raven',name:'Картина над камином',x:55,y:30},
      {id:'diary',name:'Дневник хозяина',x:76,y:76}, {id:'livingbook',name:'Книга на подставке',x:86,y:62}
    ]},
    dining: {name:'Столовая',chapter:'III · НЕЗВАНЫЕ ГОСТИ',icon:'candle',image:'dining',description:'Стол накрыт на пятерых. Пыль лежит только на четырёх стульях.',spots:[
      {id:'candles',name:'Пять свечей',x:51,y:50}, {id:'menu',name:'Записка у прибора',x:65,y:62},
      {id:'mirror',name:'Старое зеркало',x:60,y:32}, {id:'fireplace',name:'Остывший камин',x:20,y:47}
    ]},
    cellar: {name:'Погреб',chapter:'IV · ПАМЯТЬ КАМНЯ',icon:'cellar',image:'cellar',description:'Снизу доносится ветер. Будто под домом есть ещё одно небо.',spots:[
      {id:'stones',name:'Каменная печать',x:51,y:45}, {id:'barrels',name:'Старые бочки',x:21,y:51},
      {id:'parchment',name:'Последняя страница',x:78,y:63}
    ]}
  };
  const seals = [
    {id:'clock',name:'Печать времени',icon:'time',description:'Латунный осколок с застывшей стрелкой. Время снова идёт.'},
    {id:'shelves',name:'Печать слова',icon:'raven',description:'Перо, отлитое из серебра. Чужие слова обрели голос.'},
    {id:'candles',name:'Печать света',icon:'moon',description:'Тёмное стекло с тёплым лунным отблеском.'},
    {id:'stones',name:'Печать памяти',icon:'key',description:'Старинный ключ. Его бородка повторяет рисунок входной двери.'}
  ];
  const clues = {
    letter:{title:'Письмо без адресата',text:'«31 октября. До полуночи осталось три четверти часа. Именно в этот миг дом уснул. Верните стрелки к началу — и он позволит вам пройти дальше». Подпись: Э. М.'},
    diary:{title:'Страница из дневника',text:'«Цезарь сделал три шага вперёд. Я вернусь на три назад. В моём алфавите нет Ё. Птица на корешке знает, как разбудить слово». Алфавит: АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ.'},
    menu:{title:'Приглашение на ужин',text:'«Сначала погаси свет, который не греет. Затем — звезду, которая ближе всех к Земле. Последними пусть остановятся пески времени. Остальные огни оставь живыми». Под свечами: луна, ворон, солнце, песочные часы, звезда.'},
    parchment:{title:'Последняя страница',text:'«Помни, что ты смертен. Помни, что нужно жить». Словарь на полях: MEMENTO — помни; MORI — что ты смертен; VIVERE — жить. Две половины надписи, по два слова каждая. Память о смерти должна предшествовать памяти о жизни.'}
  };
  const hints = {
    clock:['Письмо на столе говорит о моменте, когда дом уснул. Найдите его.','До полуночи осталось три четверти часа — это 45 минут. Отнимите их от 00:00.','Установите 23:15. На двенадцатичасовом циферблате это 11:15.'],
    shelves:['Загляните в дневник на письменном столе. В нём есть правило шифра.','Каждую букву «ЕСУСР» нужно сдвинуть на три позиции назад по русскому алфавиту без Ё. Например, Е → В.','Получается ВОРОН. Введите это слово на корешке книги.'],
    candles:['Записка на столе объясняет, какие три свечи нужно погасить и в каком порядке.','Луна светит отражённым светом. Ближайшая к Земле звезда — Солнце. Время отмеряют песочные часы.','Погасите по очереди: Луна → Солнце → Песочные часы. Ворона и Звезду оставьте гореть.'],
    stones:['Последняя страница на пьедестале содержит перевод слов.','Два выражения начинаются одинаково: MEMENTO. Сначала вспомните о смерти, затем о жизни.','Порядок камней: MEMENTO → MORI → MEMENTO → VIVERE.'],
    door:['Все четыре печати сняты. Осталось вернуться в вестибюль.','Откройте входную дверь в вестибюле. Ключ уже у вас.','На карте выберите «Вестибюль», затем нажмите на входную дверь.']
  };
  const freshState = () => ({version:1,started:false,room:'hall',solved:[],clues:[],visited:['hall'],seen:[],hintLevels:{},hintsUsed:0,elapsed:0,finished:false});
  const readState = () => {
    try {
      const v = JSON.parse((localStorage.getItem(STORAGE_KEY) || localStorage.getItem('remembering-manor-v1')));
      if (!v || v.version !== 1 || !Array.isArray(v.solved) || !Array.isArray(v.clues)) return freshState();
      const s = {...freshState(),...v};
      s.solved = v.solved.filter(x => seals.some(y => y.id === x));
      s.clues = v.clues.filter(x => clues[x]);
      s.visited = Array.isArray(v.visited) ? v.visited.filter(x => rooms[x]) : ['hall'];
      s.seen = Array.isArray(v.seen) ? v.seen.filter(x => typeof x === 'string') : [];
      s.hintLevels = v.hintLevels && typeof v.hintLevels === 'object' ? v.hintLevels : {};
      s.hintsUsed = Math.max(0, Number(v.hintsUsed) || 0);
      s.elapsed = Math.max(0, Number(v.elapsed) || 0);
      if (!rooms[s.room]) s.room = 'hall';
      return s;
    } catch { return freshState(); }
  };
  let state = readState();
  let sessionStart = 0, activeObject = null, sound = null, soundEnabled = false;
  let candleOrder = [], stoneOrder = [], lightEnabled = true, roomBusy = false;
  let toastTimer, captionTimer, tipTimer, lastFocus;
  const modal = $('#modal');
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* Storage can be disabled in private browsers. */ } };
  const solved = id => state.solved.includes(id);
  const unlocked = id => id === 'hall' || (id === 'library' || id === 'dining') && solved('clock') || id === 'cellar' && solved('shelves') && solved('candles');
  const totalElapsed = () => state.elapsed + (sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0);
  const checkpoint = () => { state.elapsed = totalElapsed(); if (sessionStart) sessionStart = Date.now(); save(); };
  const nextPuzzle = () => state.solved.length === 4 ? 'door' : state.room === 'hall' && !solved('clock') ? 'clock' : state.room === 'library' && !solved('shelves') ? 'shelves' : state.room === 'dining' && !solved('candles') ? 'candles' : state.room === 'cellar' ? 'stones' : seals.find(s => !solved(s.id)).id;
  const toast = message => { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200); };
  const whisper = message => { clearTimeout(captionTimer); $('#ambient-caption').textContent = message; $('#ambient-caption').classList.add('visible'); captionTimer = setTimeout(() => $('#ambient-caption').classList.remove('visible'), 5000); };
  const openModal = html => { $('#modal-content').innerHTML = html; if (!modal.open) { lastFocus = document.activeElement; modal.showModal(); } modal.scrollTop = 0; };
  const closeModal = () => { modal.close(); activeObject = null; };
  const objectFooter = hint => `<div class="object-footer"><span>ДОМ СЛУШАЕТ. НЕ ТОРОПИТЕСЬ.</span>${hint ? `<button class="text-button" data-action="hint" data-puzzle="${hint}">Нужна подсказка?</button>` : '<span>ESC — закрыть</span>'}</div>`;
  const showObject = (kicker, title, body, hint = null) => openModal(`<div class="object-kicker">${kicker}</div><h2>${title}</h2>${body}${objectFooter(hint)}`);

  function refreshWelcome() {
    $('#resume').hidden = !state.started;
    $('#resume').textContent = state.finished ? 'Посмотреть финал ↗' : 'Продолжить историю ↗';
    $('#start').innerHTML = `${state.started ? 'Начать новую историю' : 'Открыть глаза'} ${icon('arrow')}`;
  }
  function showScreen(name) {
    for (const id of ['welcome','game','ending']) $(`#${id}`).hidden = id !== name;
    document.body.dataset.screen = name;
    if(name!=='game')sound?.engine.pause(true);
  }
  function startGame(reset = false) {
    if (reset) state = freshState();
    if (state.finished) { showEnding(); return; }
    state.started = true;
    sessionStart = Date.now();
    showScreen('game');
    if(!sound)sound=new ManorAudio();soundEnabled=true;sound.enable();updateSoundButton();
    renderRoom();
    save();
    refreshWelcome();
    clearTimeout(tipTimer);
    $('#explore-tip').style.opacity = '1';
    tipTimer = setTimeout(() => $('#explore-tip').style.opacity = '0', 14000);

    for (const room of Object.values(rooms)) { const image = new Image(); image.src = `../assets/${room.image}.webp`; }
  }
  function objective() {
    if (!solved('clock')) return 'Время здесь остановилось. Найдите мгновение, с которого всё началось.';
    if (!solved('shelves') && !solved('candles')) return 'За дверями проснулся дом. Ищите слово в библиотеке и свет в столовой.';
    if (!solved('shelves')) return 'Одна из книг хранит слово, которое вы уже слышали.';
    if (!solved('candles')) return 'В столовой ещё горят лишние огни. Прислушайтесь к приглашению.';
    if (!solved('stones')) return 'Лестница в погреб открыта. Камень помнит последнее заклинание.';
    return 'Ключ тёплый у вас в ладони. Вернитесь ко входной двери.';
  }
  function hotspotPosition(spot) {
    return {x:spot.x,y:Math.min(spot.y,matchMedia('(max-width:760px)').matches ? 66 : 76)};
  }
  function renderRoom() {
    const room = rooms[state.room];
    sound?.sync();
    $('#scene-image').style.backgroundImage = `url("../assets/${room.image}.webp")`;
    $('#room-chapter').textContent = room.chapter;
    $('#room-name').textContent = room.name;
    $('#room-description').textContent = room.description;
    $('#objective-text').textContent = objective();
    $('#objective-dots').innerHTML = seals.map(s => `<i class="${solved(s.id) ? 'done' : ''}"></i>`).join('');
    $('#hotspots').innerHTML = room.spots.map(spot => { const p = hotspotPosition(spot); return `<button class="hotspot ${solved(spot.id) ? 'solved' : ''}" style="left:${p.x}%;top:${p.y}%" data-object="${spot.id}" aria-label="Осмотреть: ${spot.name}"><span class="hotspot-orb"></span><span class="hotspot-label">${spot.name}</span></button>`; }).join('');
    $('#room-nav').innerHTML = Object.entries(rooms).map(([id,r]) => `<button class="room-tab ${id === state.room ? 'selected' : ''} ${unlocked(id) ? '' : 'locked'}" data-room="${id}" ${unlocked(id) ? '' : 'disabled'} ${id === state.room ? 'aria-current="location"' : ''} aria-label="${r.name}${unlocked(id) ? '' : ': пока закрыто'}">${icon(r.icon)}<span>${r.name}</span>${solved(Object.keys(rooms).indexOf(id) === 0 ? 'clock' : id === 'library' ? 'shelves' : id === 'dining' ? 'candles' : 'stones') ? `<svg class="tab-complete"><use href="#i-check"/></svg>` : ''}</button>`).join('');
    $('#seals').innerHTML = seals.map(s => `<span class="seal ${solved(s.id) ? 'solved' : ''}" title="${s.name}${solved(s.id) ? ': снята' : ''}">${icon(s.icon)}</span>`).join('');
    $('#seal-count').textContent = `${state.solved.length} / 4`;
    $('#inventory-count').textContent = state.solved.length + (state.clues.includes('letter') ? 1 : 0);
    $('#story-time').textContent = ['23:15','23:27','23:38','23:51','23:58'][state.solved.length];
    if ($('#scene').dataset.room !== state.room) {
      $('#scene').dataset.room = state.room;
      $('#scene').scrollLeft = Math.max(0,($('#scene').scrollWidth-$('#scene').clientWidth)/2);
    }
    $('#explore-tip').innerHTML = `${icon('eye')} ${matchMedia('(max-width:760px)').matches ? 'Проведите вбок, чтобы осмотреть всю комнату.' : 'Ищите мерцающие точки. У предметов есть история.'}`;
  }
  async function goToRoom(id) {
    if (roomBusy || id === state.room || !rooms[id] || !unlocked(id)) return;
    roomBusy = true;
    if (modal.open) closeModal();
    $('#scene-image').style.opacity = '.15';
    sound?.creak();
    await new Promise(resolve => setTimeout(resolve, 280));
    state.room = id;
    if (!state.visited.includes(id)) state.visited.push(id);
    renderRoom();
    $('#scene-image').style.opacity = '1';
    save();
    roomBusy = false;
    const words = {hall:'За дверью всё ещё кто-то ждёт.',library:'Страницы шевелятся, хотя окна закрыты.',dining:'Пятый стул едва заметно отодвигается.',cellar:'Камень хранит тепло чужой ладони.'};

  }
  function collectClue(id) {
    if (state.clues.includes(id)) return;
    state.clues.push(id);
    save();
    $('#journal-dot').hidden = false;
    renderRoom();
    toast('Улика сохранена в дневнике');
  }
  function showClue(id) {
    collectClue(id);
    const body = {
      letter:`<p class="object-description">На конверте нет ни имени, ни адреса. Бумага тёплая, будто письмо только что держали в руках.</p><div class="note-paper"><div class="note-date">31 ОКТЯБРЯ · ГОД СТЁРТ</div><div class="handwritten"><p>До полуночи осталось три четверти часа. Именно в этот миг дом уснул.</p><p>Верните стрелки к началу — и он позволит вам пройти дальше.</p><p>Не верьте тишине. Здесь она всегда кого-то слушает.</p></div><div class="note-signature">Э. М.</div></div>`,
      diary:`<p class="object-description">Между страницами засохшее чёрное перо. Последние строки написаны торопливо.</p><div class="note-paper"><div class="handwritten"><p>Цезарь сделал три шага вперёд.<br>Я вернусь на три назад.</p><p>В моём алфавите нет Ё.<br>Птица на корешке знает, как разбудить слово.</p></div></div><p class="puzzle-label">Алфавит из дневника</p><div class="cipher-alphabet">${[...'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'].map((c,i) => `<span class="cipher-pair"><span>${i + 1}</span> <b>${c}</b></span>`).join('')}</div>`,
      menu:`<p class="object-description">На пятом месте лежит карточка. Чернила проступают, когда вы касаетесь её пальцами.</p><div class="note-paper"><div class="handwritten"><p>Сначала погаси свет, который не греет.</p><p>Затем — звезду, которая ближе всех к Земле.</p><p>Последними пусть остановятся пески времени.</p><p>Остальные огни оставь живыми.</p></div></div>`,
      parchment:`<p class="object-description">Эта страница вырвана из дневника в библиотеке. Теперь вы узнаёте почерк.</p><div class="note-paper"><div class="handwritten"><p>Помни, что ты смертен.<br>Помни, что нужно жить.</p><p>Сначала память о смерти.<br>Затем — память о жизни.</p></div></div><p class="object-description">На полях небольшой словарь:<br><strong>MEMENTO</strong> — помни;<br><strong>MORI</strong> — что ты смертен;<br><strong>VIVERE</strong> — жить.<br><br>Две половины надписи. По два слова каждая.</p>`
    };
    const puzzle = {letter:'clock',diary:'shelves',menu:'candles',parchment:'stones'}[id];
    showObject('НАЙДЕННАЯ УЛИКА',clues[id].title,body[id] + `<div class="clue-saved">${icon('check')} Страница сохранена в дневнике</div>`,puzzle);
  }
  function inspect(id) {
    activeObject = id;
    if (!state.seen.includes(id)) state.seen.push(id);
    save();
    sound?.touch();
    if (clues[id]) { showClue(id); return; }
    if (seals.some(s => s.id === id) && solved(id)) { showSolved(id); return; }
    switch (id) {
      case 'clock': showClock(); break;
      case 'shelves': showCipher(); break;
      case 'candles': candleOrder = []; showCandles(); break;
      case 'stones': stoneOrder = []; showStones(); break;
      case 'door':
        if (state.solved.length === 4) showObject('ПОСЛЕДНИЙ ПОРОГ','По ту сторону ночи',`<p class="object-description">Четыре углубления на двери больше не пусты. Ключ поворачивается сам, едва вы подносите его к замку.</p><div class="note-paper handwritten">«Вы вспомнили всё, что нужно.<br>Теперь позвольте дому забыть вас».</div><button class="primary-button" data-action="escape">Повернуть ключ ${icon('arrow')}</button>`);
        else showObject('ВЕСТИБЮЛЬ · ВХОДНАЯ ДВЕРЬ','Дом вас не отпускает',`<p class="object-description">На дубовой двери четыре углубления: стрелка, перо, луна и ключ. Под ними едва различимая надпись.</p><div class="note-paper handwritten">«Вспомни время.<br>Вспомни слово.<br>Вспомни свет.<br>Вспомни, что ты жив».</div><p class="object-description">Снято печатей: ${state.solved.length} из 4.</p>`); break;
      case 'portrait':
        showObject('ВЕСТИБЮЛЬ · ПОРТРЕТ','Она смотрит чуть дольше',`<p class="object-description">Вы не узнаёте женщину. Она, кажется, узнаёт вас. Проведите курсором над портретом — или коснитесь холста.</p><div class="portrait-art" id="portrait-art" role="img" aria-label="Тёмный портрет незнакомки"><div class="portrait-eyes"><span class="portrait-eye"></span><span class="portrait-eye"></span></div></div><p class="handwritten" style="text-align:center;font-size:19px">«Некоторые гости остаются навсегда».</p>`); break;
      case 'livingbook': showLivingBook(); break;
      case 'raven': showObject('БИБЛИОТЕКА · НАД КАМИНОМ','Птица над дверью',`<p class="object-description">Чёрная птица на тёмном холсте. В раме спрятана гравировка: «Память говорит голосом тех, кто ушёл».</p><p class="handwritten">На мгновение вам кажется, что клюв приоткрывается. Но в комнате слышно только дождь.</p><p class="object-description">Такая же птица вытеснена на корешке одной из книг.</p>`,'shelves'); break;
      case 'mirror': showObject('СТОЛОВАЯ · ЗЕРКАЛО','Отражение опоздало',`<p class="object-description">Вы поднимаете руку. Отражение поднимает свою на долю секунды позже.</p><div class="note-paper handwritten">За вашей спиной отражаются пять свечей.<br>Но чья-то тень уже погасила три.</div><p class="object-description">Вы оборачиваетесь. Никого.</p>`,'candles'); break;
      case 'fireplace': showObject('СТОЛОВАЯ · КАМИН','Тёплый пепел',`<p class="object-description">Огонь погас много лет назад. Но пепел всё ещё тёплый. В нём следы маленьких босых ног — они ведут к стене и обрываются.</p><p class="handwritten">«Дом не страшен тем, кто помнит дорогу».</p>`); break;
      case 'barrels': showObject('ПОГРЕБ · ВИННЫЕ БОЧКИ','Урожай, которого не было',`<p class="object-description">На всех бочках одна дата: 31 октября. Вместо года вырезано ваше имя — но, как только вы пытаетесь прочитать его, буквы снова становятся царапинами.</p><p class="handwritten">Из пустой бочки доносится далёкий шум моря.</p>`); break;
    }
  }
  function showClock() {
    showObject('ВЕСТИБЮЛЬ · ПЕРВАЯ ПЕЧАТЬ','Час, в котором уснул дом',`<p class="object-description">Маятник неподвижен. На корпусе царапина: «Начало спрятано в письме». Вы можете передвинуть стрелки.</p><div class="clock-wrap"><div class="clock-face" aria-hidden="true">${['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'].map((n,i) => `<span class="clock-number" style="left:${50+Math.sin(i*Math.PI/6)*40}%;top:${50-Math.cos(i*Math.PI/6)*40}%;transform:translate(-50%,-50%)">${n}</span>`).join('')}<span class="clock-hand hour" id="hour-hand"></span><span class="clock-hand minute" id="minute-hand"></span></div><div class="time-inputs"><div class="time-field"><label for="hour">ЧАСЫ · 0–23</label><input id="hour" type="number" min="0" max="23" value="0" inputmode="numeric" aria-label="Часы от 0 до 23"></div><span class="time-colon">:</span><div class="time-field"><label for="minute">МИНУТЫ</label><input id="minute" type="number" min="0" max="59" value="0" inputmode="numeric" aria-label="Минуты от 0 до 59"></div></div></div><button class="primary-button clock-submit" data-action="clock-check">Отпустить маятник ${icon('arrow')}</button><div class="feedback" id="feedback" role="status"></div>`,'clock');
    updateClock();
  }
  function updateClock() {
    const hour = Number($('#hour')?.value || 0), minute = Number($('#minute')?.value || 0);
    if ($('#hour-hand')) $('#hour-hand').style.transform = `rotate(${hour * 30 + minute * .5}deg)`;
    if ($('#minute-hand')) $('#minute-hand').style.transform = `rotate(${minute * 6}deg)`;
  }
  function showCipher() {
    showObject('БИБЛИОТЕКА · ВТОРАЯ ПЕЧАТЬ','Слово под переплётом',`<p class="object-description">Одна книга прибита к полке. Название заменено пятью буквами. Рядом — след чёрного пера и латунный замок с буквенным диском.</p><div class="cipher-word">ЕСУСР</div><div class="cipher-caption">ПЯТЬ БУКВ · ТРИ ШАГА НАЗАД</div><p class="object-description" style="margin-top:23px">Подсказка к алфавиту осталась в дневнике на письменном столе.</p><form class="answer-form" id="cipher-form"><input id="cipher-answer" type="text" maxlength="20" placeholder="Забытое слово" aria-label="Расшифрованное слово" autocomplete="off" autocapitalize="characters" spellcheck="false" required><button class="primary-button" type="submit">Произнести</button></form><div class="feedback" id="feedback" role="status"></div>`,'shelves');
  }
  function showCandles() {
    const choices = [{id:'moon',name:'Луна'},{id:'raven',name:'Ворон'},{id:'sun',name:'Солнце'},{id:'time',name:'Песочные часы'},{id:'star',name:'Звезда'}];
    showObject('СТОЛОВАЯ · ТРЕТЬЯ ПЕЧАТЬ','Свет, который помнит',`<p class="object-description">Пять огней горят без воска. У каждой свечи свой знак. Коснитесь огня, чтобы погасить его. Порядок имеет значение.</p><div class="candles">${choices.map(c => `<button class="candle-choice ${candleOrder.includes(c.id) ? 'extinguished' : ''}" data-candle="${c.id}" aria-label="Погасить свечу: ${c.name}" aria-pressed="${candleOrder.includes(c.id)}" ${candleOrder.includes(c.id) ? 'disabled' : ''}><span class="candle-order">${candleOrder.includes(c.id) ? candleOrder.indexOf(c.id)+1 : ''}</span><span class="wax"><span class="flame"></span></span>${icon(c.id)}<span class="candle-name">${c.name}</span></button>`).join('')}</div><button class="candle-reset" data-action="candle-reset">Зажечь все свечи заново</button><div class="feedback" id="feedback" role="status"></div><p class="object-description" style="margin-bottom:0">Приглашение у пятого прибора хранит порядок ритуала.</p>`,'candles');
  }
  function showStones() {
    const tokens = [{id:'v',word:'VIVERE'},{id:'m1',word:'MEMENTO'},{id:'o',word:'MORI'},{id:'m2',word:'MEMENTO'}];
    showObject('ПОГРЕБ · ЧЕТВЁРТАЯ ПЕЧАТЬ','То, что помнит камень',`<p class="object-description">На плите два стёртых изречения. Четыре камня с латинскими словами лежат у стены. Сложите их в том порядке, о котором говорит последняя страница.</p><div class="latin-translation">«Помни, что ты смертен.<br>Помни, что нужно жить».</div><div class="latin-slots">${Array.from({length:4},(_,i) => `<button class="latin-slot ${stoneOrder[i] ? 'filled' : ''}" ${stoneOrder[i] ? 'data-action="stone-undo"' : 'disabled'} aria-label="${stoneOrder[i] ? 'Убрать последний камень' : 'Место для камня '+(i+1)}">${stoneOrder[i] ? tokens.find(t=>t.id===stoneOrder[i]).word : '·'}</button>`).join('')}</div><div class="latin-tokens">${tokens.map(t => `<button class="latin-token" data-stone="${t.id}" ${stoneOrder.includes(t.id) ? 'disabled' : ''}>${t.word}</button>`).join('')}</div><button class="candle-reset" data-action="stone-reset">Снять все камни</button><button class="primary-button" data-action="stones-check" style="margin:20px auto 0">Коснуться печати ${icon('arrow')}</button><div class="feedback" id="feedback" role="status"></div>`,'stones');
  }
  function feedback(message) {
    if ($('#feedback')) $('#feedback').textContent = message;
    sound?.heartbeat();
  }
  function solve(id) {
    if (solved(id)) return;
    state.solved.push(id);
    save();
    renderRoom();
    sound?.chime();
    $('#journal-dot').hidden = false;
    const messages = {
      clock:'Маятник делает первый вздох. На верхнем этаже отпираются две двери. Из корпуса часов выпадает латунный осколок.',
      shelves:'Книга раскрывается сама. Между страницами серебряное перо. Из глубины дома доносится облегчённый вздох.',
      candles:'Три огня гаснут. На скатерти проступает лунный знак. Под ним лежит осколок тёмного стекла.',
      stones:'Камни встают на место с тихим щелчком. В нише появляется ключ. Наверху открывается засов входной двери.'
    };
    const s = seals.find(s => s.id === id);
    const next = id === 'clock' ? 'Библиотека и столовая теперь открыты.' : solved('shelves') && solved('candles') && !solved('stones') ? 'Вы слышите, как открывается лестница в погреб.' : id === 'stones' ? 'Вернитесь в вестибюль. Ночь ещё не закончилась.' : 'В доме остались другие тайны.';
    openModal(`<div class="seal-reveal"><div class="reveal-subtitle">ПЕЧАТЬ СНЯТА · ${state.solved.length} ИЗ 4</div><div class="reveal-icon">${icon(s.icon)}</div><h2>${s.name}</h2><p>${messages[id]}</p><p class="object-description">${next}</p><div class="reveal-progress">${seals.map(seal=>`<i class="${solved(seal.id) ? 'done' : ''}"></i>`).join('')}</div><button class="primary-button" data-action="close">Продолжить исследование ${icon('arrow')}</button></div>`);
  }
  function showSolved(id) {
    const seal = seals.find(s=>s.id===id);
    showObject('ТАЙНА РАСКРЫТА',seal.name,`<div class="seal-reveal"><div class="reveal-icon">${icon(seal.icon)}</div><p>${seal.description}</p></div><p class="object-description">${id === 'clock' ? 'Маятник отбивает секунды. Теперь вы точно знаете: в этом доме время не потеряно.' : id === 'shelves' ? 'На раскрытой странице одно слово: «ВОРОН». Ниже появилась новая строка: «Он вернулся».':id === 'candles' ? 'Луна, Солнце и Песочные часы погасли. Ворон и Звезда всё ещё освещают стол.' : 'MEMENTO MORI. MEMENTO VIVERE. Память о смерти возвращает вас к жизни.'}</p>`);
  }
  function showLivingBook() {
    const roomVisits = state.visited.length;
    const line = state.solved.length === 4 ? '«Ключ уже лежал в его ладони. Но он всё ещё читал, будто боялся последней страницы».' : state.solved.length ? `«Он снял ${state.solved.length} ${state.solved.length === 1 ? 'печать' : 'печати'} и успел заглянуть в ${roomVisits} ${roomVisits === 1 ? 'комнату' : 'комнаты'}. Дом делал вид, что не замечает».'` : '«Он остановился перед книгой и прочёл первую строку. В этот момент книга тоже начала его читать».';
    showObject('БИБЛИОТЕКА · КНИГА НА ПОДСТАВКЕ','Здесь пишут о вас',`<p class="object-description">На странице свежие чернила. В них ещё отражается свеча.</p><div class="living-book">${line}<br><br><span>Следующая строка появляется прямо сейчас:<br>«Он задержал дыхание. За его спиной…»</span></div><p class="object-description" style="margin-top:20px">Дальше — чистая страница. Пока.</p>`);
  }
  function showMap() {
    showObject('ПЛАН ПЕРВОГО ЭТАЖА И ПОДЗЕМЕЛЬЯ','У дома есть свои пути',`<p class="object-description">Доступные комнаты можно исследовать в любом порядке.</p><div class="map-grid">${Object.entries(rooms).map(([id,r]) => `<button class="map-room ${state.room===id?'selected':''}" style="background-image:url('../assets/${r.image}.webp')" data-map-room="${id}" ${unlocked(id)?'':'disabled'}>${icon(r.icon)}<h3>${r.name}</h3><small>${state.room === id ? 'Вы здесь' : unlocked(id) ? 'Войти в комнату ↗' : id==='cellar'?'Нужны печати слова и света':'Сначала разбудите часы'}</small></button>`).join('')}</div>`);
  }
  function showJournal() {
    $('#journal-dot').hidden = true;
    showObject('ВАШИ ЗАПИСИ · СОХРАНЯЮТСЯ АВТОМАТИЧЕСКИ','Дневник этой ночи',`<p class="object-description">То, что вы нашли. То, что дом позволил запомнить.</p>${state.clues.length ? state.clues.map((id,i)=>`<article class="journal-entry"><span class="journal-time">УЛИКА ${String(i+1).padStart(2,'0')}</span><h3>${clues[id].title}</h3><p>${clues[id].text}</p></article>`).join('') : '<div class="inventory-empty">Пока здесь только тишина.<br>Осмотрите письмо в вестибюле.</div>'}${state.solved.length ? `<article class="journal-entry"><span class="journal-time">СНЯТЫЕ ПЕЧАТИ</span><p>${state.solved.map(id=>seals.find(s=>s.id===id).name).join(' · ')}</p></article>` : ''}`);
  }
  function showInventory() {
    const items = seals.filter(s=>solved(s.id));
    showObject('ТО, ЧТО МОЖНО УНЕСТИ','Находки',`<p class="object-description">У каждой вещи есть вес. У некоторых — память.</p>${items.length || state.clues.includes('letter') ? `<div class="inventory-grid">${state.clues.includes('letter') ? `<div class="inventory-item">${icon('book')}<h3>Письмо Э. М.</h3><p>Без адреса. Но предназначенное именно вам.</p></div>` : ''}${items.map(s=>`<div class="inventory-item">${icon(s.icon)}<h3>${s.name}</h3><p>${s.description}</p></div>`).join('')}</div>` : '<div class="inventory-empty">В карманах ничего.<br>Даже воспоминаний.</div>'}`);
  }
  function showHint(puzzle = nextPuzzle(), advance = false) {
    if (!hints[puzzle]) puzzle = nextPuzzle();
    const current = Math.min(3, Math.max(0, Number(state.hintLevels[puzzle]) || 0));
    if (advance && current < 3) { state.hintLevels[puzzle] = current + 1; state.hintsUsed++; save(); }
    const level = Number(state.hintLevels[puzzle]) || 0;
    showObject('ЕСЛИ ВЫ СБИЛИСЬ С ПУТИ','Прислушаться к дому',`<p class="object-description">Подсказки открываются постепенно. Первые направляют, последняя раскрывает решение.</p><div class="hint-number">${level ? `ПОДСКАЗКА ${level} ИЗ 3` : 'ПОКА БЕЗ ПОДСКАЗОК'}</div><div class="hint-step">${level ? hints[puzzle][level-1] : 'Дом готов ответить. Нужно только задать вопрос.'}</div>${level<3 ? `<button class="primary-button" data-action="hint-next" data-puzzle="${puzzle}">${level ? 'Следующая подсказка' : 'Услышать подсказку'} ${icon('arrow')}</button>` : ''}`);
  }
  function showEnding() {
    if (!state.finished) { checkpoint(); state.finished = true; sessionStart = 0; save(); }
    closeModal();
    showScreen('ending');
    const mins = Math.floor(state.elapsed / 60), secs = state.elapsed % 60;
    $('#end-time').textContent = `${mins}:${String(secs).padStart(2,'0')}`;
    $('#end-hints').textContent = state.hintsUsed;
    sound?.chime();
    refreshWelcome();
  }
  function confirmRestart() {
    if (!state.started) { startGame(true); return; }
    showObject('НОВАЯ НОЧЬ','Начать историю заново?',`<p class="object-description">Собранные улики, печати и текущий прогресс этой истории будут сброшены.</p><button class="primary-button" data-action="restart">Начать заново ${icon('arrow')}</button><button class="secondary-button" data-action="close" style="margin-top:12px">Отмена</button>`);
  }
  function showAbout() {
    showObject('ИНТЕРАКТИВНАЯ ГОТИЧЕСКАЯ ИСТОРИЯ','Одна ночь в чужой памяти',`<p class="object-description">В ночь на Хэллоуин вы просыпаетесь в особняке. Входная дверь закрыта четырьмя печатями. Чтобы выйти, придётся понять, что помнит этот дом.</p><div class="note-paper handwritten">Исследуйте предметы.<br>Собирайте страницы дневника.<br>Соединяйте знаки и слова.<br>Слушайте, о чём молчит дом.</div><p class="object-description">Четыре локации и четыре связанные загадки. Около 15–25 минут. Можно играть с телефона. Все улики сохраняются в дневнике, прогресс — в этом браузере.</p><p class="object-description">Звук включается при входе в игру; кнопка в правом верхнем углу его отключает. Для атмосферы подойдут наушники. Таймера проигрыша нет: ночь будет ждать вас.</p><div class="dev-note">Первый игровой прототип по вашим заметкам: готический романтизм, живой полумрак, таинственные предметы и красивая магия. История и персонажи вымышлены.</div>`);
  }

  class ManorAudio {
    constructor() {
      this.engine=new globalThis.ManorSoundscape();
      this.elapsed=0;
      this.timer=setInterval(()=>{if(this.engine.active){this.elapsed+=.12;this.engine.update(this.listener(),{x:0,y:0,z:-1},state.room,this.elapsed);}},120);
    }
    listener(){const a={hall:[0,1.64,0],library:[-12,1.64,0],dining:[12,1.64,0],cellar:[0,-.76,-20]}[state.room];return {x:a[0],y:a[1],z:a[2]};}
    enable(){this.engine.setEnabled(true);this.engine.start();this.engine.sync(state.solved);}
    disable(){this.engine.setEnabled(false);}
    touch(){this.engine.paper(this.listener());}
    creak(){this.engine.openDoor(this.listener());}
    chime(){this.engine.chime(this.listener());}
    heartbeat(){this.engine.heartbeat();}
    sync(){this.engine.sync(state.solved);}
  }
  function updateSoundButton(){
    $('#sound use').setAttribute('href',soundEnabled?'#i-sound':'#i-mute');
    $('#sound').setAttribute('aria-pressed',String(soundEnabled));
    $('#sound').setAttribute('aria-label',soundEnabled?'Выключить звук':'Включить звук');
    $('#sound').title=soundEnabled?'Выключить звук':'Включить звук';
  }
  async function toggleSound() {
    try {
      if(!sound)sound=new ManorAudio();
      soundEnabled=!soundEnabled;
      if(soundEnabled)await sound.enable();else sound.disable();
      $('#sound use').setAttribute('href',soundEnabled?'#i-sound':'#i-mute');
      $('#sound').setAttribute('aria-pressed',String(soundEnabled));
      $('#sound').setAttribute('aria-label',soundEnabled?'Выключить звук':'Включить звук');
      $('#sound').title=soundEnabled?'Выключить атмосферный звук':'Включить атмосферный звук';
      toast(soundEnabled?'Дом обрёл голос. Лучше слушать в наушниках.':'Звук выключен');
    } catch {soundEnabled=false;toast('Браузер пока не разрешил звук. Попробуйте нажать ещё раз.');}
  }

  $('#start').addEventListener('click',confirmRestart);
  $('#resume').addEventListener('click',()=>startGame());
  $('#replay').addEventListener('click',confirmRestart);
  $('#about').addEventListener('click',showAbout);
  $('#home').addEventListener('click',()=>{checkpoint();sessionStart=0;showScreen('welcome');refreshWelcome();});
  $('#modal-close').addEventListener('click',closeModal);
  modal.addEventListener('click',event=>{if(event.target===modal){const r=modal.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeModal();}});
  modal.addEventListener('close',()=>{activeObject=null;if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});});
  $('#map-button').addEventListener('click',showMap);
  $('#journal-button').addEventListener('click',showJournal);
  $('#inventory-button').addEventListener('click',showInventory);
  $('#hint-button').addEventListener('click',()=>showHint());
  $('#sound').addEventListener('click',toggleSound);
  $('#light-button').addEventListener('click',()=>{lightEnabled=!lightEnabled;$('#candle-light').style.opacity=lightEnabled?'1':'0';$('#light-button').classList.toggle('active',lightEnabled);$('#light-button').setAttribute('aria-pressed',String(lightEnabled));toast(lightEnabled?'Свет свечи следует за вашим взглядом':'Ровный свет: все предметы остаются видимыми');});
  $('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Полноэкранный режим недоступен в этом окне браузера');}});
  document.addEventListener('click',event=>{
    const object=event.target.closest('[data-object]');if(object){inspect(object.dataset.object);return;}
    const room=event.target.closest('[data-room]');if(room){goToRoom(room.dataset.room);return;}
    const mapRoom=event.target.closest('[data-map-room]');if(mapRoom){const id=mapRoom.dataset.mapRoom;closeModal();goToRoom(id);return;}
    const candle=event.target.closest('[data-candle]');
    if(candle&&!candle.disabled){
      candleOrder.push(candle.dataset.candle);sound?.touch();
      const expected=['moon','sun','time'];
      if(candleOrder.some((id,i)=>id!==expected[i])){candleOrder=[];showCandles();feedback('Пламя вспыхивает снова. Порядок нарушен. Прочитайте приглашение ещё раз.');}
      else if(candleOrder.length===3)solve('candles');else{showCandles();$('#feedback').textContent='Огонь погас. Дом ждёт следующего.';}
      return;
    }
    const stone=event.target.closest('[data-stone]');if(stone&&!stone.disabled){stoneOrder.push(stone.dataset.stone);sound?.touch();showStones();return;}
    const action=event.target.closest('[data-action]');if(!action)return;
    switch(action.dataset.action){
      case 'close':closeModal();break;
      case 'restart':closeModal();startGame(true);break;
      case 'escape':showEnding();break;
      case 'hint':showHint(action.dataset.puzzle);break;
      case 'hint-next':showHint(action.dataset.puzzle,true);break;
      case 'clock-check':{
        const h=$('#hour'),m=$('#minute');
        if(!h.checkValidity()||!m.checkValidity()||h.value===''||m.value===''){feedback('Укажите часы от 0 до 23 и минуты от 0 до 59.');break;}
        if([11,23].includes(Number(h.value))&&Number(m.value)===15)solve('clock');else feedback('Маятник качнулся и замер. Это не тот час.');break;
      }
      case 'candle-reset':candleOrder=[];showCandles();break;
      case 'stone-reset':stoneOrder=[];showStones();break;
      case 'stone-undo':stoneOrder.pop();showStones();break;
      case 'stones-check':{
        const words=stoneOrder.map(x=>x==='v'?'VIVERE':x==='o'?'MORI':'MEMENTO');
        if(words.join(' ')==='MEMENTO MORI MEMENTO VIVERE')solve('stones');else feedback(stoneOrder.length<4?'Четырём словам нужны четыре места.':'Камень холоден. Вспомните порядок двух изречений.');break;
      }
    }
  });
  document.addEventListener('submit',event=>{if(event.target.id==='cipher-form'){event.preventDefault();const answer=$('#cipher-answer').value.trim().toUpperCase().replace(/Ё/g,'Е');if(['ВОРОН','RAVEN'].includes(answer))solve('shelves');else feedback('Замок молчит. Вернитесь на три буквы назад.');}});
  document.addEventListener('input',event=>{if(['hour','minute'].includes(event.target.id))updateClock();});
  document.addEventListener('keydown',event=>{if(event.key==='Enter'&&modal.open&&['hour','minute'].includes(document.activeElement.id))$('[data-action="clock-check"]')?.click();});
  document.addEventListener('pointermove',event=>{
    const x=event.clientX/window.innerWidth,y=event.clientY/window.innerHeight;
    document.documentElement.style.setProperty('--mx',`${event.clientX+$('#scene').scrollLeft}px`);document.documentElement.style.setProperty('--my',`${event.clientY}px`);
    if(!matchMedia('(prefers-reduced-motion:reduce)').matches && !matchMedia('(pointer:coarse)').matches){$('#scene-image').style.setProperty('--px',`${(x-.5)*-8}px`);$('#scene-image').style.setProperty('--py',`${(y-.5)*-5}px`);}
    const portrait=$('#portrait-art');if(portrait){const r=portrait.getBoundingClientRect();portrait.style.setProperty('--ex',`${Math.max(-2,Math.min(2,(event.clientX-r.left-r.width/2)/60))}px`);portrait.style.setProperty('--ey',`${Math.max(-1,Math.min(1,(event.clientY-r.top-r.height/2)/100))}px`);}
  });
  document.addEventListener('click',event=>{const portrait=event.target.closest('#portrait-art');if(portrait){portrait.classList.remove('portrait-ripple');void portrait.offsetWidth;portrait.classList.add('portrait-ripple');sound?.creak();}});
  window.addEventListener('resize',()=>{if(!$('#game').hidden)renderRoom();});
  window.addEventListener('pagehide',checkpoint);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){checkpoint();sessionStart=0;sound?.engine.setHidden(true);}else{if(!$('#game').hidden&&!state.finished)sessionStart=Date.now();sound?.engine.setHidden(false);}});

  setInterval(()=>{if(sessionStart)checkpoint();},15000);
  refreshWelcome();showScreen('welcome');
})();
