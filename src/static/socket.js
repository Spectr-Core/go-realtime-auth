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
    }
    if (data.type === "userscount") {
      Setusercount(data.count)
    }
    if (data.type === "notification") {
			// Получаем уведомление от сервера
			if (notificationCenter) {
				notificationCenter.showNotification({
					id: data.id || `note-${Date.now()}`,
					icon: data.icon || "info",
					title: data.title || "Notification",
					subtitle: data.subtitle || "",
					actions: data.actions || ["OK"]
				});
			}
		}
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
  const statusEl = document.querySelector("#status");
  if (!statusEl) return;

  statusEl.textContent = "Server online";
  statusEl.style.background = "#052e1a";
}

function ServerOffline() {
  const statusEl = document.querySelector("#status");
  if (!statusEl) return;

  statusEl.textContent = "Server Offline";
  statusEl.style.background = "#ff0008";
}
function Setusercount(count) {
   document.getElementById("userscount").textContent = count
}

socket.onclose = (event) => {
  console.log("WS closed:", event);
};


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