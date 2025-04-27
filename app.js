import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCqeGYlQTO0Q55Ndy9EYp7q0AulIYhDLpA",
  authDomain: "femhack-9fae5.firebaseapp.com",
  databaseURL: "https://femhack-9fae5-default-rtdb.firebaseio.com",
  projectId: "femhack-9fae5",
  storageBucket: "femhack-9fae5.appspot.com",
  messagingSenderId: "1008278968390",
  appId: "1:1008278968390:web:9da0fd6549b69039979247",
  measurementId: "G-6FSGZRFGFW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI Elements
const authSection = document.getElementById('auth-section');
const boardSection = document.getElementById('board-section');
const actionBtn = document.getElementById('actionBtn');
const googleBtn = document.getElementById('googleBtn');
const toggleAuth = document.getElementById('toggle-link');
const logoutBtn = document.getElementById('logoutBtn');
const board = document.querySelector('.board');

let isLogin = true;
let currentUser = null;
let isSigningIn = false; // Flag for popup control

// Auth Toggle (Login/Signup text change)
toggleAuth.onclick = () => {
  isLogin = !isLogin;
  document.getElementById('auth-title').innerText = isLogin ? "Login" : "Sign Up";
  actionBtn.innerText = isLogin ? "Login" : "Sign Up";
  document.getElementById('toggle-auth').innerHTML = isLogin
    ?` Don't have an account? <span id="toggle-link">Sign Up</span>`
    :` Already have an account? <span id="toggle-link">Login</span>`;
  document.getElementById('toggle-link').onclick = toggleAuth;
};

// Email/Password Auth Placeholder (Not Implemented Here)
actionBtn.onclick = () => {
  alert('Please use Google to login/signup in this version.');
};

// Google Sign In
googleBtn.onclick = async () => {
  if (isSigningIn) return; // Prevent multiple popups
  isSigningIn = true;
  googleBtn.disabled = true; // Disable button during sign-in
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    authSection.style.display = 'none';
    boardSection.style.display = 'block';
    listenTasks();
  } catch (error) {
    if (error.code === 'auth/cancelled-popup-request') {
      console.log('Popup request cancelled, ignoring...');
    } else {
      alert(error.message);
    }
  } finally {
    isSigningIn = false;
    googleBtn.disabled = false; // Re-enable button after process
  }
};

// Logout
logoutBtn.onclick = async () => {
  await signOut(auth);
  currentUser = null;
  authSection.style.display = 'block';
  boardSection.style.display = 'none';
};

// Listen to tasks collection
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

// Render tasks to the board
function renderTasks(tasks) {
  board.innerHTML = '';
  for (const [status, items] of Object.entries(tasks)) {
    const col = document.createElement('div');
    col.className = column `${status.replace(' ', '').toLowerCase()};`
    col.innerHTML = `<h2>${status}</h2>;`
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

// Create a task card
function createCard(task) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    ${task.title}<br>
    <small>Assigned to: ${task.creatorName}</small>
  `;

  if (task.creatorUid === currentUser.uid) {
    const moveBtn = button('Move to ' + next(task.status), () => move(task));
    const editBtn = button('Edit', () => edit(task));
    const delBtn = button('Delete', () => remove(task));
    card.appendChild(moveBtn);
    card.appendChild(editBtn);
    card.appendChild(delBtn);
  }
  return card;
}

// Helper to create button
function button(text, fn) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.onclick = fn;
  btn.style.marginTop = '5px';
  btn.style.display = 'block';
  btn.style.width = '100%';
  btn.style.borderRadius = '5px';
  btn.style.border = 'none';
  btn.style.padding = '8px';
  btn.style.color = 'white';
  btn.style.cursor = 'pointer';
  btn.style.backgroundColor = text.startsWith('Move') ? '#4caf50' :
                              text === 'Edit' ? '#ff9800' :
                              '#f44336';
  return btn;
}

// Get next status
function next(status) {
  return status === 'To Do' ? 'In Progress' : status === 'In Progress' ? 'Done' : 'To Do';
}

// Move Task
function move(task) {
  updateDoc(doc(db, 'tasks', task.id), { status: next(task.status) });
}

// Edit Task
function edit(task) {
  const title = prompt('New title:', task.title);
  const details = prompt('New details:', task.details);
  if (title && details) {
    updateDoc(doc(db, 'tasks', task.id), { title, details });
  }
}

// Delete Task
function remove(task) {
  if (confirm('Delete this task?')) {
    deleteDoc(doc(db, 'tasks', task.id));
  }
}

// Add Task
async function addTask() {
  const title = prompt('Task title:');
  const details = prompt('Task details:');
  if (!title || !details) return alert('Please enter both title and details.');
  await addDoc(collection(db, 'tasks'), {
    title,
    details,
    status: 'To Do',
    creatorUid: currentUser.uid,
    creatorName: currentUser.displayName
  });
}