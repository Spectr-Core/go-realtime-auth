console.log("HOST:", window.location.host);
console.log("PROTOCOL:", window.location.protocol);

const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const socketURL = `${protocol}://${window.location.host}/ws`;

console.log("SOCKET URL:", socketURL);

const socket = new WebSocket(socketURL);

socket.onopen = () => {
  console.log("WS connected");
};
let pingTimeout = null;
let pingInterval = null;

socket.onopen = () => {
  console.log("WS connected");
  ServerOnline();
  isSocketReady = true;
    socket.send(JSON.stringify({
        type: "get_logs"
    }));

  pingInterval = setInterval(() => {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
      type: "ping",
      message: "Привет"
    }));
    clearTimeout(pingTimeout);

    pingTimeout = setTimeout(() => {
      console.log("No pong response");
      ServerOffline();
    }, 5000);

  }, 5000);
};

socket.onmessage = (event) => {
  console.log("Ответ от сервера:", event.data);

  try {
    const data = JSON.parse(event.data);

    if (data.type === "pong") {
      clearTimeout(pingTimeout);
      ServerOnline();
      return; // Выходим, чтобы не обрабатывать дальше
    }
    
    if (data.type === "userscount") {
      Setusercount(data.count);
      return; // Выходим
    }
    
    if (data.type === "notification") {
      if (notificationCenter) {
        notificationCenter.showNotification({
          id: data.id || `note-${Date.now()}`,
          icon: data.icon || "info",
          title: data.title || "Notification",
          subtitle: data.subtitle || "",
          actions: data.actions || ["OK"]
        });
      }
      return;
    }
    
    if (data.type === "log") {
      handleLog(data);
      return;
    }
    
    if (data.type === "logs_history") {
      if (data.logs && Array.isArray(data.logs)) {
        // Очищаем список перед загрузкой истории
        const activityList = document.getElementById('activityList');
        if (activityList) {
          activityList.innerHTML = '';
        }
        // Добавляем логи в обратном порядке (новые сверху)
        data.logs.reverse().forEach(log => handleLog(log));
      }
      return;
    }
    
    // Если тип не распознан
    console.log('Неизвестный тип:', data.type);
    
  } catch (error) {
    console.error("Ошибка парсинга:", error);
  }
};
document.addEventListener("DOMContentLoaded", () => {
  notificationCenter = new NotificationCenter();
  ServerOffline();
});
socket.onerror = (event) => {
  console.log("WS error:", event);
  ServerOffline();
};

socket.onclose = () => {
  console.log("WS closed");

  clearTimeout(pingTimeout);
  clearInterval(pingInterval);

  ServerOffline();
};

function ServerOnline() {
  const statusEl = document.getElementById("server_status");
  if (!statusEl) return;

  statusEl.textContent = "Online";
  statusEl.style.color = "#00ff00";
}

function ServerOffline() {
  const statusEl = document.getElementById("server_status");
  if (!statusEl) return;

  statusEl.textContent = "Offline";
  statusEl.style.color = "#ff0008";
}
function Setusercount(count) {
   document.getElementById("users_online").textContent = count
}

socket.onclose = (event) => {
  console.log("WS closed:", event);
};


// Конфигурация иконок
function handleLog(data) {
  const ICONS = {
    error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    buy: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    user: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    default: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  };

  const COLORS = {
    error: '#ef4444',
    buy: '#22c55e',
    info: '#3b82f6',
    warning: '#eab308',
    success: '#22c55e',
    user: '#8b5cf6',
    default: '#6b7280'
  };

  const icon = ICONS[data.logType] || ICONS.default;
  const color = COLORS[data.logType] || COLORS.default;
  const timestamp = data.time ? new Date(data.time * 1000) : new Date();
  const timeStr = formatTime(timestamp);
  
  const activityList = document.getElementById('activityList');
  if (!activityList) return;
  
  const item = document.createElement('div');
  item.className = 'activity-item';
  
  item.innerHTML = `
    <div class="activity-icon" style="background:${color}">
      ${icon}
    </div>
    <div class="activity-content">
      <p class="activity-text">${data.message}</p>
      <p class="activity-time">${timeStr}</p>
    </div>
  `;
  
  activityList.prepend(item);
  
  // Ограничиваем количество логов
  const MAX_LOGS = 50;
  while (activityList.children.length > MAX_LOGS) {
    activityList.removeChild(activityList.lastChild);
  }
}

