import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCcapONYuRIFRfz1iM_mZ6lm7CDsw6-9mg",
  authDomain: "task-manager-system-12307.firebaseapp.com",
  projectId: "task-manager-system-12307",
  storageBucket: "task-manager-system-12307.appspot.com",
  messagingSenderId: "314905607297",
  appId: "1:314905607297:web:4902a5b2e67d79ca8fe180",
  measurementId: "G-4S86JVX3RF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔧 UI Elements
const authSection = document.getElementById('auth-section');
const boardSection = document.getElementById('board-section');
const actionBtn = document.getElementById('actionBtn');
const googleBtn = document.getElementById('googleBtn');
const toggleAuth = document.getElementById('toggle-link');
const logoutBtn = document.getElementById('logoutBtn');
const board = document.querySelector('.board');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');

let isLogin = true;
let currentUser = null;

// 🔁 Toggle Login/Signup
toggleAuth.onclick = () => {
  isLogin = !isLogin;
  document.getElementById('auth-title').innerText = isLogin ? "Login" : "Sign Up";
  actionBtn.innerText = isLogin ? "Login" : "Sign Up";
  document.getElementById('toggle-auth').innerHTML = isLogin
    ? `Don't have an account? <span id="toggle-link">Sign Up</span>`
    : `Already have an account? <span id="toggle-link">Login</span>`;
  document.getElementById('toggle-link').onclick = toggleAuth;
};

// ✅ Email/Password Login or Signup
actionBtn.onclick = async () => {
  const email = emailInput.value;
  const password = passInput.value;
  if (!email || !password) return alert("Enter email and password.");

  try {
    let userCredential;
    if (isLogin) {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } else {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    }
    currentUser = userCredential.user;
    authSection.style.display = 'none';
    boardSection.style.display = 'block';
    listenTasks();
  } catch (error) {
    alert(error.message);
  }
};

// ✅ Google Sign In
googleBtn.onclick = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    authSection.style.display = 'none';
    boardSection.style.display = 'block';
    listenTasks();
  } catch (error) {
    alert(error.message);
  }
};

// ✅ Logout
logoutBtn.onclick = async () => {
  await signOut(auth);
  currentUser = null;
  authSection.style.display = 'block';
  boardSection.style.display = 'none';
};

// ✅ Auto-login on reload
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authSection.style.display = 'none';
    boardSection.style.display = 'block';
    listenTasks();
  } else {
    currentUser = null;
    authSection.style.display = 'block';
    boardSection.style.display = 'none';
  }
});

// 🔁 Real-Time Task Listener
function listenTasks() {
  onSnapshot(collection(db, 'tasks'), (snapshot) => {
    const tasks = { 'To Do': [], 'In Progress': [], 'Done': [] };
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      tasks[data.status || 'To Do'].push({ id: docSnap.id, ...data });
    });
    renderTasks(tasks);
  });
}

// ✅ Render Task Columns
function renderTasks(tasks) {
  board.innerHTML = '';
  for (const [status, items] of Object.entries(tasks)) {
    const col = document.createElement('div');
    col.className = 'column';
    col.dataset.status = status;

    // Drag over and drop for columns
    col.ondragover = (e) => e.preventDefault();
    col.ondrop = async (e) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('text/plain');
      await updateDoc(doc(db, 'tasks', taskId), { status: status });
    };

    col.innerHTML = `<h2>${status}</h2>`;
    items.forEach(task => col.appendChild(createCard(task)));

    if (status === 'To Do') {
      const createBtn = document.createElement('button');
      createBtn.className = 'create-btn';
      createBtn.textContent = '+ Create New Task';
      createBtn.onclick = addTask;
      col.appendChild(createBtn);
    }

    board.appendChild(col);
  }
}

// ✅ Task Card UI with Drag Support
function createCard(task) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = task.id;

  card.innerHTML = `
    <strong>${task.title}</strong><br>
    <small>By: ${task.creatorName || "Unknown"}</small>
  `;

  if (task.creatorUid === currentUser.uid) {
    card.appendChild(button('Edit', () => edit(task)));
    card.appendChild(button('Delete', () => remove(task)));
  }

  // Drag Event
  card.ondragstart = (e) => {
    e.dataTransfer.setData('text/plain', task.id);
  };

  return card;
}

// ✅ Task Card Buttons
function button(text, fn) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.onclick = fn;
  btn.className = 'task-btn';
  return btn;
}

// ✅ Task Edit/Delete
function edit(task) {
  const title = prompt("New title", task.title);
  const details = prompt("New details", task.details);
  if (title && details) {
    updateDoc(doc(db, 'tasks', task.id), { title, details });
  }
}

function remove(task) {
  if (confirm("Delete this task?")) {
    deleteDoc(doc(db, 'tasks', task.id));
  }
}

// ✅ Add New Task
async function addTask() {
  const title = prompt("Task title:");
  const details = prompt("Task details:");
  if (!title || !details) return alert("Fill both fields");
  await addDoc(collection(db, 'tasks'), {
    title,
    details,
    status: 'To Do',
    creatorUid: currentUser.uid,
    creatorName: currentUser.displayName || currentUser.email
  });
}


