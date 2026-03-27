// DOM Elements
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const itemsLeft = document.getElementById('items-left');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearBtn = document.getElementById('clear-completed');

// State Management
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    renderTodos();
    updateStats();
});

// Event Listeners
addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
});

clearBtn.addEventListener('click', clearCompleted);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTodos();
    });
});

// Functions
function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    const newTodo = {
        id: Date.now(),
        text: text,
        completed: false
    };

    todos.unshift(newTodo);
    saveTodos();
    renderTodos();
    todoInput.value = '';
    todoInput.focus();
}

function toggleTodo(id) {
    todos = todos.map(todo => {
        if (todo.id === id) {
            return { ...todo, completed: !todo.completed };
        }
        return todo;
    });
    saveTodos();
    renderTodos();
}

function deleteTodo(id) {
    const todoElement = document.querySelector(`[data-id="${id}"]`);
    todoElement.style.transform = 'translateX(50px)';
    todoElement.style.opacity = '0';
    
    setTimeout(() => {
        todos = todos.filter(todo => todo.id !== id);
        saveTodos();
        renderTodos();
    }, 300);
}

function clearCompleted() {
    todos = todos.filter(todo => !todo.completed);
    saveTodos();
    renderTodos();
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
    updateStats();
}

function updateStats() {
    const remaining = todos.filter(todo => !todo.completed).length;
    itemsLeft.innerText = `${remaining} ${remaining === 1 ? 'item' : 'items'} left`;
}

function renderTodos() {
    todoList.innerHTML = '';
    
    const filteredTodos = todos.filter(todo => {
        if (currentFilter === 'active') return !todo.completed;
        if (currentFilter === 'completed') return todo.completed;
        return true;
    });

    if (filteredTodos.length === 0) {
        const emptyMsg = document.createElement('li');
        emptyMsg.className = 'empty-msg';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.padding = '2rem';
        emptyMsg.style.color = 'var(--text-muted)';
        emptyMsg.innerHTML = currentFilter === 'completed' ? 'No completed tasks yet.' : 
                             currentFilter === 'active' ? 'No active tasks. You\'re all caught up!' :
                             'No tasks yet. Add one to get started!';
        todoList.appendChild(emptyMsg);
        return;
    }

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.id = todo.id;
        
        li.innerHTML = `
            <label class="checkbox-wrapper">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
                <span class="checkmark"></span>
            </label>
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <button class="delete-btn" onclick="deleteTodo(${todo.id})" aria-label="Delete task">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        `;
        
        todoList.appendChild(li);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