function formatTime(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}







//УВЕДОМЛЕННИЯ
// Глобальный экземпляр
let notificationCenter = null;


// Обновленный класс Notification
class Notification {
	constructor(args) {
		this.args = args;
		this.el = null;
		this.id = null;
		this.killTime = 300;
		this.init(args);
		
		// Добавляем обработчики для кнопок
		this.setupButtonHandlers();
	}
	
	setupButtonHandlers() {
		if (this.el) {
			const buttons = this.el.querySelectorAll('.notification__btn');
			buttons.forEach(btn => {
				btn.addEventListener('click', (e) => {
					e.stopPropagation();
					const action = btn.textContent.trim();
					const noteId = btn.getAttribute('data-dismiss');
					
					console.log(`Button clicked: ${action} for notification ${noteId}`);
					
					// Отправляем действие на сервер
					if (socket && socket.readyState === WebSocket.OPEN) {
						socket.send(JSON.stringify({
							type: "notification_action",
							notification_id: noteId,
							action: action
						}));
					}
					
					// Закрываем уведомление при любом нажатии на кнопку
					// Находим уведомление в NotificationCenter
					if (notificationCenter) {
						notificationCenter.killNote(noteId, { target: this.el });
					}
				});
			});
		}
	}
	
	init(args) {
		const {id,icon,title,subtitle,actions} = args;
		const block = "notification";
		const parent = document.body;
		const xmlnsSVG = "http://www.w3.org/2000/svg";
		const xmlnsUse = "http://www.w3.org/1999/xlink";

		const note = this.newEl("div");
		note.id = id;
		note.className = block;
		parent.insertBefore(note,parent.lastElementChild);

		const box = this.newEl("div");
		box.className = `${block}__box`;
		note.appendChild(box);

		const content = this.newEl("div");
		content.className = `${block}__content`;
		box.appendChild(content);

		const _icon = this.newEl("div");
		_icon.className = `${block}__icon`;
		content.appendChild(_icon);

		const iconSVG = this.newEl("svg",xmlnsSVG);
		iconSVG.setAttribute("class",`${block}__icon-svg`);
		iconSVG.setAttribute("role","img");
		iconSVG.setAttribute("aria-label",icon);
		iconSVG.setAttribute("width","32px");
		iconSVG.setAttribute("height","32px");
		_icon.appendChild(iconSVG);

		const iconUse = this.newEl("use",xmlnsSVG);
		iconUse.setAttributeNS(xmlnsUse,"href",`#${icon}`);
		iconSVG.appendChild(iconUse);

		const text = this.newEl("div");
		text.className = `${block}__text`;
		content.appendChild(text);

		const _title = this.newEl("div");
		_title.className = `${block}__text-title`;
		_title.textContent = title;
		text.appendChild(_title);

		if (subtitle) {
			const _subtitle = this.newEl("div");
			_subtitle.className = `${block}__text-subtitle`;
			_subtitle.textContent = subtitle;
			text.appendChild(_subtitle);
		}

		const btns = this.newEl("div");
		btns.className = `${block}__btns`;
		box.appendChild(btns);

		actions.forEach(action => {
			const btn = this.newEl("button");
			btn.className = `${block}__btn`;
			btn.type = "button";
			btn.setAttribute("data-dismiss", id);

			const btnText = this.newEl("span");
			btnText.className = `${block}__btn-text`;
			btnText.textContent = action;

			btn.appendChild(btnText);
			btns.appendChild(btn);
		});

		this.el = note;
		this.id = note.id;
	}
	
