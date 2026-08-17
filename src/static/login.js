
console.log("HOST:", window.location.host);
console.log("PROTOCOL:", window.location.protocol);

const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const socketURL = `${protocol}://${window.location.host}/ws`;

console.log("SOCKET URL:", socketURL);

const socket = new WebSocket(socketURL);

socket.onopen = () => {
    console.log("WS connected");
};

socket.onopen = () => {
    console.log("WS connected");
};

socket.onmessage = (event) => {
    console.log("Ответ от сервера:", event.data);

    try {
        const data = JSON.parse(event.data);

        if (data.type === "pong") {
            clearTimeout(pingTimeout);
            ServerOnline();
        }
        if (data.type === "invalid login") {
            const emailError = document.getElementById('eror');
            const erortext = document.getElementById("errtext")
            erortext.textContent = "Invalid username or password";
            emailError.style.display = 'flex';
            document.getElementById("password").value = ""; 
            
        }
        if (data.type === "redirect") {
            window.location.href = data.rout;
        }
        if (data.type === "user not register") {
            const erortext = document.getElementById("errtext")
            erortext.textContent = "User not register";
            emailError.style.display = 'flex';
        }
    } catch (error) {
        console.error("Ошибка парсинга:", error);
    }
};
socket.onerror = (event) => {
    console.log("WS error:", event);
};

socket.onclose = (event) => {
    console.log("WS closed:", event);
};
document.getElementById("btnlogin").addEventListener("click", async function (event) { 
     event.preventDefault();
     fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "applocation/json"
        },
        body: JSON.stringify({
            username: document.getElementById("username").value,
            password: document.getElementById("password").value
        })
     })
});

const emailselector = document.getElementById('erremail');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('eror');
const erortext = document.getElementById("errtext")


emailInput.onblur = function () {
    if (emailInput.value.length >= 4) {

    } else {
        emailError.style.display = 'flex';
        emailInput.style.cssText = "border: 2px solid rgb(255, 0, 0);";
        erortext.textContent = "Enter Username"
    }
};

emailInput.onfocus = function () {
    emailError.style.display = 'none';
    emailInput.style.cssText = "border: 2px solid #fff;";
};