	newEl(elName,NSValue) {
		if (NSValue)
			return document.createElementNS(NSValue,elName);
		else
			return document.createElement(elName);
	}
}

// Обновленный NotificationCenter
class NotificationCenter {
	constructor() {
		this.items = [];
		this.itemsToKill = [];
		this.killTimeout = null;
		this.maxNotifications = 5;
	}
	
	showNotification(args) {
		// Проверяем лимит уведомлений
		if (this.items.length >= this.maxNotifications) {
			const oldest = this.items.shift();
			if (oldest && oldest.el && oldest.el.parentNode) {
				document.body.removeChild(oldest.el);
			}
		}
		
		const note = new Notification({
			id: args.id || `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			icon: args.icon || "info",
			title: args.title || "Notification",
			subtitle: args.subtitle || "",
			actions: args.actions || ["OK"]
		});
		
		const transY = 100 * this.items.length;
		note.el.style.transform = `translateY(${transY}%)`;
		
		this.items.push(note);
		
		// Анимация появления
		setTimeout(() => {
			note.el.classList.add('notification--show');
		}, 10);
		
		// Автоматическое закрытие через 5 секунд если нет кнопок
		if (!args.actions || args.actions.length === 0) {
			setTimeout(() => {
				this.killNote(note.id, { target: note.el });
			}, 5000);
		}
		
		return note;
	}
	
	killNote(id, e) {
		const note = this.items.find(item => item.id === id);
		if (!note) return;
		
		const tar = e?.target || note.el;
		
		if (tar && tar.getAttribute && tar.getAttribute("data-dismiss") === id) {
			note.el.classList.add("notification--out");
			this.itemsToKill.push(note);
			
			clearTimeout(this.killTimeout);
			
			this.killTimeout = setTimeout(() => {
				this.itemsToKill.forEach(itemToKill => {
					if (itemToKill.el && itemToKill.el.parentNode) {
						document.body.removeChild(itemToKill.el);
					}
					
					const left = this.items.filter(item => item.id !== itemToKill.id);
					this.items = [...left];
				});
				
				this.itemsToKill = [];
				
				if (!this.items.length) {
					// Можно показать новые уведомления
					// this.spawnNotes();
				} else {
					this.shiftNotes();
				}
				
			}, note.killTime || 300);
		} else {
			// Если вызвано без события (программно)
			note.el.classList.add("notification--out");
			this.itemsToKill.push(note);
			
			setTimeout(() => {
				if (note.el && note.el.parentNode) {
					document.body.removeChild(note.el);
				}
				const left = this.items.filter(item => item.id !== note.id);
				this.items = [...left];
				this.itemsToKill = [];
				this.shiftNotes();
			}, 300);
		}
	}
	
	shiftNotes() {
		this.items.forEach((item, i) => {
			const transY = 100 * i;
			if (item.el) {
				item.el.style.transform = `translateY(${transY}%)`;
			}
		});
	}
	
	// Остальные методы (spawnNote, spawnNotes, random) остаются без изменений
	spawnNote() {
		const id = this.random(0,2**32,true).toString(16);
		const draw = this.random(0,this.messages.length - 1,true);
		const message = this.messages[draw];
		const note = new Notification({
			id: `note-${id}`,
			icon: message.icon,
			title: message.title,
			subtitle: message.subtitle,
			actions: message.actions
		});
		const transY = 100 * this.items.length;
		
		note.el.style.transform = `translateY(${transY}%)`;
		note.el.addEventListener("click", this.killNote.bind(this, note.id));
		
		this.items.push(note);
	}
	
	spawnNotes(amount) {
		let count = typeof amount === "number" ? amount : this.random(1,5,true);
		while (count--)
			this.spawnNote();
	}
	
	random(min, max, round = false) {
		const percent = crypto.getRandomValues(new Uint32Array(1))[0] / 2**32;
		const relativeValue = (max - min) * percent;
		return min + (round === true ? Math.round(relativeValue) : +relativeValue.toFixed(2));
	}
}